import { Injectable } from '@nestjs/common';
import { StripeEvent } from '@app/generated/prisma/client';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';

type StripeEventUpsertInput = Pick<StripeEvent, 'stripeEventId' | 'eventType'>;

@Injectable()
export class StripeEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: StripeEventUpsertInput) {
    return this.prisma.stripeEvent.upsert({
      where: { stripeEventId: data.stripeEventId },
      update: {},
      create: {
        stripeEventId: data.stripeEventId,
        eventType: data.eventType,
        processed: false,
      },
    });
  }

  async markProcessed(stripeEventId: string) {
    return this.prisma.stripeEvent.update({
      where: { stripeEventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  }
}
