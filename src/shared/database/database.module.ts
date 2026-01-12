import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './mongoose-config.service';

/**
 * Database Module
 * 
 * Centralizes all database configuration and connection management.
 * Global module - imported once in AppModule, available everywhere.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    }),
  ],
  providers: [MongooseConfigService],
  exports: [MongooseConfigService],
})
export class DatabaseModule {}
