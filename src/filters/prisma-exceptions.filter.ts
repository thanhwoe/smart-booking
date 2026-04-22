import {
  type ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Request, Response } from 'express';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const payload = {
      statusCode: 500,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    switch (exception.code) {
      case 'P2025':
        payload.statusCode = HttpStatus.NOT_FOUND;
        payload.message = 'Record not found';

        break;
      case 'P2002':
        payload.statusCode = HttpStatus.CONFLICT;
        payload.message = 'Unique constraint violation';

        break;

      case 'P2003':
        payload.statusCode = HttpStatus.BAD_REQUEST;
        payload.message = 'Foreign key constraint failed';

        break;

      case 'P2007':
        payload.statusCode = HttpStatus.BAD_REQUEST;
        payload.message = 'Data validation error';

        break;
    }

    response.status(payload.statusCode).json(payload);
  }
}
