import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { minutes, seconds, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

// --- Infrastructure Layer ---
import { DatabaseModule } from '@infrastructure/database/database.module';
import { AuthModule } from '@infrastructure/auth/auth.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { LockModule } from '@infrastructure/lock/lock.module';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { EmailModule } from '@infrastructure/email/email.module';
import { TrackingModule } from '@infrastructure/tracking/tracking.module';
import { StripeModule } from '@infrastructure/payment-gateway/stripe/stripe.module';

// --- Presentation Layer (HTTP) ---
import { UsersModule } from '@presentation/http/users/users.module';
import { SlotsModule } from '@presentation/http/slots/slots.module';
import { ServicesModule } from '@presentation/http/services/services.module';
import { BookingsModule } from '@presentation/http/bookings/bookings.module';
import { PaymentsModule } from '@presentation/http/payments/payments.module';
import { EmailLogsModule } from '@presentation/http/email-logs/email-logs.module';

// --- Global Presentation Elements ---
import { JwtAuthGuard } from '@presentation/guards/jwt-auth.guard';
import { RolesGuard } from '@presentation/guards/roles.guard';
import { CustomThrottlerGuard } from '@presentation/guards/throttler.guard';
import { TrackInterceptor } from '@presentation/interceptors/track.interceptor';
import { ErrorLoggingInterceptor } from '@presentation/interceptors/error-logging.interceptor';
import { HttpCacheInterceptor } from '@presentation/interceptors/http-cache.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'burst',
          ttl: seconds(1),
          limit: 10,
        },
        {
          name: 'sustained',
          ttl: minutes(1),
          limit: 100,
        },
      ],
    }),
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),

    // Framework Setup & Infrastructure
    DatabaseModule,
    RedisModule,
    CacheModule,
    LockModule,
    QueueModule,
    EmailModule,
    TrackingModule,
    AuthModule,
    StripeModule,

    // Feature APIs
    UsersModule,
    SlotsModule,
    ServicesModule,
    BookingsModule,
    PaymentsModule,
    EmailLogsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TrackInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
  ],
})
export class AppModule {}
