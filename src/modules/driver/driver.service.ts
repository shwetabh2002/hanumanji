import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../user/schemas/user.schema';
import { Driver, DriverDocument } from './schemas/driver.schema';
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
    @InjectModel(Driver.name) private readonly driverModel: Model<DriverDocument>,
    private readonly eventService: EventService,
  ) {}

  // ============ Query Methods ============

  /**
   * Find driver by ID (ID can be either userId or driverId)
   * First tries to find by Driver._id, then by Driver.userId
   */
  async findById(id: string): Promise<DriverDocument | null> {
    // Try finding by Driver._id first
    let driver = await this.driverModel.findById(id).exec();

    // If not found, try finding by userId (in case id is User._id from JWT)
    if (!driver) {
      driver = await this.driverModel.findOne({ userId: id }).exec();
    }

    return driver;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<DriverDocument | null> {
    return this.driverModel.findOne({ phoneNumber }).exec();
  }

  async findByEmail(email: string): Promise<DriverDocument | null> {
    return this.driverModel.findOne({ email }).exec();
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

  /**
   * Set driver status to ONLINE
   * Looks up driver by userId (User._id from JWT) or driverId (Driver._id)
   */
  async setOnline(id: string): Promise<DriverDocument> {
    // Find driver by ID (tries both _id and userId)
    let driver = await this.driverModel.findById(id).exec();
    if (!driver) {
      driver = await this.driverModel.findOne({ userId: id }).exec();
    }

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Update status
    driver.status = DriverStatus.ONLINE;
    await driver.save();

    // Emit domain event via Kafka
    await this.eventService.emitDriverEvent<DriverStatusPayload>(
      DomainEvents.DRIVER_ONLINE,
      { driverId: driver._id.toString(), status: 'online' },
      driver._id.toString(),
    );

    this.logger.log(`Driver ${driver._id} is now online`);
    return driver;
  }

  /**
   * Set driver status to OFFLINE
   * Looks up driver by userId (User._id from JWT) or driverId (Driver._id)
   */
  async setOffline(id: string): Promise<DriverDocument> {
    // Find driver by ID (tries both _id and userId)
    let driver = await this.driverModel.findById(id).exec();
    if (!driver) {
      driver = await this.driverModel.findOne({ userId: id }).exec();
    }

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Update status
    driver.status = DriverStatus.OFFLINE;
    await driver.save();

    // Emit domain event via Kafka
    await this.eventService.emitDriverEvent<DriverStatusPayload>(
      DomainEvents.DRIVER_OFFLINE,
      { driverId: driver._id.toString(), status: 'offline' },
      driver._id.toString(),
    );

    this.logger.log(`Driver ${driver._id} is now offline`);
    return driver;
  }

  /**
   * Set driver status to BUSY
   * Looks up driver by userId (User._id from JWT) or driverId (Driver._id)
   */
  async setBusy(id: string): Promise<DriverDocument> {
    // Find driver by ID (tries both _id and userId)
    let driver = await this.driverModel.findById(id).exec();
    if (!driver) {
      driver = await this.driverModel.findOne({ userId: id }).exec();
    }

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Update status
    driver.status = DriverStatus.BUSY;
    await driver.save();

    return driver;
  }

  /**
   * Count online drivers in MongoDB
   * Used as fallback when Redis is unavailable
   */
  async countOnlineDrivers(): Promise<number> {
    return this.driverModel.countDocuments({
      status: DriverStatus.ONLINE,
    }).exec();
  }

  // ============ Profile Operations ============

  async updateProfile(id: string, updateData: Partial<Driver>): Promise<DriverDocument> {
    // Remove sensitive fields that shouldn't be updated directly
    const { password, status, isVerified, ...safeUpdate } = updateData as any;

    // Find driver by ID (tries both _id and userId)
    let driver = await this.driverModel.findById(id).exec();
    if (!driver) {
      driver = await this.driverModel.findOne({ userId: id }).exec();
    }

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Update fields
    Object.assign(driver, safeUpdate);
    await driver.save();

    return driver;
  }

  // ============ Location (MongoDB - for persistence) ============

  async updateLocationInMongo(
    id: string,
    longitude: number,
    latitude: number,
    heading?: number,
    speed?: number,
  ): Promise<void> {
    // Find driver by ID (tries both _id and userId)
    let driver = await this.driverModel.findById(id).exec();
    if (!driver) {
      driver = await this.driverModel.findOne({ userId: id }).exec();
    }

    if (driver) {
      driver.currentLocation = [longitude, latitude];
      driver.location = {
        coordinates: [longitude, latitude],
        heading,
        speed,
        lastUpdated: new Date(),
      };
      await driver.save();
    }
  }

  // ============ Nearby Drivers (MongoDB fallback) ============

  async findNearbyDrivers(
    longitude: number,
    latitude: number,
    radiusKm: number,
    vehicleType?: string,
    limit: number = 10,
  ): Promise<DriverDocument[]> {
    const query: any = {
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

    return this.driverModel.find(query).limit(limit).exec();
  }
}

