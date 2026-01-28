import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Configuration
import appConfig from './common/config/app.config';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DriverModule } from './modules/driver/driver.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LocationModule } from './modules/location/location.module';

// Phase 1 Feature Modules (New Implementation)
import { BookingsModule } from './modules/bookings/bookings.module';
import { RidersModule } from './modules/riders/riders.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

// Shared Infrastructure Modules
import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { KafkaModule } from './shared/kafka/kafka.module';
import { WebSocketModule } from './shared/websocket/websocket.module';
import { HttpModule } from './shared/http/http.module';
import { ServicesModule } from './shared/services/services.module';

// Global Providers
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Middleware
import { JwtAuthMiddleware } from './modules/auth/middlewares/jwt-auth.middleware';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';

// Controllers
import { AppController } from './app.controller';

/**
 * Root Application Module
 * 
 * Orchestrates all feature and infrastructure modules.
 * Follows modular monolith architecture with clear separation:
 * 
 * - Feature Modules: Business logic (auth, booking, etc.)
 * - Shared Modules: Cross-cutting infrastructure (db, redis, kafka)
 * - Global Providers: Filters, interceptors, guards
 */
@Module({
  imports: [
    // ─────────────────────────────────────────────────────────────
    // Configuration (loaded first, available globally)
    // ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true, // Cache env vars for performance
    }),

    // ─────────────────────────────────────────────────────────────
    // Infrastructure Modules
    // ─────────────────────────────────────────────────────────────
    DatabaseModule,     // MongoDB
    RedisModule,        // Redis (caching, real-time state)
    KafkaModule,        // Event streaming
    WebSocketModule,    // Real-time client communication
    HttpModule,         // External HTTP clients
    ServicesModule,     // Shared services (Google Maps, etc.)

    // ─────────────────────────────────────────────────────────────
    // Framework Modules
    // ─────────────────────────────────────────────────────────────
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get<number>('app.throttle.ttl', 60) * 1000,
        limit: config.get<number>('app.throttle.limit', 100),
      }],
    }),
    ScheduleModule.forRoot(),

    // ─────────────────────────────────────────────────────────────
    // Feature Modules (Business Logic)
    // ─────────────────────────────────────────────────────────────
    AuthModule,
    UserModule,
    DriverModule,
    PaymentsModule,
    LocationModule,

    // Phase 1 Implementation Modules
    BookingsModule,
    RidersModule,
    WebsocketModule,
  ],

  controllers: [AppController],

  providers: [
    // Global rate limiting
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    
    // Global exception handling
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    
    // Global request/response logging
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  /**
   * Configure middleware pipeline
   * Order matters: RequestId → Auth
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*')
      .apply(JwtAuthMiddleware)
      .forRoutes('*');
  }
}
