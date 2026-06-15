import { TrackService } from '@app/modules/shared/track/track.service';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);
  constructor(
    private readonly trackService: TrackService,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;

    return next.handle().pipe(
      catchError((err) => {
        const error = err instanceof Error ? err : new Error(String(err));

        this.trackService.error(error, {
          distinctId: 'system',
          properties: {
            error: error.message,
            stack: error.stack,
            method,
            url,
            body,
          },
        });

        if (this.configService.get<string>('NODE_ENV') === 'development') {
          this.logger.error(
            `Error in ${method} ${url}`,
            JSON.stringify(
              {
                body,
                error: error.message,
                stack: error.stack,
              },
              null,
              2,
            ),
          );
        }

        return throwError(() => err);
      }),
    );
  }
}
