import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { DriverStatus, VehicleType, DocumentVerificationStatus } from '../../../common/enums';

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
  // ============ Link to User Account ============
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ default: '+91' })
  countryCode: string;

  // ============ Basic Driver Info (Duplicated for Query Convenience) ============
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ type: String, enum: ['en', 'hi'], default: 'en' })
  language: 'en' | 'hi';

  @Prop()
  profilePicture?: string;

  @Prop()
  dateOfBirth?: Date;

  // ============ Driver Status & Approval ============
  @Prop({ type: String, enum: DriverStatus, default: DriverStatus.PENDING_APPROVAL })
  status: DriverStatus;

  @Prop({ default: false })
  isVerified: boolean; // Full driver verification (documents approved, background check, etc.)

  @Prop({ default: false })
  canGoOnline: boolean; // Can driver go online (approved and verified)

  // ============ KYC Documents ============
  @Prop({ unique: true, sparse: true }) // sparse: allows null but ensures unique when present
  licenseNumber?: string;

  @Prop()
  licenseExpiry?: Date;

  @Prop({ required: false })
  aadharNumber?: string; // Full 12-digit Aadhaar (encrypt in production)

  @Prop({ required: false })
  panNumber?: string; // PAN card number (format: ABCDE1234F)

  // Document Verification Status
  @Prop({ type: String, enum: DocumentVerificationStatus, default: DocumentVerificationStatus.NOT_UPLOADED })
  licenseVerificationStatus: DocumentVerificationStatus;

  @Prop({ type: String, enum: DocumentVerificationStatus, default: DocumentVerificationStatus.NOT_UPLOADED })
  aadharVerificationStatus: DocumentVerificationStatus;

  @Prop({ type: String, enum: DocumentVerificationStatus, default: DocumentVerificationStatus.NOT_UPLOADED })
  panVerificationStatus: DocumentVerificationStatus;

  @Prop({ type: String, enum: DocumentVerificationStatus, default: DocumentVerificationStatus.NOT_UPLOADED })
  rcVerificationStatus: DocumentVerificationStatus;

  // Approval Tracking
  @Prop()
  approvedBy?: string; // Admin user ID who approved

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedBy?: string; // Admin user ID who rejected

  @Prop()
  rejectedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: DriverVehicle })
  vehicle?: DriverVehicle;

  @Prop({ type: DriverLocation })
  location?: DriverLocation;

  @Prop({
    type: [Number],
    index: '2dsphere',
    default: [0, 0], // Default until driver shares location
  })
  currentLocation?: [number, number]; // [longitude, latitude]

  @Prop({ type: DriverBankDetails })
  bankDetails?: DriverBankDetails;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);

// Indexes (avoid duplicates - unique/index in @Prop creates its own)
// userId: already indexed via unique: true
// phoneNumber: already indexed via unique: true
// licenseNumber: already indexed via unique: true
// vehicle.registrationNumber: already indexed via unique: true in DriverVehicle
// location.coordinates: already indexed via index: '2dsphere' in DriverLocation
// currentLocation: already indexed via index: '2dsphere' in @Prop
DriverSchema.index({ status: 1 });
DriverSchema.index({ 'vehicle.type': 1 });
DriverSchema.index({ createdAt: -1 });
DriverSchema.index({ userId: 1, phoneNumber: 1 }); // Compound index for user-driver lookup