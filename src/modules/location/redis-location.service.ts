import { Injectable } from '@nestjs/common';
import { RedisService } from '../../shared/redis/redis.service';

/**
 * Redis Location Tracking Service
 *
 * Uses Redis Geospatial commands for ultra-fast captain location tracking
 * GEOADD: Add captain location
 * GEORADIUS: Find captains within radius
 * GEOPOS: Get captain current location
 * ZREM: Remove captain (when offline)
 */

interface CaptainLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

interface NearbyCaptain {
  driverId: string;
  distance: number; // km
  latitude: number;
  longitude: number;
}

@Injectable()
export class RedisLocationService {

  private readonly CAPTAINS_ONLINE_KEY = 'captains:online';
  private readonly CAPTAIN_METADATA_PREFIX = 'captain:meta:';

  constructor(
    private readonly redis: RedisService
  ) {}

  /**
   * Add/Update captain location when online
   * Called every 10 seconds from captain app
   */
  async updateCaptainLocation(location: CaptainLocation): Promise<void> {
    const { driverId, latitude, longitude, heading, speed } = location;

    // Add to geospatial index
    // GEOADD captains:online <longitude> <latitude> <driverId>
    await this.redis.geoAdd(
      this.CAPTAINS_ONLINE_KEY,
      longitude,
      latitude,
      driverId
    );

    // Store metadata (heading, speed, timestamp) separately
    // Using hash for efficient storage
    const metadataKey = `${this.CAPTAIN_METADATA_PREFIX}${driverId}`;
    const metadata = {
      heading: String(heading || 0),
      speed: String(speed || 0),
      timestamp: location.timestamp.toISOString(),
      lat: String(latitude),
      lng: String(longitude)
    };

    // hset requires field-value pairs
    for (const [field, value] of Object.entries(metadata)) {
      await this.redis.hset(metadataKey, field, value);
    }

    // Set TTL on metadata (expire after 30 seconds if no update)
    // This auto-removes stale captains
    await this.redis.expire(metadataKey, 30);
  }

  /**
   * Find captains within radius of coordinates
   * Used for ride matching
   *
   * @param latitude Rider's latitude
   * @param longitude Rider's longitude
   * @param radiusKm Search radius in kilometers (default: 5km)
   * @param limit Max captains to return (default: 10)
   */
  async findNearbyCaptains(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 10
  ): Promise<NearbyCaptain[]> {

    // GEORADIUS captains:online <lng> <lat> <radius> km WITHDIST ASC COUNT <limit>
    const results = await this.redis.geoRadius(
      this.CAPTAINS_ONLINE_KEY,
      longitude,
      latitude,
      radiusKm,
      limit
    );

    if (!results || results.length === 0) {
      return [];
    }

    // RedisService.geoRadius returns GeoMember[]
    const captains: NearbyCaptain[] = results.map(member => ({
      driverId: member.memberId,
      distance: member.distance || 0,
      latitude: member.latitude,
      longitude: member.longitude
    }));

    return captains;
  }

  /**
   * Get captain's current location
   */
  async getCaptainLocation(driverId: string): Promise<{
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    timestamp: string;
  } | null> {

    // Get coordinates from geospatial index
    const position = await this.redis.geoPos(this.CAPTAINS_ONLINE_KEY, driverId);

    if (!position) {
      return null; // Captain is offline
    }

    const { latitude, longitude } = position;

    // Get metadata
    const metadataKey = `${this.CAPTAIN_METADATA_PREFIX}${driverId}`;
    const metadata = await this.redis.hgetall(metadataKey);

    if (!metadata || Object.keys(metadata).length === 0) {
      // Metadata expired, captain likely offline
      // Remove from geospatial index
      await this.removeCaptain(driverId);
      return null;
    }

    return {
      latitude,
      longitude,
      heading: parseInt(metadata.heading) || 0,
      speed: parseInt(metadata.speed) || 0,
      timestamp: metadata.timestamp
    };
  }

  /**
   * Remove captain from online pool
   * Called when captain goes offline
   */
  async removeCaptain(driverId: string): Promise<void> {
    // Remove from geospatial index
    await this.redis.geoRemove(this.CAPTAINS_ONLINE_KEY, driverId);

    // Delete metadata
    const metadataKey = `${this.CAPTAIN_METADATA_PREFIX}${driverId}`;
    await this.redis.del(metadataKey);
  }

  /**
   * Get total count of online captains
   */
  async getOnlineCaptainsCount(): Promise<number> {
    // Workaround: Get all captains in a very large radius
    const SERVICE_AREA_LAT = 28.4744; // Pari Chowk
    const SERVICE_AREA_LNG = 77.4920;
    const captains = await this.redis.geoRadius(
      this.CAPTAINS_ONLINE_KEY,
      SERVICE_AREA_LNG,
      SERVICE_AREA_LAT,
      10, // 10km radius covers entire service area
      1000 // Large limit
    );
    return captains.length;
  }

  /**
   * Get all online captains in service area
   */
  async getAllOnlineCaptains(): Promise<string[]> {
    // Get all captains in service area
    const SERVICE_AREA_LAT = 28.4744;
    const SERVICE_AREA_LNG = 77.4920;
    const captains = await this.redis.geoRadius(
      this.CAPTAINS_ONLINE_KEY,
      SERVICE_AREA_LNG,
      SERVICE_AREA_LAT,
      10, // 10km radius
      1000 // Large limit
    );
    return captains.map(c => c.memberId);
  }

  /**
   * Calculate distance between captain and location
   * Uses Redis GEODIST command
   */
  async getDistanceBetween(
    driverId: string,
    latitude: number,
    longitude: number
  ): Promise<number | null> {

    // First, add temporary location for distance calculation
    const tempKey = `temp:location:${Date.now()}`;
    await this.redis.geoAdd(tempKey, longitude, latitude, 'temp');

    // Calculate distance using geoDist
    const distance = await this.redis.geoDist(
      this.CAPTAINS_ONLINE_KEY,
      driverId,
      'temp'
    );

    // Cleanup temp key
    await this.redis.del(tempKey);

    return distance;
  }

  /**
   * Mark captain as busy (has active ride)
   * Keep in geospatial index for tracking but mark as unavailable for new rides
   */
  async markCaptainBusy(driverId: string): Promise<void> {
    const metadataKey = `${this.CAPTAIN_METADATA_PREFIX}${driverId}`;
    await this.redis.hset(metadataKey, 'busy', '1');
  }

  /**
   * Mark captain as available (ride completed)
   */
  async markCaptainAvailable(driverId: string): Promise<void> {
    const metadataKey = `${this.CAPTAIN_METADATA_PREFIX}${driverId}`;
    await this.redis.hset(metadataKey, 'busy', '0');
  }

  /**
   * Check if captain is busy
   */
  async isCaptainBusy(driverId: string): Promise<boolean> {
    const metadataKey = `${this.CAPTAIN_METADATA_PREFIX}${driverId}`;
    const busy = await this.redis.hget(metadataKey, 'busy');
    return busy === '1';
  }

  /**
   * Get market statistics for area
   * Used to show captain dashboard info (how many captains nearby, etc.)
   */
  async getMarketStats(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<{
    totalCaptainsInArea: number;
    availableCaptains: number;
    busyCaptains: number;
  }> {

    // Find all captains in radius
    const captains = await this.findNearbyCaptains(latitude, longitude, radiusKm, 100);

    let available = 0;
    let busy = 0;

    // Check busy status for each
    for (const captain of captains) {
      const isBusy = await this.isCaptainBusy(captain.driverId);
      if (isBusy) {
        busy++;
      } else {
        available++;
      }
    }

    return {
      totalCaptainsInArea: captains.length,
      availableCaptains: available,
      busyCaptains: busy
    };
  }

  /**
   * Cleanup stale captains
   * Run this periodically (every 1 minute) to remove captains whose metadata expired
   */
  async cleanupStaleCaptains(): Promise<number> {
    const allCaptains = await this.getAllOnlineCaptains();
    let removed = 0;

    for (const driverId of allCaptains) {
      const metadataKey = `${this.CAPTAIN_METADATA_PREFIX}${driverId}`;
      const exists = await this.redis.exists(metadataKey);

      if (!exists) {
        // Metadata expired, remove from geospatial index
        await this.removeCaptain(driverId);
        removed++;
      }
    }

    return removed;
  }
}
