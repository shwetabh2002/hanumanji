import { IsString, IsNotEmpty, IsObject, IsOptional, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: 'UP16AB1234', description: 'Vehicle registration number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/, { message: 'Invalid vehicle number format' })
  vehicleNumber: string;

  @ApiProperty({ example: 'Honda Activa', description: 'Vehicle model' })
  @IsString()
  @IsNotEmpty()
  vehicleModel: string;

  @ApiProperty({ example: 'DL123456789', description: 'Driving license number' })
  @IsString()
  @IsNotEmpty()
  drivingLicense: string;

  @ApiProperty({ example: '1234', description: 'Last 4 digits of Aadhaar (for privacy)', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'Must be 4 digits' })
  aadhaarLast4?: string;

  @ApiProperty({ type: BankAccountDto, description: 'Bank account details' })
  @IsObject()
  @IsNotEmpty()
  bankAccount: BankAccountDto;
}
