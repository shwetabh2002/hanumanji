import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpStorageService } from './otp-storage.service';

export interface OtpUserData {
  phoneNumber: string;
  otp?: string;
  otpExpiry?: Date;
}

export interface OtpVerifyResult {
  valid: boolean;
  source: 'redis' | 'db' | 'expired' | 'not_found';
  message: string;
}

/**
 * OTP Service
 * 
 * Handles OTP generation, storage (Redis + DB fallback), verification, and SMS delivery.
 * 
 * Flow:
 * 1. Generate OTP → Store in Redis (primary) + DB (fallback)
 * 2. Verify OTP → Check Redis first, fallback to DB
 * 3. Delete OTP after successful verification
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_LENGTH = 6;
  private readonly isProduction: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly otpStorage: OtpStorageService,
  ) {
    this.isProduction = this.configService.get<boolean>('app.isProduction', false);
  }

  /**
   * Generate a random OTP
   */
  generateOtp(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    const otp = Math.floor(Math.random() * (max - min + 1)) + min;
    return otp.toString();
  }

  /**
   * Store OTP in Redis and return expiry for DB storage
   */
  async storeOtp(identifier: string, otp: string): Promise<Date> {
    return this.otpStorage.storeOtp(identifier, otp);
  }

  /**
   * Verify OTP with Redis primary, DB fallback
   */
  async verifyOtp(
    identifier: string,
    providedOtp: string,
    dbOtp?: string,
    dbOtpExpiry?: Date,
  ): Promise<OtpVerifyResult> {
    const result = await this.otpStorage.verifyOtp(
      identifier,
      providedOtp,
      dbOtp,
      dbOtpExpiry,
    );

    const messages: Record<string, string> = {
      redis: 'OTP verified successfully',
      db: 'OTP verified successfully (from fallback)',
      expired: 'OTP has expired',
      not_found: 'No OTP found for this user',
    };

    return {
      valid: result.valid,
      source: result.source as OtpVerifyResult['source'],
      message: result.valid ? messages[result.source] : messages[result.source] || 'Invalid OTP',
    };
  }

  /**
   * Delete OTP after successful verification
   */
  async clearOtp(identifier: string): Promise<void> {
    await this.otpStorage.deleteOtp(identifier);
  }

  /**
   * Check if user has an active OTP (for rate limiting)
   */
  async hasActiveOtp(identifier: string): Promise<boolean> {
    return this.otpStorage.hasActiveOtp(identifier);
  }

  /**
   * Get remaining TTL (for "resend in X seconds" UX)
   */
  async getRemainingCooldown(identifier: string): Promise<number | null> {
    return this.otpStorage.getRemainingTtl(identifier);
  }

  /**
   * Legacy validation method (DB-only, for backward compatibility)
   */
  isOtpValid(userData: OtpUserData, providedOtp: string): boolean {
    if (!userData.otp) {
      return false;
    }
    return userData.otp === providedOtp;
  }

  /**
   * Legacy expiry check (DB-only, for backward compatibility)
   */
  isOtpExpired(userData: OtpUserData): boolean {
    if (!userData.otpExpiry) {
      return true;
    }
    return userData.otpExpiry < new Date();
  }

  /**
   * Get OTP expiry date (for DB storage)
   */
  getOtpExpiryDate(): Date {
    return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Send OTP via SMS
   * 
   * TODO: Integrate with actual SMS provider (Twilio, MSG91, etc.)
   */
  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const smsProvider = this.configService.get<string>('app.sms.provider', 'mock');

    try {
      if (smsProvider === 'mock' || !this.isProduction) {
        // Mock SMS in development
        this.logger.log(`[MOCK SMS] OTP ${otp} sent to ${phoneNumber}`);
        return true;
      }

      // TODO: Implement actual SMS providers
      // switch (smsProvider) {
      //   case 'twilio':
      //     return this.sendViaTwilio(phoneNumber, otp);
      //   case 'msg91':
      //     return this.sendViaMsg91(phoneNumber, otp);
      // }

      this.logger.log(`SMS sent to ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${phoneNumber}: ${error.message}`);
      return false;
    }
  }
}
