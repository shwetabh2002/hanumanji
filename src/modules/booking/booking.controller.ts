import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { BookingService } from './booking.service';
import { FareService } from './services/fare.service';
import {
  CreateBookingDto,
  AcceptBookingDto,
  RejectBookingDto,
  CancelBookingDto,
  StartRideDto,
  CompleteRideDto,
  BookingResponseDto,
  FareEstimateDto,
  NearbyBookingsDto,
} from './dto/booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VehicleType } from '../../common/enums';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly fareService: FareService,
  ) {}

  // ============ User Endpoints ============

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({ status: 201, type: BookingResponseDto })
  async createBooking(
    @Req() req: any,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const userId = req.user.sub;
    return this.bookingService.createBooking(userId, dto);
  }

  @Get('current')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current active booking for user' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async getCurrentBooking(@Req() req: any): Promise<BookingResponseDto | null> {
    const userId = req.user.sub;
    return this.bookingService.getCurrentBookingForUser(userId);
  }

  @Get('history')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get booking history for user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  async getBookingHistory(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    const userId = req.user.sub;
    return this.bookingService.getUserBookings(userId, limit || 20, skip || 0);
  }

  @Post('cancel')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking (user)' })
  @ApiBody({ type: CancelBookingDto })
  async cancelBookingByUser(@Req() req: any, @Body() dto: CancelBookingDto) {
    const userId = req.user.sub;
    await this.bookingService.cancelBooking(userId, dto.bookingId, dto.reason, 'user');
    return { success: true, message: 'Booking cancelled' };
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get booking details by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async getBookingById(@Param('id') id: string) {
    return this.bookingService.getBookingById(id);
  }

  // ============ Driver Endpoints ============

  @Get('driver/current')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current active booking for driver' })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async getDriverCurrentBooking(@Req() req: any): Promise<BookingResponseDto | null> {
    const driverId = req.user.sub;
    return this.bookingService.getCurrentBookingForDriver(driverId);
  }

  @Get('driver/nearby')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get nearby pending bookings for driver' })
  async getNearbyBookings(@Query() dto: NearbyBookingsDto): Promise<BookingResponseDto[]> {
    return this.bookingService.getNearbyPendingBookings(
      dto.latitude,
      dto.longitude,
      dto.radiusKm || 5,
    );
  }

  @Get('driver/history')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get booking history for driver' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  async getDriverBookingHistory(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    const driverId = req.user.sub;
    return this.bookingService.getDriverBookings(driverId, limit || 20, skip || 0);
  }

  @Post('driver/accept')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a booking (driver)' })
  @ApiBody({ type: AcceptBookingDto })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async acceptBooking(
    @Req() req: any,
    @Body() dto: AcceptBookingDto,
  ): Promise<BookingResponseDto> {
    const driverId = req.user.sub;
    return this.bookingService.acceptBooking(driverId, dto.bookingId);
  }

  @Post('driver/reject')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a booking (driver)' })
  @ApiBody({ type: RejectBookingDto })
  async rejectBooking(@Req() req: any, @Body() dto: RejectBookingDto) {
    const driverId = req.user.sub;
    await this.bookingService.rejectBooking(driverId, dto.bookingId, dto.reason);
    return { success: true, message: 'Booking rejected' };
  }

  @Post('driver/arrived')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark driver arrived at pickup (driver)' })
  @ApiBody({ type: AcceptBookingDto })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async driverArrived(
    @Req() req: any,
    @Body() dto: AcceptBookingDto,
  ): Promise<BookingResponseDto> {
    const driverId = req.user.sub;
    return this.bookingService.driverArrived(driverId, dto.bookingId);
  }

  @Post('driver/start')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the ride with OTP verification (driver)' })
  @ApiBody({ type: StartRideDto })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async startRide(@Req() req: any, @Body() dto: StartRideDto): Promise<BookingResponseDto> {
    const driverId = req.user.sub;
    return this.bookingService.startRide(driverId, dto.bookingId, dto.otp);
  }

  @Post('driver/complete')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete the ride (driver)' })
  @ApiBody({ type: CompleteRideDto })
  @ApiResponse({ status: 200, type: BookingResponseDto })
  async completeRide(
    @Req() req: any,
    @Body() dto: CompleteRideDto,
  ): Promise<BookingResponseDto> {
    const driverId = req.user.sub;
    return this.bookingService.completeRide(
      driverId,
      dto.bookingId,
      dto.actualDistance,
      dto.actualDuration,
    );
  }

  @Post('driver/cancel')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking (driver)' })
  @ApiBody({ type: CancelBookingDto })
  async cancelBookingByDriver(@Req() req: any, @Body() dto: CancelBookingDto) {
    const driverId = req.user.sub;
    await this.bookingService.cancelBooking(driverId, dto.bookingId, dto.reason, 'driver');
    return { success: true, message: 'Booking cancelled' };
  }

  // ============ Fare Estimation ============

  @Get('estimate/fare')
  @ApiOperation({ summary: 'Get fare estimate for a trip' })
  @ApiQuery({ name: 'pickupLat', type: Number })
  @ApiQuery({ name: 'pickupLng', type: Number })
  @ApiQuery({ name: 'dropLat', type: Number })
  @ApiQuery({ name: 'dropLng', type: Number })
  @ApiQuery({ name: 'vehicleType', enum: VehicleType })
  async getFareEstimate(
    @Query('pickupLat') pickupLat: number,
    @Query('pickupLng') pickupLng: number,
    @Query('dropLat') dropLat: number,
    @Query('dropLng') dropLng: number,
    @Query('vehicleType') vehicleType: VehicleType,
  ): Promise<FareEstimateDto> {
    const { distanceMeters, durationSeconds } = this.fareService.estimateDistanceAndDuration(
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
    );

    const surgeMultiplier = await this.fareService.calculateSurge(pickupLat, pickupLng, vehicleType);

    return this.fareService.calculateFare(vehicleType, distanceMeters, durationSeconds, surgeMultiplier);
  }
}

