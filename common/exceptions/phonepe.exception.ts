import { HttpStatus } from '@nestjs/common';
//FIXME: Remove this after fixing the global exception filter
export class PhonePeException extends Error {
  statusCode: HttpStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string | Record<string, any>, statusCode: HttpStatus) {
    super(
      typeof message === 'string'
        ? message
        : message.response.error_message
          ? message.response.error_message
          : message.response.refundStatus,
    );
    this.statusCode = statusCode;
  }
}
