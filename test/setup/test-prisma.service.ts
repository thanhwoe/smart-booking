import { PrismaClient } from '@app/generated/prisma/client';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class TestPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString:
        process.env['DATABASE_URL'] ??
        'postgresql://postgres:postgres@localhost:5433/smart_booking_test',
    });

    super({
      adapter,
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    // Delete in order respecting foreign key constraints
    await this.$transaction([
      this.emailLog.deleteMany(),
      this.payment.deleteMany(),
      this.booking.deleteMany(),
      this.slot.deleteMany(),
      this.service.deleteMany(),
      this.stripeEvent.deleteMany(),
      this.emailSuppression.deleteMany(),
      this.user.deleteMany(),
    ]);
  }
}
