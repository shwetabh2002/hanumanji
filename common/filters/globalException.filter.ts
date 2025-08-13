import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { MongooseError } from 'mongoose';
import { TypeGuardError } from 'typia';

import { AxiosError } from 'axios';

import { JuspayException } from '../exceptions/juspay.exception';
import { PaytmException } from '../exceptions/paytm.exception';
import { PhonePeException } from '../exceptions/phonepe.exception';

interface ErrorResponse {
  error: string;
  message?: string;
  statusCode?: HttpStatus;
}
type ExceptionHandler = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exception: any,
  logger: Logger,
  request?: FastifyRequest,
) => ErrorResponse;

@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter<Error> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly exceptionHandlers = new Map<any, ExceptionHandler>([
    [TypeGuardError, this.handleTypeGuardError],
    [MongooseError, this.handleMongooseError],
    [JuspayException, this.handleJuspayException],
    [PaytmException, this.handlePaytmException],
    [PhonePeException, this.handlePhonepeException],
    [AxiosError, this.handleAxiosError],
  ]);

  private getErrorHandler(exception: unknown) {
    let handler;

    if (exception instanceof HttpException) {
      handler = this.handleHttpException;
    } else if (this.isAxiosError(exception)) {
      handler = this.handleAxiosError;
    } else {
      handler =
        this.exceptionHandlers.get((exception as Error)?.constructor) ||
        this.handleDefaultError;
    }

    return handler;
  }

  private handleAxiosError(
    exception: AxiosError,
    logger: Logger,
  ): ErrorResponse {
    // Get the response from the Axios error
    const axiosResponse = exception.response;

    const response = {
      details: {
        code: exception.code,
        config: {
          baseURL: exception.config?.baseURL,
          method: exception.config?.method,
          url: exception.config?.url,
        },
        data: axiosResponse?.data,
        status: axiosResponse?.status,
      },
      error: 'External service error',
      message: exception.message,
      statusCode: axiosResponse?.status || HttpStatus.BAD_GATEWAY,
    };

    logger.warn({ logData: response }, 'Axios Error');

    // Log different types of Axios errors
    if (exception.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.error(
        {
          error: exception,
          headers: exception.response.headers,
          response: exception.response.data,
          status: exception.response.status,
        },
        'External API responded with error',
      );
    } else if (exception.request) {
      // The request was made but no response was received
      logger.error(
        {
          error: exception,
          request: exception.request,
        },
        'No response received from external API',
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error(
        {
          config: exception.config,
          error: exception,
        },
        'Error setting up external API request',
      );
    }

    return {
      error: 'Internal server error',
      message: exception.message,
      statusCode: axiosResponse?.status || HttpStatus.BAD_GATEWAY,
    };
  }

  private handleDefaultError(exception: Error, logger: Logger): ErrorResponse {
    const isProduction = process.env.NODE_ENV === 'production';
    const response = {
      error: isProduction ? 'Internal server error' : exception.message,
      message: isProduction ? undefined : exception.stack,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
    logger.warn(
      { logData: response },
      `Default Error Handler: ${exception.message}`,
    );
    return response;
  }

  private handleHttpException(
    exception: HttpException,
    logger: Logger,
  ): ErrorResponse {
    const errorResponse = exception.getResponse() as ErrorResponse;
    const response = {
      error: errorResponse.message as string,
      message: errorResponse.error,
      statusCode: exception.getStatus(),
    };
    if (response.statusCode >= 500) {
      logger.error(
        {
          error: exception,
        },
        'Http Exception for 5XX',
      );
    } else {
      logger.warn(
        {
          error: exception,
        },
        'Http Exception for 4XX',
      );
    }
    return response;
  }

  // FIXME: Should be removed and user axios error handler instead after confirming with team
  private handleJuspayException(exception: JuspayException, logger: Logger) {
    const response = {
      error: 'Payment Processing Error',
      refunded: exception.refunded,
      statusCode: exception.statusCode,
    };
    logger.warn({ logData: response }, 'Juspay Payment Processing Error');
    return response;
  }

  private handleMongooseError(
    exception: MongooseError,
    logger: Logger,
  ): ErrorResponse {
    const response = {
      error: exception.name,
      message: exception.message,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
    logger.warn({ logData: response }, 'Mongoose Error Occured');
    return response;
  }

  // FIXME: Should be removed and user axios error handler instead after confirming with team
  private handlePaytmException(exception: PaytmException, logger: Logger) {
    const response = {
      error: 'Payment Processing Error',
      message: exception.message,
      refunded: exception.refunded,
      statusCode: exception.statusCode,
    };
    logger.warn({ logData: response }, 'Paytm Payment Processing Error');
    return response;
  }

  // FIXME: Should be removed and user axios error handler instead after confirming with team
  private handlePhonepeException(exception: PhonePeException, logger: Logger) {
    const response = {
      error: 'Phonepe Processing Error',
      message: exception.message,
      refunded: false,
      statusCode: exception.statusCode,
    };
    logger.warn(
      { logData: { ...exception } },
      'Phonepe Payment Processing Error',
    );
    return response;
  }

  private handleTypeGuardError(
    exception: TypeGuardError,
    logger: Logger,
  ): ErrorResponse {
    const response = {
      error: 'Internal server error',
      message: `${exception.path}: ${exception.expected}`,
      statusCode: HttpStatus.BAD_REQUEST,
    };
    logger.warn({ logData: response }, 'Validation Error');
    return response;
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (
      error instanceof Error &&
      'isAxiosError' in error &&
      (error as AxiosError).isAxiosError === true
    );
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const logger: Logger = new Logger(GlobalExceptionFilter.name);
    const context = host.switchToHttp();
    const response = context.getResponse<FastifyReply>();

    const handler = this.getErrorHandler(exception);

    const errorResponse = handler(exception as HttpException, logger);

    const { statusCode } = errorResponse;
    delete errorResponse.statusCode;
    response
      .status(statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR)
      .send(errorResponse);
  }
}
