import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Driver/Captain Schema
 */

@Schema({ timestamps: true })
export class Driver extends Document {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ default: '+91' })
  countryCode: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  email?: string;

  @Prop({ required: true, unique: true })
  vehicleNumber: string;

  @Prop({ required: true })
  vehicleModel: string;

  @Prop({ required: true })
  drivingLicense: string;

  @Prop()
  aadhaarLast4?: string;

  @Prop({
    type: {
      accountNumber: { type: String, required: true },
      ifsc: { type: String, required: true },
      accountHolder: { type: String, required: true }
    },
    required: true
  })
  bankAccount: {
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
  };

  @Prop({
    type: String,
    enum: ['APPROVED_PENDING_DOCS', 'DOCS_UPLOADED', 'VERIFIED', 'REJECTED'],
    default: 'APPROVED_PENDING_DOCS'
  })
  verificationStatus: string;

  @Prop({ default: true })
  canGoOnline: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: String,
    enum: ['offline', 'online', 'busy'],
    default: 'offline'
  })
  status: string;

  @Prop({
    type: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
      radius: { type: Number, required: true }
    }
  })
  serviceArea: {
    type: string;
    coordinates: number[];
    radius: number;
  };

  @Prop({
    type: {
      license: {
        url: String,
        verified: { type: Boolean, default: false }
      },
      rc: {
        url: String,
        verified: { type: Boolean, default: false }
      },
      aadhaar: {
        url: String,
        verified: { type: Boolean, default: false }
      },
      photo: {
        url: String,
        verified: { type: Boolean, default: false }
      }
    }
  })
  documents?: {
    license: { url?: string; verified: boolean };
    rc: { url?: string; verified: boolean };
    aadhaar: { url?: string; verified: boolean };
    photo: { url?: string; verified: boolean };
  };

  @Prop()
  documentsDeadline?: Date;

  @Prop()
  approvedAt?: Date;

  @Prop()
  currentRideId?: string;

  @Prop({ default: 0 })
  totalRides: number;

  @Prop({ default: 0 })
  totalEarnings: number;

  @Prop({ default: 5.0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalRatings: number;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);

// Indexes
DriverSchema.index({ phoneNumber: 1 });
DriverSchema.index({ vehicleNumber: 1 });
DriverSchema.index({ status: 1 });
DriverSchema.index({ verificationStatus: 1 });
DriverSchema.index({ 'serviceArea.coordinates': '2dsphere' });
