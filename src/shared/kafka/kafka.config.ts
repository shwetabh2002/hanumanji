import { Kafka, logLevel } from 'kafkajs';
import { ConfigService } from '@nestjs/config';

export const isKafkaEnabled = (configService: ConfigService): boolean => {
  return configService.get<boolean>('app.kafka.enabled', true);
};

export const createKafkaClient = (configService: ConfigService): Kafka | null => {
  if (!isKafkaEnabled(configService)) {
    return null;
  }

  // Use port 29092 for host-to-container communication
  const brokers = configService.get<string[]>('app.kafka.brokers') || ['localhost:29092'];
  const clientId = configService.get<string>('app.kafka.clientId') || 'rideit-app';

  return new Kafka({
    clientId,
    brokers,
    logLevel: logLevel.WARN,
    retry: {
      initialRetryTime: 300,
      retries: 3, // Fail fast if Kafka is unavailable
    },
  });
};

export const KAFKA_TOPICS = {
  // Booking Events (high priority)
  BOOKING_EVENTS: 'booking-events',
  
  // Driver Events
  DRIVER_EVENTS: 'driver-events',
  
  // Payment Events (critical - must not lose)
  PAYMENT_EVENTS: 'payment-events',
  
  // Notification Events
  NOTIFICATION_EVENTS: 'notification-events',
  
  // Dead Letter Queue
  DLQ: 'dead-letter-queue',
} as const;

export const CONSUMER_GROUPS = {
  BOOKING_SERVICE: 'booking-service-group',
  DRIVER_SERVICE: 'driver-service-group',
  PAYMENT_SERVICE: 'payment-service-group',
  NOTIFICATION_SERVICE: 'notification-service-group',
} as const;

