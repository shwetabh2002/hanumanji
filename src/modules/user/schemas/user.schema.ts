import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole, UserType, DriverStatus, VehicleType } from '../../../common/enums';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class UserAddress {
  @Prop({ required: true })
  displayAddress: string;

  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  zipCode: string;

  @Prop({
    type: [Number],
    required: true,
    index: '2dsphere',
  })
  coordinates: [number, number]; // [longitude, latitude]
}

@Schema({ _id: false })
export class UserSavedLocation {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({
    type: [Number],
    required: true,
    index: '2dsphere',
  })
  coordinates: [number, number]; // [longitude, latitude]
}

@Schema({ _id: false })
export class UserStats {
  @Prop({ type: Number, default: 5.0 })
  rating: number;

  @Prop({ type: Number, default: 0 })
  totalRides: number;

  // User-specific stats
  @Prop({ type: Number, default: 0 })
  totalSpent?: number;

  // Driver-specific stats
  @Prop({ type: Number, default: 0 })
  totalEarnings?: number;

  @Prop({ type: Number, default: 100 })
  completionRate?: number;

  @Prop({ type: Number, default: 0 })
  cancellationRate?: number;
}

// Driver-specific nested schemas
@Schema({ _id: false })
export class UserVehicle {
  @Prop({ type: String, enum: VehicleType, required: true })
  type: VehicleType;

  @Prop({ required: true })
  make: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true })
  registrationNumber: string;

  @Prop()
  insuranceNumber?: string;

  @Prop()
  insuranceExpiry?: Date;

  @Prop()
  rcNumber?: string;
}

@Schema({ _id: false })
export class UserLocation {
  @Prop({
    type: [Number],
    required: true,
    index: '2dsphere',
  })
  coordinates: [number, number]; // [longitude, latitude]

  @Prop()
  address?: string;

  @Prop({ type: Number })
  heading?: number; // Direction in degrees

  @Prop({ type: Number })
  speed?: number; // Speed in km/h

  @Prop({ type: Number })
  accuracy?: number;

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;
}

@Schema({ _id: false })
export class UserBankDetails {
  @Prop()
  accountNumber?: string;

  @Prop()
  ifscCode?: string;

  @Prop()
  bankName?: string;

  @Prop()
  holderName?: string;
}

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ default:"" })
  firstName: string;

  @Prop({required:true,default:"+91" })
  countryCode: string;

  @Prop({ default:"" })
  lastName: string;

  @Prop()
  email?: string;

  @Prop()
  password?: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: String, enum: UserType, default: UserType.USER, index: true })
  type: UserType;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  profilePicture?: string;

  @Prop()
  dateOfBirth?: Date;

  // Driver-specific fields
  @Prop({ type: String, enum: DriverStatus, index: true })
  status?: DriverStatus;

  @Prop({ type: String, enum: ['en', 'hi'] })
  language?: 'en' | 'hi';

  @Prop({ unique: true, sparse: true })
  licenseNumber?: string;

  @Prop()
  licenseExpiry?: Date;

  @Prop()
  aadharNumber?: string;

  @Prop()
  panNumber?: string;

  @Prop({ type: UserVehicle })
  vehicle?: UserVehicle;

  @Prop({ type: UserLocation })
  location?: UserLocation;

  @Prop({ type: UserBankDetails })
  bankDetails?: UserBankDetails;

  @Prop({ type: UserAddress })
  address?: UserAddress;

  @Prop({ type: [UserSavedLocation] })
  savedLocations?: UserSavedLocation[];

  @Prop({ type: UserStats })
  stats?: UserStats;

  @Prop({ type: [String] })
  fcmTokens?: string[];

  @Prop()
  lastLogin?: Date;

  @Prop()
  refreshToken?: string;

  // OTP field
  @Prop()
  otp?: string;

  @Prop()
  otpExpiry?: Date;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({
    type: [Number],
    index: '2dsphere',
    default: [0, 0], // Default to null island, updated when user shares location
  })
  currentLocation: [number, number]; // [longitude, latitude]
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes (only non-duplicate ones - unique/index in @Prop creates its own index)
// phoneNumber: already indexed via unique: true
// type: already indexed via index: true in @Prop
// status: already indexed via index: true in @Prop
// address.coordinates: already indexed via index: '2dsphere' in UserAddress
// location.coordinates: already indexed via index: '2dsphere' in UserLocation
UserSchema.index({ email: 1 }, { sparse: true }); // sparse for optional field
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
// Driver-specific indexes
UserSchema.index({ 'vehicle.registrationNumber': 1 }, { sparse: true, unique: true });
UserSchema.index({ 'vehicle.type': 1 });
// Compound indexes for efficient queries
UserSchema.index({ type: 1, status: 1 }); // Find available drivers
UserSchema.index({ type: 1, isActive: 1 });
UserSchema.index({ type: 1, createdAt: -1 });