import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UserDocument } from '../user/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      role: user.role,
      phoneNumber: user.phoneNumber,
      countryCode: (user as any).countryCode,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwt.secret'),
      expiresIn: this.configService.get<string>('app.jwt.expiresIn'),
    });
  }

  signRefreshToken(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      tokenId: randomUUID(),
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('app.jwt.refreshExpiresIn'),
    });
  }

  buildAuthResponse(user: UserDocument) {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('app.jwt.expiresIn'),
      user: {
        id: user._id.toString(),
        phoneNumber: user.phoneNumber,
        countryCode: (user as any).countryCode,
        role: user.role,
      },
    };
  }
} 