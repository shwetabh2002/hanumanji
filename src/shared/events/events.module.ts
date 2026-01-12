import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventService } from './domain-event.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcards for event patterns
      wildcard: true,
      // Delimiter for namespaced events
      delimiter: '.',
      // Show event name in memory leak warning
      verboseMemoryLeak: true,
      // Disable throwing on errors
      ignoreErrors: false,
    }),
  ],
  providers: [DomainEventService],
  exports: [DomainEventService],
})
export class EventsModule {}
