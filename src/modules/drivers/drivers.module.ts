import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Schemas
import { Driver } from '../database/schemas/driver.schema';
import { DriverSchema } from '../database/schemas/driver.schema';

// Services
import { DriverOnboardingService } from './services/driver-onboarding.service';

// Controllers
import { DriversController } from './drivers.controller';

// Dependencies
import { LocationModule } from '../location/location.module';
import { DriverModule } from '../driver/driver.module';

/**
 * Drivers Module (Phase 1 Implementation)
 *
 * Handles all Phase 1 driver/captain operations:
 * - Instant driver onboarding (APPROVED_PENDING_DOCS)
 * - Driver profile management
 * - Online/Offline status management
 * - Location updates (every 10s)
 * - Document upload handling
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    MongooseModule.forFeature([{ name: Driver.name, schema: DriverSchema }]),
    LocationModule, // For RedisLocationService, GeofenceService
    DriverModule, // For DriverService to update MongoDB status
  ],
  providers: [DriverOnboardingService],
  controllers: [DriversController],
  exports: [
    DriverOnboardingService,
    MongooseModule, // ✅ Re-export MongooseModule so other modules can access Driver model
  ],
})
export class DriversModule {}
