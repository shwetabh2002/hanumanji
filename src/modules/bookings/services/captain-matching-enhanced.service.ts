import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, Types } from 'mongoose';
import { RedisLocationService } from '../../location/redis-location.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Booking } from '../../database/schemas/booking.schema';
import { Driver } from '../../database/schemas/driver.schema';

/**
 * Enhanced Captain Matching Service - Rapido-like Algorithm
 *
 * Features:
 * - Multi-factor captain scoring (distance + rating + acceptance rate)
 * - Simultaneous broadcast to top N captains (first-come-first-served)
 * - Smart retry with performance-based filtering
 * - Fair distribution algorithm (prevent same captain always winning)
 * - Historical performance tracking
 * - Dynamic timeout based on distance
 */

interface CaptainScore {
  driverId: string;
  distance: number; // km to pickup
  rating: number; // 1-5
  acceptanceRate: number; // 0-100%
  totalRides: number;
  lastRideTime?: Date;
  score: number; // Computed score
  latitude: number;
  longitude: number;
}

interface MatchingStrategy {
  type: 'sequential' | 'broadcast' | 'hybrid';
  simultaneousBroadcast: number; // How many captains to notify at once
  acceptanceTimeout: number; // ms
  maxRetries: number;
}

@Injectable()
export class CaptainMatchingEnhancedService {

  // Configuration
  private readonly SEARCH_RADIUS_KM = 5;
  private readonly BASE_TIMEOUT_MS = 30000; // 30 seconds base
  private readonly MIN_TIMEOUT_MS = 15000; // 15 seconds min
  private readonly MAX_TIMEOUT_MS = 45000; // 45 seconds max

  // Matching strategies
  private readonly STRATEGIES = {
    PEAK_HOURS: {
      type: 'broadcast' as const,
      simultaneousBroadcast: 5, // Broadcast to 5 captains simultaneously
      acceptanceTimeout: 20000, // 20 seconds (faster during peak)
      maxRetries: 2
    },
    NORMAL: {
      type: 'hybrid' as const,
      simultaneousBroadcast: 3, // Broadcast to 3 captains
      acceptanceTimeout: 30000, // 30 seconds
      maxRetries: 3
    },
    LOW_DEMAND: {
      type: 'sequential' as const,
      simultaneousBroadcast: 1, // One at a time
      acceptanceTimeout: 45000, // 45 seconds (give more time)
      maxRetries: 5
    }
  };

  // Scoring weights
  private readonly SCORE_WEIGHTS = {
    DISTANCE: 0.5, // 50% weight - Distance is most important
    RATING: 0.25, // 25% weight - Quality matters
    ACCEPTANCE_RATE: 0.15, // 15% weight - Reliability
    RECENT_ACTIVITY: 0.10 // 10% weight - Fairness (recent ride gets lower priority)
  };

  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    @InjectModel(Driver.name) private readonly driverModel: Model<Driver>,
    private readonly locationService: RedisLocationService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Match captain with enhanced algorithm
   */
  async matchCaptain(bookingId: string): Promise<{
    matched: boolean;
    captain?: any;
    message: string;
    messageHi: string;
    attemptedCaptains?: number;
    strategy?: string;
  }> {

    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Determine matching strategy based on demand
    const strategy = await this.determineStrategy();

    // Find and score nearby captains
    const scoredCaptains = await this.findAndScoreCaptains(
      booking.pickup.coordinates.lat,
      booking.pickup.coordinates.lng
    );

    if (scoredCaptains.length === 0) {
      return {
        matched: false,
        message: 'No captains available nearby. Please try again in a few minutes.',
        messageHi: 'आस-पास कोई captain available नहीं है। कुछ मिनट में फिर try करें।',
        strategy: strategy.type
      };
    }

    // Execute matching based on strategy
    let matchResult;

    if (strategy.type === 'broadcast') {
      matchResult = await this.broadcastMatching(
        booking,
        scoredCaptains,
        strategy
      );
    } else if (strategy.type === 'sequential') {
      matchResult = await this.sequentialMatching(
        booking,
        scoredCaptains,
        strategy
      );
    } else {
      // Hybrid: Try broadcast first, then sequential
      matchResult = await this.hybridMatching(
        booking,
        scoredCaptains,
        strategy
      );
    }

    return {
      ...matchResult,
      strategy: strategy.type
    };
  }

  /**
   * Find nearby captains and calculate scores
   */
  private async findAndScoreCaptains(
    lat: number,
    lng: number
  ): Promise<CaptainScore[]> {

    // Get nearby captains from Redis
    const nearbyCaptains = await this.locationService.findNearbyCaptains(
      lat,
      lng,
      this.SEARCH_RADIUS_KM,
      30 // Top 30 nearest
    );

    const scoredCaptains: CaptainScore[] = [];

    for (const captain of nearbyCaptains) {
      // Check if busy
      const isBusy = await this.locationService.isCaptainBusy(captain.driverId);
      if (isBusy) continue;

      // Get driver details
      const driver = await this.driverModel.findById(captain.driverId);
      if (!driver) continue;

      // Calculate score
      const score = this.calculateCaptainScore({
        driverId: captain.driverId,
        distance: captain.distance,
        rating: driver.averageRating || 5.0,
        acceptanceRate: 100, // TODO: Add acceptanceRate field to Driver schema in future
        totalRides: driver.totalRides || 0,
        lastRideTime: undefined, // TODO: Add lastRideCompletedAt field to Driver schema in future
        latitude: captain.latitude,
        longitude: captain.longitude,
        score: 0 // Will be calculated
      });

      scoredCaptains.push(score);
    }

    // Sort by score (highest first)
    return scoredCaptains.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate captain score using multiple factors
   * Rapido-like: Distance + Rating + Acceptance Rate + Fair Distribution
   */
  private calculateCaptainScore(captain: CaptainScore): CaptainScore {
    // 1. Distance Score (closer is better, max 5km)
    const distanceScore = Math.max(0, 1 - (captain.distance / this.SEARCH_RADIUS_KM));

    // 2. Rating Score (normalize 1-5 to 0-1)
    const ratingScore = captain.rating / 5;

    // 3. Acceptance Rate Score (normalize 0-100 to 0-1)
    const acceptanceScore = captain.acceptanceRate / 100;

    // 4. Recent Activity Score (fairness - give others a chance)
    let recentActivityScore = 1.0;
    if (captain.lastRideTime) {
      const minutesSinceLastRide = (Date.now() - captain.lastRideTime.getTime()) / (1000 * 60);
      // If last ride was within 10 minutes, reduce score slightly
      if (minutesSinceLastRide < 10) {
        recentActivityScore = 0.7; // 30% penalty for very recent rides
      } else if (minutesSinceLastRide < 30) {
        recentActivityScore = 0.9; // 10% penalty
      }
    }

    // Weighted total score
    const totalScore =
      (distanceScore * this.SCORE_WEIGHTS.DISTANCE) +
      (ratingScore * this.SCORE_WEIGHTS.RATING) +
      (acceptanceScore * this.SCORE_WEIGHTS.ACCEPTANCE_RATE) +
      (recentActivityScore * this.SCORE_WEIGHTS.RECENT_ACTIVITY);

    return {
      ...captain,
      score: totalScore
    };
  }

  /**
   * Broadcast matching: Send to multiple captains simultaneously
   * Rapido's approach during peak hours - first to accept wins
   */
  private async broadcastMatching(
    booking: Booking,
    scoredCaptains: CaptainScore[],
    strategy: MatchingStrategy
  ): Promise<any> {

    const topCaptains = scoredCaptains.slice(0, strategy.simultaneousBroadcast);

    if (topCaptains.length === 0) {
      return {
        matched: false,
        message: 'All nearby captains are busy. Please wait...',
        messageHi: 'सभी nearby captains busy हैं। Please wait...'
      };
    }

    // Broadcast to all top captains
    const broadcastPromises = topCaptains.map(captain =>
      this.sendRideRequest(booking, captain)
    );

    await Promise.all(broadcastPromises);

    // Wait for first acceptance
    const result = await this.waitForFirstAcceptance(
      booking._id.toString(),
      topCaptains.map(c => c.driverId),
      strategy.acceptanceTimeout
    );

    if (result.accepted && result.driverId) {
      // Mark booking as matched
      booking.driverId = new Types.ObjectId(result.driverId) as any;
      booking.status = 'MATCHED';
      await booking.save();

      // Mark captain as busy
      await this.locationService.markCaptainBusy(result.driverId);

      // Cancel requests for other captains
      this.cancelOtherRequests(booking._id.toString(), topCaptains.map(c => c.driverId), result.driverId);

      // Get captain details
      const matchedCaptain = topCaptains.find(c => c.driverId === result.driverId);
      const driverDetails = await this.driverModel.findById(result.driverId);

      return {
        matched: true,
        captain: this.formatCaptainResponse(matchedCaptain!, driverDetails),
        message: 'Captain matched successfully!',
        messageHi: 'Captain mil gaya!',
        attemptedCaptains: topCaptains.length
      };
    }

    // No captain accepted - retry with next batch
    if (strategy.maxRetries > 0) {
      const remainingCaptains = scoredCaptains.slice(strategy.simultaneousBroadcast);
      if (remainingCaptains.length > 0) {
        return this.broadcastMatching(
          booking,
          remainingCaptains,
          { ...strategy, maxRetries: strategy.maxRetries - 1 }
        );
      }
    }

    return {
      matched: false,
      message: 'No captain accepted your ride. Please try again.',
      messageHi: 'किसी captain ने ride accept नहीं किया। फिर से try करें।',
      attemptedCaptains: topCaptains.length
    };
  }

  /**
   * Sequential matching: One captain at a time
   */
  private async sequentialMatching(
    booking: Booking,
    scoredCaptains: CaptainScore[],
    strategy: MatchingStrategy
  ): Promise<any> {

    const maxAttempts = Math.min(strategy.maxRetries, scoredCaptains.length);

    for (let i = 0; i < maxAttempts; i++) {
      const captain = scoredCaptains[i];

      // Send ride request
      await this.sendRideRequest(booking, captain);

      // Wait for acceptance
      const accepted = await this.waitForAcceptance(
        booking._id.toString(),
        captain.driverId,
        strategy.acceptanceTimeout
      );

      if (accepted) {
        // Match successful
        booking.driverId = new Types.ObjectId(captain.driverId) as any;
        booking.status = 'MATCHED';
        await booking.save();

        await this.locationService.markCaptainBusy(captain.driverId);

        const driverDetails = await this.driverModel.findById(captain.driverId);

        return {
          matched: true,
          captain: this.formatCaptainResponse(captain, driverDetails),
          message: 'Captain matched successfully!',
          messageHi: 'Captain mil gaya!',
          attemptedCaptains: i + 1
        };
      }
    }

    return {
      matched: false,
      message: 'No captain accepted your ride. Please try again.',
      messageHi: 'किसी captain ने ride accept नहीं किया। फिर से try करें।',
      attemptedCaptains: maxAttempts
    };
  }

  /**
   * Hybrid matching: Broadcast first, then sequential
   */
  private async hybridMatching(
    booking: Booking,
    scoredCaptains: CaptainScore[],
    strategy: MatchingStrategy
  ): Promise<any> {

    // Try broadcast with top 3
    const broadcastResult = await this.broadcastMatching(
      booking,
      scoredCaptains,
      { ...strategy, maxRetries: 0 } // No retry in broadcast phase
    );

    if (broadcastResult.matched) {
      return broadcastResult;
    }

    // Fall back to sequential with remaining
    const remainingCaptains = scoredCaptains.slice(strategy.simultaneousBroadcast);
    if (remainingCaptains.length > 0) {
      return this.sequentialMatching(
        booking,
        remainingCaptains,
        { ...strategy, simultaneousBroadcast: 1 }
      );
    }

    return broadcastResult;
  }

  /**
   * Determine matching strategy based on current demand
   */
  private async determineStrategy(): Promise<MatchingStrategy> {
    const hour = new Date().getHours();

    // Peak hours: 8-10 AM, 5-8 PM
    const isPeakHour = (hour >= 8 && hour < 10) || (hour >= 17 && hour < 20);

    if (isPeakHour) {
      return this.STRATEGIES.PEAK_HOURS;
    }

    // TODO: Add dynamic demand calculation
    // For now, use normal strategy
    return this.STRATEGIES.NORMAL;
  }

  /**
   * Send ride request to captain via event
   */
  private async sendRideRequest(booking: Booking, captain: CaptainScore): Promise<void> {
    this.eventEmitter.emit('ride.request.send', {
      bookingId: booking._id.toString(),
      driverId: captain.driverId,
      rideDetails: {
        bookingId: booking._id.toString(),
        pickup: booking.pickup,
        drop: booking.drop,
        fare: booking.fare,
        distance: booking.distance,
        estimatedDuration: booking.estimatedDuration,
        distanceToPickup: captain.distance,
        earnings: booking.fare, // 100% in Phase 1
        eta: Math.ceil(captain.distance * 2.4) // 2.4 min per km
      },
      expiresAt: Date.now() + this.BASE_TIMEOUT_MS
    });
  }

  /**
   * Wait for single captain acceptance
   */
  private async waitForAcceptance(
    bookingId: string,
    driverId: string,
    timeoutMs: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, timeoutMs);

      const handler = (data: { bookingId: string; driverId: string; accepted: boolean }) => {
        if (data.bookingId === bookingId && data.driverId === driverId && !resolved) {
          resolved = true;
          clearTimeout(timer);
          this.eventEmitter.off('ride.request.response', handler);
          resolve(data.accepted);
        }
      };

      this.eventEmitter.on('ride.request.response', handler);
    });
  }

  /**
   * Wait for first acceptance from any captain (broadcast mode)
   */
  private async waitForFirstAcceptance(
    bookingId: string,
    driverIds: string[],
    timeoutMs: number
  ): Promise<{ accepted: boolean; driverId?: string }> {
    return new Promise((resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ accepted: false });
        }
      }, timeoutMs);

      const handler = (data: { bookingId: string; driverId: string; accepted: boolean }) => {
        if (data.bookingId === bookingId && driverIds.includes(data.driverId) && data.accepted && !resolved) {
          resolved = true;
          clearTimeout(timer);
          this.eventEmitter.off('ride.request.response', handler);
          resolve({ accepted: true, driverId: data.driverId });
        }
      };

      this.eventEmitter.on('ride.request.response', handler);
    });
  }

  /**
   * Cancel ride requests for captains who didn't win
   */
  private cancelOtherRequests(bookingId: string, allDriverIds: string[], winnerDriverId: string): void {
    const losers = allDriverIds.filter(id => id !== winnerDriverId);

    for (const driverId of losers) {
      this.eventEmitter.emit('ride.request.cancelled', {
        bookingId,
        driverId,
        reason: 'Another captain accepted'
      });
    }
  }

  /**
   * Format captain response
   */
  private formatCaptainResponse(captain: CaptainScore, driverDetails: any): any {
    return {
      id: captain.driverId,
      name: `${driverDetails.firstName} ${driverDetails.lastName}`,
      phone: driverDetails.phoneNumber,
      rating: captain.rating,
      totalRides: captain.totalRides,
      vehicleNumber: driverDetails.vehicle?.vehicleNumber,
      vehicleModel: driverDetails.vehicle?.model,
      currentLocation: {
        lat: captain.latitude,
        lng: captain.longitude
      },
      distanceToPickup: Math.round(captain.distance * 100) / 100,
      eta: Math.ceil(captain.distance * 2.4), // 2.4 min per km
      score: Math.round(captain.score * 100) / 100
    };
  }

  /**
   * Captain accepts ride (called from controller)
   */
  async acceptRide(bookingId: string, driverId: string): Promise<void> {
    this.eventEmitter.emit('ride.request.response', {
      bookingId,
      driverId,
      accepted: true,
      timestamp: new Date()
    });
  }

  /**
   * Captain rejects ride (called from controller)
   */
  async rejectRide(bookingId: string, driverId: string, reason?: string): Promise<void> {
    this.eventEmitter.emit('ride.request.response', {
      bookingId,
      driverId,
      accepted: false,
      reason,
      timestamp: new Date()
    });

    // Track rejection for captain performance metrics
    // TODO: Update driver acceptance rate
  }
}
