import { IsString, IsNotEmpty, IsObject, IsOptional, Matches, Length, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleType } from '../../../common/enums';

class VehicleDetailsDto {
  @ApiProperty({ example: 'bike', enum: VehicleType, description: 'Vehicle type' })
  @IsEnum(VehicleType)
  @IsNotEmpty()
  type: VehicleType;

  @ApiProperty({ example: 'Honda', description: 'Vehicle make/manufacturer' })
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiProperty({ example: 'Activa 6G', description: 'Vehicle model' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 2022, description: 'Manufacturing year' })
  @IsNumber()
  @Min(2000)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({ example: 'Black', description: 'Vehicle color' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: 'UP16AB1234', description: 'Vehicle registration number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/, { message: 'Invalid vehicle registration format' })
  registrationNumber: string;

  @ApiProperty({ example: 'UP16202212345678', description: 'RC (Registration Certificate) number', required: false })
  @IsString()
  @IsOptional()
  rcNumber?: string;

  @ApiProperty({ example: 'ABC123456789', description: 'Insurance policy number', required: false })
  @IsString()
  @IsOptional()
  insuranceNumber?: string;

  @ApiProperty({ example: '2025-12-31', description: 'Insurance expiry date', required: false })
  @IsOptional()
  insuranceExpiry?: string;
}

class BankAccountDto {
  @ApiProperty({ example: '1234567890', description: 'Bank account number' })
  @IsString()
  @IsNotEmpty()
  @Length(9, 18)
  accountNumber: string;

  @ApiProperty({ example: 'SBIN0001234', description: 'IFSC code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  ifsc: string;

  @ApiProperty({ example: 'Rajesh Kumar', description: 'Account holder name' })
  @IsString()
  @IsNotEmpty()
  accountHolder: string;
}

export class CompleteRegistrationDto {
  @ApiProperty({ example: '9876543210', description: 'Phone number (10 digits)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
  phoneNumber: string;

  @ApiProperty({ example: 'Rajesh', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  firstName: string;

  @ApiProperty({ example: 'Kumar', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  lastName: string;

  @ApiProperty({ example: 'DL123456789', description: 'Driving license number' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 20)
  licenseNumber: string;

  @ApiProperty({ example: '2028-12-31', description: 'License expiry date', required: false })
  @IsOptional()
  licenseExpiry?: string;

  @ApiProperty({ example: '123456789012', description: 'Aadhaar number (12 digits)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{12}$/, { message: 'Aadhaar must be exactly 12 digits' })
  aadharNumber: string;

  @ApiProperty({ example: 'ABCDE1234F', description: 'PAN number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' })
  panNumber: string;

  @ApiProperty({ type: VehicleDetailsDto, description: 'Complete vehicle details' })
  @IsObject()
  @IsNotEmpty()
  vehicle: VehicleDetailsDto;

  @ApiProperty({ type: BankAccountDto, description: 'Bank account details' })
  @IsObject()
  @IsNotEmpty()
  bankAccount: BankAccountDto;
}
