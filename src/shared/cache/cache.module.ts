import { Module, Logger } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('Redis');
        const host = configService.get<string>('app.redis.host');
        const port = configService.get<number>('app.redis.port');
        
        return {
          type: 'single',
          url: `redis://${host}:${port}`,
          options: {
            password: configService.get<string>('app.redis.password') || undefined,
            db: configService.get<number>('app.redis.db'),
            keyPrefix: configService.get<string>('app.redis.keyPrefix'),
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            onConnect: () => {
              logger.log('✅ Redis connected successfully');
              logger.log(`🔴 Redis: ${host}:${port}`);
              logger.log(`📊 Redis connection state: CONNECTED`);
            },
            onError: (error: Error) => {
              logger.error('💥 Redis connection error:', error.message);
            },
            onClose: () => {
              logger.warn('❌ Redis connection closed');
            },
            onReconnecting: () => {
              logger.log('🔄 Redis reconnecting...');
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [RedisModule],
})
export class CacheModule {} 