import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

export interface AppErrorResponse {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}

/**
 * Custom Application Exception
 * 
 * Provides consistent error structure across the API
 * Includes error codes for client-side handling
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, any>,
  ) {
    super({ code, message, details }, status);
  }

  static badRequest(code: ErrorCode, message: string, details?: Record<string, any>) {
    return new AppException(code, message, HttpStatus.BAD_REQUEST, details);
  }

  static notFound(code: ErrorCode, message: string) {
    return new AppException(code, message, HttpStatus.NOT_FOUND);
  }

  static unauthorized(code: ErrorCode, message: string) {
    return new AppException(code, message, HttpStatus.UNAUTHORIZED);
  }

  static conflict(code: ErrorCode, message: string) {
    return new AppException(code, message, HttpStatus.CONFLICT);
  }

  static internal(code: ErrorCode, message: string) {
    return new AppException(code, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

