import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { minutes, seconds, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './database/prisma/prisma.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
