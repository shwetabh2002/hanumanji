import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User, UserSchema } from '../user/schemas/user.schema';
import { DriverService } from './driver.service';
import { DriverLocationService } from './driver-location.service';
import { DriverController } from './driver.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
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
  ],
  providers: [DriverService, DriverLocationService],
  controllers: [DriverController],
  exports: [DriverService, DriverLocationService],
})
export class DriverModule {}
