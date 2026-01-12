import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';

import { RedisService, GeoMember } from '../../shared/redis/redis.service';
import { RedisKeys, RedisTTL } from '../../shared/redis/redis.keys';
import { EventService } from '../../shared/kafka/event.service';
import { DomainEvents, DriverLocationUpdatedPayload } from '../../shared/events/events.constants';
import { DriverService } from './driver.service';
import { DriverStatus } from '../../common/enums';

export interface DriverLocationState {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  vehicleType: string;
  updatedAt: number;
}

@Injectable()
export class DriverLocationService {
  private readonly logger = new Logger(DriverLocationService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly eventService: EventService,
    @Inject(forwardRef(() => DriverService))
    private readonly driverService: DriverService,
  ) {}

  // ============ Location Updates ============

  /**
   * Update driver location in Redis (real-time)
   * Called frequently (every 3-5 seconds when driver is online)
   */
  async updateLocation(
    driverId: string,
    latitude: number,
    longitude: number,
    vehicleType: string,
    heading?: number,
    speed?: number,
  ): Promise<void> {
    // Update geo index for proximity queries
    await this.redis.geoAdd(RedisKeys.DRIVER_LOCATIONS, longitude, latitude, driverId);

    // Store detailed state with TTL
    const state: DriverLocationState = {
      driverId,
      latitude,
      longitude,
      heading,
      speed,
      vehicleType,
      updatedAt: Date.now(),
    };
    await this.redis.setJson(
      RedisKeys.driverState(driverId),
      state,
      RedisTTL.DRIVER_STATE,
    );

    // Emit local event for real-time consumers (WebSocket, etc.)
    // Location updates are high-frequency - use local emit, not Kafka
    this.eventService.emitLocal<DriverLocationUpdatedPayload>(
      DomainEvents.DRIVER_LOCATION_UPDATED,
      { driverId, latitude, longitude, heading, speed },
    );

    this.logger.debug(`Updated location for driver ${driverId}: ${latitude}, ${longitude}`);
  }

  /**
   * Remove driver from location tracking
   * Called when driver goes offline
   */
  async removeLocation(driverId: string): Promise<void> {
    await this.redis.geoRemove(RedisKeys.DRIVER_LOCATIONS, driverId);
    await this.redis.del(RedisKeys.driverState(driverId));
    
    this.logger.debug(`Removed location for driver ${driverId}`);
  }

  // ============ Proximity Queries ============

  /**
   * Find nearby available drivers
   * Primary method for ride matching
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number = 10,
  ): Promise<GeoMember[]> {
    const drivers = await this.redis.geoRadius(
      RedisKeys.DRIVER_LOCATIONS,
      longitude,
      latitude,
      radiusKm,
      limit * 2, // Fetch more to filter
    );

    // Filter by availability (check if driver state exists and is recent)
    const availableDrivers: GeoMember[] = [];
    
    for (const driver of drivers) {
      const state = await this.redis.getJson<DriverLocationState>(
        RedisKeys.driverState(driver.memberId),
      );
      
      // Include if state exists and was updated within last 60 seconds
      if (state && Date.now() - state.updatedAt < 60000) {
        availableDrivers.push(driver);
      }
      
      if (availableDrivers.length >= limit) break;
    }

    return availableDrivers;
  }

  /**
   * Find nearby drivers filtered by vehicle type
   */
  async findNearbyDriversByVehicleType(
    latitude: number,
    longitude: number,
    radiusKm: number,
    vehicleType: string,
    limit: number = 10,
  ): Promise<GeoMember[]> {
    const drivers = await this.redis.geoRadius(
      RedisKeys.DRIVER_LOCATIONS,
      longitude,
      latitude,
      radiusKm,
      limit * 3, // Fetch more to filter by type
    );

    const matchingDrivers: GeoMember[] = [];
    
    for (const driver of drivers) {
      const state = await this.redis.getJson<DriverLocationState>(
        RedisKeys.driverState(driver.memberId),
      );
      
      if (
        state &&
        state.vehicleType === vehicleType &&
        Date.now() - state.updatedAt < 60000
      ) {
        matchingDrivers.push(driver);
      }
      
      if (matchingDrivers.length >= limit) break;
    }

    return matchingDrivers;
  }

  // ============ Driver State ============

  /**
   * Get driver's current location and state
   * Redis-first with graceful degradation if not found
   */
  async getDriverState(driverId: string): Promise<DriverLocationState | null> {
    try {
      // Try Redis first (real-time data)
      const state = await this.redis.getJson<DriverLocationState>(
        RedisKeys.driverState(driverId)
      );

      if (state) {
        return state;
      }

      // If not in Redis, check if driver is online in MongoDB
      this.logger.debug(
        `Driver ${driverId} state not in Redis, checking if driver should be online`
      );

      const driver = await this.driverService.findById(driverId);

      // If driver is online in MongoDB but has no Redis state, log warning
      if (driver && driver.status === DriverStatus.ONLINE) {
        this.logger.warn(
          `Driver ${driverId} is ONLINE in MongoDB but has no location state in Redis - data inconsistency detected`
        );
      }

      // Return null if no state available (expected for offline drivers)
      return null;
    } catch (error) {
      this.logger.error(`Error getting driver state for ${driverId}:`, error);
      return null;
    }
  }

  /**
   * Get driver's current position
   */
  async getDriverPosition(driverId: string): Promise<{ latitude: number; longitude: number } | null> {
    const pos = await this.redis.geoPos(RedisKeys.DRIVER_LOCATIONS, driverId);
    return pos ? { latitude: pos.latitude, longitude: pos.longitude } : null;
  }

  /**
   * Get distance between driver and a point
   */
  async getDistanceToPoint(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<number | null> {
    // Temporarily add point to geo set, calculate distance, then remove
    const tempKey = `temp:${Date.now()}`;
    await this.redis.geoAdd(RedisKeys.DRIVER_LOCATIONS, longitude, latitude, tempKey);
    const distance = await this.redis.geoDist(RedisKeys.DRIVER_LOCATIONS, driverId, tempKey);
    await this.redis.geoRemove(RedisKeys.DRIVER_LOCATIONS, tempKey);
    return distance;
  }

  // ============ Online/Offline Management ============

  /**
   * Mark driver as online (available for rides)
   */
  async markOnline(driverId: string, vehicleType: string): Promise<void> {
    try {
      this.logger.debug(`Marking driver ${driverId} online with vehicle type ${vehicleType}`);

      // Add to ONLINE_DRIVERS set
      this.logger.debug(`Adding to ${RedisKeys.ONLINE_DRIVERS} set...`);
      await this.redis.sadd(RedisKeys.ONLINE_DRIVERS, driverId);
      this.logger.debug(`Successfully added to ${RedisKeys.ONLINE_DRIVERS}`);

      // Add to vehicle-specific available drivers set
      const vehicleKey = RedisKeys.availableDrivers(vehicleType);
      this.logger.debug(`Adding to ${vehicleKey} set...`);
      await this.redis.sadd(vehicleKey, driverId);
      this.logger.debug(`Successfully added to ${vehicleKey}`);

      // Verify the driver was added
      const isInOnlineSet = await this.redis.sismember(RedisKeys.ONLINE_DRIVERS, driverId);
      const isInVehicleSet = await this.redis.sismember(vehicleKey, driverId);

      this.logger.log(`Driver ${driverId} marked online with vehicle type ${vehicleType} - Verified: online=${isInOnlineSet}, vehicle=${isInVehicleSet}`);

      if (!isInOnlineSet || !isInVehicleSet) {
        this.logger.error(`⚠️ Redis verification failed! Driver ${driverId} not found in sets after SADD`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to mark driver ${driverId} online in Redis:`, error);
      throw error;
    }
  }

  /**
   * Mark driver as offline
   */
  async markOffline(driverId: string, vehicleType?: string): Promise<void> {
    try {
      this.logger.debug(`Marking driver ${driverId} offline (vehicleType: ${vehicleType})`);

      // Remove from ONLINE_DRIVERS set
      this.logger.debug(`Removing from ${RedisKeys.ONLINE_DRIVERS} set...`);
      await this.redis.srem(RedisKeys.ONLINE_DRIVERS, driverId);
      this.logger.debug(`Successfully removed from ${RedisKeys.ONLINE_DRIVERS}`);

      if (vehicleType) {
        const vehicleKey = RedisKeys.availableDrivers(vehicleType);
        this.logger.debug(`Removing from ${vehicleKey} set...`);
        await this.redis.srem(vehicleKey, driverId);
        this.logger.debug(`Successfully removed from ${vehicleKey}`);
      }

      // Remove location data
      this.logger.debug(`Removing location data for driver ${driverId}...`);
      await this.removeLocation(driverId);
      this.logger.debug(`Location data removed for driver ${driverId}`);

      // Verify the driver was removed
      const isStillOnline = await this.redis.sismember(RedisKeys.ONLINE_DRIVERS, driverId);

      this.logger.log(`Driver ${driverId} marked offline - Verified: stillOnline=${isStillOnline}`);

      if (isStillOnline) {
        this.logger.error(`⚠️ Redis verification failed! Driver ${driverId} still in ONLINE_DRIVERS after SREM`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to mark driver ${driverId} offline in Redis:`, error);
      throw error;
    }
  }

  /**
   * Check if driver is online
   * Redis-first with MongoDB fallback for resilience
   */
  async isOnline(driverId: string): Promise<boolean> {
    try {
      // First, check Redis (fast, real-time)
      const isOnlineInRedis = await this.redis.sismember(RedisKeys.ONLINE_DRIVERS, driverId);

      // If found in Redis, trust it
      if (isOnlineInRedis) {
        return true;
      }

      // If not in Redis, fallback to MongoDB (source of truth)
      this.logger.debug(`Driver ${driverId} not found in Redis ONLINE_DRIVERS, checking MongoDB`);
      const driver = await this.driverService.findById(driverId);

      if (!driver) {
        this.logger.warn(`Driver ${driverId} not found in database`);
        return false;
      }

      const isOnlineInMongo = driver.status === DriverStatus.ONLINE;

      // If MongoDB says online but Redis doesn't have it, sync Redis
      if (isOnlineInMongo) {
        this.logger.warn(
          `Driver ${driverId} is ONLINE in MongoDB but missing in Redis - syncing Redis`
        );

        // Re-add to Redis (defensive sync)
        const vehicleType = driver.vehicle?.type || 'BIKE';
        await this.markOnline(driverId, vehicleType);
      }

      return isOnlineInMongo;
    } catch (error) {
      this.logger.error(`Error checking online status for driver ${driverId}:`, error);

      // On error, fallback to MongoDB only
      try {
        const driver = await this.driverService.findById(driverId);
        return driver?.status === DriverStatus.ONLINE || false;
      } catch (dbError) {
        this.logger.error(`MongoDB fallback failed for driver ${driverId}:`, dbError);
        return false;
      }
    }
  }

  /**
   * Get count of online drivers
   * Redis-first with MongoDB fallback
   */
  async getOnlineDriverCount(): Promise<number> {
    try {
      // Try Redis first (fast)
      const drivers = await this.redis.smembers(RedisKeys.ONLINE_DRIVERS);

      if (drivers && drivers.length > 0) {
        return drivers.length;
      }

      // If Redis is empty, fallback to MongoDB count
      this.logger.debug('Redis ONLINE_DRIVERS set is empty, falling back to MongoDB');
      const count = await this.driverService.countOnlineDrivers();

      if (count > 0) {
        this.logger.warn(
          `Found ${count} online drivers in MongoDB but 0 in Redis - data inconsistency`
        );
      }

      return count;
    } catch (error) {
      this.logger.error('Error getting online driver count from Redis:', error);

      // Fallback to MongoDB on error
      try {
        const count = await this.driverService.countOnlineDrivers();
        this.logger.warn(`Using MongoDB fallback for online count: ${count}`);
        return count;
      } catch (dbError) {
        this.logger.error('MongoDB fallback failed for online count:', dbError);
        return 0;
      }
    }
  }
}

