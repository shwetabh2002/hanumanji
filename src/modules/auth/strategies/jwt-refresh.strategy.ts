import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface RefreshPayload {
  sub: string;
  tokenId: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  private readonly logger = new Logger(JwtRefreshStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const refreshSecret = configService.get<string>('app.jwt.refreshSecret');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: refreshSecret,
    });
    this.logger.log(`Initializing JwtRefreshStrategy...`);
    this.logger.log(`JwtRefreshStrategy initialized with secret: ${refreshSecret?.substring(0, 10)}...`);
  }

  async validate(payload: RefreshPayload) {
    this.logger.log(`🔄 JWT Refresh Strategy validate called`);
    this.logger.log(`Payload received: ${JSON.stringify(payload)}`);
    
    if (!payload?.sub || !payload?.tokenId) {
      this.logger.error('❌ Invalid refresh token payload - missing sub or tokenId');
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    this.logger.log('✅ Refresh token validation successful');
    return payload;
  }
} 