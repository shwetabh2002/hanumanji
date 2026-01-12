import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FareCalculationService } from './fare-calculation.service';
import { GeofenceService } from '../../location/geofence.service';
import { RedisLocationService } from '../../location/redis-location.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Ride Management Service
 *
 * Manages complete ride lifecycle:
 * SEARCHING → MATCHED → ARRIVING → ONGOING → COMPLETED/CANCELLED
 */

interface CreateBookingDto {
  riderId: string;
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  drop: {
    address: string;
    lat: number;
    lng: number;
  };
  fare: number;
  userType?: 'student' | 'regular';
}

interface Booking {
  _id: string;
  riderId: string;
  driverId?: string;
  status: 'SEARCHING' | 'MATCHED' | 'ARRIVING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  pickup: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  drop: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  fare: number;
  captainEarnings: number;
  commission: number;
  distance: number;
  estimatedDuration: number;
  actualDistance?: number;
  actualDuration?: number;
  otp: string;
  userType: 'student' | 'regular';
  createdAt: Date;
  matchedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

@Injectable()
export class RideManagementService {

  constructor(
    @InjectModel('Booking') private readonly bookingModel: Model<Booking>,
    @InjectModel('Driver') private readonly driverModel: Model<any>,
    @InjectModel('User') private readonly userModel: Model<any>,
    private readonly fareService: FareCalculationService,
    private readonly geofenceService: GeofenceService,
    private readonly locationService: RedisLocationService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Create new ride booking
   */
  async createBooking(dto: CreateBookingDto) {
    // Validate locations are in service area
    const validation = this.geofenceService.validateRideLocations(
      { lat: dto.pickup.lat, lng: dto.pickup.lng },
      { lat: dto.drop.lat, lng: dto.drop.lng }
    );

    if (!validation.valid) {
      throw new BadRequestException({
        message: validation.message,
        messageHi: validation.messageHi
      });
    }

    // Calculate distance and time
    const distance = this.geofenceService.calculateDistance(
      dto.pickup.lat,
      dto.pickup.lng,
      dto.drop.lat,
      dto.drop.lng
    );

    const estimatedDuration = this.geofenceService.calculateEstimatedTime(distance);

    // Recalculate fare (verify client didn't tamper)
    const fareBreakdown = this.fareService.calculateFare(
      distance,
      estimatedDuration,
      dto.userType || 'regular'
    );

    // Generate OTP
    const otp = this.generateOTP();

    // Create booking
    const booking = await this.bookingModel.create({
      riderId: dto.riderId,
      status: 'SEARCHING',
      pickup: {
        address: dto.pickup.address,
        coordinates: { lat: dto.pickup.lat, lng: dto.pickup.lng }
      },
      drop: {
        address: dto.drop.address,
        coordinates: { lat: dto.drop.lat, lng: dto.drop.lng }
      },
      fare: fareBreakdown.riderPays,
      captainEarnings: fareBreakdown.captainEarns,
      commission: fareBreakdown.commission,
      distance,
      estimatedDuration,
      otp,
      userType: dto.userType || 'regular',
      createdAt: new Date()
    });

    // Emit event to start captain matching
    this.eventEmitter.emit('booking.created', { bookingId: booking._id });

    return {
      bookingId: booking._id,
      status: 'SEARCHING',
      displayMessage: 'Finding you a captain...',
      displayMessageHi: 'Captain खोज रहे हैं...',
      estimatedMatchTime: 30, // seconds

      ride: {
        pickup: dto.pickup,
        drop: dto.drop,
        fare: fareBreakdown.riderPays,
        distance,
        estimatedTime: estimatedDuration
      }
    };
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string) {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    let captain = null;
    if (booking.driverId) {
      const driver = await this.driverModel.findById(booking.driverId);
      if (driver) {
        const location = await this.locationService.getCaptainLocation(booking.driverId);

        captain = {
          id: driver._id,
          name: `${driver.firstName} ${driver.lastName}`,
          nameHi: `${driver.firstName} ${driver.lastName}`,
          phone: `+91 ${driver.phoneNumber}`,
          rating: 4.8, // TODO: Get from ratings table
          totalRides: 342, // TODO: Get from stats
          vehicleNumber: driver.vehicleNumber,
          vehicleModel: driver.vehicleModel,
          photo: driver.documents?.photo?.url,
          currentLocation: location ? {
            lat: location.latitude,
            lng: location.longitude,
            heading: location.heading,
            speed: location.speed
          } : null
        };
      }
    }

    return {
      bookingId: booking._id,
      status: booking.status,

      captain,

      ride: {
        pickup: {
          address: booking.pickup.address,
          coordinates: booking.pickup.coordinates
        },
        drop: {
          address: booking.drop.address,
          coordinates: booking.drop.coordinates
        },
        fare: booking.fare,
        distance: booking.distance,
        estimatedDuration: booking.estimatedDuration,
        otp: booking.status === 'MATCHED' || booking.status === 'ARRIVING' ? booking.otp : undefined,

        // Timestamps
        bookedAt: booking.createdAt,
        matchedAt: booking.matchedAt,
        startedAt: booking.startedAt,
        completedAt: booking.completedAt
      },

      // Display status
      displayStatus: this.getDisplayStatus(booking.status),
      displayStatusHi: this.getDisplayStatusHi(booking.status),

      // Progress
      progress: this.getProgress(booking.status)
    };
  }

  /**
   * Captain accepts ride
   */
  async acceptRide(bookingId: string, driverId: string) {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'SEARCHING') {
      throw new BadRequestException('Ride already matched or completed');
    }

    // Update booking
    booking.driverId = driverId;
    booking.status = 'MATCHED';
    booking.matchedAt = new Date();
    await booking.save();

    // Mark captain as busy
    await this.locationService.markCaptainBusy(driverId);

    // Get rider details
    const rider = await this.userModel.findById(booking.riderId);

    // Get captain location
    const captainLocation = await this.locationService.getCaptainLocation(driverId);

    // Calculate ETA to pickup
    const distanceToPickup = this.geofenceService.calculateDistance(
      captainLocation.latitude,
      captainLocation.longitude,
      booking.pickup.coordinates.lat,
      booking.pickup.coordinates.lng
    );
    const eta = Math.ceil(distanceToPickup * 2.4); // 2.4 min per km

    // Emit event to notify rider
    this.eventEmitter.emit('ride.matched', {
      bookingId: booking._id,
      riderId: booking.riderId,
      driverId
    });

    return {
      bookingId: booking._id,
      status: 'MATCHED',

      // Rider details
      rider: {
        name: rider ? `${rider.firstName} ${rider.lastName}` : 'Rider',
        phone: rider ? `+91 ${rider.phoneNumber}` : '',
        rating: 4.7 // TODO: Get from ratings
      },

      // Pickup details
      pickup: {
        address: booking.pickup.address,
        location: booking.pickup.coordinates,
        eta,
        distance: distanceToPickup,
        navigationUrl: `https://maps.google.com/?daddr=${booking.pickup.coordinates.lat},${booking.pickup.coordinates.lng}`
      },

      // Drop details
      drop: {
        address: booking.drop.address,
        location: booking.drop.coordinates
      },

      // Ride details
      ride: {
        distance: booking.distance,
        estimatedDuration: booking.estimatedDuration,
        estimatedEarnings: booking.captainEarnings,
        otp: booking.otp
      },

      displayMessage: `Navigate to pickup. Call ${rider?.firstName || 'rider'} when you reach.`,
      displayMessageHi: `Pickup पर जाएं। पहुंचने पर ${rider?.firstName || 'rider'} को call करें।`
    };
  }

  /**
   * Start ride (verify OTP)
   */
  async startRide(bookingId: string, otp: string, startLocation: { lat: number; lng: number }) {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.otp !== otp) {
      throw new BadRequestException({
        message: 'Invalid OTP',
        messageHi: 'गलत OTP'
      });
    }

    // Update booking
    booking.status = 'ONGOING';
    booking.startedAt = new Date();
    await booking.save();

    // Emit event
    this.eventEmitter.emit('ride.started', {
      bookingId: booking._id,
      riderId: booking.riderId,
      driverId: booking.driverId
    });

    return {
      status: 'ONGOING',
      startedAt: booking.startedAt,

      drop: {
        address: booking.drop.address,
        location: booking.drop.coordinates,
        navigationUrl: `https://maps.google.com/?daddr=${booking.drop.coordinates.lat},${booking.drop.coordinates.lng}`
      },

      expectedDistance: booking.distance,
      expectedEarnings: booking.captainEarnings,
      estimatedCompletionTime: new Date(Date.now() + booking.estimatedDuration * 60 * 1000),

      displayMessage: 'Ride started! Navigate to drop location.',
      displayMessageHi: 'Ride शुरू हो गई! Drop location पर जाएं।'
    };
  }

  /**
   * Complete ride
   */
  async completeRide(
    bookingId: string,
    endLocation: { lat: number; lng: number },
    actualDistance: number
  ) {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Calculate actual duration
    const actualDuration = Math.round((new Date().getTime() - booking.startedAt.getTime()) / 60000);

    // Recalculate final fare based on actual distance
    const finalFareCalc = this.fareService.recalculateFinalFare(
      booking.fare,
      booking.distance,
      actualDistance,
      booking.estimatedDuration,
      actualDuration,
      booking.userType
    );

    // Update booking
    booking.status = 'COMPLETED';
    booking.completedAt = new Date();
    booking.actualDistance = actualDistance;
    booking.actualDuration = actualDuration;
    booking.fare = finalFareCalc.finalFare; // Use recalculated fare
    await booking.save();

    // Mark captain as available
    await this.locationService.markCaptainAvailable(booking.driverId);

    // TODO: Update captain earnings in database
    // TODO: Update rider payment status

    // Emit event
    this.eventEmitter.emit('ride.completed', {
      bookingId: booking._id,
      riderId: booking.riderId,
      driverId: booking.driverId
    });

    return {
      status: 'COMPLETED',
      completedAt: booking.completedAt,

      trip: {
        estimatedDistance: booking.distance,
        actualDistance,
        duration: actualDuration,
        estimatedFare: booking.fare,
        finalFare: finalFareCalc.finalFare,
        adjustment: finalFareCalc.adjustment,
        youEarned: finalFareCalc.finalFare, // 100% in Phase 1
        commission: 0,
        payment: 'CASH'
      },

      displayMessage: `Ride completed! You earned ₹${finalFareCalc.finalFare}. Collect cash from rider.`,
      displayMessageHi: `Ride पूरी हो गई! आपने ₹${finalFareCalc.finalFare} कमाए। Rider से cash collect करें।`,

      promptRating: true
    };
  }

  /**
   * Cancel ride
   */
  async cancelRide(bookingId: string, cancelledBy: 'rider' | 'driver', reason?: string) {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date();
    await booking.save();

    // If driver was assigned, mark as available
    if (booking.driverId) {
      await this.locationService.markCaptainAvailable(booking.driverId);
    }

    // Emit event
    this.eventEmitter.emit('ride.cancelled', {
      bookingId: booking._id,
      riderId: booking.riderId,
      driverId: booking.driverId,
      cancelledBy,
      reason
    });

    return {
      status: 'CANCELLED',
      cancelledBy,
      reason,
      message: `Ride cancelled by ${cancelledBy}`,
      messageHi: `Ride ${cancelledBy === 'rider' ? 'rider' : 'driver'} ने cancel की`
    };
  }

  /**
   * Generate 4-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Get display status text
   */
  private getDisplayStatus(status: string): string {
    const statusMap = {
      'SEARCHING': 'Finding captain...',
      'MATCHED': 'Captain matched',
      'ARRIVING': 'Captain is coming',
      'ONGOING': 'On the way',
      'COMPLETED': 'Ride completed',
      'CANCELLED': 'Ride cancelled'
    };
    return statusMap[status] || status;
  }

  private getDisplayStatusHi(status: string): string {
    const statusMap = {
      'SEARCHING': 'Captain खोज रहे हैं...',
      'MATCHED': 'Captain मिल गया',
      'ARRIVING': 'Captain आ रहा है',
      'ONGOING': 'रास्ते में',
      'COMPLETED': 'Ride पूरी हो गई',
      'CANCELLED': 'Ride cancel हो गई'
    };
    return statusMap[status] || status;
  }

  private getProgress(status: string): { step: number; percentage: number } {
    const progressMap = {
      'SEARCHING': { step: 1, percentage: 25 },
      'MATCHED': { step: 2, percentage: 50 },
      'ARRIVING': { step: 2, percentage: 50 },
      'ONGOING': { step: 3, percentage: 75 },
      'COMPLETED': { step: 4, percentage: 100 },
      'CANCELLED': { step: 0, percentage: 0 }
    };
    return progressMap[status] || { step: 0, percentage: 0 };
  }

  /**
   * Get current active booking for a user
   * Returns the most recent booking that is not COMPLETED or CANCELLED
   */
  async getCurrentBooking(userId: string) {
    const activeStatuses = ['SEARCHING', 'MATCHED', 'ARRIVING', 'ONGOING'];

    const booking = await this.bookingModel
      .findOne({
        riderId: userId,
        status: { $in: activeStatuses }
      })
      .sort({ createdAt: -1 })
      .limit(1);

    if (!booking) {
      return null;
    }

    // Return full booking details using existing getBooking method
    return this.getBooking(booking._id.toString());
  }

  /**
   * Get booking history for a user
   * Returns paginated list of completed or cancelled bookings
   */
  async getBookingHistory(userId: string, limit: number = 10, skip: number = 0) {
    const completedStatuses = ['COMPLETED', 'CANCELLED'];

    // Get total count
    const total = await this.bookingModel.countDocuments({
      riderId: userId,
      status: { $in: completedStatuses }
    });

    // Get bookings
    const bookings = await this.bookingModel
      .find({
        riderId: userId,
        status: { $in: completedStatuses }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format bookings for mobile app
    const formattedBookings = await Promise.all(
      bookings.map(async (booking: any) => {
        let captain = null;

        if (booking.driverId) {
          const driver = await this.driverModel.findById(booking.driverId);
          if (driver) {
            captain = {
              id: driver._id,
              name: `${driver.firstName} ${driver.lastName}`,
              phone: `+91 ${driver.phoneNumber}`,
              vehicleNumber: driver.vehicleNumber,
              vehicleModel: driver.vehicleModel,
              photo: driver.documents?.photo?.url
            };
          }
        }

        return {
          bookingId: booking._id,
          status: booking.status,
          pickup: {
            address: booking.pickup.address,
            coordinates: booking.pickup.coordinates
          },
          drop: {
            address: booking.drop.address,
            coordinates: booking.drop.coordinates
          },
          fare: booking.fare,
          distance: booking.actualDistance || booking.distance,
          duration: booking.actualDuration || booking.estimatedDuration,
          captain,
          createdAt: booking.createdAt,
          completedAt: booking.completedAt || booking.cancelledAt,
          displayStatus: this.getDisplayStatus(booking.status),
          displayStatusHi: this.getDisplayStatusHi(booking.status)
        };
      })
    );

    return {
      bookings: formattedBookings,
      total
    };
  }
}
