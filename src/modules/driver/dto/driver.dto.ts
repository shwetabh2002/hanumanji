import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { VehicleType } from '../../../common/enums';

export class UpdateLocationDto {
  @ApiProperty({ description: 'Latitude', example: 28.4739 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 77.5089 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'Heading in degrees', example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiPropertyOptional({ description: 'Speed in km/h', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;
}

export class NearbyDriversDto {
  @ApiProperty({ description: 'Latitude', example: 28.4739 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 77.5089 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'Search radius in km', example: 5, default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Vehicle type filter', enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ description: 'Max results', example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class DriverStatusDto {
  @ApiProperty({ description: 'Driver status', enum: ['online', 'offline'] })
  @IsEnum(['online', 'offline'])
  status: 'online' | 'offline';
}

export class NearbyDriverResponseDto {
  @ApiProperty()
  driverId: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ description: 'Distance in km' })
  distance: number;

  @ApiPropertyOptional()
  vehicleType?: string;

  @ApiPropertyOptional()
  heading?: number;
}

