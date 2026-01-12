import { IsNotEmpty, IsString, IsOptional, Length, Matches, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '../../../common/enums';

export class RegisterUserDto {
  @ApiProperty({
    description: 'Country code with + prefix',
    example: '+91'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+\d{1,4}$/, { message: 'Country code must start with + followed by 1-4 digits' })
  countryCode: string;

  @ApiProperty({
    description: 'Phone number without country code',
    example: '9876543210'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{8,12}$/, { message: 'Phone number must be 8-12 digits' })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'User type - user or driver',
    enum: UserType,
    example: UserType.USER,
    default: UserType.USER
  })
  @IsOptional()
  @IsEnum(UserType, { message: 'Type must be either user or driver' })
  type?: UserType;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Language preference (for drivers)', enum: ['en', 'hi'], example: 'en' })
  @IsOptional()
  @IsString()
  @Matches(/^(en|hi)$/, { message: 'Language must be either en or hi' })
  language?: 'en' | 'hi';
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Country code with + prefix',
    example: '+91'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+\d{1,4}$/, { message: 'Country code must start with + followed by 1-4 digits' })
  countryCode: string;

  @ApiProperty({
    description: 'Phone number without country code',
    example: '9876543210'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{8,12}$/, { message: 'Phone number must be 8-12 digits' })
  phoneNumber: string;

  @ApiProperty({
    description: '6-digit OTP',
    example: '123456'
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;

  @ApiPropertyOptional({
    description: 'User type - user or driver',
    enum: UserType,
    example: UserType.USER
  })
  @IsOptional()
  @IsEnum(UserType, { message: 'Type must be either user or driver' })
  type?: UserType;
}

export class ResendOtpDto {
  @ApiProperty({
    description: 'Country code with + prefix',
    example: '+91'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+\d{1,4}$/, { message: 'Country code must start with + followed by 1-4 digits' })
  countryCode: string;

  @ApiProperty({
    description: 'Phone number without country code',
    example: '9876543210'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{8,12}$/, { message: 'Phone number must be 8-12 digits' })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'User type - user or driver',
    enum: UserType,
    example: UserType.USER
  })
  @IsOptional()
  @IsEnum(UserType, { message: 'Type must be either user or driver' })
  type?: UserType;
} 