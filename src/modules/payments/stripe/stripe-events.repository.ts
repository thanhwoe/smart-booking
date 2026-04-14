import { Injectable } from '@nestjs/common';
import { StripeEvent } from '@app/generated/prisma/client';
import { PrismaService } from '@app/database/prisma/prisma.service';

type StripeEventUpsertInput = Pick<StripeEvent, 'stripeEventId' | 'eventType'>;

interface IStripeEventsRepository {
  upsert(data: StripeEventUpsertInput): Promise<StripeEvent>;
  markProcessed(stripeEventId: string): Promise<StripeEvent>;
}

@Injectable()
export class StripeEventsRepository implements IStripeEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: StripeEventUpsertInput) {
    return this.prisma.stripeEvent.upsert({
      where: { stripeEventId: data.stripeEventId },
      update: {}, // no-op if already exists — preserves existing processed flag
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
