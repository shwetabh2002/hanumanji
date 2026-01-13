import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Booking/Ride Schema
 */

@Schema({ timestamps: true })
export class Booking extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  riderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Driver' })
  driverId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['SEARCHING', 'MATCHED', 'ARRIVING', 'ONGOING', 'COMPLETED', 'CANCELLED'],
    default: 'SEARCHING'
  })
  status: string;

  @Prop({
    type: {
      address: { type: String, required: false }, // Optional: can be derived from coordinates
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      }
    },
    required: true
  })
  pickup: {
    address?: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };

  @Prop({
    type: {
      address: { type: String, required: false }, // Optional: can be derived from coordinates
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      }
    },
    required: true
  })
  drop: {
    address?: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };

  @Prop({ required: true })
  fare: number;

  @Prop({ required: true })
  captainEarnings: number;

  @Prop({ required: true, default: 0 })
  commission: number;

  @Prop({ required: true })
  distance: number;

  @Prop({ required: true })
  estimatedDuration: number;

  @Prop()
  actualDistance?: number;

  @Prop()
  actualDuration?: number;

  @Prop({ required: true })
  otp: string;

  @Prop({ default: 'regular', enum: ['student', 'regular'] })
  userType: string;

  @Prop({ default: 'CASH', enum: ['CASH', 'UPI', 'WALLET', 'CARD'] })
  paymentMethod: string;

  @Prop({ default: false })
  paymentCompleted: boolean;

  @Prop()
  matchedAt?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop({ enum: ['rider', 'driver', 'system'] })
  cancelledBy?: string;

  @Prop()
  cancellationReason?: string;

  @Prop()
  riderRating?: number;

  @Prop()
  riderFeedback?: string;

  @Prop()
  driverRating?: number;

  @Prop()
  driverFeedback?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Indexes
BookingSchema.index({ riderId: 1, createdAt: -1 });
BookingSchema.index({ driverId: 1, createdAt: -1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ 'pickup.coordinates.lat': 1, 'pickup.coordinates.lng': 1 });
BookingSchema.index({ 'drop.coordinates.lat': 1, 'drop.coordinates.lng': 1 });
