import { Injectable, BadRequestException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import * as bcrypt from 'bcryptjs';

import { User, UserDocument } from './schemas/user.schema';
import { RegisterUserDto, VerifyOtpDto, ResendOtpDto } from './dto/register-user.dto';
import { RegisterResponseDto, VerifyOtpResponseDto, ResendOtpResponseDto, UserResponseDto } from './dto/user-response.dto';
import { IUserService } from './interfaces/user-service.interface';
import { OtpService } from './services/otp.service';
import { UserRole } from '../../common/enums';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService implements IUserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly otpService: OtpService,
    private readonly authService: AuthService,
  ) {}

  async registerUser(registerUserDto: RegisterUserDto): Promise<RegisterResponseDto> {
    try {
      const { phoneNumber, firstName, lastName } = registerUserDto;

      this.logger.log(`Registration attempt for phone: ${phoneNumber}`);
      const countryCode = phoneNumber.substring(0, 3);
      const phoneNumberWithoutCountryCode = this.phoneNumberWithoutCountryCode(phoneNumber);
      
      // Check if user already exists
      const existingUser = await this.findUserByPhoneNumber( phoneNumberWithoutCountryCode);
      
      // Generate OTP for all cases (new user, unverified user, verified user trying to login)
      const otp = this.otpService.generateOtp();
      const otpExpiry = this.otpService.getOtpExpiryDate();

      let user: UserDocument;
      let isLogin = false;

      if (existingUser) {
        if (existingUser.isPhoneVerified) {
          // Verified user trying to register again - treat as login
          this.logger.log(`Verified user attempting login: ${phoneNumber}`);
          user = await this.updateUserOtpForLogin({phoneNumber:this.phoneNumberWithoutCountryCode(phoneNumber), otp, otpExpiry});
          isLogin = true;
        } else {
          // Unverified user - update with new details and OTP
          this.logger.log(`Updating unverified user: ${phoneNumber}`);
          user = await this.updateExistingUser(existingUser, { firstName, lastName, otp, otpExpiry });
        }
      } else {
        // Create new user
        user = await this.createNewUser({ phoneNumber: phoneNumberWithoutCountryCode, firstName, lastName, otp, otpExpiry, countryCode });
        this.logger.log(`Created new user: ${phoneNumber}`);
      }

      // Send OTP (in production, this should be async)
      const otpSent = await this.otpService.sendOtp(phoneNumber, otp);
      if (!otpSent) {
        this.logger.error(`Failed to send OTP to ${phoneNumber}`);
        throw new InternalServerErrorException('Failed to send OTP');
      }

      return this.buildRegisterResponse(user, otp, otpExpiry, isLogin);

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Registration failed for ${registerUserDto.phoneNumber}:`, error);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    try {
      const { phoneNumber, otp } = verifyOtpDto;

      this.logger.log(`OTP verification attempt for phone: ${phoneNumber}`);

      const user = await this.findUserByPhoneNumber(phoneNumber);
      if (!user) {
        this.logger.warn(`OTP verification failed: User not found - ${phoneNumber}`);
        throw new NotFoundException('User not found');
      }

      // Validate OTP
      this.validateOtpForUser(user, otp);

      // Determine if this is a login or registration verification
      const isLogin = user.isPhoneVerified;
      
      // Update user based on scenario
      const verifiedUser = isLogin 
        ? await this.clearOtpForLogin(phoneNumber)
        : await this.markUserAsVerified(phoneNumber);
      
      const successMessage = isLogin 
        ? 'Login successful' 
        : 'Phone number verified successfully';
      
      this.logger.log(`${successMessage}: ${phoneNumber}`);

      return this.buildVerifyResponse(verifiedUser, successMessage);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`OTP verification failed for ${verifyOtpDto.phoneNumber}:`, error);
      throw new InternalServerErrorException('OTP verification failed');
    }
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<ResendOtpResponseDto> {
    try {
      const { phoneNumber } = resendOtpDto;

      this.logger.log(`OTP resend request for phone: ${phoneNumber}`);

      const user = await this.findUserByPhoneNumber(this.phoneNumberWithoutCountryCode(phoneNumber));
      if (!user) {
        this.logger.warn(`OTP resend failed: User not found - ${phoneNumber}`);
        throw new NotFoundException('User not found');
      }

      if (user.isPhoneVerified) {
        this.logger.warn(`OTP resend failed: Phone already verified - ${phoneNumber}`);
        throw new BadRequestException('Phone number is already verified');
      }

      // Generate new OTP
      const otp = this.otpService.generateOtp();
      const otpExpiry = this.otpService.getOtpExpiryDate();

      await this.updateUserOtp(this.phoneNumberWithoutCountryCode(phoneNumber), otp, otpExpiry);

      // Send OTP
      const otpSent = await this.otpService.sendOtp(phoneNumber, otp);
      if (!otpSent) {
        this.logger.error(`Failed to resend OTP to ${phoneNumber}`);
        throw new InternalServerErrorException('Failed to send OTP');
      }

      this.logger.log(`OTP resent successfully: ${phoneNumber}`);

      return this.buildResendResponse(phoneNumber, otp, otpExpiry);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`OTP resend failed for ${resendOtpDto.phoneNumber}:`, error);
      throw new InternalServerErrorException('OTP resend failed');
    }
  }

  async findUserByPhoneNumber( phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({  phoneNumber }).exec();
  }

  // Public method to update generic user fields
  async updateUser(userId: string, dto: UpdateUserDto): Promise<UserDocument> {
    const update: any = {};

    if (dto.firstName !== undefined) update.firstName = dto.firstName;
    if (dto.lastName !== undefined) update.lastName = dto.lastName;
    if (dto.email !== undefined) update.email = dto.email;
    if (dto.profilePicture !== undefined) update.profilePicture = dto.profilePicture;
    if (dto.dateOfBirth !== undefined) update.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.currentLocation !== undefined) update.currentLocation = [dto.currentLocation.longitude, dto.currentLocation.latitude];
    if (dto.address) {
      update.address = {
        ...(dto.address.street !== undefined && { street: dto.address.street }),
        ...(dto.address.city !== undefined && { city: dto.address.city }),
        ...(dto.address.state !== undefined && { state: dto.address.state }),
        ...(dto.address.country !== undefined && { country: dto.address.country }),
        ...(dto.address.zipCode !== undefined && { zipCode: dto.address.zipCode }),
        ...(dto.address.coordinates !== undefined && {
          coordinates: [
            dto.address.coordinates.longitude,
            dto.address.coordinates.latitude,
          ] as [number, number],
        }),
      };
    }

    const updated = await this.userModel.findByIdAndUpdate(userId, update, { new: true }).exec();
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }

  // Private helper methods
  private async createNewUser(userData: {
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
    otp: string;
    otpExpiry: Date;
    countryCode: string;
  }): Promise<UserDocument> {
    console.log(userData);
    const tempPassword = await bcrypt.hash('temp123', 10);
    const existingUser = await this.findUserByPhoneNumber(userData.phoneNumber);
    if (existingUser) {
     return existingUser;
    }
    const user = new this.userModel({
      phoneNumber: userData.phoneNumber,
      firstName: userData.firstName||"",
      lastName: userData.lastName ||"",
      email: `${userData.phoneNumber.replace('+', '')}@temp.com`,
      password: tempPassword,
      role: UserRole.USER,
      otp: userData.otp,
      otpExpiry: userData.otpExpiry,
      isPhoneVerified: false,
      isVerified: false,
      countryCode: userData.countryCode,
    });

    return user.save();
  }

  private async updateExistingUser(
    user: UserDocument,
    updateData: { firstName?: string; lastName?: string; otp: string; otpExpiry: Date }
  ): Promise<UserDocument> {
    return this.userModel.findOneAndUpdate(
      { phoneNumber: user.phoneNumber },
      {
        otp: updateData.otp,
        otpExpiry: updateData.otpExpiry,
        firstName: updateData.firstName || user.firstName,
        lastName: updateData.lastName || user.lastName,
      },
      { new: true }
    ).exec();
  }

  private async updateUserOtpForLogin(userData: {phoneNumber: string, otp: string, otpExpiry: Date}): Promise<UserDocument> {
    return this.userModel.findOneAndUpdate(
      { phoneNumber: userData.phoneNumber },
      {
        otp: userData.otp,
        otpExpiry: userData.otpExpiry,
      },
      { new: true }
    ).exec();
  }

  private validateOtpForUser(user: UserDocument, providedOtp: string): void {
    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException('No OTP found for this user');
    }

    if (this.otpService.isOtpExpired(user)) {
      throw new BadRequestException('OTP has expired');
    }

    if (!this.otpService.isOtpValid(user, providedOtp)) {
      throw new BadRequestException('Invalid OTP');
    }
  }

  private async markUserAsVerified(phoneNumber: string): Promise<UserDocument> {
    return this.userModel.findOneAndUpdate(
      { phoneNumber },
      {
        isPhoneVerified: true,
        isVerified: true,
        $unset: { otp: 1, otpExpiry: 1 },
      },
      { new: true }
    ).exec();
  }

  private async updateUserOtp(phoneNumber: string, otp: string, otpExpiry: Date): Promise<void> {
    await this.userModel.findOneAndUpdate(
      { phoneNumber },
      { otp, otpExpiry }
    ).exec();
  }

  private async clearOtpForLogin(phoneNumber: string): Promise<UserDocument> {
    return this.userModel.findOneAndUpdate(
      { phoneNumber },
      {
        $unset: { otp: 1, otpExpiry: 1 },
      },
      { new: true }
    ).exec();
  }

  // Response builders
  private buildRegisterResponse(user: UserDocument, otp: string, otpExpiry: Date, isLogin: boolean = false): RegisterResponseDto {
    const message = isLogin ? 'Login OTP sent successfully' : 'OTP sent successfully';
    const tokens = this.authService.buildAuthResponse(user);
    
    return {
      message,
      phoneNumber: user.phoneNumber,
      userId: user._id.toString(),
      otpExpiry,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      // Only include OTP in development mode
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    } as RegisterResponseDto;
  }

  private buildVerifyResponse(user: UserDocument, message: string): VerifyOtpResponseDto {
    const userResponse = plainToClass(UserResponseDto, user.toObject(), {
      excludeExtraneousValues: true,
    });

    return {
      message,
      user: userResponse,
    };
  }

  private buildResendResponse(phoneNumber: string, otp: string, otpExpiry: Date): ResendOtpResponseDto {
    return {
      message: 'OTP resent successfully',
      phoneNumber,
      otpExpiry,
      // Only include OTP in development mode
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    };
  }
  private phoneNumberWithoutCountryCode(phoneNumber: string): string {
    return phoneNumber.substring(3);
  }
} 