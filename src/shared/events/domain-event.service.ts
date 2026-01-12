import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DomainEvent<T = any> {
  eventName: string;
  payload: T;
  timestamp: Date;
  correlationId?: string;
}

@Injectable()
export class DomainEventService {
  private readonly logger = new Logger(DomainEventService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit a domain event to be consumed by other modules
   * Events are processed asynchronously
   */
  emit<T>(eventName: string, payload: T, correlationId?: string): void {
    const event: DomainEvent<T> = {
      eventName,
      payload,
      timestamp: new Date(),
      correlationId,
    };

    this.logger.debug(`Emitting event: ${eventName}`, { correlationId });
    this.eventEmitter.emit(eventName, event);
  }

  /**
   * Emit and wait for all handlers to complete
   * Use sparingly - only when you need confirmation
   */
  async emitAsync<T>(eventName: string, payload: T, correlationId?: string): Promise<void> {
    const event: DomainEvent<T> = {
      eventName,
      payload,
      timestamp: new Date(),
      correlationId,
    };

    this.logger.debug(`Emitting async event: ${eventName}`, { correlationId });
    await this.eventEmitter.emitAsync(eventName, event);
  }
}

