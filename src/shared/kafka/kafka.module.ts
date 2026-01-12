import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { EventService } from './event.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    EventService,
  ],
  exports: [
    KafkaProducerService,
    KafkaConsumerService,
    EventService,
  ],
})
export class KafkaModule {}

