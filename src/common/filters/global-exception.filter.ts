import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AppException } from '../exceptions/app.exception';
import { ErrorCodes } from '../constants/error-codes';

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string | string[];
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  details?: Record<string, any>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = (request.headers['x-request-id'] as string) || undefined;

    let status: number;
    let code: string;
    let message: string | string[];
    let details: Record<string, any> | undefined;

    if (exception instanceof AppException) {
      // Our custom application exception
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      // NestJS built-in exceptions
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      
      if (typeof errorResponse === 'string') {
        message = errorResponse;
        code = this.mapStatusToCode(status);
      } else {
        const resp = errorResponse as any;
        message = resp.message || exception.message;
        code = resp.code || this.mapStatusToCode(status);
        details = resp.details;
      }
    } else if (exception instanceof Error) {
      // Unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = ErrorCodes.SYSTEM_INTERNAL_ERROR;
      message = 'Internal server error';
      
      // Log full error for debugging
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    } else {
      // Unknown error type
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = ErrorCodes.SYSTEM_INTERNAL_ERROR;
      message = 'Internal server error';
      
      this.logger.error('Unknown exception type:', exception);
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(requestId && { requestId }),
      ...(details && process.env.NODE_ENV !== 'production' && { details }),
    };

    // Log error (excluding 4xx client errors in production)
    if (status >= 500 || process.env.NODE_ENV !== 'production') {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} - ${code}: ${JSON.stringify(message)}`,
      );
    }

    response.status(status).send(errorResponse);
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 429: return ErrorCodes.SYSTEM_RATE_LIMITED;
      default: return ErrorCodes.SYSTEM_INTERNAL_ERROR;
    }
  }
} 