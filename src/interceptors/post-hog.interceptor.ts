import { PostHogService } from '@app/modules/shared/posthog/posthog.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs/operators';

@Injectable()
export class PostHogInterceptor implements NestInterceptor {
  constructor(private posthog: PostHogService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.posthog.capture({
          distinctId: req.user?.id || 'anonymous',
          event: 'api_called',
          properties: {
            path: req.url,
            method: req.method,
            duration: Date.now() - start,
          },
        });
      }),
    );
  }
}
