import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../shared/redis/redis.service';

/**
 * OTP Storage Service
 * 
 * Primary: Redis (fast, auto-expiry via TTL)
 * Fallback: MongoDB (reliability)
 * 
 * Key format: otp:{userId}:{environment}
 * TTL: 10 minutes
 */
@Injectable()
export class OtpStorageService {
  private readonly logger = new Logger(OtpStorageService.name);
  private readonly OTP_TTL_SECONDS = 10 * 60; // 10 minutes
  private readonly environment: string;

  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.environment = this.configService.get<string>('app.environment', 'development');
  }

  /**
   * Generate Redis key for OTP storage
   */
  private getKey(identifier: string): string {
    // Use phone number or userId as identifier
    return `otp:${identifier}:${this.environment}`;
  }

  /**
   * Store OTP in Redis
   * Returns expiry timestamp for DB fallback storage
   */
  async storeOtp(identifier: string, otp: string): Promise<Date> {
    const key = this.getKey(identifier);
    const expiresAt = new Date(Date.now() + this.OTP_TTL_SECONDS * 1000);

    try {
      // Store OTP with metadata
      const data = JSON.stringify({
        otp,
        createdAt: Date.now(),
        expiresAt: expiresAt.getTime(),
      });

      await this.redis.set(key, data, this.OTP_TTL_SECONDS);
      this.logger.debug(`OTP stored in Redis for ${identifier}`);
    } catch (error) {
      this.logger.warn(`Redis store failed for ${identifier}: ${error.message}`);
      // Fallback handled by caller storing in DB
    }

    return expiresAt;
  }

  /**
   * Verify OTP - checks Redis first, returns result
   * 
   * @returns { valid: boolean, source: 'redis' | 'db' | 'expired' | 'not_found' }
   */
  async verifyOtp(
    identifier: string,
    providedOtp: string,
    dbOtp?: string,
    dbOtpExpiry?: Date,
  ): Promise<{ valid: boolean; source: string }> {
    const key = this.getKey(identifier);

    // Try Redis first
    try {
      const cached = await this.redis.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        
        // Check if expired (shouldn't happen due to TTL, but safety check)
        if (Date.now() > data.expiresAt) {
          await this.redis.del(key);
          return { valid: false, source: 'expired' };
        }

        // Verify OTP
        if (data.otp === providedOtp) {
          await this.redis.del(key); // One-time use
          this.logger.debug(`OTP verified from Redis for ${identifier}`);
          return { valid: true, source: 'redis' };
        }

        return { valid: false, source: 'redis' };
      }
    } catch (error) {
      this.logger.warn(`Redis verify failed for ${identifier}: ${error.message}`);
      // Fall through to DB check
    }

    // Fallback to DB
    if (dbOtp && dbOtpExpiry) {
      if (new Date() > dbOtpExpiry) {
        return { valid: false, source: 'expired' };
      }

      if (dbOtp === providedOtp) {
        this.logger.debug(`OTP verified from DB fallback for ${identifier}`);
        return { valid: true, source: 'db' };
      }

      return { valid: false, source: 'db' };
    }

    return { valid: false, source: 'not_found' };
  }

  /**
   * Delete OTP from Redis (called after successful verification or manual invalidation)
   */
  async deleteOtp(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    
    try {
      await this.redis.del(key);
      this.logger.debug(`OTP deleted from Redis for ${identifier}`);
    } catch (error) {
      this.logger.warn(`Redis delete failed for ${identifier}: ${error.message}`);
    }
  }

  /**
   * Check if OTP exists in Redis (for rate limiting checks)
   */
  async hasActiveOtp(identifier: string): Promise<boolean> {
    const key = this.getKey(identifier);
    
    try {
      return await this.redis.exists(key);
    } catch (error) {
      this.logger.warn(`Redis exists check failed for ${identifier}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get remaining TTL for OTP (useful for telling user when to resend)
   */
  async getRemainingTtl(identifier: string): Promise<number | null> {
    const key = this.getKey(identifier);
    
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        const remaining = Math.floor((data.expiresAt - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
    } catch (error) {
      this.logger.warn(`Redis TTL check failed for ${identifier}: ${error.message}`);
    }
    
    return null;
  }
}

