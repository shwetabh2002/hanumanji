import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RideManagementService } from './services/ride-management.service';
import { CaptainMatchingService } from './services/captain-matching.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Bookings Controller
 *
 * Handles all ride booking operations:
 * - Create booking (rider)
 * - Get booking status
 * - Accept/reject ride (captain)
 * - Start ride (captain)
 * - Complete ride (captain)
 * - Cancel ride (rider/captain)
 */

@ApiTags('Bookings')
@Controller('api/v1/bookings')
export class BookingsController {

  constructor(
    private readonly rideService: RideManagementService,
    private readonly matchingService: CaptainMatchingService
  ) {}

  /**
   * Create new ride booking
   * POST /api/v1/bookings
   */
  @Post()
  @ApiOperation({ summary: 'Create new ride booking' })
  @ApiResponse({ status: 201, description: 'Booking created, searching for captain' })
  @ApiResponse({ status: 400, description: 'Invalid location or outside service area' })
  async createBooking(@Body() body: {
    riderId: string;
    pickup: { address: string; lat: number; lng: number };
    drop: { address: string; lat: number; lng: number };
    fare: number;
    userType?: 'student' | 'regular';
  }) {
    const booking = await this.rideService.createBooking(body);

    // Start captain matching in background
    // The matching service will emit events when captain is found
    setTimeout(async () => {
      await this.matchingService.matchCaptain(booking.bookingId);
    }, 100);

    return booking;
  }

  /**
   * Get current active booking for logged-in user
   * GET /api/v1/bookings/current
   */
  @Get('current')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current active booking for the logged-in rider' })
  @ApiResponse({ status: 200, description: 'Current booking retrieved or null if no active booking' })
  async getCurrentBooking(@Req() req: any) {
    const userId = req.user.sub;

    // Find active booking for this user (status: PENDING, MATCHED, ONGOING, DRIVER_ARRIVED)
    const activeBooking = await this.rideService.getCurrentBooking(userId);

    if (!activeBooking) {
      return {
        hasActiveBooking: false,
        booking: null,
        message: 'No active booking found',
        messageHi: 'कोई active booking नहीं है'
      };
    }

    return {
      hasActiveBooking: true,
      booking: activeBooking
    };
  }

  /**
   * Get booking history for logged-in user
   * GET /api/v1/bookings/history
   */
  @Get('history')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get booking history with pagination' })
  @ApiResponse({ status: 200, description: 'Booking history retrieved' })
  async getBookingHistory(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number
  ) {
    const userId = req.user.sub;
    const limitNum = limit ? parseInt(String(limit), 10) : 10;
    const skipNum = skip ? parseInt(String(skip), 10) : 0;

    const history = await this.rideService.getBookingHistory(userId, limitNum, skipNum);

    return {
      bookings: history.bookings,
      total: history.total,
      limit: limitNum,
      skip: skipNum,
      hasMore: (skipNum + limitNum) < history.total
    };
  }

  /**
   * Get booking details and status
   * GET /api/v1/bookings/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get booking details and real-time status' })
  @ApiResponse({ status: 200, description: 'Booking details retrieved' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBooking(@Param('id') id: string) {
    return await this.rideService.getBooking(id);
  }

  /**
   * Captain accepts ride
   * POST /api/v1/bookings/:id/accept
   */
  @Post(':id/accept')
  @ApiOperation({ summary: 'Captain accepts ride request' })
  @ApiResponse({ status: 200, description: 'Ride accepted, navigation details provided' })
  @ApiResponse({ status: 400, description: 'Ride already matched or invalid' })
  async acceptRide(
    @Param('id') id: string,
    @Body() body: { driverId: string }
  ) {
    // Notify matching service
    await this.matchingService.acceptRide(id, body.driverId);

    // Get ride details for captain
    return await this.rideService.acceptRide(id, body.driverId);
  }

  /**
   * Captain rejects ride
   * POST /api/v1/bookings/:id/reject
   */
  @Post(':id/reject')
  @ApiOperation({ summary: 'Captain rejects ride request' })
  @ApiResponse({ status: 200, description: 'Ride rejected' })
  async rejectRide(
    @Param('id') id: string,
    @Body() body: { driverId: string; reason?: string }
  ) {
    // Notify matching service to try next captain
    await this.matchingService.rejectRide(id, body.driverId);

    return {
      success: true,
      message: 'Ride rejected',
      messageHi: 'Ride reject कर दिया'
    };
  }

  /**
   * Start ride (verify OTP)
   * POST /api/v1/bookings/:id/start
   */
  @Post(':id/start')
  @ApiOperation({ summary: 'Start ride after OTP verification' })
  @ApiResponse({ status: 200, description: 'Ride started' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async startRide(
    @Param('id') id: string,
    @Body() body: {
      otp: string;
      startLocation: { lat: number; lng: number };
    }
  ) {
    return await this.rideService.startRide(id, body.otp, body.startLocation);
  }

  /**
   * Complete ride
   * POST /api/v1/bookings/:id/complete
   */
  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete ride and calculate final fare' })
  @ApiResponse({ status: 200, description: 'Ride completed, earnings calculated' })
  async completeRide(
    @Param('id') id: string,
    @Body() body: {
      endLocation: { lat: number; lng: number };
      actualDistance: number;
    }
  ) {
    return await this.rideService.completeRide(
      id,
      body.endLocation,
      body.actualDistance
    );
  }

  /**
   * Cancel ride
   * POST /api/v1/bookings/:id/cancel
   */
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel ride (rider or captain)' })
  @ApiResponse({ status: 200, description: 'Ride cancelled' })
  async cancelRide(
    @Param('id') id: string,
    @Body() body: {
      cancelledBy: 'rider' | 'driver';
      reason?: string;
    }
  ) {
    return await this.rideService.cancelRide(id, body.cancelledBy, body.reason);
  }
}
