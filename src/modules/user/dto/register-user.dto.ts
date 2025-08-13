import { IsNotEmpty, IsString, IsPhoneNumber, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterUserDto {

  @IsNotEmpty()
  phoneNumber: string;


  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

}

export class VerifyOtpDto {
  @ApiProperty({ 
    description: 'Phone number', 
    example: '+919876543210' 
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber('IN')
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
}

export class ResendOtpDto {
  @ApiProperty({ 
    description: 'Phone number', 
    example: '+919876543210' 
  })
  @IsNotEmpty()
  @IsString()
  @IsPhoneNumber('IN')
  phoneNumber: string;
} 