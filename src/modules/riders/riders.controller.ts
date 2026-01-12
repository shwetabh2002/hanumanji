import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GeofenceService } from '../location/geofence.service';
import { FareCalculationService } from '../bookings/services/fare-calculation.service';
import { RedisLocationService } from '../location/redis-location.service';
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
    private readonly locationService: RedisLocationService
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
}
