import { PostHogService } from '@app/modules/shared/posthog/posthog.service';
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
    private readonly posthog: PostHogService,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;

    return next.handle().pipe(
      catchError((err) => {
        this.posthog.error(err, {
          distinctId: 'system',
          properties: {
            error: err.message,
            stack: err.stack,
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
                error: err.message,
                stack: err.stack,
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
