import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../user/schemas/user.schema';
import { EventService } from '../../shared/kafka/event.service';
import { DomainEvents, DriverStatusPayload } from '../../shared/events/events.constants';
import { DriverStatus, UserType } from '../../common/enums';

export interface CreateDriverData {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  language?: 'en' | 'hi';
  otp: string;
  otpExpiry: Date;
}

export interface UpdateDriverOtpData {
  otp: string;
  otpExpiry: Date;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly eventService: EventService,
  ) {}

  // ============ Query Methods ============

  async findById(driverId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: driverId, type: UserType.DRIVER }).exec();
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phoneNumber, type: UserType.DRIVER }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, type: UserType.DRIVER }).exec();
  }

  // ============ Auth-Related Methods ============

  async createNewDriver(data: CreateDriverData): Promise<UserDocument> {
    const driver = new this.userModel({
      phoneNumber: data.phoneNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      countryCode: data.countryCode,
      type: UserType.DRIVER,
      language: data.language || 'en',
      otp: data.otp,
      otpExpiry: data.otpExpiry,
      isPhoneVerified: false,
      isVerified: false,
      status: DriverStatus.OFFLINE,
    });

    return driver.save();
  }

  async updateDriverOtp(phoneNumber: string, otp: string, otpExpiry: Date): Promise<UserDocument> {
    const driver = await this.userModel.findOneAndUpdate(
      { phoneNumber, type: UserType.DRIVER },
      { otp, otpExpiry },
      { new: true },
    ).exec();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async updateExistingDriver(driver: UserDocument, data: UpdateDriverOtpData): Promise<UserDocument> {
    driver.otp = data.otp;
    driver.otpExpiry = data.otpExpiry;
    if (data.firstName) driver.firstName = data.firstName;
    if (data.lastName) driver.lastName = data.lastName;

    return driver.save();
  }

  async markDriverAsVerified(phoneNumber: string): Promise<UserDocument> {
    const driver = await this.userModel.findOneAndUpdate(
      { phoneNumber, type: UserType.DRIVER },
      {
        isPhoneVerified: true,
        otp: null,
        otpExpiry: null,
      },
      { new: true },
    ).exec();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async clearDriverOtp(phoneNumber: string): Promise<UserDocument> {
    const driver = await this.userModel.findOneAndUpdate(
      { phoneNumber, type: UserType.DRIVER },
      { otp: null, otpExpiry: null },
      { new: true },
    ).exec();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async updateLastLogin(driverId: string): Promise<void> {
    await this.userModel.findOneAndUpdate(
      { _id: driverId, type: UserType.DRIVER },
      { lastLogin: new Date() }
    ).exec();
  }

  // ============ Status Management ============

  async setOnline(driverId: string): Promise<UserDocument> {
    const driver = await this.userModel.findOneAndUpdate(
      { _id: driverId, type: UserType.DRIVER },
      { status: DriverStatus.ONLINE },
      { new: true },
    ).exec();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Emit domain event via Kafka
    await this.eventService.emitDriverEvent<DriverStatusPayload>(
      DomainEvents.DRIVER_ONLINE,
      { driverId, status: 'online' },
      driverId,
    );

    this.logger.log(`Driver ${driverId} is now online`);
    return driver;
  }

  async setOffline(driverId: string): Promise<UserDocument> {
    const driver = await this.userModel.findOneAndUpdate(
      { _id: driverId, type: UserType.DRIVER },
      { status: DriverStatus.OFFLINE },
      { new: true },
    ).exec();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Emit domain event via Kafka
    await this.eventService.emitDriverEvent<DriverStatusPayload>(
      DomainEvents.DRIVER_OFFLINE,
      { driverId, status: 'offline' },
      driverId,
    );

    this.logger.log(`Driver ${driverId} is now offline`);
    return driver;
  }

  async setBusy(driverId: string): Promise<UserDocument> {
    const driver = await this.userModel.findOneAndUpdate(
      { _id: driverId, type: UserType.DRIVER },
      { status: DriverStatus.BUSY },
      { new: true },
    ).exec();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  /**
   * Count online drivers in MongoDB
   * Used as fallback when Redis is unavailable
   */
  async countOnlineDrivers(): Promise<number> {
    return this.userModel.countDocuments({
      type: UserType.DRIVER,
      status: DriverStatus.ONLINE,
    }).exec();
  }

  // ============ Profile Operations ============

  async updateProfile(driverId: string, updateData: Partial<User>): Promise<UserDocument> {
    // Remove sensitive fields that shouldn't be updated directly
    const { password, status, isVerified, ...safeUpdate } = updateData as any;

    const driver = await this.userModel.findOneAndUpdate(
      { _id: driverId, type: UserType.DRIVER },
      safeUpdate,
      { new: true },
    ).exec();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  // ============ Location (MongoDB - for persistence) ============

  async updateLocationInMongo(
    driverId: string,
    longitude: number,
    latitude: number,
    heading?: number,
    speed?: number,
  ): Promise<void> {
    await this.userModel.findOneAndUpdate(
      { _id: driverId, type: UserType.DRIVER },
      {
        currentLocation: [longitude, latitude],
        location: {
          coordinates: [longitude, latitude],
          heading,
          speed,
          lastUpdated: new Date(),
        },
      }
    ).exec();
  }

  // ============ Nearby Drivers (MongoDB fallback) ============

  async findNearbyDrivers(
    longitude: number,
    latitude: number,
    radiusKm: number,
    vehicleType?: string,
    limit: number = 10,
  ): Promise<UserDocument[]> {
    const query: any = {
      type: UserType.DRIVER,
      status: DriverStatus.ONLINE,
      isVerified: true,
      currentLocation: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusKm * 1000, // Convert to meters
        },
      },
    };

    if (vehicleType) {
      query['vehicle.type'] = vehicleType;
    }

    return this.userModel.find(query).limit(limit).exec();
  }
}

