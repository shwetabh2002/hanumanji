import { Controller, Post, Get, Body, Param, UseGuards, Inject, forwardRef, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DriverOnboardingService } from './services/driver-onboarding.service';
import { RedisLocationService } from '../location/redis-location.service';
import { DriverService } from './driver.service';
import { DriverLocationService } from './driver-location.service';
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
export class DriverController {

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
   * Get driver profile (supports both URL formats)
   * GET /api/v1/drivers/profile/:driverId (old)
   * GET /api/v1/drivers/:driverId/profile (new - LakshmanApp)
   */
  @Get('profile/:driverId')
  @ApiOperation({ summary: 'Get driver profile' })
  @ApiResponse({ status: 200, description: 'Driver profile retrieved' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getProfile(@Param('driverId') driverId: string) {
    return await this.onboardingService.getDriverProfile(driverId);
  }

  @Get(':driverId/profile')
  @ApiOperation({ summary: 'Get driver profile (alternative route)' })
  @ApiResponse({ status: 200, description: 'Driver profile retrieved' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getProfileAlt(@Param('driverId') driverId: string) {
    return await this.onboardingService.getDriverProfile(driverId);
  }

  /**
   * Update driver status (unified endpoint for online/offline)
   * POST /api/v1/drivers/:driverId/status
   * Body: { status: 'online' | 'offline', location?: LocationDto }
   */
  @Post(':driverId/status')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update driver status (online/offline)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @Param('driverId') driverId: string,
    @Body() body: { status: 'online' | 'offline'; location?: LocationDto }
  ) {
    const { status, location } = body;

    if (status === 'online') {
      // Require location when going online
      if (!location) {
        return {
          success: false,
          error: 'Location required when going online',
          message: 'Please provide your current location'
        };
      }

      // Call the goOnline logic
      return await this.goOnlineInternal(driverId, location);
    } else {
      // Call the goOffline logic
      return await this.goOfflineInternal(driverId);
    }
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
    return await this.goOnlineInternal(driverId, location);
  }

  /**
   * Internal method for going online (shared logic)
   */
  private async goOnlineInternal(driverId: string, location: LocationDto) {
    console.log('');
    console.log('🟢 ═══════════════════════════════════════════════════════════');
    console.log('🟢 [DriversController] GO ONLINE - Start');
    console.log('🟢 ═══════════════════════════════════════════════════════════');
    console.log('📥 Driver ID:', driverId);
    console.log('📍 Location:', JSON.stringify(location, null, 2));

    try {
      // Get driver to determine vehicle type for Redis ONLINE_DRIVERS set
      console.log('🔍 [Step 1] Finding driver in database...');
      const driver = await this.driverService.findById(driverId);

      if (!driver) {
        console.error('❌ Driver not found in database!');
        throw new Error(`Driver not found: ${driverId}`);
      }

      console.log('✅ Driver found:', {
        id: driver._id,
        name: `${driver.firstName} ${driver.lastName}`,
        currentStatus: driver.status,
        vehicleType: driver.vehicle?.type
      });

      const vehicleType = driver?.vehicle?.type || 'BIKE';

      // Update MongoDB status to ONLINE
      console.log('💾 [Step 2] Updating MongoDB status to ONLINE...');
      const updatedDriver = await this.driverService.setOnline(driverId);
      console.log('✅ MongoDB status updated:', {
        newStatus: updatedDriver.status,
        driverId: updatedDriver._id
      });

      // Add to Redis geospatial index
      console.log('📡 [Step 3] Adding driver to Redis geospatial index...');
      await this.locationService.updateCaptainLocation({
        driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        timestamp: new Date()
      });
      console.log('✅ Driver added to Redis geospatial index');

      // Mark as available (sets busy=0 in captain metadata)
      console.log('🟢 [Step 4] Marking driver as available in Redis...');
      await this.locationService.markCaptainAvailable(driverId);
      console.log('✅ Driver marked as available');

      // Mark as online in ONLINE_DRIVERS Redis set (critical for /drivers/me endpoint)
      console.log('🔴 [Step 5] Adding to ONLINE_DRIVERS Redis set...');
      await this.driverLocationService.markOnline(driverId, vehicleType);
      console.log('✅ Driver added to ONLINE_DRIVERS set');

      // Get market statistics
      console.log('📊 [Step 6] Fetching market statistics...');
      const marketStats = await this.locationService.getMarketStats(
        location.latitude,
        location.longitude,
        5 // 5km radius
      );
      console.log('✅ Market stats retrieved:', marketStats);

      // Calculate expected earnings
      const averageFarePerRide = 45; // ₹45 average
      const expectedRidesPerHour = 4;
      const expectedHourlyEarnings = averageFarePerRide * expectedRidesPerHour;

      const response = {
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

      console.log('✅ [SUCCESS] Driver is now online!');
      console.log('🟢 ═══════════════════════════════════════════════════════════');
      console.log('');

      return response;

    } catch (error) {
      console.error('❌ [ERROR] Failed to set driver online:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      console.log('🟢 ═══════════════════════════════════════════════════════════');
      console.log('');
      throw error;
    }
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
    return await this.goOfflineInternal(driverId);
  }

  /**
   * Internal method for going offline (shared logic)
   */
  private async goOfflineInternal(driverId: string) {
    console.log('');
    console.log('🔴 ═══════════════════════════════════════════════════════════');
    console.log('🔴 [DriversController] GO OFFLINE - Start');
    console.log('🔴 ═══════════════════════════════════════════════════════════');
    console.log('📥 Driver ID:', driverId);

    try {
      // Get driver to determine vehicle type for Redis ONLINE_DRIVERS set
      console.log('🔍 [Step 1] Finding driver in database...');
      const driver = await this.driverService.findById(driverId);

      if (!driver) {
        console.error('❌ Driver not found in database!');
        throw new Error(`Driver not found: ${driverId}`);
      }

      console.log('✅ Driver found:', {
        id: driver._id,
        name: `${driver.firstName} ${driver.lastName}`,
        currentStatus: driver.status
      });

      const vehicleType = driver?.vehicle?.type || 'BIKE';

      // Update MongoDB status to OFFLINE
      console.log('💾 [Step 2] Updating MongoDB status to OFFLINE...');
      const updatedDriver = await this.driverService.setOffline(driverId);
      console.log('✅ MongoDB status updated:', {
        newStatus: updatedDriver.status,
        driverId: updatedDriver._id
      });

      // Remove from Redis geospatial index and metadata
      console.log('🗑️ [Step 3] Removing from Redis geospatial index...');
      await this.locationService.removeCaptain(driverId);
      console.log('✅ Driver removed from Redis');

      // Mark as offline in ONLINE_DRIVERS Redis set (critical for /drivers/me endpoint)
      console.log('🔴 [Step 4] Removing from ONLINE_DRIVERS Redis set...');
      await this.driverLocationService.markOffline(driverId, vehicleType);
      console.log('✅ Driver removed from ONLINE_DRIVERS set');

      // TODO: Get today's stats from database
      console.log('📊 [Step 5] Fetching today\'s stats...');
      const todayStats = {
        ridesCompleted: 0,
        earnings: 0,
        hoursOnline: 0
      };
      console.log('✅ Stats fetched:', todayStats);

      const response = {
        status: 'OFFLINE',
        offlineSince: new Date().toISOString(),

        // Today's summary
        todayStats,

        // Display
        message: `You're offline. Today: ₹${todayStats.earnings} from ${todayStats.ridesCompleted} rides.`,
        messageHi: `आप offline हैं। आज: ₹${todayStats.earnings}, ${todayStats.ridesCompleted} rides।`
      };

      console.log('✅ [SUCCESS] Driver is now offline!');
      console.log('🔴 ═══════════════════════════════════════════════════════════');
      console.log('');

      return response;

    } catch (error) {
      console.error('❌ [ERROR] Failed to set driver offline:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      console.log('🔴 ═══════════════════════════════════════════════════════════');
      console.log('');
      throw error;
    }
  }

  /**
   * Update driver location (called every 10 seconds when online)
   * POST /api/v1/drivers/location (authenticated - gets driverId from JWT)
   * POST /api/v1/drivers/:driverId/location (with driverId param - LakshmanApp)
   */
  @Post('location')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update driver location (every 10s when online)' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateLocation(
    @Req() req: any,
    @Body() body: { location: LocationDto; lat?: number; lng?: number; heading?: number; speed?: number }
  ) {
    const driverId = req.user.sub;

    // Support both formats: nested location object or flat lat/lng
    const location = body.location || {
      latitude: body.lat,
      longitude: body.lng,
      heading: body.heading,
      speed: body.speed
    };

    return await this.updateLocationInternal(driverId, location);
  }

  @Post(':driverId/location')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update driver location with driverId param (LakshmanApp)' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateLocationWithId(
    @Param('driverId') driverId: string,
    @Body() body: { lat?: number; lng?: number; heading?: number; speed?: number }
  ) {
    const location = {
      latitude: body.lat,
      longitude: body.lng,
      heading: body.heading,
      speed: body.speed
    };

    return await this.updateLocationInternal(driverId, location);
  }

  /**
   * Internal method for updating location (shared logic)
   */
  private async updateLocationInternal(driverId: string, location: { latitude: number; longitude: number; heading?: number; speed?: number }) {
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

  // TODO: Document upload endpoints - to be implemented with new schema structure
  // Will be added after approval workflow is complete
  /*
  @Post('documents/upload')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload driver documents (license, RC, Aadhaar, photo)' })
  @ApiResponse({ status: 200, description: 'Document uploaded successfully' })
  async uploadDocument(
    @Req() req: any,
    @Body() body: {
      documentType: 'license' | 'rc' | 'aadhaar' | 'photo';
      url: string;
    }
  ) {
    // TODO: Implement with new schema
    return { success: true, message: 'Document upload endpoint - coming soon' };
  }
  */

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

  /**
   * Get driver statistics
   * GET /api/v1/drivers/:driverId/stats
   */
  @Get(':driverId/stats')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get driver statistics (today, weekly, overall)' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getStats(@Param('driverId') driverId: string) {
    // TODO: Get actual stats from database
    // For now, return mock data
    return {
      today: {
        ridesCompleted: 0,
        earnings: 0,
        hoursOnline: 0,
        averageRating: 5.0,
        acceptanceRate: 100
      },
      weekly: {
        ridesCompleted: 0,
        earnings: 0,
        hoursOnline: 0,
        averageRating: 5.0,
        acceptanceRate: 100
      },
      overall: {
        ridesCompleted: 0,
        earnings: 0,
        hoursOnline: 0,
        averageRating: 5.0,
        acceptanceRate: 100,
        totalRides: 0
      }
    };
  }

  /**
   * Get driver earnings
   * GET /api/v1/drivers/:driverId/earnings?period=today|week|month
   */
  @Get(':driverId/earnings')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get driver earnings by period' })
  @ApiResponse({ status: 200, description: 'Earnings retrieved' })
  async getEarnings(
    @Param('driverId') driverId: string,
    @Req() req: any
  ) {
    const period = req.query?.period || 'today';

    // TODO: Get actual earnings from database
    // For now, return mock data
    return {
      period,
      earnings: {
        total: 0,
        rides: 0,
        commission: 0,
        netEarnings: 0,
        breakdown: {
          cash: 0,
          online: 0,
          wallet: 0
        }
      },
      rides: {
        completed: 0,
        cancelled: 0,
        acceptanceRate: 100
      },
      displayText: `Total earnings for ${period}: ₹0`,
      displayTextHi: `${period} की कुल कमाई: ₹0`
    };
  }

  /**
   * Get list of pending driver applications (Admin only)
   * GET /api/v1/drivers/pending
   */
  @Get('pending')
  @UseGuards(JwtAuthGuard) // TODO: Add AdminGuard when admin authentication is implemented
  @ApiOperation({ summary: 'Get all pending driver applications (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending drivers retrieved' })
  async getPendingDrivers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return await this.onboardingService.getPendingDrivers(Number(page), Number(limit));
  }

  /**
   * Approve driver application (Admin only)
   * POST /api/v1/drivers/:driverId/approve
   */
  @Post(':driverId/approve')
  @UseGuards(JwtAuthGuard) // TODO: Add AdminGuard
  @ApiOperation({ summary: 'Approve driver application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Driver approved successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 400, description: 'Driver not in PENDING_APPROVAL status' })
  async approveDriver(
    @Param('driverId') driverId: string,
    @Req() req: any,
    @Body() body: { documentsRequired?: boolean }
  ) {
    const adminId = req.user.sub;
    const documentsRequired = body.documentsRequired !== undefined ? body.documentsRequired : true;
    return await this.onboardingService.approveDriver(driverId, adminId, documentsRequired);
  }

  /**
   * Reject driver application (Admin only)
   * POST /api/v1/drivers/:driverId/reject
   */
  @Post(':driverId/reject')
  @UseGuards(JwtAuthGuard) // TODO: Add AdminGuard
  @ApiOperation({ summary: 'Reject driver application (Admin only)' })
  @ApiResponse({ status: 200, description: 'Driver rejected successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 400, description: 'Driver not in PENDING_APPROVAL status' })
  async rejectDriver(
    @Param('driverId') driverId: string,
    @Req() req: any,
    @Body() body: { reason: string }
  ) {
    const adminId = req.user.sub;
    return await this.onboardingService.rejectDriver(driverId, adminId, body.reason);
  }

  /**
   * Get driver's own registration and approval status
   * GET /api/v1/drivers/me/status
   */
  @Get('me/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get own registration and approval status' })
  @ApiResponse({ status: 200, description: 'Driver status retrieved' })
  async getMyStatus(@Req() req: any) {
    const userId = req.user.sub;
    return await this.onboardingService.getDriverStatusByUserId(userId);
  }
}
