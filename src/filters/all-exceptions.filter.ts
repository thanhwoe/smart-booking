import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const body = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    const isValidationError =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'errors' in exceptionResponse;

    if (isValidationError) {
      response.status(status).json({
        ...body,
        message: (exceptionResponse as unknown as Error).message,
        errors: exceptionResponse.errors,
      });
    } else {
      response.status(status).json({
        ...body,
        message:
          typeof exceptionResponse === 'object' && exceptionResponse !== null
            ? (exceptionResponse as Error).message
            : (exceptionResponse ?? 'Internal server error'),
      });
    }
  }
}
