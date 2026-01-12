import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeofenceService } from './geofence.service';
import { RedisLocationService } from './redis-location.service';

/**
 * Location Module
 *
 * Handles all location-based services:
 * - Geofencing (service area validation)
 * - Redis-based captain location tracking
 * - Popular destinations management
 */
@Module({
  imports: [ConfigModule],
  providers: [GeofenceService, RedisLocationService],
  controllers: [],
  exports: [GeofenceService, RedisLocationService],
})
export class LocationModule {} 