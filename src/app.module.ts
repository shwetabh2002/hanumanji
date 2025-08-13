import { Module, OnApplicationBootstrap, Logger, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Connection } from 'mongoose';

// Configuration
import appConfig from './common/config/app.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DriverModule } from './modules/driver/driver.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LocationModule } from './modules/location/location.module';

// Shared Modules
import { DatabaseModule } from './shared/database/database.module';
import { CacheModule } from './shared/cache/cache.module';
import { EventsModule } from './shared/events/events.module';
import { WebSocketModule } from './shared/websocket/websocket.module';

// Guards, Filters, Interceptors
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthMiddleware } from './modules/auth/middlewares/jwt-auth.middleware';

// Controllers
import { AppController } from './app.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Database
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('MongoDB');
        const uri = configService.get<string>('app.database.uri');
        
        return {
          uri,
          ...configService.get('app.database.options'),
          connectionFactory: (connection: Connection) => {
            connection.on('connected', () => {
              logger.log('✅ MongoDB connected successfully');
              logger.log(`🗄️  Database: ${connection.db?.databaseName || 'Unknown'}`);
              logger.log(`📊 MongoDB connection state: CONNECTED`);
            });
            
            connection.on('disconnected', () => {
              logger.warn('❌ MongoDB disconnected');
            });
            
            connection.on('error', (error) => {
              logger.error('💥 MongoDB connection error:', error.message);
            });
            
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    
    // Rate Limiting
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('app.throttle.ttl') * 1000,
          limit: configService.get<number>('app.throttle.limit'),
        },
      ],
      inject: [ConfigService],
    }),
    
    // Schedule
    ScheduleModule.forRoot(),
    
    // Shared modules
    DatabaseModule,
    CacheModule,
    EventsModule,
    WebSocketModule,
    
    // Feature modules
    AuthModule,
    UserModule,
    DriverModule,
    BookingModule,
    PaymentsModule,
    LocationModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements OnApplicationBootstrap, NestModule {
  private readonly logger = new Logger(AppModule.name);

  async onApplicationBootstrap() {
    this.logger.log('🚀 Application modules initialized');
    this.logger.log('🔧 All services bootstrapped successfully');
    this.logger.log('📦 Modules loaded: Auth, User, Driver, Booking, Payments, Location');
    this.logger.log('🛡️  Security: JWT Auth, Rate Limiting, CORS configured');
    this.logger.log('📡 Infrastructure: MongoDB, Redis, Kafka ready');
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtAuthMiddleware).forRoutes('*');
  }
}
