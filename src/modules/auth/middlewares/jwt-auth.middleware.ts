import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  // Only allow registration without auth; everything else requires Authorization
  private readonly publicPaths: RegExp[] = [
    /^\/users\/register$/,
    /^\/auth\/refresh$/,
    /^\/users\/verify-otp$/,
    /^\/users\/resend-otp$/,
    /^\/auth\/login-otp$/,
  ];

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: any, res: any, next: () => void) {
    const path: string = req.originalUrl || req.url || '';

    // Skip public paths
    if (this.publicPaths.some((re) => re.test(path))) {
      return next();
    }

    const authHeader: string | undefined = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return this.unauthorized(res);
    }

    const token = authHeader.substring('Bearer '.length);

    try {
      const secret = this.configService.get<string>('app.jwt.secret');
      const decoded = this.jwtService.verify(token, { secret });
      req.user = decoded;
      return next();
    } catch {
      return this.unauthorized(res);
    }
  }

  private unauthorized(res: any) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }),
    );
  }
} 