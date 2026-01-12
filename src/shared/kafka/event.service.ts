import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KafkaProducerService } from './kafka-producer.service';
import { KAFKA_TOPICS } from './kafka.config';
import { DomainEvents } from '../events/events.constants';

export interface EventOptions {
  /**
   * Use Kafka for distributed delivery (default: true for critical events)
   */
  distributed?: boolean;
  
  /**
   * Correlation ID for tracing
   */
  correlationId?: string;
  
  /**
   * Key for Kafka partitioning (ensures ordering)
   */
  partitionKey?: string;
}

/**
 * Unified Event Service
 * 
 * Strategy:
 * - Critical events (bookings, payments) → Kafka (durable, distributed)
 * - Local events (cache invalidation, metrics) → EventEmitter (fast, in-process)
 * 
 * This abstraction allows:
 * 1. Easy switching between backends
 * 2. Gradual migration to microservices
 * 3. Fallback to EventEmitter if Kafka is down
 */
@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  // Events that MUST go through Kafka for durability
  private readonly distributedEvents: Set<string> = new Set([
    DomainEvents.BOOKING_CREATED,
    DomainEvents.BOOKING_ACCEPTED,
    DomainEvents.BOOKING_COMPLETED,
    DomainEvents.BOOKING_CANCELLED,
    DomainEvents.PAYMENT_INITIATED,
    DomainEvents.PAYMENT_COMPLETED,
    DomainEvents.PAYMENT_FAILED,
    DomainEvents.NOTIFICATION_SEND,
  ]);

  // Map event types to Kafka topics
  private readonly eventTopicMap: Record<string, string> = {
    [DomainEvents.BOOKING_CREATED]: KAFKA_TOPICS.BOOKING_EVENTS,
    [DomainEvents.BOOKING_ACCEPTED]: KAFKA_TOPICS.BOOKING_EVENTS,
    [DomainEvents.BOOKING_COMPLETED]: KAFKA_TOPICS.BOOKING_EVENTS,
    [DomainEvents.BOOKING_CANCELLED]: KAFKA_TOPICS.BOOKING_EVENTS,
    [DomainEvents.BOOKING_STARTED]: KAFKA_TOPICS.BOOKING_EVENTS,
    [DomainEvents.BOOKING_REJECTED]: KAFKA_TOPICS.BOOKING_EVENTS,
    [DomainEvents.DRIVER_ONLINE]: KAFKA_TOPICS.DRIVER_EVENTS,
    [DomainEvents.DRIVER_OFFLINE]: KAFKA_TOPICS.DRIVER_EVENTS,
    [DomainEvents.DRIVER_LOCATION_UPDATED]: KAFKA_TOPICS.DRIVER_EVENTS,
    [DomainEvents.PAYMENT_INITIATED]: KAFKA_TOPICS.PAYMENT_EVENTS,
    [DomainEvents.PAYMENT_COMPLETED]: KAFKA_TOPICS.PAYMENT_EVENTS,
    [DomainEvents.PAYMENT_FAILED]: KAFKA_TOPICS.PAYMENT_EVENTS,
    [DomainEvents.PAYMENT_REFUNDED]: KAFKA_TOPICS.PAYMENT_EVENTS,
    [DomainEvents.NOTIFICATION_SEND]: KAFKA_TOPICS.NOTIFICATION_EVENTS,
  };

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * Emit an event - automatically routes to Kafka or EventEmitter
   */
  async emit<T>(eventType: string, payload: T, options?: EventOptions): Promise<void> {
    const shouldUseKafka = options?.distributed ?? this.distributedEvents.has(eventType);
    const topic = this.eventTopicMap[eventType];

    // Always emit locally for in-process listeners
    this.eventEmitter.emit(eventType, {
      eventType,
      payload,
      timestamp: new Date(),
      correlationId: options?.correlationId,
    });

    // Also publish to Kafka for distributed events
    if (shouldUseKafka && topic) {
      try {
        await this.kafkaProducer.publish(topic, eventType, payload, {
          key: options?.partitionKey,
          correlationId: options?.correlationId,
        });
        this.logger.debug(`Event ${eventType} published to Kafka topic ${topic}`);
      } catch (error) {
        this.logger.error(`Failed to publish ${eventType} to Kafka:`, error.message);
        // Event was already emitted locally, so processing continues
      }
    }
  }

  /**
   * Emit booking event
   */
  async emitBookingEvent<T>(eventType: string, payload: T, bookingId: string): Promise<void> {
    await this.emit(eventType, payload, {
      distributed: true,
      partitionKey: bookingId,
    });
  }

  /**
   * Emit driver event
   */
  async emitDriverEvent<T>(eventType: string, payload: T, driverId: string): Promise<void> {
    await this.emit(eventType, payload, {
      distributed: true,
      partitionKey: driverId,
    });
  }

  /**
   * Emit payment event (always distributed - critical)
   */
  async emitPaymentEvent<T>(eventType: string, payload: T, paymentId: string): Promise<void> {
    await this.emit(eventType, payload, {
      distributed: true,
      partitionKey: paymentId,
    });
  }

  /**
   * Emit notification event
   */
  async emitNotification<T>(payload: T, userId: string): Promise<void> {
    await this.emit(DomainEvents.NOTIFICATION_SEND, payload, {
      distributed: true,
      partitionKey: userId,
    });
  }

  /**
   * Emit local-only event (not distributed)
   */
  emitLocal<T>(eventType: string, payload: T): void {
    this.eventEmitter.emit(eventType, {
      eventType,
      payload,
      timestamp: new Date(),
    });
  }
}

