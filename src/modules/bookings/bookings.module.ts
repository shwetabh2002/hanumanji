import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Schemas
import { Booking } from '../database/schemas/booking.schema';
import { BookingSchema } from '../database/schemas/booking.schema';
import { Driver, DriverSchema } from '../database/schemas/driver.schema';
import { User, UserSchema } from '../database/schemas/user.schema';

// Services
import { FareCalculationService } from './services/fare-calculation.service';
import { CaptainMatchingService } from './services/captain-matching.service';
import { RideManagementService } from './services/ride-management.service';

// Controllers
import { BookingsController } from './bookings.controller';

// Dependencies
import { LocationModule } from '../location/location.module';
import { DriverModule } from '../driver/driver.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Bookings Module (Phase 1 Implementation)
 *
 * Handles all Phase 1 booking/ride operations:
 * - Fare calculation with phase-based pricing
 * - Captain matching (nearest available)
 * - Complete ride lifecycle management (SEARCHING → COMPLETED)
 * - Event-driven architecture for real-time updates
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Driver.name, schema: DriverSchema },  // Import Driver model for CaptainMatchingService
      { name: User.name, schema: UserSchema },      // Import User model for RideManagementService
    ]),
    AuthModule,     // For JWT authentication
    LocationModule, // For GeofenceService, RedisLocationService
    DriverModule,   // For DriverOnboardingService
    UserModule,     // For UserService
  ],
  providers: [
    FareCalculationService,
    CaptainMatchingService,
    RideManagementService,
  ],
  controllers: [BookingsController],
  exports: [
    FareCalculationService,
    CaptainMatchingService,
    RideManagementService,
  ],
})
export class BookingsModule {}
