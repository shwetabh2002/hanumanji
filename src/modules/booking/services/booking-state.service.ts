import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../shared/redis/redis.service';
import { RedisKeys, RedisTTL } from '../../../shared/redis/redis.keys';
import { BookingStatus, VehicleType } from '../../../common/enums';

export interface ActiveBookingState {
  bookingId: string;
  userId: string;
  driverId?: string;
  status: BookingStatus;
  vehicleType: VehicleType;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  estimatedFare: number;
  otp?: string;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class BookingStateService {
  private readonly logger = new Logger(BookingStateService.name);

  constructor(private readonly redis: RedisService) {}

  // ============ Booking State Management ============

  /**
   * Store active booking state in Redis
   */
  async setBookingState(state: ActiveBookingState): Promise<void> {
    await this.redis.setJson(
      RedisKeys.bookingState(state.bookingId),
      { ...state, updatedAt: Date.now() },
      RedisTTL.BOOKING_STATE,
    );

    // Add to active bookings set
    await this.redis.sadd(RedisKeys.ACTIVE_BOOKINGS, state.bookingId);

    this.logger.debug(`Set booking state: ${state.bookingId} -> ${state.status}`);
  }

  /**
   * Get active booking state from Redis
   */
  async getBookingState(bookingId: string): Promise<ActiveBookingState | null> {
    return this.redis.getJson<ActiveBookingState>(RedisKeys.bookingState(bookingId));
  }

  /**
   * Update booking state
   */
  async updateBookingState(
    bookingId: string,
    updates: Partial<ActiveBookingState>,
  ): Promise<ActiveBookingState | null> {
    const current = await this.getBookingState(bookingId);
    if (!current) return null;

    const updated: ActiveBookingState = {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    };

    await this.redis.setJson(
      RedisKeys.bookingState(bookingId),
      updated,
      RedisTTL.BOOKING_STATE,
    );

    return updated;
  }

  /**
   * Remove booking from active state (after completion/cancellation)
   */
  async removeBookingState(bookingId: string): Promise<void> {
    await this.redis.del(RedisKeys.bookingState(bookingId));
    await this.redis.srem(RedisKeys.ACTIVE_BOOKINGS, bookingId);
    
    this.logger.debug(`Removed booking state: ${bookingId}`);
  }

  // ============ Distributed Locking ============

  /**
   * Acquire lock for booking acceptance
   * Prevents multiple drivers from accepting same booking
   */
  async acquireBookingLock(bookingId: string): Promise<boolean> {
    return this.redis.acquireLock(RedisKeys.bookingLock(bookingId), RedisTTL.LOCK);
  }

  /**
   * Release booking lock
   */
  async releaseBookingLock(bookingId: string): Promise<void> {
    await this.redis.releaseLock(RedisKeys.bookingLock(bookingId));
  }

  // ============ User/Driver Active Booking ============

  /**
   * Set user's current booking
   */
  async setUserCurrentBooking(userId: string, bookingId: string): Promise<void> {
    await this.redis.set(`user:${userId}:booking`, bookingId, RedisTTL.BOOKING_STATE);
  }

  /**
   * Get user's current booking
   */
  async getUserCurrentBooking(userId: string): Promise<string | null> {
    return this.redis.get(`user:${userId}:booking`);
  }

  /**
   * Clear user's current booking
   */
  async clearUserCurrentBooking(userId: string): Promise<void> {
    await this.redis.del(`user:${userId}:booking`);
  }

  /**
   * Set driver's current booking
   */
  async setDriverCurrentBooking(driverId: string, bookingId: string): Promise<void> {
    await this.redis.set(RedisKeys.driverBooking(driverId), bookingId, RedisTTL.BOOKING_STATE);
  }

  /**
   * Get driver's current booking
   */
  async getDriverCurrentBooking(driverId: string): Promise<string | null> {
    return this.redis.get(RedisKeys.driverBooking(driverId));
  }

  /**
   * Clear driver's current booking
   */
  async clearDriverCurrentBooking(driverId: string): Promise<void> {
    await this.redis.del(RedisKeys.driverBooking(driverId));
  }

  // ============ Pending Bookings by Area ============

  /**
   * Add booking to pending queue for drivers to find
   * Uses geo for location-based queries
   */
  async addToPendingQueue(
    bookingId: string,
    pickupLat: number,
    pickupLng: number,
  ): Promise<void> {
    await this.redis.geoAdd(
      'booking:pending:geo',
      pickupLng,
      pickupLat,
      bookingId,
    );
  }

  /**
   * Remove booking from pending queue
   */
  async removeFromPendingQueue(bookingId: string): Promise<void> {
    await this.redis.geoRemove('booking:pending:geo', bookingId);
  }

  /**
   * Find pending bookings near a driver
   */
  async findNearbyPendingBookings(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 10,
  ): Promise<string[]> {
    const results = await this.redis.geoRadius(
      'booking:pending:geo',
      longitude,
      latitude,
      radiusKm,
      limit,
    );

    return results.map((r) => r.memberId);
  }

  // ============ Stats ============

  /**
   * Get count of active bookings
   */
  async getActiveBookingCount(): Promise<number> {
    const bookings = await this.redis.smembers(RedisKeys.ACTIVE_BOOKINGS);
    return bookings.length;
  }

  /**
   * Check if user has an active booking
   */
  async userHasActiveBooking(userId: string): Promise<boolean> {
    const bookingId = await this.getUserCurrentBooking(userId);
    if (!bookingId) return false;

    const state = await this.getBookingState(bookingId);
    if (!state) return false;

    // Check if booking is in an active state
    const activeStatuses = [
      BookingStatus.PENDING,
      BookingStatus.ACCEPTED,
      BookingStatus.DRIVER_ARRIVED,
      BookingStatus.RIDE_STARTED,
    ];

    return activeStatuses.includes(state.status);
  }

  /**
   * Check if driver has an active booking
   */
  async driverHasActiveBooking(driverId: string): Promise<boolean> {
    const bookingId = await this.getDriverCurrentBooking(driverId);
    return !!bookingId;
  }
}

