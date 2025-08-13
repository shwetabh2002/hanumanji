import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, headers, body } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Log incoming request
    const bodySize = body ? JSON.stringify(body).length : 0;
    this.logger.log(
      `➡️  ${method} ${url} - ${userAgent.substring(0, 50)}${userAgent.length > 50 ? '...' : ''} - Body: ${bodySize}B`
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        const statusEmoji = this.getStatusEmoji(statusCode);
        
        this.logger.log(
          `⬅️  ${method} ${url} ${statusEmoji} ${statusCode} - ${duration}ms`
        );
      }),
    );
  }

  private getStatusEmoji(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return '✅';
    if (statusCode >= 300 && statusCode < 400) return '↩️';
    if (statusCode >= 400 && statusCode < 500) return '❌';
    if (statusCode >= 500) return '💥';
    return '❓';
  }
} 