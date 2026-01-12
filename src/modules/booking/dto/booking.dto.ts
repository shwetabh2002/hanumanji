import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType, PaymentMethod, BookingStatus } from '../../../common/enums';

export class LocationDto {
  @ApiProperty({ description: 'Address string', example: 'Connaught Place, New Delhi' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Latitude', example: 28.6139 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 77.2090 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'Landmark', example: 'Near Metro Station' })
  @IsOptional()
  @IsString()
  landmark?: string;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'Pickup location', type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  pickupLocation: LocationDto;

  @ApiProperty({ description: 'Drop location', type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  dropLocation: LocationDto;

  @ApiProperty({ description: 'Vehicle type', enum: VehicleType })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiPropertyOptional({ description: 'Payment method', enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Promo code' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({ description: 'Scheduled time for future booking' })
  @IsOptional()
  scheduledTime?: Date;
}

export class AcceptBookingDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  bookingId: string;
}

export class RejectBookingDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  bookingId: string;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelBookingDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  bookingId: string;

  @ApiProperty({ description: 'Cancellation reason' })
  @IsString()
  reason: string;
}

export class StartRideDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  bookingId: string;

  @ApiProperty({ description: 'OTP provided by user' })
  @IsString()
  otp: string;
}

export class CompleteRideDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  bookingId: string;

  @ApiPropertyOptional({ description: 'Actual distance in meters' })
  @IsOptional()
  @IsNumber()
  actualDistance?: number;

  @ApiPropertyOptional({ description: 'Actual duration in seconds' })
  @IsOptional()
  @IsNumber()
  actualDuration?: number;
}

export class RateRideDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  bookingId: string;

  @ApiProperty({ description: 'Rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Feedback' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

// Response DTOs
export class FareEstimateDto {
  @ApiProperty()
  baseFare: number;

  @ApiProperty()
  distanceFare: number;

  @ApiProperty()
  timeFare: number;

  @ApiProperty()
  surgeMultiplier: number;

  @ApiProperty()
  discount: number;

  @ApiProperty()
  tax: number;

  @ApiProperty()
  totalFare: number;

  @ApiProperty()
  estimatedDistance: number;

  @ApiProperty()
  estimatedDuration: number;
}

export class BookingResponseDto {
  @ApiProperty()
  bookingId: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty()
  pickupLocation: LocationDto;

  @ApiProperty()
  dropLocation: LocationDto;

  @ApiProperty({ enum: VehicleType })
  vehicleType: VehicleType;

  @ApiProperty()
  estimatedFare: number;

  @ApiProperty()
  estimatedDistance: number;

  @ApiProperty()
  estimatedDuration: number;

  @ApiPropertyOptional()
  driverId?: string;

  @ApiPropertyOptional()
  otp?: string;

  @ApiPropertyOptional()
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehicleNumber: string;
    rating: number;
  };
}

export class NearbyBookingsDto {
  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Radius in km', default: 5 })
  @IsOptional()
  @IsNumber()
  radiusKm?: number;
}

