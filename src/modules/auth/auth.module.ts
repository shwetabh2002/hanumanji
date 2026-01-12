import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { OtpService } from './services/otp.service';
import { OtpStorageService } from './services/otp-storage.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AuthController } from './auth.controller';
import { RegistrationController } from './registration.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwt.secret'),
        signOptions: { expiresIn: config.get<string>('app.jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => UserModule),
  ],
  providers: [
    AuthService,
    OtpService,
    OtpStorageService,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  controllers: [AuthController, RegistrationController],
  exports: [AuthService, OtpService, OtpStorageService, JwtModule],
})
export class AuthModule {}
