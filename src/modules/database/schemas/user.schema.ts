import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * User/Rider Schema
 */

@Schema({ timestamps: true })
export class User extends Document {
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

  @Prop({ default: 'regular', enum: ['student', 'regular'] })
  userType: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: true })
  isPhoneVerified: boolean;

  @Prop({
    type: {
      displayAddress: String,
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number] // [lng, lat]
      }
    }
  })
  address?: {
    displayAddress: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates: {
      type: string;
      coordinates: number[];
    };
  };

  @Prop({
    type: [{
      name: String,
      address: String,
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number]
      }
    }]
  })
  savedLocations?: Array<{
    name: string;
    address: string;
    coordinates: {
      type: string;
      coordinates: number[];
    };
  }>;

  @Prop({
    type: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    }
  })
  currentLocation?: {
    type: string;
    coordinates: number[];
  };

  @Prop({ type: [String] })
  fcmTokens?: string[];

  @Prop()
  dateOfBirth?: Date;

  @Prop({ default: 0 })
  totalRides: number;

  @Prop({ default: 5.0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalRatings: number;

  @Prop({ default: 0 })
  walletBalance: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ userType: 1 });
UserSchema.index({ 'currentLocation.coordinates': '2dsphere' });
