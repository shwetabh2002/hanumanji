import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebsocketGateway } from './websocket.gateway';
import { LocationModule } from '../location/location.module';

/**
 * WebSocket Module (Phase 1 Implementation)
 *
 * Handles all real-time communication:
 * - Ride requests to captains
 * - Ride matched notifications to riders
 * - Real-time driver location updates (map preview)
 * - Captain location updates
 * - Ride status changes (started, completed, cancelled)
 * - Event-driven architecture
 */
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    LocationModule, // For RedisLocationService
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
