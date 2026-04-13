import { TrackService } from '@app/modules/shared/track/track.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs/operators';

@Injectable()
export class TrackInterceptor implements NestInterceptor {
  constructor(private trackService: TrackService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.trackService.capture({
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
