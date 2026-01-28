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
import { Interval } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { RedisLocationService } from '../location/redis-location.service';

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

  private readonly logger = new Logger(WebsocketGateway.name);

  // Track connected users
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  // Track rider subscriptions for real-time driver updates
  // Maps socketId to subscription data (pickup location)
  private driverLocationSubscriptions = new Map<string, {
    socketId: string;
    pickup: { lat: number; lng: number };
    lastDrivers: string[]; // Track last seen drivers for change detection
  }>();

  constructor(
    private readonly locationService: RedisLocationService
  ) {}

  /**
   * Handle client connection
   */
  handleConnection(@ConnectedSocket() client: ClientSocket) {
    this.logger.log(`✅ Client connected:`, {
      socketId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(@ConnectedSocket() client: ClientSocket) {
    this.logger.log(`❌ Client disconnected:`, {
      socketId: client.id,
      userId: client.userId,
      userType: client.userType,
      timestamp: new Date().toISOString(),
    });

    // Remove from connected users
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.debug(`Removed user ${client.userId} from connected users map`);
    }

    // Remove from driver location subscriptions
    if (this.driverLocationSubscriptions.has(client.id)) {
      this.driverLocationSubscriptions.delete(client.id);
      this.logger.debug(`Removed client ${client.id} from driver location subscriptions`);
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

    this.logger.log(`User registered: ${data.userId} as ${data.userType}`);

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

      this.logger.log(`Ride request sent to captain ${payload.driverId}`);
    } else {
      this.logger.warn(`Captain ${payload.driverId} not connected to WebSocket`);
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

      this.logger.log(`Ride matched notification sent to rider ${payload.riderId}`);
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
   * Subscribe to real-time driver location updates
   * Client subscribes with pickup location to receive nearby driver updates
   *
   * Used for map booking screen - shows moving driver markers in real-time
   */
  @SubscribeMessage('subscribe-driver-locations')
  handleSubscribeDriverLocations(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { pickup: { lat: number; lng: number } }
  ) {
    const { pickup } = data;

    this.logger.log(`📡 Subscribe request received:`, {
      socketId: client.id,
      pickup,
    });

    // Validate pickup coordinates
    if (!pickup || typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number') {
      this.logger.warn(`⚠️ Invalid subscription request from ${client.id}:`, {
        pickup,
      });

      return {
        event: 'error',
        data: {
          success: false,
          message: 'Invalid pickup coordinates'
        }
      };
    }

    // Store subscription
    this.driverLocationSubscriptions.set(client.id, {
      socketId: client.id,
      pickup,
      lastDrivers: []
    });

    this.logger.log(`✅ Client subscribed to driver locations:`, {
      socketId: client.id,
      pickup: `${pickup.lat},${pickup.lng}`,
      totalSubscriptions: this.driverLocationSubscriptions.size,
    });

    return {
      event: 'subscription-confirmed',
      data: {
        success: true,
        message: 'Subscribed to driver location updates'
      }
    };
  }

  /**
   * Unsubscribe from driver location updates
   */
  @SubscribeMessage('unsubscribe-driver-locations')
  handleUnsubscribeDriverLocations(@ConnectedSocket() client: Socket) {
    const hadSubscription = this.driverLocationSubscriptions.has(client.id);
    this.driverLocationSubscriptions.delete(client.id);

    this.logger.log(`🔌 Client unsubscribed from driver locations:`, {
      socketId: client.id,
      hadSubscription,
      remainingSubscriptions: this.driverLocationSubscriptions.size,
    });

    return {
      event: 'unsubscription-confirmed',
      data: {
        success: true,
        message: 'Unsubscribed from driver location updates'
      }
    };
  }

  /**
   * Broadcast driver location updates every 3 seconds
   * Runs automatically for all subscribed clients
   */
  @Interval(3000) // Every 3 seconds
  async broadcastDriverLocationUpdates() {
    // Skip if no subscriptions
    if (this.driverLocationSubscriptions.size === 0) {
      return;
    }

    this.logger.debug(`🔄 Broadcasting driver locations to ${this.driverLocationSubscriptions.size} subscribers`);

    // Process each subscription
    for (const [socketId, subscription] of this.driverLocationSubscriptions) {
      try {
        const { pickup, lastDrivers } = subscription;

        // Find nearby available drivers (5km radius, max 20)
        const nearbyCaptains = await this.locationService.findNearbyCaptains(
          pickup.lat,
          pickup.lng,
          5, // 5km radius
          20 // Max 20 drivers
        );

        // Filter out busy drivers and build driver list
        const availableDrivers = [];
        for (const captain of nearbyCaptains) {
          const isBusy = await this.locationService.isCaptainBusy(captain.driverId);
          if (!isBusy) {
            // Get driver metadata (heading, speed)
            const location = await this.locationService.getCaptainLocation(captain.driverId);
            if (location) {
              availableDrivers.push({
                id: captain.driverId,
                coordinates: {
                  lat: location.latitude,
                  lng: location.longitude
                },
                heading: location.heading || 0,
                speed: location.speed || 0
              });
            }
          }
        }

        // Detect changes (which drivers are new, which went offline)
        const currentDriverIds = availableDrivers.map(d => d.id);
        const removedDrivers = lastDrivers.filter(id => !currentDriverIds.includes(id));
        const newDrivers = currentDriverIds.filter(id => !lastDrivers.includes(id));

        this.logger.debug(`📡 Emitting driver update to ${socketId}:`, {
          total: nearbyCaptains.length,
          available: availableDrivers.length,
          newDrivers: newDrivers.length,
          removedDrivers: removedDrivers.length,
        });

        // Update last seen drivers
        subscription.lastDrivers = currentDriverIds;

        // Emit update to this specific client
        this.server.to(socketId).emit('driver-locations-update', {
          drivers: availableDrivers,
          removed: removedDrivers,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        this.logger.error(`❌ Error broadcasting to client ${socketId}:`, {
          error: error.message,
          stack: error.stack,
        });
      }
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
