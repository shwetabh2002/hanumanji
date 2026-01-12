import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  @Expose()
  @Transform(({ obj }) => obj._id.toString())
  id: string;

  @ApiProperty({ description: 'Phone number', example: '+919876543210' })
  @Expose()
  phoneNumber: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @Expose()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @Expose()
  lastName: string;

  @ApiProperty({ description: 'Email address', example: 'john@example.com' })
  @Expose()
  email?: string;

  @ApiProperty({ description: 'User role', example: 'user' })
  @Expose()
  role: string;

  @ApiProperty({ description: 'Phone verification status', example: true })
  @Expose()
  isPhoneVerified: boolean;

  @ApiProperty({ description: 'Account verification status', example: true })
  @Expose()
  isVerified: boolean;

  @ApiProperty({ description: 'Account active status', example: true })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Address object', required: false })
  @Expose()
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates: [number, number];
  };

  // Exclude sensitive fields
  @Exclude()
  password: string;

  @Exclude()
  otp: string;

  @Exclude()
  otpExpiry: Date;

  @Exclude()
  refreshToken: string;
}

export class RegisterResponseDto {
  @ApiProperty({ description: 'Success message', example: 'OTP sent successfully' })
  message: string;

  @ApiProperty({ description: 'Country code with + prefix', example: '+91' })
  countryCode: string;

  @ApiProperty({ description: 'Phone number without country code', example: '9876543210' })
  phoneNumber: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'OTP expiry time' })
  otpExpiry: Date;

  @ApiProperty({})
  accessToken: string;

  @ApiProperty({})
  refreshToken: string;

  @ApiProperty({})
  otp?: string;
}

export class VerifyOtpResponseDto {
  @ApiProperty({ description: 'Success message', example: 'Phone number verified successfully' })
  message: string;

  @ApiProperty({ description: 'User details', type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ description: 'Access token', required: false })
  accessToken?: string;

  @ApiProperty({ description: 'Refresh token', required: false })
  refreshToken?: string;
}

export class ResendOtpResponseDto {
  @ApiProperty({ description: 'Success message', example: 'OTP resent successfully' })
  message: string;

  @ApiProperty({ description: 'Country code with + prefix', example: '+91' })
  countryCode: string;

  @ApiProperty({ description: 'Phone number without country code', example: '9876543210' })
  phoneNumber: string;

  @ApiProperty({ description: 'OTP expiry time' })
  otpExpiry: Date;

  @ApiProperty({ description: 'OTP (only for testing)', example: '654321', required: false })
  otp?: string;
} 