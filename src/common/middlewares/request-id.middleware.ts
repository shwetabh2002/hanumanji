import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Request ID Middleware
 * 
 * Adds a unique request ID to each request for tracing
 * Uses incoming X-Request-ID header if provided, otherwise generates one
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const requestId = req.headers['x-request-id'] || randomUUID();
    
    // Set on request for logging
    req.headers['x-request-id'] = requestId;
    req.requestId = requestId;
    
    // Set on response for client
    res.setHeader('X-Request-ID', requestId);
    
    next();
  }
}

