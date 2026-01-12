import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { RidersController } from './riders.controller';

// Dependencies
import { LocationModule } from '../location/location.module';
import { BookingsModule } from '../bookings/bookings.module';

/**
 * Riders Module (Phase 1 Implementation)
 *
 * Handles all Phase 1 rider operations:
 * - Quick destinations with backend-calculated fares
 * - Custom destination fare estimates
 * - Backend-heavy architecture (thin mobile client)
 */
@Module({
  imports: [
    ConfigModule,
    LocationModule, // For GeofenceService
    BookingsModule, // For FareCalculationService
  ],
  controllers: [RidersController],
  providers: [],
  exports: [],
})
export class RidersModule {}
