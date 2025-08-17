import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BookingStatus, VehicleType, PaymentMethod } from '../../../common/enums';
import { CoordinatesDto } from '@app/common/dto/location.dto';

export type BookingDocument = Booking & Document;

@Schema({ _id: false })
export class BookingLocation {
  @Prop({ required: true })
  address: string;

  @Prop({
    type: [Number],
    required: true,
    index: '2dsphere',
  })
  coordinates: [number, number]; // [longitude, latitude]

  @Prop()
  landmark?: string;
}

@Schema({ _id: false })
export class BookingFareBreakdown {
  @Prop({ type: Number })
  baseFare: number;

  @Prop({ type: Number })
  distanceFare: number;

  @Prop({ type: Number })
  timeFare: number;

  @Prop({ type: Number, default: 1 })
  surgeMultiplier: number;

  @Prop({ type: Number, default: 0 })
  discount: number;

  @Prop({ type: Number })
  tax: number;

  @Prop({ type: Number })
  totalFare: number;
}

@Schema({ _id: false })
export class BookingRating {
  @Prop({ type: Number })
  userRating?: number;

  @Prop({ type: Number })
  driverRating?: number;

  @Prop()
  userFeedback?: string;

  @Prop()
  driverFeedback?: string;
}

@Schema({
  timestamps: true,
  collection: 'bookings',
})
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Driver' })
  driverId?: Types.ObjectId;

  @Prop({ type: CoordinatesDto, required: true })
  bookingLocation: CoordinatesDto;

  @Prop({ type: CoordinatesDto, required: true })
  bookingDestination: CoordinatesDto;

  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Prop({ type: String, enum: VehicleType, required: true })
  vehicleType: VehicleType;

  @Prop({ type: BookingLocation, required: true })
  pickupLocation: BookingLocation;

  @Prop({ type: BookingLocation, required: true })
  dropLocation: BookingLocation;

  @Prop({ required: true })
  estimatedDistance: number; // in meters

  @Prop({ required: true })
  estimatedDuration: number; // in seconds

  @Prop({ required: true })
  estimatedFare: number;

  @Prop()
  actualDistance: number;

  @Prop()
  actualDuration: number;

  @Prop()
  actualFare: number;

  @Prop({ type: String, enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Prop()
  paymentId: string;

  @Prop({ type: BookingFareBreakdown })
  fareBreakdown: BookingFareBreakdown;

  @Prop()
  scheduledTime: Date;

  @Prop()
  requestedAt: Date;

  @Prop()
  acceptedAt: Date;

  @Prop()
  arrivedAt: Date;

  @Prop()
  startedAt: Date;

  @Prop()
  completedAt: Date;

  @Prop()
  cancelledAt: Date;

  @Prop()
  cancelledBy: string; // 'user' | 'driver' | 'system'

  @Prop()
  cancellationReason: string;

  @Prop({ type: [Types.ObjectId], default: [] })
  rejectedDrivers: Types.ObjectId[];

  @Prop()
  promoCode: string;

  @Prop()
  otp: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Indexes
BookingSchema.index({ userId: 1 });
BookingSchema.index({ driverId: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ vehicleType: 1 });
BookingSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
BookingSchema.index({ 'dropLocation.coordinates': '2dsphere' });
BookingSchema.index({ requestedAt: -1 });
BookingSchema.index({ completedAt: -1 });
BookingSchema.index({ createdAt: -1 }); 