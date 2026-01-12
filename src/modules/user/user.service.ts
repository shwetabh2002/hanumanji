import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, UserType, DriverStatus } from '../../common/enums';
import { GeocodingService } from '../../shared/http/geocoding.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly geocodingService: GeocodingService,
  ) {}

  // ============ Query Methods ============

  async findUserByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  async findUserById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  // ============ User Creation & Update ============

  async createNewUser(userData: {
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
    type?: UserType;
    language?: 'en' | 'hi';
    otp: string;
    otpExpiry: Date;
    countryCode: string;
  }): Promise<UserDocument> {
    const existingUser = await this.findUserByPhoneNumber(userData.phoneNumber);
    if (existingUser) {
      return existingUser;
    }

    const tempPassword = await bcrypt.hash('temp123', 10);

    const userType = userData.type || UserType.USER;
    const isDriver = userType === UserType.DRIVER;

    const user = new this.userModel({
      phoneNumber: userData.phoneNumber,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: `${userData.phoneNumber.replace('+', '')}@temp.com`,
      password: tempPassword,
      role: UserRole.USER,
      type: userType,
      otp: userData.otp,
      otpExpiry: userData.otpExpiry,
      isPhoneVerified: false,
      isVerified: false,
      countryCode: userData.countryCode,
      // Driver-specific fields
      ...(isDriver && {
        status: DriverStatus.OFFLINE,
        language: userData.language || 'en',
      }),
    });

    return user.save();
  }

  async updateExistingUser(
    user: UserDocument,
    updateData: {
      firstName?: string;
      lastName?: string;
      type?: UserType;
      language?: 'en' | 'hi';
      otp: string;
      otpExpiry: Date;
    }
  ): Promise<UserDocument> {
    const updateFields: any = {
      otp: updateData.otp,
      otpExpiry: updateData.otpExpiry,
      firstName: updateData.firstName || user.firstName,
      lastName: updateData.lastName || user.lastName,
    };

    // Update type if provided
    if (updateData.type) {
      updateFields.type = updateData.type;
    }

    // Update language if provided (for drivers)
    if (updateData.language) {
      updateFields.language = updateData.language;
    }

    return this.userModel.findOneAndUpdate(
      { phoneNumber: user.phoneNumber },
      updateFields,
      { new: true }
    ).exec();
  }

  async updateUserOtp(phoneNumber: string, otp: string, otpExpiry: Date): Promise<UserDocument> {
    return this.userModel.findOneAndUpdate(
      { phoneNumber },
      { otp, otpExpiry },
      { new: true }
    ).exec();
  }

  async markUserAsVerified(phoneNumber: string): Promise<UserDocument> {
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

  async clearOtp(phoneNumber: string): Promise<UserDocument> {
    return this.userModel.findOneAndUpdate(
      { phoneNumber },
      { $unset: { otp: 1, otpExpiry: 1 } },
      { new: true }
    ).exec();
  }

  // ============ Profile Update ============

  async updateUser(userId: string, dto: UpdateUserDto): Promise<UserDocument> {
    const update: any = {};

    if (dto.firstName !== undefined) update.firstName = dto.firstName;
    if (dto.lastName !== undefined) update.lastName = dto.lastName;
    if (dto.email !== undefined) update.email = dto.email;
    if (dto.profilePicture !== undefined) update.profilePicture = dto.profilePicture;
    if (dto.dateOfBirth !== undefined) update.dateOfBirth = new Date(dto.dateOfBirth);

    // Handle currentLocation - auto-geocode to address
    if (dto.currentLocation && dto.currentLocation.latitude && dto.currentLocation.longitude) {
      const geocodedAddress = await this.geocodingService.reverseGeocode(
        dto.currentLocation.latitude,
        dto.currentLocation.longitude
      );
      
      update.address = {
        displayAddress: geocodedAddress.displayName || '',
        street: dto.address?.street || geocodedAddress.street,
        city: dto.address?.city || geocodedAddress.city,
        state: dto.address?.state || geocodedAddress.state,
        country: dto.address?.country || geocodedAddress.country,
        zipCode: dto.address?.zipCode || geocodedAddress.zipCode,
        coordinates: [
          dto.currentLocation.longitude,
          dto.currentLocation.latitude,
        ] as [number, number],
      };
      
      update.currentLocation = [
        dto.currentLocation.longitude,
        dto.currentLocation.latitude,
      ] as [number, number];
    }

    // Handle manual address update
    if (dto.address) {
      update.address = {
        ...(dto.address.street !== undefined && { street: dto.address.street }),
        ...(dto.address.city !== undefined && { city: dto.address.city }),
        ...(dto.address.state !== undefined && { state: dto.address.state }),
        ...(dto.address.country !== undefined && { country: dto.address.country }),
        ...(dto.address.zipCode !== undefined && { zipCode: dto.address.zipCode }),
        ...(dto.address.displayAddress !== undefined && { displayAddress: dto.address.displayAddress }),
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
}
