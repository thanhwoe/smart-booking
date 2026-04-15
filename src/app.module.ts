import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { minutes, seconds, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TrackInterceptor } from './interceptors/track.interceptor';
import { SharedModule } from './modules/shared/shared.module';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';
import { SlotsModule } from './modules/slots/slots.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { EmailLogsModule } from './modules/email-logs/email-logs.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { HttpCacheInterceptor } from './interceptors/http-cache.interceptor';
import { CustomThrottlerGuard } from './guards/throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          // anti-spam
          name: 'burst',
          ttl: seconds(1),
          limit: 10,
        },
        {
          // anti-abuse
          name: 'sustained',
          ttl: minutes(1),
          limit: 100,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    SharedModule,
    SlotsModule,
    ServicesModule,
    BookingsModule,
    EmailLogsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
