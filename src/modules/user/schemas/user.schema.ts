import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../../common/enums';

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

  @Prop({ type: Number, default: 0 })
  totalSpent: number;
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

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  profilePicture?: string;

  @Prop()
  dateOfBirth?: Date;

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
    required: true,
    index: '2dsphere',
  })
  currentLocation: [number, number]; // [longitude, latitude]
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ 'address.coordinates': '2dsphere' });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });