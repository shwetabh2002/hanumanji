import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Booking, BookingDocument } from './schemas/booking.schema';
import { BookingStateService, ActiveBookingState } from './services/booking-state.service';
import { FareService } from './services/fare.service';
import { EventService } from '../../shared/kafka/event.service';
import {
  DomainEvents,
  BookingCreatedPayload,
  BookingAcceptedPayload,
  BookingCompletedPayload,
} from '../../shared/events/events.constants';
import { BookingStatus, PaymentMethod } from '../../common/enums';
import { CreateBookingDto, BookingResponseDto } from './dto/booking.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    private readonly bookingStateService: BookingStateService,
    private readonly fareService: FareService,
    private readonly eventService: EventService,
  ) {}

  // ============ Booking Creation ============

  async createBooking(userId: string, dto: CreateBookingDto): Promise<BookingResponseDto> {
    // Check if user already has an active booking
    const hasActive = await this.bookingStateService.userHasActiveBooking(userId);
    if (hasActive) {
      throw new ConflictException('You already have an active booking');
    }

    // Calculate fare estimate
    const { distanceMeters, durationSeconds } = this.fareService.estimateDistanceAndDuration(
      dto.pickupLocation.latitude,
      dto.pickupLocation.longitude,
      dto.dropLocation.latitude,
      dto.dropLocation.longitude,
    );

    const surgeMultiplier = await this.fareService.calculateSurge(
      dto.pickupLocation.latitude,
      dto.pickupLocation.longitude,
      dto.vehicleType,
    );

    const fareEstimate = this.fareService.calculateFare(
      dto.vehicleType,
      distanceMeters,
      durationSeconds,
      surgeMultiplier,
    );

    // Generate OTP for ride verification
    const otp = this.generateOtp();

    // Create booking in MongoDB
    const booking = await this.bookingModel.create({
      userId: new Types.ObjectId(userId),
      vehicleType: dto.vehicleType,
      pickupLocation: {
        address: dto.pickupLocation.address,
        coordinates: [dto.pickupLocation.longitude, dto.pickupLocation.latitude],
        landmark: dto.pickupLocation.landmark,
      },
      dropLocation: {
        address: dto.dropLocation.address,
        coordinates: [dto.dropLocation.longitude, dto.dropLocation.latitude],
        landmark: dto.dropLocation.landmark,
      },
      bookingLocation: {
        longitude: dto.pickupLocation.longitude,
        latitude: dto.pickupLocation.latitude,
      },
      bookingDestination: {
        longitude: dto.dropLocation.longitude,
        latitude: dto.dropLocation.latitude,
      },
      estimatedDistance: distanceMeters,
      estimatedDuration: durationSeconds,
      estimatedFare: fareEstimate.totalFare,
      fareBreakdown: fareEstimate,
      paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
      promoCode: dto.promoCode,
      scheduledTime: dto.scheduledTime,
      status: BookingStatus.PENDING,
      requestedAt: new Date(),
      otp,
    });

    // Set active state in Redis
    const bookingState: ActiveBookingState = {
      bookingId: booking._id.toString(),
      userId,
      status: BookingStatus.PENDING,
      vehicleType: dto.vehicleType,
      pickupLat: dto.pickupLocation.latitude,
      pickupLng: dto.pickupLocation.longitude,
      dropLat: dto.dropLocation.latitude,
      dropLng: dto.dropLocation.longitude,
      estimatedFare: fareEstimate.totalFare,
      otp,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.bookingStateService.setBookingState(bookingState);
    await this.bookingStateService.setUserCurrentBooking(userId, booking._id.toString());
    await this.bookingStateService.addToPendingQueue(
      booking._id.toString(),
      dto.pickupLocation.latitude,
      dto.pickupLocation.longitude,
    );

    // Emit domain event via Kafka
    await this.eventService.emitBookingEvent<BookingCreatedPayload>(
      DomainEvents.BOOKING_CREATED,
      {
        bookingId: booking._id.toString(),
        userId,
        pickupLocation: {
          lat: dto.pickupLocation.latitude,
          lng: dto.pickupLocation.longitude,
          address: dto.pickupLocation.address,
        },
        dropLocation: {
          lat: dto.dropLocation.latitude,
          lng: dto.dropLocation.longitude,
          address: dto.dropLocation.address,
        },
        vehicleType: dto.vehicleType,
        estimatedFare: fareEstimate.totalFare,
      },
      booking._id.toString(),
    );

    this.logger.log(`Booking created: ${booking._id} by user ${userId}`);

    return this.toBookingResponse(booking, otp);
  }

  // ============ Driver Actions ============

  async acceptBooking(driverId: string, bookingId: string): Promise<BookingResponseDto> {
    // Acquire distributed lock
    const lockAcquired = await this.bookingStateService.acquireBookingLock(bookingId);
    if (!lockAcquired) {
      throw new ConflictException('Booking is being processed by another driver');
    }

    try {
      // Check if driver already has an active booking
      const driverHasBooking = await this.bookingStateService.driverHasActiveBooking(driverId);
      if (driverHasBooking) {
        throw new ConflictException('You already have an active booking');
      }

      // Get booking state
      const state = await this.bookingStateService.getBookingState(bookingId);
      if (!state) {
        throw new NotFoundException('Booking not found');
      }

      if (state.status !== BookingStatus.PENDING) {
        throw new BadRequestException('Booking is no longer available');
      }

      // Update MongoDB
      const booking = await this.bookingModel.findByIdAndUpdate(
        bookingId,
        {
          driverId: new Types.ObjectId(driverId),
          status: BookingStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        { new: true },
      ).exec();

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Update Redis state
      await this.bookingStateService.updateBookingState(bookingId, {
        driverId,
        status: BookingStatus.ACCEPTED,
      });

      // Set driver's current booking
      await this.bookingStateService.setDriverCurrentBooking(driverId, bookingId);

      // Remove from pending queue
      await this.bookingStateService.removeFromPendingQueue(bookingId);

      // Emit domain event via Kafka
      await this.eventService.emitBookingEvent<BookingAcceptedPayload>(
        DomainEvents.BOOKING_ACCEPTED,
        {
          bookingId,
          driverId,
          userId: state.userId,
          estimatedArrival: 5, // TODO: Calculate actual ETA
        },
        bookingId,
      );

      this.logger.log(`Booking ${bookingId} accepted by driver ${driverId}`);

      return this.toBookingResponse(booking);
    } finally {
      // Release lock
      await this.bookingStateService.releaseBookingLock(bookingId);
    }
  }

  async rejectBooking(driverId: string, bookingId: string, reason?: string): Promise<void> {
    const booking = await this.bookingModel.findByIdAndUpdate(
      bookingId,
      {
        $addToSet: { rejectedDrivers: new Types.ObjectId(driverId) },
      },
      { new: true },
    ).exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.eventService.emitBookingEvent(
      DomainEvents.BOOKING_REJECTED,
      { bookingId, driverId, reason },
      bookingId,
    );

    this.logger.log(`Booking ${bookingId} rejected by driver ${driverId}`);
  }

  async driverArrived(driverId: string, bookingId: string): Promise<BookingResponseDto> {
    const state = await this.bookingStateService.getBookingState(bookingId);
    if (!state || state.driverId !== driverId) {
      throw new BadRequestException('Invalid booking');
    }

    if (state.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException('Invalid booking state');
    }

    const booking = await this.bookingModel.findByIdAndUpdate(
      bookingId,
      {
        status: BookingStatus.DRIVER_ARRIVED,
        arrivedAt: new Date(),
      },
      { new: true },
    ).exec();

    await this.bookingStateService.updateBookingState(bookingId, {
      status: BookingStatus.DRIVER_ARRIVED,
    });

    this.logger.log(`Driver ${driverId} arrived for booking ${bookingId}`);

    return this.toBookingResponse(booking!);
  }

  async startRide(driverId: string, bookingId: string, otp: string): Promise<BookingResponseDto> {
    const state = await this.bookingStateService.getBookingState(bookingId);
    if (!state || state.driverId !== driverId) {
      throw new BadRequestException('Invalid booking');
    }

    if (state.status !== BookingStatus.DRIVER_ARRIVED) {
      throw new BadRequestException('Driver must arrive first');
    }

    // Verify OTP
    if (state.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const booking = await this.bookingModel.findByIdAndUpdate(
      bookingId,
      {
        status: BookingStatus.RIDE_STARTED,
        startedAt: new Date(),
      },
      { new: true },
    ).exec();

    await this.bookingStateService.updateBookingState(bookingId, {
      status: BookingStatus.RIDE_STARTED,
    });

    await this.eventService.emitBookingEvent(
      DomainEvents.BOOKING_STARTED,
      { bookingId, driverId, userId: state.userId },
      bookingId,
    );

    this.logger.log(`Ride started for booking ${bookingId}`);

    return this.toBookingResponse(booking!);
  }

  async completeRide(
    driverId: string,
    bookingId: string,
    actualDistance?: number,
    actualDuration?: number,
  ): Promise<BookingResponseDto> {
    const state = await this.bookingStateService.getBookingState(bookingId);
    if (!state || state.driverId !== driverId) {
      throw new BadRequestException('Invalid booking');
    }

    if (state.status !== BookingStatus.RIDE_STARTED) {
      throw new BadRequestException('Ride must be started first');
    }

    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Calculate final fare
    const finalFare = this.fareService.calculateFinalFare(
      booking.vehicleType,
      actualDistance || booking.estimatedDistance,
      actualDuration || booking.estimatedDuration,
      booking.fareBreakdown?.surgeMultiplier || 1,
      booking.fareBreakdown?.discount || 0,
    );

    const updatedBooking = await this.bookingModel.findByIdAndUpdate(
      bookingId,
      {
        status: BookingStatus.RIDE_COMPLETED,
        completedAt: new Date(),
        actualDistance: actualDistance || booking.estimatedDistance,
        actualDuration: actualDuration || booking.estimatedDuration,
        actualFare: finalFare.totalFare,
      },
      { new: true },
    ).exec();

    // Clean up Redis state
    await this.bookingStateService.removeBookingState(bookingId);
    await this.bookingStateService.clearUserCurrentBooking(state.userId);
    await this.bookingStateService.clearDriverCurrentBooking(driverId);

    // Emit domain event via Kafka
    await this.eventService.emitBookingEvent<BookingCompletedPayload>(
      DomainEvents.BOOKING_COMPLETED,
      {
        bookingId,
        driverId,
        userId: state.userId,
        finalFare: finalFare.totalFare,
        distance: actualDistance || booking.estimatedDistance,
        duration: actualDuration || booking.estimatedDuration,
      },
      bookingId,
    );

    this.logger.log(`Ride completed for booking ${bookingId}`);

    return this.toBookingResponse(updatedBooking!);
  }

  // ============ Cancellation ============

  async cancelBooking(
    cancelledBy: string,
    bookingId: string,
    reason: string,
    cancellerType: 'user' | 'driver',
  ): Promise<void> {
    const state = await this.bookingStateService.getBookingState(bookingId);
    if (!state) {
      throw new NotFoundException('Booking not found');
    }

    // Validate canceller
    if (cancellerType === 'user' && state.userId !== cancelledBy) {
      throw new BadRequestException('Not authorized to cancel this booking');
    }
    if (cancellerType === 'driver' && state.driverId !== cancelledBy) {
      throw new BadRequestException('Not authorized to cancel this booking');
    }

    // Check if cancellable
    const cancellableStatuses = [
      BookingStatus.PENDING,
      BookingStatus.ACCEPTED,
      BookingStatus.DRIVER_ARRIVED,
    ];
    if (!cancellableStatuses.includes(state.status)) {
      throw new BadRequestException('Booking cannot be cancelled at this stage');
    }

    await this.bookingModel.findByIdAndUpdate(bookingId, {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: cancellerType,
      cancellationReason: reason,
    }).exec();

    // Clean up Redis
    await this.bookingStateService.removeBookingState(bookingId);
    await this.bookingStateService.removeFromPendingQueue(bookingId);
    await this.bookingStateService.clearUserCurrentBooking(state.userId);
    if (state.driverId) {
      await this.bookingStateService.clearDriverCurrentBooking(state.driverId);
    }

    await this.eventService.emitBookingEvent(
      DomainEvents.BOOKING_CANCELLED,
      {
        bookingId,
        cancelledBy: cancellerType,
        reason,
        userId: state.userId,
        driverId: state.driverId,
      },
      bookingId,
    );

    this.logger.log(`Booking ${bookingId} cancelled by ${cancellerType}`);
  }

  // ============ Queries ============

  async getBookingById(bookingId: string): Promise<BookingDocument | null> {
    return this.bookingModel.findById(bookingId).exec();
  }

  async getUserBookings(
    userId: string,
    limit: number = 20,
    skip: number = 0,
  ): Promise<BookingDocument[]> {
    return this.bookingModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getDriverBookings(
    driverId: string,
    limit: number = 20,
    skip: number = 0,
  ): Promise<BookingDocument[]> {
    return this.bookingModel
      .find({ driverId: new Types.ObjectId(driverId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getCurrentBookingForUser(userId: string): Promise<BookingResponseDto | null> {
    const bookingId = await this.bookingStateService.getUserCurrentBooking(userId);
    if (!bookingId) return null;

    const state = await this.bookingStateService.getBookingState(bookingId);
    if (!state) return null;

    const booking = await this.bookingModel.findById(bookingId).exec();
    return booking ? this.toBookingResponse(booking, state.otp) : null;
  }

  async getCurrentBookingForDriver(driverId: string): Promise<BookingResponseDto | null> {
    const bookingId = await this.bookingStateService.getDriverCurrentBooking(driverId);
    if (!bookingId) return null;

    const state = await this.bookingStateService.getBookingState(bookingId);
    if (!state) return null;

    const booking = await this.bookingModel.findById(bookingId).exec();
    return booking ? this.toBookingResponse(booking) : null;
  }

  async getNearbyPendingBookings(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
  ): Promise<BookingResponseDto[]> {
    const bookingIds = await this.bookingStateService.findNearbyPendingBookings(
      latitude,
      longitude,
      radiusKm,
    );

    const bookings = await this.bookingModel.find({
      _id: { $in: bookingIds.map((id) => new Types.ObjectId(id)) },
      status: BookingStatus.PENDING,
    }).exec();

    return bookings.map((b) => this.toBookingResponse(b));
  }

  // ============ Helpers ============

  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private toBookingResponse(booking: BookingDocument, otp?: string): BookingResponseDto {
    return {
      bookingId: booking._id.toString(),
      status: booking.status,
      pickupLocation: {
        address: booking.pickupLocation.address,
        latitude: booking.pickupLocation.coordinates[1],
        longitude: booking.pickupLocation.coordinates[0],
        landmark: booking.pickupLocation.landmark,
      },
      dropLocation: {
        address: booking.dropLocation.address,
        latitude: booking.dropLocation.coordinates[1],
        longitude: booking.dropLocation.coordinates[0],
        landmark: booking.dropLocation.landmark,
      },
      vehicleType: booking.vehicleType,
      estimatedFare: booking.estimatedFare,
      estimatedDistance: booking.estimatedDistance,
      estimatedDuration: booking.estimatedDuration,
      driverId: booking.driverId?.toString(),
      otp: otp || booking.otp,
    };
  }
}

