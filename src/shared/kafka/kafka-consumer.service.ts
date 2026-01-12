import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload, KafkaMessage as KafkaJSMessage } from 'kafkajs';
import { createKafkaClient, KAFKA_TOPICS, CONSUMER_GROUPS } from './kafka.config';
import { KafkaMessage, KafkaProducerService } from './kafka-producer.service';

export type MessageHandler<T = any> = (
  eventType: string,
  payload: T,
  metadata: KafkaMessage['metadata'],
) => Promise<void>;

interface TopicSubscription {
  topic: string;
  groupId: string;
  handler: MessageHandler;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumers: Map<string, Consumer> = new Map();
  private subscriptions: TopicSubscription[] = [];
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly producer: KafkaProducerService,
  ) {
    this.kafka = createKafkaClient(configService);
  }

  async onModuleInit() {
    // Consumers are started when subscriptions are registered
    this.logger.log('Kafka consumer service initialized');
  }

  async onModuleDestroy() {
    for (const [groupId, consumer] of this.consumers) {
      await consumer.disconnect();
      this.logger.log(`Kafka consumer ${groupId} disconnected`);
    }
  }

  /**
   * Subscribe to a topic with a handler
   */
  async subscribe(
    topic: string,
    groupId: string,
    handler: MessageHandler,
  ): Promise<void> {
    // Check if consumer for this group already exists
    let consumer = this.consumers.get(groupId);

    if (!consumer) {
      consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576, // 1MB
      });

      try {
        await consumer.connect();
        this.consumers.set(groupId, consumer);
        this.logger.log(`✅ Kafka consumer ${groupId} connected`);
      } catch (error) {
        this.logger.error(`❌ Failed to connect Kafka consumer ${groupId}:`, error.message);
        return;
      }
    }

    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload, handler, topic, groupId);
      },
    });

    this.subscriptions.push({ topic, groupId, handler });
    this.logger.log(`Subscribed to ${topic} with group ${groupId}`);
  }

  /**
   * Process a message with error handling and DLQ
   */
  private async handleMessage(
    payload: EachMessagePayload,
    handler: MessageHandler,
    topic: string,
    groupId: string,
  ): Promise<void> {
    const { message, partition, topic: messageTopic } = payload;

    try {
      const value = message.value?.toString();
      if (!value) {
        this.logger.warn(`Empty message received on ${topic}`);
        return;
      }

      const parsed: KafkaMessage = JSON.parse(value);
      const { eventType, payload: eventPayload, metadata } = parsed;

      this.logger.debug(
        `Processing ${eventType} from ${topic} (partition: ${partition}, offset: ${message.offset})`,
      );

      await handler(eventType, eventPayload, metadata);

      this.logger.debug(`Successfully processed ${eventType}`);
    } catch (error) {
      this.logger.error(
        `Error processing message from ${topic}:`,
        error.message,
      );

      // Send to Dead Letter Queue
      await this.sendToDLQ(message, topic, groupId, error);
    }
  }

  /**
   * Send failed message to Dead Letter Queue
   */
  private async sendToDLQ(
    originalMessage: KafkaJSMessage,
    originalTopic: string,
    groupId: string,
    error: Error,
  ): Promise<void> {
    try {
      const dlqPayload = {
        originalTopic,
        originalMessage: originalMessage.value?.toString(),
        error: error.message,
        stack: error.stack,
        failedAt: new Date().toISOString(),
        consumerGroup: groupId,
      };

      await this.producer.publish(KAFKA_TOPICS.DLQ, 'message.failed', dlqPayload, {
        headers: {
          originalTopic,
          errorMessage: error.message,
        },
      });

      this.logger.warn(`Message sent to DLQ from ${originalTopic}`);
    } catch (dlqError) {
      this.logger.error('Failed to send message to DLQ:', dlqError.message);
    }
  }
}

