import { IsNotEmpty, IsString, IsNumber, IsLatitude, IsLongitude, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoordinatesDto {
  @ApiProperty({ description: 'Longitude coordinate', example: 77.2090 })
  @IsNotEmpty()
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiProperty({ description: 'Latitude coordinate', example: 28.6139 })
  @IsNotEmpty()
  @IsNumber()
  @IsLatitude()
  latitude: number;
}

export class LocationDto {
  @ApiProperty({ description: 'Address string', example: 'Connaught Place, New Delhi' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ description: 'Coordinates', type: CoordinatesDto })
  @IsNotEmpty()
  coordinates: CoordinatesDto;

  @ApiPropertyOptional({ description: 'Landmark', example: 'Near Metro Station' })
  @IsOptional()
  @IsString()
  landmark?: string;
} 