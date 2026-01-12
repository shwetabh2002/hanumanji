import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { KafkaConsumerService, MessageHandler } from '../../../shared/kafka/kafka-consumer.service';
import { KAFKA_TOPICS, CONSUMER_GROUPS } from '../../../shared/kafka/kafka.config';
import { DomainEvents } from '../../../shared/events/events.constants';

/**
 * Booking Event Handler
 * 
 * Demonstrates both:
 * 1. Local EventEmitter listeners (in-process)
 * 2. Kafka consumers (distributed)
 * 
 * In production, you'd typically use Kafka consumers for:
 * - Cross-service communication
 * - Durable message processing
 * - Scalable event handling
 */
@Injectable()
export class BookingEventHandler implements OnModuleInit {
  private readonly logger = new Logger(BookingEventHandler.name);

  constructor(private readonly kafkaConsumer: KafkaConsumerService) {}

  async onModuleInit() {
    // Subscribe to Kafka topic for distributed events
    await this.subscribeToKafkaEvents();
  }

  // ============ Kafka Consumers ============

  private async subscribeToKafkaEvents(): Promise<void> {
    try {
      await this.kafkaConsumer.subscribe(
        KAFKA_TOPICS.BOOKING_EVENTS,
        CONSUMER_GROUPS.BOOKING_SERVICE,
        this.handleBookingEvent.bind(this),
      );
      this.logger.log('Subscribed to booking events topic');
    } catch (error) {
      // Don't fail if Kafka is not available in dev
      this.logger.warn(`Kafka subscription skipped: ${error.message}`);
    }
  }

  private async handleBookingEvent(
    eventType: string,
    payload: any,
    metadata: any,
  ): Promise<void> {
    this.logger.log(`[KAFKA] Processing ${eventType}`, { messageId: metadata.messageId });

    switch (eventType) {
      case DomainEvents.BOOKING_CREATED:
        await this.onBookingCreatedKafka(payload);
        break;
      case DomainEvents.BOOKING_ACCEPTED:
        await this.onBookingAcceptedKafka(payload);
        break;
      case DomainEvents.BOOKING_COMPLETED:
        await this.onBookingCompletedKafka(payload);
        break;
      case DomainEvents.BOOKING_CANCELLED:
        await this.onBookingCancelledKafka(payload);
        break;
      default:
        this.logger.debug(`Unhandled booking event: ${eventType}`);
    }
  }

  private async onBookingCreatedKafka(payload: any): Promise<void> {
    this.logger.log(`[KAFKA] Booking created: ${payload.bookingId}`);
    // This is where you'd:
    // - Trigger driver matching algorithm
    // - Send push notifications to nearby drivers
    // - Start timeout timer
  }

  private async onBookingAcceptedKafka(payload: any): Promise<void> {
    this.logger.log(`[KAFKA] Booking accepted: ${payload.bookingId} by driver ${payload.driverId}`);
    // This is where you'd:
    // - Notify user via push notification
    // - Start ETA calculation
    // - Update real-time tracking
  }

  private async onBookingCompletedKafka(payload: any): Promise<void> {
    this.logger.log(`[KAFKA] Booking completed: ${payload.bookingId}`);
    // This is where you'd:
    // - Trigger payment processing
    // - Update driver/user stats
    // - Request ratings
  }

  private async onBookingCancelledKafka(payload: any): Promise<void> {
    this.logger.log(`[KAFKA] Booking cancelled: ${payload.bookingId}`);
    // This is where you'd:
    // - Process refund if applicable
    // - Notify other party
    // - Update cancellation stats
  }

  // ============ Local EventEmitter Listeners ============
  // These handle in-process events (faster, for same-instance processing)

  @OnEvent(DomainEvents.BOOKING_CREATED)
  onBookingCreatedLocal(event: any) {
    this.logger.debug(`[LOCAL] Booking created: ${event.payload.bookingId}`);
    // Quick in-process tasks like cache updates
  }

  @OnEvent(DomainEvents.BOOKING_ACCEPTED)
  onBookingAcceptedLocal(event: any) {
    this.logger.debug(`[LOCAL] Booking accepted: ${event.payload.bookingId}`);
  }

  @OnEvent(DomainEvents.BOOKING_COMPLETED)
  onBookingCompletedLocal(event: any) {
    this.logger.debug(`[LOCAL] Booking completed: ${event.payload.bookingId}`);
  }

  @OnEvent(DomainEvents.BOOKING_CANCELLED)
  onBookingCancelledLocal(event: any) {
    this.logger.debug(`[LOCAL] Booking cancelled: ${event.payload.bookingId}`);
  }
}

