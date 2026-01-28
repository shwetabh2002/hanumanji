import { Module, Global } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';

/**
 * Shared Services Module
 *
 * Provides common services used across modules:
 * - Google Maps integration
 * - Other external API integrations
 */
@Global()
@Module({
  providers: [GoogleMapsService],
  exports: [GoogleMapsService],
})
export class ServicesModule {}
