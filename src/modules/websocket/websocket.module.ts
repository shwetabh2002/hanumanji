import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebsocketGateway } from './websocket.gateway';

/**
 * WebSocket Module (Phase 1 Implementation)
 *
 * Handles all real-time communication:
 * - Ride requests to captains
 * - Ride matched notifications to riders
 * - Captain location updates
 * - Ride status changes (started, completed, cancelled)
 * - Event-driven architecture
 */
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
