import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../schemas/user.schema';
import { IOtpService } from '../interfaces/user-service.interface';

@Injectable()
export class OtpService implements IOtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;

  constructor(private readonly configService: ConfigService) {}

  generateOtp(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    const otp = Math.floor(Math.random() * (max - min + 1)) + min;
    
    this.logger.debug(`Generated OTP: ${otp}`);
    return otp.toString();
  }

  isOtpValid(user: UserDocument, providedOtp: string): boolean {
    if (!user.otp) {
      this.logger.warn(`No OTP found for user: ${user.phoneNumber}`);
      return false;
    }

    const isValid = user.otp === providedOtp;
    this.logger.debug(`OTP validation for ${user.phoneNumber}: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    
    return isValid;
  }

  isOtpExpired(user: UserDocument): boolean {
    if (!user.otpExpiry) {
      this.logger.warn(`No OTP expiry found for user: ${user.phoneNumber}`);
      return true;
    }

    const isExpired = user.otpExpiry < new Date();
    this.logger.debug(`OTP expiry check for ${user.phoneNumber}: ${isExpired ? 'EXPIRED' : 'VALID'}`);
    
    return isExpired;
  }

  getOtpExpiryDate(): Date {
    return new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
  }

  // In production, this would integrate with SMS service
  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      this.logger.log(`📱 SMS Service: Sending OTP ${otp} to ${phoneNumber}`);
      
      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.log(`✅ OTP sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send OTP to ${phoneNumber}:`, error);
      return false;
    }
  }
} 