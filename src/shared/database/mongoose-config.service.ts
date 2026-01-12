import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * MongoDB Configuration Service
 * 
 * Handles all MongoDB connection configuration and lifecycle logging.
 * Extracted from AppModule for testability and separation of concerns.
 */
@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  private readonly logger = new Logger('MongoDB');

  constructor(private readonly configService: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    const uri = this.configService.get<string>('app.database.uri');
    const options = this.configService.get('app.database.options');
    const dbName = this.extractDatabaseName(uri);

    this.logger.log(`Connecting to MongoDB...`);

    return {
      uri,
      ...options,
      onConnectionCreate: (connection: Connection) => {
        this.handleConnectionCreated(connection, dbName);
      },
    };
  }

  /**
   * Extract database name from MongoDB URI
   */
  private extractDatabaseName(uri: string | undefined): string {
    if (!uri) return 'unknown';
    
    try {
      // Handle both formats:
      // mongodb://host:port/dbname
      // mongodb://host:port/dbname?authSource=admin
      const url = new URL(uri);
      const pathname = url.pathname;
      return pathname.startsWith('/') ? pathname.slice(1).split('?')[0] : 'unknown';
    } catch {
      // Fallback regex for non-standard URIs
      const match = uri.match(/\/([^/?]+)(\?|$)/);
      return match?.[1] || 'unknown';
    }
  }

  /**
   * Handle MongoDB connection lifecycle events
   */
  private handleConnectionCreated(connection: Connection, dbName: string): void {
    this.logger.log(`✅ Connected successfully to mongoDb`);
    this.logger.log(`🗄️ Database: ${dbName}`);

    // Log host info when connection is ready
    connection.asPromise()
      .then(() => {
        if (connection.host && connection.port) {
          this.logger.log(`🌐 Host: ${connection.host}:${connection.port}`);
        }
      })
      .catch(() => {
        // Silently ignore - connection might close before promise resolves
      });

    // Connection event handlers
    connection.on('disconnected', () => {
      this.logger.warn('Disconnected from MongoDB');
    });

    connection.on('error', (error: Error) => {
      this.logger.error(`Connection error: ${error.message}`);
    });

    connection.on('reconnected', () => {
      this.logger.log('Reconnected to MongoDB');
    });
  }
}

