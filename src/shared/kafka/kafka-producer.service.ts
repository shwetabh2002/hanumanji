import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, ProducerRecord, RecordMetadata, Partitioners } from 'kafkajs';
import { createKafkaClient, KAFKA_TOPICS } from './kafka.config';
import { randomUUID } from 'crypto';

export interface KafkaMessage<T = any> {
  eventType: string;
  payload: T;
  metadata: {
    messageId: string;
    timestamp: string;
    correlationId?: string;
    source: string;
  };
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    this.kafka = createKafkaClient(configService);
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
      createPartitioner: Partitioners.DefaultPartitioner, // Suppress v2.0 warning
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('✅ Kafka producer connected');
    } catch (error) {
      this.logger.error('❌ Failed to connect Kafka producer:', error.message);
      // Don't throw - allow app to start without Kafka in dev
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    }
  }

  /**
   * Publish a message to a Kafka topic
   */
  async publish<T>(
    topic: string,
    eventType: string,
    payload: T,
    options?: {
      key?: string;
      correlationId?: string;
      headers?: Record<string, string>;
    },
  ): Promise<RecordMetadata[] | null> {
    if (!this.isConnected) {
      this.logger.warn(`Kafka not connected, skipping event: ${eventType}`);
      return null;
    }

    const message: KafkaMessage<T> = {
      eventType,
      payload,
      metadata: {
        messageId: randomUUID(),
        timestamp: new Date().toISOString(),
        correlationId: options?.correlationId,
        source: 'rideit-backend',
      },
    };

    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: options?.key,
          value: JSON.stringify(message),
          headers: {
            eventType,
            ...options?.headers,
          },
        },
      ],
    };

    try {
      const result = await this.producer.send(record);
      this.logger.debug(`Published ${eventType} to ${topic}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to publish ${eventType} to ${topic}:`, error.message);
      throw error;
    }
  }

  /**
   * Publish booking event
   */
  async publishBookingEvent<T>(eventType: string, payload: T, bookingId?: string): Promise<void> {
    await this.publish(KAFKA_TOPICS.BOOKING_EVENTS, eventType, payload, {
      key: bookingId, // Ensures ordering per booking
    });
  }

  /**
   * Publish driver event
   */
  async publishDriverEvent<T>(eventType: string, payload: T, driverId?: string): Promise<void> {
    await this.publish(KAFKA_TOPICS.DRIVER_EVENTS, eventType, payload, {
      key: driverId,
    });
  }

  /**
   * Publish payment event (critical - higher reliability needed)
   */
  async publishPaymentEvent<T>(eventType: string, payload: T, paymentId?: string): Promise<void> {
    await this.publish(KAFKA_TOPICS.PAYMENT_EVENTS, eventType, payload, {
      key: paymentId,
    });
  }

  /**
   * Publish notification event
   */
  async publishNotificationEvent<T>(eventType: string, payload: T, userId?: string): Promise<void> {
    await this.publish(KAFKA_TOPICS.NOTIFICATION_EVENTS, eventType, payload, {
      key: userId,
    });
  }
}

