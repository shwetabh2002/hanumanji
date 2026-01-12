import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * WebSocket Gateway
 *
 * Handles real-time communication between riders and captains
 *
 * Events emitted to clients:
 * - ride_request: Captain receives ride request
 * - ride_matched: Rider receives captain details
 * - captain_location: Real-time captain location updates
 * - ride_status: Ride status changes
 * - ride_cancelled: Ride cancellation notification
 * - ride_started: Ride started notification
 * - ride_completed: Ride completed notification
 */

interface ClientSocket extends Socket {
  userId?: string;
  userType?: 'rider' | 'driver';
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
    credentials: true
  }
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  // Track connected users
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  /**
   * Handle client connection
   */
  handleConnection(@ConnectedSocket() client: ClientSocket) {
    console.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(@ConnectedSocket() client: ClientSocket) {
    console.log(`Client disconnected: ${client.id}`);

    // Remove from connected users
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
    }
  }

  /**
   * Client registers with user ID and type
   */
  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: ClientSocket,
    @MessageBody() data: { userId: string; userType: 'rider' | 'driver' }
  ) {
    client.userId = data.userId;
    client.userType = data.userType;
    this.connectedUsers.set(data.userId, client.id);

    console.log(`User registered: ${data.userId} as ${data.userType}`);

    return {
      event: 'registered',
      data: { success: true, userId: data.userId }
    };
  }

  /**
   * Send ride request to specific captain
   * Triggered by captain matching service
   */
  @OnEvent('ride.request.send')
  async handleRideRequest(payload: {
    bookingId: string;
    driverId: string;
    rideDetails: any;
  }) {
    const socketId = this.connectedUsers.get(payload.driverId);

    if (socketId) {
      this.server.to(socketId).emit('ride_request', {
        bookingId: payload.bookingId,
        ...payload.rideDetails,

        // Auto-reject timer
        expiresIn: 30,

        displayMessage: 'New ride request!',
        displayMessageHi: 'नया ride request!'
      });

      console.log(`Ride request sent to captain ${payload.driverId}`);
    } else {
      console.log(`Captain ${payload.driverId} not connected to WebSocket`);
    }
  }

  /**
   * Notify rider when captain is matched
   * Triggered by ride management service
   */
  @OnEvent('ride.matched')
  async handleRideMatched(payload: {
    bookingId: string;
    riderId: string;
    driverId: string;
  }) {
    const socketId = this.connectedUsers.get(payload.riderId);

    if (socketId) {
      // TODO: Get captain details from database
      this.server.to(socketId).emit('ride_matched', {
        bookingId: payload.bookingId,
        status: 'MATCHED',

        captain: {
          id: payload.driverId,
          // ... captain details
        },

        displayMessage: 'Captain found! On the way to pick you up.',
        displayMessageHi: 'Captain mil gaya! आपको लेने आ रहा है।'
      });

      console.log(`Ride matched notification sent to rider ${payload.riderId}`);
    }
  }

  /**
   * Broadcast captain location updates
   * Called when captain updates location (every 10s)
   */
  async broadcastCaptainLocation(
    driverId: string,
    location: { latitude: number; longitude: number; heading: number; speed: number }
  ) {
    // TODO: Get active ride for this driver
    // For now, broadcast to all connected riders (in production, send only to matched rider)

    this.server.emit('captain_location', {
      driverId,
      location
    });
  }

  /**
   * Notify when ride starts
   */
  @OnEvent('ride.started')
  async handleRideStarted(payload: {
    bookingId: string;
    riderId: string;
    driverId: string;
  }) {
    const riderSocketId = this.connectedUsers.get(payload.riderId);

    if (riderSocketId) {
      this.server.to(riderSocketId).emit('ride_started', {
        bookingId: payload.bookingId,
        status: 'ONGOING',
        startTime: new Date().toISOString(),

        displayMessage: 'Ride started! Enjoy your trip.',
        displayMessageHi: 'Ride शुरू हो गई! सफर का मज़ा लें।'
      });
    }
  }

  /**
   * Notify when ride is completed
   */
  @OnEvent('ride.completed')
  async handleRideCompleted(payload: {
    bookingId: string;
    riderId: string;
    driverId: string;
  }) {
    const riderSocketId = this.connectedUsers.get(payload.riderId);
    const driverSocketId = this.connectedUsers.get(payload.driverId);

    // Notify rider
    if (riderSocketId) {
      this.server.to(riderSocketId).emit('ride_completed', {
        bookingId: payload.bookingId,
        status: 'COMPLETED',

        displayMessage: 'Ride completed! Please rate your captain.',
        displayMessageHi: 'Ride पूरी हो गई! कृपया captain को rate करें।'
      });
    }

    // Notify driver
    if (driverSocketId) {
      this.server.to(driverSocketId).emit('ride_completed', {
        bookingId: payload.bookingId,
        status: 'COMPLETED',

        displayMessage: 'Ride completed! Collect payment from rider.',
        displayMessageHi: 'Ride पूरी हो गई! Rider से payment collect करें।'
      });
    }
  }

  /**
   * Notify when ride is cancelled
   */
  @OnEvent('ride.cancelled')
  async handleRideCancelled(payload: {
    bookingId: string;
    riderId: string;
    driverId: string;
    cancelledBy: 'rider' | 'driver';
    reason?: string;
  }) {
    const riderSocketId = this.connectedUsers.get(payload.riderId);
    const driverSocketId = this.connectedUsers.get(payload.driverId);

    // Notify rider
    if (riderSocketId) {
      this.server.to(riderSocketId).emit('ride_cancelled', {
        bookingId: payload.bookingId,
        status: 'CANCELLED',
        cancelledBy: payload.cancelledBy,
        reason: payload.reason,

        displayMessage: payload.cancelledBy === 'rider'
          ? 'You cancelled the ride'
          : 'Captain cancelled the ride',
        displayMessageHi: payload.cancelledBy === 'rider'
          ? 'आपने ride cancel की'
          : 'Captain ने ride cancel किया'
      });
    }

    // Notify driver
    if (driverSocketId) {
      this.server.to(driverSocketId).emit('ride_cancelled', {
        bookingId: payload.bookingId,
        status: 'CANCELLED',
        cancelledBy: payload.cancelledBy,
        reason: payload.reason,

        displayMessage: payload.cancelledBy === 'driver'
          ? 'You cancelled the ride'
          : 'Rider cancelled the ride',
        displayMessageHi: payload.cancelledBy === 'driver'
          ? 'आपने ride cancel की'
          : 'Rider ने ride cancel किया'
      });
    }
  }

  /**
   * Ping/pong for connection keep-alive
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }
}
