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
        payload.message = 'We couldn’t find what you’re looking for.';

        break;
      case 'P2002':
        payload.statusCode = HttpStatus.CONFLICT;
        payload.message = 'This information is already in use.';

        break;

      case 'P2003':
        payload.statusCode = HttpStatus.BAD_REQUEST;
        payload.message =
          'This action can’t be completed because some related data is missing or invalid.';

        break;

      case 'P2007':
        payload.statusCode = HttpStatus.BAD_REQUEST;
        payload.message = 'Some of the information provided is invalid.';

        break;
    }

    response.status(payload.statusCode).json(payload);
  }
}
