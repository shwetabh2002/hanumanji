import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  // Public paths that don't require authentication
  private readonly publicPaths: RegExp[] = [
    // User auth
    /^\/users\/register$/,
    /^\/users\/verify-otp$/,
    /^\/users\/resend-otp$/,
    /^\/auth\/refresh$/,
    /^\/auth\/login-otp$/,

    // Driver auth
    /^\/driver\/auth\/register$/,
    /^\/driver\/auth\/verify-otp$/,
    /^\/driver\/auth\/resend-otp$/,

    // Driver operations (public endpoints)
    /^\/api\/v1\/drivers\/.+\/location$/,

    // Rider operations (public endpoints)
    /^\/api\/v1\/riders\/quick-destinations/,
    /^\/api\/v1\/riders\/estimate/,
    /^\/api\/v1\/riders\/map-preview$/,

    // Booking operations (public for testing - should be protected in production)
    /^\/api\/v1\/bookings\/[^\/]+$/,           // GET /api/v1/bookings/:id
    /^\/api\/v1\/bookings\/[^\/]+\/accept$/,   // POST /api/v1/bookings/:id/accept
    /^\/api\/v1\/bookings\/[^\/]+\/reject$/,   // POST /api/v1/bookings/:id/reject
    /^\/api\/v1\/bookings\/[^\/]+\/start$/,    // POST /api/v1/bookings/:id/start
    /^\/api\/v1\/bookings\/[^\/]+\/complete$/, // POST /api/v1/bookings/:id/complete
    /^\/api\/v1\/bookings\/[^\/]+\/cancel$/,   // POST /api/v1/bookings/:id/cancel

    // Public endpoints
    /^\/bookings\/estimate\/fare/,
    /^\/drivers\/nearby/,
    /^\/drivers\/online-count$/,
    /^\/health$/,
    /^\/api\/docs/,
    /^\/$/,
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