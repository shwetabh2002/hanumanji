import { HttpStatus } from '@nestjs/common';
//FIXME: Remove this after fixing the global exception filter
export class JuspayException extends Error {
  refunded: boolean;
  statusCode: HttpStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string | Record<string, any>, statusCode: HttpStatus) {
    super(
      typeof message === 'string' ? message : message.response.error_message,
    );
    this.statusCode = statusCode;
    this.refunded =
      typeof message === 'object' ? message.response?.refunded : false;
  }
}
