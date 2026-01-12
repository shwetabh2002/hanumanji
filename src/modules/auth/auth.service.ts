import { Injectable, BadRequestException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { plainToClass } from 'class-transformer';

import { UserService } from '../user/user.service';
import { UserDocument } from '../user/schemas/user.schema';
import { OtpService } from './services/otp.service';
import { RegisterUserDto, VerifyOtpDto, ResendOtpDto } from '../user/dto/register-user.dto';
import { RegisterResponseDto, VerifyOtpResponseDto, ResendOtpResponseDto, UserResponseDto } from '../user/dto/user-response.dto';

/**
 * Authentication Service
 * 
 * Handles user registration, OTP verification, and token management.
 * 
 * OTP Storage Strategy:
 * - Primary: Redis (fast, auto-expiry via TTL)
 * - Fallback: MongoDB (reliability if Redis fails)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly isProduction: boolean;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly otpService: OtpService,
  ) {
    this.isProduction = this.configService.get<boolean>('app.isProduction', false);
  }

  // ============ Registration & OTP Flow ============

  async registerUser(dto: RegisterUserDto): Promise<RegisterResponseDto> {
    const { countryCode, phoneNumber, firstName, lastName, type, language } = dto;
    const fullPhoneNumber = `${countryCode}${phoneNumber}`; // For SMS sending

    this.logger.log(`Registration attempt: ${fullPhoneNumber} (type: ${type || 'user'})`);

    try {
      const existingUser = await this.userService.findUserByPhoneNumber(phoneNumber);

      // Generate OTP
      const otp = this.otpService.generateOtp();

      // Store OTP in Redis (returns expiry for DB fallback)
      const otpExpiry = await this.otpService.storeOtp(phoneNumber, otp);

      let user: UserDocument;
      let isLogin = false;

      if (existingUser) {
        if (existingUser.isPhoneVerified) {
          // Existing verified user → Login flow
          this.logger.log(`Login flow for verified user: ${fullPhoneNumber}`);
          user = await this.userService.updateUserOtp(phoneNumber, otp, otpExpiry);
          isLogin = true;
        } else {
          // Existing unverified user → Update and retry
          this.logger.log(`Updating unverified user: ${fullPhoneNumber}`);
          user = await this.userService.updateExistingUser(existingUser, {
            firstName,
            lastName,
            type,
            language,
            otp,
            otpExpiry,
          });
        }
      } else {
        // New user → Create
        user = await this.userService.createNewUser({
          phoneNumber,
          firstName,
          lastName,
          type,
          language,
          otp,
          otpExpiry,
          countryCode,
        });
        this.logger.log(`New ${type || 'user'} created: ${fullPhoneNumber}`);
      }

      // Send OTP via SMS (use full phone number with country code)
      const sent = await this.otpService.sendOtp(fullPhoneNumber, otp);
      if (!sent) {
        throw new InternalServerErrorException('Failed to send OTP');
      }

      return this.buildRegisterResponse(user, countryCode, otp, otpExpiry, isLogin);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Registration failed: ${fullPhoneNumber}`, error.stack);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    const { countryCode, phoneNumber, otp } = dto;
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;

    this.logger.log(`OTP verification: ${fullPhoneNumber} (stored as: ${phoneNumber})`);

    try {
      // DB stores phone WITHOUT country code
      const user = await this.userService.findUserByPhoneNumber(phoneNumber);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify OTP: Redis first (uses phoneNumber), then DB fallback
      const result = await this.otpService.verifyOtp(
        phoneNumber, // Must match what was used in storeOtp
        otp,
        user.otp,         // DB fallback
        user.otpExpiry,   // DB fallback
      );

      if (!result.valid) {
        this.logger.warn(`OTP verification failed: ${fullPhoneNumber} - ${result.source}`);
        throw new BadRequestException(result.message);
      }

      this.logger.log(`OTP verified (${result.source}): ${fullPhoneNumber}`);

      // Clear OTP from both Redis and DB (use phoneNumber for Redis)
      await this.otpService.clearOtp(phoneNumber);

      // Update user status (use phoneNumber - how it's stored in DB)
      const isLogin = user.isPhoneVerified;
      const verifiedUser = isLogin
        ? await this.userService.clearOtp(phoneNumber)
        : await this.userService.markUserAsVerified(phoneNumber);

      const message = isLogin ? 'Login successful' : 'Phone number verified successfully';

      return this.buildVerifyResponse(verifiedUser, message);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`OTP verification failed: ${fullPhoneNumber}`, error.stack);
      throw new InternalServerErrorException('OTP verification failed');
    }
  }

  async resendOtp(dto: ResendOtpDto): Promise<ResendOtpResponseDto> {
    const { countryCode, phoneNumber } = dto;
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;

    this.logger.log(`OTP resend request: ${fullPhoneNumber}`);

    try {
      const user = await this.userService.findUserByPhoneNumber(phoneNumber);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check cooldown (rate limiting)
      const cooldown = await this.otpService.getRemainingCooldown(phoneNumber);
      if (cooldown && cooldown > 0) {
        throw new BadRequestException(`Please wait ${cooldown} seconds before requesting a new OTP`);
      }

      // Generate and store new OTP
      const otp = this.otpService.generateOtp();
      const otpExpiry = await this.otpService.storeOtp(phoneNumber, otp);

      // Update DB (fallback storage)
      await this.userService.updateUserOtp(phoneNumber, otp, otpExpiry);

      // Send OTP
      const sent = await this.otpService.sendOtp(fullPhoneNumber, otp);
      if (!sent) {
        throw new InternalServerErrorException('Failed to send OTP');
      }

      this.logger.log(`OTP resent: ${fullPhoneNumber}`);

      return this.buildResendResponse(countryCode, phoneNumber, otp, otpExpiry);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`OTP resend failed: ${fullPhoneNumber}`, error.stack);
      throw new InternalServerErrorException('OTP resend failed');
    }
  }

  // ============ Token Generation ============

  signAccessToken(user: UserDocument): string {
    return this.jwtService.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        phoneNumber: user.phoneNumber,
        countryCode: (user as any).countryCode,
      },
      {
        secret: this.configService.get<string>('app.jwt.secret'),
        expiresIn: this.configService.get<string>('app.jwt.expiresIn'),
      },
    );
  }

  signRefreshToken(user: UserDocument): string {
    return this.jwtService.sign(
      {
        sub: user._id.toString(),
        tokenId: randomUUID(),
      },
      {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('app.jwt.refreshExpiresIn'),
      },
    );
  }

  buildAuthResponse(user: UserDocument) {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('app.jwt.expiresIn'),
      user: {
        id: user._id.toString(),
        phoneNumber: user.phoneNumber,
        countryCode: (user as any).countryCode,
        role: user.role,
      },
    };
  }

  buildRefreshResponse(user: UserDocument) {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user),
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('app.jwt.expiresIn'),
    };
  }

  // ============ Private Helpers ============

  private buildRegisterResponse(
    user: UserDocument,
    countryCode: string,
    otp: string,
    otpExpiry: Date,
    isLogin: boolean,
  ): RegisterResponseDto {
    const tokens = this.buildAuthResponse(user);

    return {
      message: isLogin ? 'Login OTP sent successfully' : 'OTP sent successfully',
      countryCode,
      phoneNumber: user.phoneNumber,
      userId: user._id.toString(),
      otpExpiry,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ...(!this.isProduction && { otp }), // Only in dev
    } as RegisterResponseDto;
  }

  private buildVerifyResponse(user: UserDocument, message: string): VerifyOtpResponseDto {
    const userResponse = plainToClass(UserResponseDto, user.toObject(), {
      excludeExtraneousValues: true,
    });

    return { message, user: userResponse };
  }

  private buildResendResponse(countryCode: string, phoneNumber: string, otp: string, otpExpiry: Date): ResendOtpResponseDto {
    return {
      message: 'OTP resent successfully',
      countryCode,
      phoneNumber,
      otpExpiry,
      ...(!this.isProduction && { otp }), // Only in dev
    };
  }

  private stripCountryCode(phoneNumber: string): string {
    // India (+91): +919876543210 → 9876543210
    if (phoneNumber.startsWith('+91')) {
      return phoneNumber.substring(3);
    }
    // US/Canada (+1): +12025551234 → 2025551234
    if (phoneNumber.startsWith('+1')) {
      return phoneNumber.substring(2);
    }
    // Other countries with 2-digit codes (+44, +61, etc.)
    if (phoneNumber.match(/^\+\d{2}\d{9,}/)) {
      return phoneNumber.substring(3);
    }
    // Fallback: remove + only
    return phoneNumber.replace(/^\+/, '')
  }
}
