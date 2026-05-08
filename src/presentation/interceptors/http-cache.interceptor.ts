import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CACHE_TTL_KEY, IGNORE_CACHE_KEY } from '../decorators/cache.decorator';
import { ICacheService } from '@application/common/ports/cache.port';
import { User } from '@app/generated/prisma/client';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(ICacheService)
    private readonly cacheService: ICacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const isIgnored = this.reflector.getAllAndOverride<boolean>(
      IGNORE_CACHE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isIgnored) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request & { user: User }>();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const ttl = this.reflector.getAllAndOverride<number>(CACHE_TTL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Default TTL parameter, e.g., 60 seconds if not provided by the decorator
    const cacheTtl = ttl !== undefined ? ttl : 60;

    // Build cache key
    const user = request.user;
    const userId = user?.id ? `:${user.id}` : '';
    const key = `http_cache:${request.url}${userId}`;

    try {
      const cachedResponse = await this.cacheService.get(key);
      if (cachedResponse !== null) {
        return of(cachedResponse);
      }
    } catch {
      // In case Redis fails, just proceed to handle the request normally
    }

    return next.handle().pipe(
      tap((response) => {
        this.cacheService.set(key, response, cacheTtl).catch(() => {});
      }),
    );
  }
}
