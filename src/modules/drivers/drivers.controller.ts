import { Controller, Post, Get, Body, Param, UseGuards, Inject, forwardRef, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DriverOnboardingService } from './services/driver-onboarding.service';
import { RedisLocationService } from '../location/redis-location.service';
import { DriverService } from '../driver/driver.service';
import { DriverLocationService } from '../driver/driver-location.service';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';

/**
 * Driver Controller
 *
 * Handles all driver/captain operations:
 * - Registration & onboarding
 * - Online/offline status
 * - Location updates
 * - Profile management
 */

interface LocationDto {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

@ApiTags('Drivers')
@Controller('api/v1/drivers')
export class DriversController {

  constructor(
    private readonly onboardingService: DriverOnboardingService,
    private readonly locationService: RedisLocationService,
    private readonly driverService: DriverService,
    @Inject(forwardRef(() => DriverLocationService))
    private readonly driverLocationService: DriverLocationService,
  ) {}

  /**
   * Complete driver registration with instant approval
   * POST /api/v1/drivers/complete-registration
   * Requires: User must be registered via /users/register with type='driver' first
   * Authenticated endpoint: Creates driver record linked to user by userId
   */
  @Post('complete-registration')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Complete driver registration (instant approval)' })
  @ApiResponse({ status: 201, description: 'Driver registered successfully' })
  @ApiResponse({ status: 409, description: 'Phone number or vehicle already registered' })
  async completeRegistration(@Req() req: any, @Body() dto: CompleteRegistrationDto) {
    const userId = req.user.sub; // Extract userId from JWT
    return await this.onboardingService.completeRegistration(dto, userId);
  }

  /**
   * Get driver profile
   * GET /api/v1/drivers/profile/:driverId
   */
  @Get('profile/:driverId')
  @ApiOperation({ summary: 'Get driver profile' })
  @ApiResponse({ status: 200, description: 'Driver profile retrieved' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getProfile(@Param('driverId') driverId: string) {
    return await this.onboardingService.getDriverProfile(driverId);
  }

  /**
   * Go online - Add driver to available pool
   * POST /api/v1/drivers/online
   */
  @Post('online')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Go online and start receiving ride requests' })
  @ApiResponse({ status: 200, description: 'Driver is now online' })
  async goOnline(
    @Req() req: any,
    @Body() body: { location: LocationDto }
  ) {
    const driverId = req.user.sub;
    const { location } = body;

    // Get driver to determine vehicle type for Redis ONLINE_DRIVERS set
    const driver = await this.driverService.findById(driverId);
    const vehicleType = driver?.vehicle?.type || 'BIKE';

    // Update MongoDB status to ONLINE
    await this.driverService.setOnline(driverId);

    // Add to Redis geospatial index
    await this.locationService.updateCaptainLocation({
      driverId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      speed: location.speed,
      timestamp: new Date()
    });

    // Mark as available (sets busy=0 in captain metadata)
    await this.locationService.markCaptainAvailable(driverId);

    // Mark as online in ONLINE_DRIVERS Redis set (critical for /drivers/me endpoint)
    await this.driverLocationService.markOnline(driverId, vehicleType);

    // Get market statistics
    const marketStats = await this.locationService.getMarketStats(
      location.latitude,
      location.longitude,
      5 // 5km radius
    );

    // Calculate expected earnings
    const averageFarePerRide = 45; // ₹45 average
    const expectedRidesPerHour = 4;
    const expectedHourlyEarnings = averageFarePerRide * expectedRidesPerHour;

    return {
      status: 'ONLINE',
      onlineSince: new Date().toISOString(),

      // Service area info
      serviceArea: 'Pari Chowk (5km radius)',
      serviceAreaHi: 'परी चौक (5km radius)',
      inServiceArea: true,

      // Market conditions
      marketConditions: {
        captainsOnline: marketStats.totalCaptainsInArea,
        captainsAvailable: marketStats.availableCaptains,
        captainsBusy: marketStats.busyCaptains,

        // Earnings potential
        expectedRidesPerHour,
        averageFarePerRide,
        expectedHourlyEarnings,

        // Display text
        displayMessage: `You're online! ${marketStats.availableCaptains} captains available in your area.`,
        displayMessageHi: `आप online हैं! आपके area में ${marketStats.availableCaptains} captains available हैं।`
      },

      // TODO: Get today's stats from database
      todayStats: {
        ridesCompleted: 0,
        earnings: 0,
        hoursOnline: 0,
        averageRating: 5.0
      }
    };
  }

  /**
   * Go offline - Remove driver from available pool
   * POST /api/v1/drivers/offline
   */
  @Post('offline')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Go offline and stop receiving ride requests' })
  @ApiResponse({ status: 200, description: 'Driver is now offline' })
  async goOffline(@Req() req: any) {
    const driverId = req.user.sub;

    // Get driver to determine vehicle type for Redis ONLINE_DRIVERS set
    const driver = await this.driverService.findById(driverId);
    const vehicleType = driver?.vehicle?.type || 'BIKE';

    // Update MongoDB status to OFFLINE
    await this.driverService.setOffline(driverId);

    // Remove from Redis geospatial index and metadata
    await this.locationService.removeCaptain(driverId);

    // Mark as offline in ONLINE_DRIVERS Redis set (critical for /drivers/me endpoint)
    await this.driverLocationService.markOffline(driverId, vehicleType);

    // TODO: Get today's stats from database
    const todayStats = {
      ridesCompleted: 0,
      earnings: 0,
      hoursOnline: 0
    };

    return {
      status: 'OFFLINE',
      offlineSince: new Date().toISOString(),

      // Today's summary
      todayStats,

      // Display
      message: `You're offline. Today: ₹${todayStats.earnings} from ${todayStats.ridesCompleted} rides.`,
      messageHi: `आप offline हैं। आज: ₹${todayStats.earnings}, ${todayStats.ridesCompleted} rides।`
    };
  }

  /**
   * Update driver location (called every 10 seconds when online)
   * POST /api/v1/drivers/location
   */
  @Post('location')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update driver location (every 10s when online)' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateLocation(
    @Req() req: any,
    @Body() body: { location: LocationDto }
  ) {
    const driverId = req.user.sub;
    const { location } = body;

    // Update Redis location
    await this.locationService.updateCaptainLocation({
      driverId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      speed: location.speed,
      timestamp: new Date()
    });

    // TODO: Broadcast to any riders tracking this captain
    // await this.websocketGateway.broadcastCaptainLocation(driverId, location);

    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Upload driver documents
   * POST /api/v1/drivers/documents/upload
   */
  @Post('documents/upload')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload driver documents (license, RC, Aadhaar, photo)' })
  @ApiResponse({ status: 200, description: 'Document uploaded successfully' })
  async uploadDocument(
    @Req() req: any,
    @Body() body: {
      documentType: 'license' | 'rc' | 'aadhaar' | 'photo';
      url: string; // For MVP, assume file is already uploaded to storage
    }
  ) {
    const userId = req.user.sub; // Extract userId from JWT
    const { documentType, url } = body;

    return await this.onboardingService.updateDocuments(
      userId,
      documentType,
      url
    );
  }

  /**
   * Get driver's current location
   * GET /api/v1/drivers/:driverId/location
   */
  @Get(':driverId/location')
  @ApiOperation({ summary: 'Get driver current location' })
  @ApiResponse({ status: 200, description: 'Location retrieved' })
  @ApiResponse({ status: 404, description: 'Driver offline or not found' })
  async getLocation(@Param('driverId') driverId: string) {
    const location = await this.locationService.getCaptainLocation(driverId);

    if (!location) {
      return {
        online: false,
        message: 'Driver is offline',
        messageHi: 'Driver offline है'
      };
    }

    return {
      online: true,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        timestamp: location.timestamp
      }
    };
  }
}
