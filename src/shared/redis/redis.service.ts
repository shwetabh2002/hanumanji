import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface GeoMember {
  memberId: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  // ============ Basic Operations ============

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  // ============ JSON Operations ============

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, data);
    } else {
      await this.redis.set(key, data);
    }
  }

  // ============ Geo Operations (for driver locations) ============

  /**
   * Add a member to a geo set
   * Used for tracking driver locations
   */
  async geoAdd(key: string, longitude: number, latitude: number, memberId: string): Promise<void> {
    await this.redis.geoadd(key, longitude, latitude, memberId);
  }

  /**
   * Remove a member from a geo set
   */
  async geoRemove(key: string, memberId: string): Promise<void> {
    await this.redis.zrem(key, memberId);
  }

  /**
   * Find members within radius of a point
   * Returns members sorted by distance (nearest first)
   */
  async geoRadius(
    key: string,
    longitude: number,
    latitude: number,
    radiusKm: number,
    limit?: number,
  ): Promise<GeoMember[]> {
    const args: (string | number)[] = [
      key,
      longitude,
      latitude,
      radiusKm,
      'km',
      'WITHCOORD',
      'WITHDIST',
      'ASC',
    ];
    
    if (limit) {
      args.push('COUNT', limit);
    }

    const results = await (this.redis as any).georadius(...args);

    return (results as any[]).map((item) => ({
      memberId: item[0],
      distance: parseFloat(item[1]),
      longitude: parseFloat(item[2][0]),
      latitude: parseFloat(item[2][1]),
    }));
  }

  /**
   * Get position of a member
   */
  async geoPos(key: string, memberId: string): Promise<GeoLocation | null> {
    const result = await this.redis.geopos(key, memberId);
    if (!result || !result[0]) return null;
    
    return {
      longitude: parseFloat(result[0][0] as string),
      latitude: parseFloat(result[0][1] as string),
    };
  }

  /**
   * Get distance between two members
   */
  async geoDist(key: string, member1: string, member2: string): Promise<number | null> {
    const result = await (this.redis as any).geodist(key, member1, member2, 'km');
    return result ? parseFloat(result) : null;
  }

  // ============ Hash Operations ============

  async hget(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.redis.hdel(key, field);
  }

  // ============ Set Operations ============

  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.redis.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    await this.redis.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.redis.sismember(key, member);
    return result === 1;
  }

  // ============ Pub/Sub (for real-time updates) ============

  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message);
  }

  // ============ Distributed Lock ============

  /**
   * Acquire a distributed lock
   * Returns true if lock acquired, false if already locked
   */
  async acquireLock(lockKey: string, ttlSeconds: number = 30): Promise<boolean> {
    const result = await this.redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }

  // ============ Atomic Counter ============

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.redis.decr(key);
  }

  async incrBy(key: string, increment: number): Promise<number> {
    return this.redis.incrby(key, increment);
  }
}

