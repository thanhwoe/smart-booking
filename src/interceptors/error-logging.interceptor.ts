import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;

    return next.handle().pipe(
      catchError((err) => {
        this.logger.error(
          `Error in ${method} ${url}`,
          JSON.stringify(
            {
              body,
              error: err.message,
              stack: err.stack,
            },
            null,
            2,
          ),
        );

        return throwError(() => err);
      }),
    );
  }
}
