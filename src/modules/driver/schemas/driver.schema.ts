import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DriverStatus, VehicleType } from '../../../common/enums';

export type DriverDocument = Driver & Document;

@Schema({ _id: false })
export class DriverVehicle {
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

  @Prop({ required: true, unique: true })
  registrationNumber: string;

  @Prop()
  insuranceNumber?: string;

  @Prop()
  insuranceExpiry?: Date;

  @Prop()
  rcNumber?: string;
}

@Schema({ _id: false })
export class DriverLocation {
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
export class DriverStats {
  @Prop({ type: Number, default: 5.0 })
  rating: number;

  @Prop({ type: Number, default: 0 })
  totalRides: number;

  @Prop({ type: Number, default: 0 })
  totalEarnings: number;

  @Prop({ type: Number, default: 100 })
  completionRate: number;

  @Prop({ type: Number, default: 0 })
  cancellationRate: number;
}

@Schema({ _id: false })
export class DriverPreferredArea {
  @Prop({ required: true })
  area: string;

  @Prop({ type: Number, default: 1 })
  priority: number;
}

@Schema({ _id: false })
export class DriverBankDetails {
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
  collection: 'drivers',
})
export class Driver {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: DriverStatus, default: DriverStatus.OFFLINE })
  status: DriverStatus;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  profilePicture?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ required: true, unique: true })
  licenseNumber: string;

  @Prop()
  licenseExpiry: Date;

  @Prop()
  aadharNumber?: string;

  @Prop()
  panNumber?: string;

  @Prop({ type: DriverVehicle })
  vehicle?: DriverVehicle;

  @Prop({ type: DriverLocation })
  location?: DriverLocation;

  @Prop({
    type: [Number],
    required: true,
    index: '2dsphere',
  })
  currentLocation: [number, number]; // [longitude, latitude]

  @Prop({ type: DriverBankDetails })
  bankDetails?: DriverBankDetails;

  @Prop()
  lastLogin?: Date;

}

export const DriverSchema = SchemaFactory.createForClass(Driver);

// Indexes
DriverSchema.index({ phoneNumber: 1 });
DriverSchema.index({ email: 1 });
DriverSchema.index({ licenseNumber: 1 });
DriverSchema.index({ 'vehicle.registrationNumber': 1 });
DriverSchema.index({ status: 1 });
DriverSchema.index({ 'vehicle.type': 1 }); 
DriverSchema.index({ 'location.coordinates': '2dsphere' });
DriverSchema.index({ 'currentLocation': '2dsphere' });