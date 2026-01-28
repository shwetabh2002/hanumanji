import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { GeofenceService } from '../location/geofence.service';
import { FareCalculationService } from '../bookings/services/fare-calculation.service';
import { RedisLocationService } from '../location/redis-location.service';
import { GoogleMapsService } from '../../shared/services/google-maps.service';
import {
  PARI_CHOWK_POPULAR_DESTINATIONS,
  getDestinationsForUserType
} from '../location/popular-destinations.config';

/**
 * Riders Controller
 *
 * Handles rider-specific operations:
 * - Get popular destinations with real-time fares & ETA
 * - Estimate fare for custom destinations
 * - Check service availability
 */

@ApiTags('Riders')
@Controller('api/v1/riders')
export class RidersController {

  constructor(
    private readonly geofenceService: GeofenceService,
    private readonly fareService: FareCalculationService,
    private readonly locationService: RedisLocationService,
    private readonly googleMapsService: GoogleMapsService
  ) {}

  /**
   * Get quick destinations with real-time data
   * GET /api/v1/riders/quick-destinations
   */
  @Get('quick-destinations')
  @ApiOperation({ summary: 'Get popular destinations with fares, ETA, and availability' })
  @ApiQuery({ name: 'lat', required: true, description: 'User latitude' })
  @ApiQuery({ name: 'lng', required: true, description: 'User longitude' })
  @ApiQuery({ name: 'userType', required: false, enum: ['student', 'regular'], description: 'User type for discounts' })
  @ApiResponse({ status: 200, description: 'Quick destinations retrieved' })
  async getQuickDestinations(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('userType') userType: 'student' | 'regular' = 'regular'
  ) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    // Check if user is in service area
    const serviceCheck = this.geofenceService.isWithinServiceArea(userLat, userLng);

    if (!serviceCheck.inServiceArea) {
      return {
        inServiceArea: false,
        message: 'Service not available in your area yet. We currently serve Pari Chowk area (5km radius).',
        messageHi: 'आपके area में अभी service available नहीं है। हम currently Pari Chowk area (5km radius) में serve करते हैं।',
        nearestServiceArea: this.geofenceService.getNearestServiceArea(userLat, userLng)
      };
    }

    // Get captains nearby for availability
    const nearbyCaptains = await this.locationService.findNearbyCaptains(
      userLat,
      userLng,
      5, // 5km radius
      20 // Top 20 captains
    );

    const availableCaptains = [];
    for (const captain of nearbyCaptains) {
      const isBusy = await this.locationService.isCaptainBusy(captain.driverId);
      if (!isBusy) {
        availableCaptains.push(captain);
      }
    }

    // Calculate fares and distances for popular destinations
    const destinations = PARI_CHOWK_POPULAR_DESTINATIONS.map(dest => {
      // Calculate distance from user to destination
      const distance = this.geofenceService.calculateDistance(
        userLat,
        userLng,
        dest.coordinates.lat,
        dest.coordinates.lng
      );

      // Calculate estimated time
      const estimatedTime = this.geofenceService.calculateEstimatedTime(distance);

      // Calculate fare
      const fareBreakdown = this.fareService.calculateFare(
        distance,
        estimatedTime,
        userType
      );

      // Estimate captain ETA (nearest captain to user)
      const nearestCaptainDistance = availableCaptains.length > 0
        ? availableCaptains[0].distance
        : 2.0; // Default 2km if no captains
      const captainEta = Math.ceil(nearestCaptainDistance * 2.4); // 2.4 min per km

      return {
        id: dest.id,
        name: dest.name,
        nameHi: dest.nameHi,
        icon: dest.icon,
        category: dest.category,
        landmark: dest.landmark,
        landmarkHi: dest.landmarkHi,
        coordinates: dest.coordinates,

        // Calculated values (backend does all the work!)
        distanceFromYou: distance,
        estimatedFare: fareBreakdown.riderPays,
        fareBreakdown: fareBreakdown.breakdown,
        savingsVsRapido: fareBreakdown.comparison.youSave,
        percentSaved: fareBreakdown.comparison.percentSaved,
        estimatedTime,
        captainsNearby: availableCaptains.length,
        eta: captainEta,

        // Display text (backend provides UI strings!)
        displayFare: fareBreakdown.displayText.fare,
        displaySavings: fareBreakdown.displayText.savings,
        displayFareHi: fareBreakdown.displayTextHi.fare,
        displaySavingsHi: fareBreakdown.displayTextHi.savings
      };
    });

    // Sort by distance from user
    destinations.sort((a, b) => a.distanceFromYou - b.distanceFromYou);

    // Take top 10 nearest
    const topDestinations = destinations.slice(0, 10);

    return {
      inServiceArea: true,
      destinations: topDestinations,

      // Market info
      marketInfo: {
        captainsOnline: nearbyCaptains.length,
        captainsAvailable: availableCaptains.length,
        averageWaitTime: availableCaptains.length > 0 ? 2 : 5, // minutes

        message: `${availableCaptains.length} captains online nearby`,
        messageHi: `${availableCaptains.length} captains आपके पास online हैं`
      },

      // Phase info
      phaseInfo: this.fareService.getCurrentPhaseInfo()
    };
  }

  /**
   * Estimate fare for custom destination
   * GET /api/v1/bookings/estimate
   */
  @Get('/estimate')
  @ApiOperation({ summary: 'Estimate fare for custom pickup and drop locations' })
  @ApiQuery({ name: 'pickupLat', required: true })
  @ApiQuery({ name: 'pickupLng', required: true })
  @ApiQuery({ name: 'dropLat', required: true })
  @ApiQuery({ name: 'dropLng', required: true })
  @ApiQuery({ name: 'userType', required: false, enum: ['student', 'regular'] })
  @ApiResponse({ status: 200, description: 'Fare estimated' })
  async estimateFare(
    @Query('pickupLat') pickupLat: string,
    @Query('pickupLng') pickupLng: string,
    @Query('dropLat') dropLat: string,
    @Query('dropLng') dropLng: string,
    @Query('userType') userType: 'student' | 'regular' = 'regular'
  ) {
    const pickup = {
      lat: parseFloat(pickupLat),
      lng: parseFloat(pickupLng)
    };

    const drop = {
      lat: parseFloat(dropLat),
      lng: parseFloat(dropLng)
    };

    // Validate both locations are in service area
    const validation = this.geofenceService.validateRideLocations(pickup, drop);

    if (!validation.valid) {
      return {
        serviceAvailable: false,
        message: validation.message,
        messageHi: validation.messageHi
      };
    }

    // Calculate distance
    const distance = this.geofenceService.calculateDistance(
      pickup.lat,
      pickup.lng,
      drop.lat,
      drop.lng
    );

    // Calculate estimated time
    const estimatedDuration = this.geofenceService.calculateEstimatedTime(distance);

    // Calculate fare
    const fareBreakdown = this.fareService.calculateFare(
      distance,
      estimatedDuration,
      userType
    );

    // Check captain availability
    const nearbyCaptains = await this.locationService.findNearbyCaptains(
      pickup.lat,
      pickup.lng,
      5,
      10
    );

    let availableCount = 0;
    for (const captain of nearbyCaptains) {
      const isBusy = await this.locationService.isCaptainBusy(captain.driverId);
      if (!isBusy) availableCount++;
    }

    const estimatedWaitTime = availableCount > 0 ? 2 : 5; // minutes

    return {
      serviceAvailable: true,
      inServiceArea: true,

      // Fare details (all calculated by backend!)
      fare: {
        total: fareBreakdown.riderPays,
        breakdown: fareBreakdown.breakdown,
        captainEarns: fareBreakdown.captainEarns,
        commission: fareBreakdown.commission
      },

      // Trip details
      distance,
      estimatedDuration,

      // Comparison
      comparison: fareBreakdown.comparison,

      // Availability
      captainsAvailable: availableCount,
      estimatedWaitTime,

      // Display strings (backend provides UI text!)
      displayText: fareBreakdown.displayText,
      displayTextHi: fareBreakdown.displayTextHi
    };
  }

  /**
   * Map Preview - Get everything needed to display booking map
   * POST /api/v1/riders/map-preview
   *
   * Backend-Heavy: Returns ALL calculated data including:
   * - Map config (center, bounds)
   * - Pickup/drop markers
   * - Nearby available drivers with positions
   * - Calculated fare and ETA
   * - Availability stats
   *
   * Mobile just displays this data with ZERO business logic
   */
  @Post('map-preview')
  @ApiOperation({
    summary: 'Get complete map data for booking screen (backend-heavy)',
    description: 'Returns map config, markers, nearby drivers, fare - everything the mobile needs to render the booking map'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['pickup', 'drop'],
      properties: {
        pickup: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 28.4744 },
            lng: { type: 'number', example: 77.4920 }
          }
        },
        drop: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 28.4800 },
            lng: { type: 'number', example: 77.5000 }
          }
        },
        userType: {
          type: 'string',
          enum: ['student', 'regular'],
          default: 'regular'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Map preview data returned' })
  @ApiResponse({ status: 400, description: 'Invalid locations or out of service area' })
  async getMapPreview(
    @Body() body: {
      pickup: { lat: number; lng: number };
      drop: { lat: number; lng: number };
      userType?: 'student' | 'regular';
    }
  ) {
    const { pickup, drop, userType = 'regular' } = body;

    console.log('🗺️ [RidersController] Map preview requested:', {
      pickup,
      drop,
      userType,
      timestamp: new Date().toISOString(),
    });

    // Validate both locations are in service area
    const validation = this.geofenceService.validateRideLocations(pickup, drop);

    if (!validation.valid) {
      console.warn('⚠️ [RidersController] Locations outside service area:', {
        pickup,
        drop,
        message: validation.message,
      });

      return {
        success: false,
        serviceAvailable: false,
        message: validation.message,
        messageHi: validation.messageHi
      };
    }

    console.log('✅ [RidersController] Locations validated successfully');

    // Calculate distance (Haversine formula)
    const distance = this.geofenceService.calculateDistance(
      pickup.lat,
      pickup.lng,
      drop.lat,
      drop.lng
    );

    console.log('📏 [RidersController] Distance calculated:', {
      distance: `${distance.toFixed(2)} km`,
    });

    // Calculate estimated time
    const estimatedDuration = this.geofenceService.calculateEstimatedTime(distance);

    console.log('⏱️ [RidersController] Estimated duration:', {
      duration: `${estimatedDuration} min`,
    });

    // Calculate fare (with student discount if applicable)
    const fareBreakdown = this.fareService.calculateFare(
      distance,
      estimatedDuration,
      userType
    );

    console.log('💰 [RidersController] Fare calculated:', {
      total: fareBreakdown.riderPays,
      userType,
      discount: fareBreakdown.breakdown.discount || 0,
    });

    // Find nearby available drivers (5km radius, max 20 drivers)
    console.log('🔍 [RidersController] Searching for nearby drivers...');

    const nearbyCaptains = await this.locationService.findNearbyCaptains(
      pickup.lat,
      pickup.lng,
      5, // 5km radius
      20 // Max 20 drivers
    );

    console.log('🚗 [RidersController] Nearby captains found:', {
      total: nearbyCaptains.length,
    });

    // Filter out busy drivers and get detailed info
    const availableDrivers = [];
    for (const captain of nearbyCaptains) {
      const isBusy = await this.locationService.isCaptainBusy(captain.driverId);
      if (!isBusy) {
        // Get driver metadata (heading, speed)
        const location = await this.locationService.getCaptainLocation(captain.driverId);
        if (location) {
          // Calculate ETA for this driver to pickup
          const driverEta = Math.ceil(captain.distance * 2.4); // 2.4 min per km

          availableDrivers.push({
            id: captain.driverId,
            coordinates: {
              lat: location.latitude,
              lng: location.longitude
            },
            heading: location.heading || 0,
            speed: location.speed || 0,
            distance: captain.distance, // km from pickup
            eta: driverEta // minutes to reach pickup
          });
        }
      }
    }

    console.log('✅ [RidersController] Available drivers filtered:', {
      available: availableDrivers.length,
      busy: nearbyCaptains.length - availableDrivers.length,
    });

    // Calculate map bounds to fit pickup, drop, and drivers
    const allPoints = [
      pickup,
      drop,
      ...availableDrivers.map(d => d.coordinates)
    ];

    const bounds = this.calculateMapBounds(allPoints);
    const center = {
      lat: (pickup.lat + drop.lat) / 2,
      lng: (pickup.lng + drop.lng) / 2
    };

    // Get nearest driver ETA
    const nearestDriverEta = availableDrivers.length > 0
      ? Math.min(...availableDrivers.map(d => d.eta))
      : null;

    // Fetch route polyline from Google Directions API
    console.log('🗺️ [RidersController] Fetching route polyline from Google Maps...');
    let routePolyline: string | null = null;
    try {
      const directions = await this.googleMapsService.getDirections(pickup, drop);
      if (directions) {
        routePolyline = directions.polyline;
        console.log('✅ [RidersController] Route polyline fetched successfully', {
          polylineLength: routePolyline?.length,
          distance: directions.distance,
          duration: directions.duration,
        });
      } else {
        console.warn('⚠️ [RidersController] No route returned from Google Maps');
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('❌ [RidersController] Failed to fetch route polyline:', {
        error: error.message,
        stack: error.stack,
      });
    }

    console.log('📦 [RidersController] Preparing map preview response:', {
      hasRoute: !!routePolyline,
      driversCount: availableDrivers.length,
      fare: fareBreakdown.riderPays,
      distance,
    });

    // Return EVERYTHING the mobile needs (backend-heavy!)
    return {
      success: true,
      serviceAvailable: true,

      // Map configuration (backend calculates camera position)
      mapConfig: {
        center,
        bounds,
        zoom: this.calculateZoomLevel(distance)
      },

      // Markers for pickup and drop
      markers: {
        pickup: {
          coordinates: pickup,
          title: 'Pickup Location',
          icon: 'pickup'
        },
        drop: {
          coordinates: drop,
          title: 'Drop Location',
          icon: 'drop'
        }
      },

      // Nearby available drivers (real-time positions)
      nearbyDrivers: availableDrivers,

      // Route polyline (Google Directions API)
      route: routePolyline ? {
        polyline: routePolyline
      } : null,

      // Ride information (backend calculates everything)
      rideInfo: {
        distance, // km
        estimatedDuration, // minutes
        fare: {
          total: fareBreakdown.riderPays, // Just show total
          currency: 'INR',
          displayText: fareBreakdown.displayText.fare,
          displayTextHi: fareBreakdown.displayTextHi.fare
        },
        savings: fareBreakdown.comparison.youSave > 0 ? {
          amount: fareBreakdown.comparison.youSave,
          percent: fareBreakdown.comparison.percentSaved,
          displayText: fareBreakdown.displayText.savings,
          displayTextHi: fareBreakdown.displayTextHi.savings
        } : null
      },

      // Availability information
      availability: {
        driversNearby: availableDrivers.length,
        estimatedWaitTime: availableDrivers.length > 0 ? nearestDriverEta : null,
        message: availableDrivers.length > 0
          ? `${availableDrivers.length} drivers nearby`
          : 'No drivers available right now',
        messageHi: availableDrivers.length > 0
          ? `${availableDrivers.length} drivers आपके पास हैं`
          : 'अभी कोई driver available नहीं है'
      }
    };
  }

  /**
   * Calculate map bounds to fit all points
   * Helper method for map-preview
   */
  private calculateMapBounds(points: Array<{ lat: number; lng: number }>) {
    if (points.length === 0) {
      return null;
    }

    let minLat = points[0].lat;
    let maxLat = points[0].lat;
    let minLng = points[0].lng;
    let maxLng = points[0].lng;

    for (const point of points) {
      minLat = Math.min(minLat, point.lat);
      maxLat = Math.max(maxLat, point.lat);
      minLng = Math.min(minLng, point.lng);
      maxLng = Math.max(maxLng, point.lng);
    }

    // Add 10% padding
    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;

    return {
      northeast: {
        lat: maxLat + latPadding,
        lng: maxLng + lngPadding
      },
      southwest: {
        lat: minLat - latPadding,
        lng: minLng - lngPadding
      }
    };
  }

  /**
   * Calculate appropriate zoom level based on distance
   * Helper method for map-preview
   */
  private calculateZoomLevel(distanceKm: number): number {
    // Zoom levels (approximate):
    // 15+ = Very close (< 1km)
    // 14 = Close (1-2km)
    // 13 = Medium (2-5km)
    // 12 = Far (5-10km)
    // 11- = Very far (> 10km)

    if (distanceKm < 1) return 15;
    if (distanceKm < 2) return 14;
    if (distanceKm < 5) return 13;
    if (distanceKm < 10) return 12;
    return 11;
  }
}
