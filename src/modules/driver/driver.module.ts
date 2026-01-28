import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { User, UserSchema } from '../user/schemas/user.schema';
import { Driver, DriverSchema } from './schemas/driver.schema';
import { DriverService } from './driver.service';
import { DriverLocationService } from './driver-location.service';
import { DriverOnboardingService } from './services/driver-onboarding.service';
import { DriverController } from './driver.controller';
import { AuthModule } from '../auth/auth.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Driver.name, schema: DriverSchema }
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwt.secret'),
        signOptions: { expiresIn: config.get<string>('app.jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AuthModule), // For OtpService access
    ConfigModule,
    EventEmitterModule.forRoot(),
    LocationModule, // For RedisLocationService, GeofenceService
  ],
  providers: [DriverService, DriverLocationService, DriverOnboardingService],
  controllers: [DriverController],
  exports: [
    DriverService,
    DriverLocationService,
    DriverOnboardingService,
    MongooseModule, // Re-export MongooseModule so other modules can access Driver model
  ],
})
export class DriverModule {}
