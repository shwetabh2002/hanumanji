import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisLocationService } from '../../location/redis-location.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Captain Matching Service
 *
 * Finds and matches the nearest available captain to a ride request
 * Strategy:
 * 1. Find captains within 5km using Redis GEORADIUS
 * 2. Filter out busy captains
 * 3. Sort by distance (nearest first)
 * 4. Send request to nearest captain via WebSocket
 * 5. Wait 30 seconds for acceptance
 * 6. If timeout or reject, try next captain
 * 7. Max 3 attempts
 */

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
  distance: number;
  estimatedDuration: number;
  otp?: string;
  createdAt: Date;
}

@Injectable()
export class CaptainMatchingService {

  private readonly SEARCH_RADIUS_KM = 5;
  private readonly ACCEPTANCE_TIMEOUT_MS = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    @InjectModel('Booking') private readonly bookingModel: Model<Booking>,
    @InjectModel('Driver') private readonly driverModel: Model<any>,
    private readonly locationService: RedisLocationService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Find and match nearest captain to a booking
   */
  async matchCaptain(bookingId: string): Promise<{
    matched: boolean;
    captain?: any;
    message: string;
    messageHi: string;
  }> {

    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Find nearby captains
    const nearbyCaptains = await this.locationService.findNearbyCaptains(
      booking.pickup.coordinates.lat,
      booking.pickup.coordinates.lng,
      this.SEARCH_RADIUS_KM,
      20 // Top 20 nearest
    );

    if (nearbyCaptains.length === 0) {
      return {
        matched: false,
        message: 'No captains available nearby. Please try again in a few minutes.',
        messageHi: 'आस-पास कोई captain available नहीं है। कुछ मिनट में फिर try करें।'
      };
    }

    // Filter out busy captains
    const availableCaptains = [];
    for (const captain of nearbyCaptains) {
      const isBusy = await this.locationService.isCaptainBusy(captain.driverId);
      if (!isBusy) {
        availableCaptains.push(captain);
      }
    }

    if (availableCaptains.length === 0) {
      return {
        matched: false,
        message: 'All nearby captains are busy. Please wait...',
        messageHi: 'सभी nearby captains busy हैं। Please wait...'
      };
    }

    // Try matching with captains (up to MAX_RETRY_ATTEMPTS)
    for (let attempt = 0; attempt < Math.min(this.MAX_RETRY_ATTEMPTS, availableCaptains.length); attempt++) {
      const captain = availableCaptains[attempt];

      // Get captain details from database
      const driverDetails = await this.driverModel.findById(captain.driverId);

      if (!driverDetails) continue;

      // Send ride request to captain via WebSocket/Event
      this.eventEmitter.emit('ride.request.send', {
        bookingId,
        driverId: captain.driverId,
        rideDetails: {
          bookingId,
          pickup: booking.pickup,
          drop: booking.drop,
          fare: booking.fare,
          distance: booking.distance,
          estimatedDuration: booking.estimatedDuration,
          distanceToPickup: captain.distance,
          earnings: booking.fare // 100% in Phase 1
        }
      });

      // Wait for acceptance
      const accepted = await this.waitForAcceptance(bookingId, this.ACCEPTANCE_TIMEOUT_MS);

      if (accepted) {
        // Match successful!
        booking.driverId = captain.driverId;
        booking.status = 'MATCHED';
        await booking.save();

        // Mark captain as busy
        await this.locationService.markCaptainBusy(captain.driverId);

        return {
          matched: true,
          captain: {
            id: captain.driverId,
            name: `${driverDetails.firstName} ${driverDetails.lastName}`,
            phone: driverDetails.phoneNumber,
            vehicleNumber: driverDetails.vehicleNumber,
            vehicleModel: driverDetails.vehicleModel,
            currentLocation: {
              lat: captain.latitude,
              lng: captain.longitude
            },
            distanceToPickup: captain.distance,
            eta: Math.ceil(captain.distance * 2.4) // 2.4 min per km
          },
          message: 'Captain matched successfully!',
          messageHi: 'Captain mil gaya!'
        };
      }

      // Captain didn't accept, try next one
      console.log(`Captain ${captain.driverId} timeout/rejected, trying next...`);
    }

    // No captain accepted
    return {
      matched: false,
      message: 'No captain accepted your ride. Please try again.',
      messageHi: 'किसी captain ने ride accept नहीं किया। फिर से try करें।'
    };
  }

  /**
   * Wait for captain to accept ride
   * Returns true if accepted, false if timeout/rejected
   */
  private async waitForAcceptance(bookingId: string, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;

      // Set timeout
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false); // Timeout
        }
      }, timeoutMs);

      // Listen for acceptance event
      const acceptHandler = (data: { bookingId: string; accepted: boolean }) => {
        if (data.bookingId === bookingId && !resolved) {
          resolved = true;
          clearTimeout(timer);
          this.eventEmitter.off('ride.request.response', acceptHandler);
          resolve(data.accepted);
        }
      };

      this.eventEmitter.on('ride.request.response', acceptHandler);
    });
  }

  /**
   * Captain accepts ride (called from controller)
   */
  async acceptRide(bookingId: string, driverId: string) {
    // Emit acceptance event
    this.eventEmitter.emit('ride.request.response', {
      bookingId,
      driverId,
      accepted: true
    });
  }

  /**
   * Captain rejects ride (called from controller)
   */
  async rejectRide(bookingId: string, driverId: string) {
    // Emit rejection event
    this.eventEmitter.emit('ride.request.response', {
      bookingId,
      driverId,
      accepted: false
    });
  }
}
