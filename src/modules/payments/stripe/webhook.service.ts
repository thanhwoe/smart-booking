import { TrackService } from '@app/modules/shared/track/track.service';
import {
  BadRequestException,
  Inject,
  Injectable,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { STRIPE_CLIENT } from './stripe-client.provider';
import type { Stripe } from 'stripe';
import type { Event } from 'node_modules/stripe/cjs/resources/Events';
import type { Session } from 'node_modules/stripe/cjs/resources/Checkout';
import { QueueService } from '@app/modules/shared/queue/queue.service';
import { PaymentsRepository } from '../payments.repository';
import { StripeEventsRepository } from './stripe-events.repository';
import { PaymentStatus } from '@app/generated/prisma/enums';
import { Charge } from 'node_modules/stripe/cjs/resources/Charges';

@Injectable()
export class StripeWebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly trackService: TrackService,
    private readonly queueService: QueueService,
    @Inject(STRIPE_CLIENT)
    private readonly stripeClient: Stripe,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly stripeEventsRepository: StripeEventsRepository,
  ) {}

  async handleWebhook(signature: string, req: RawBodyRequest<Request>) {
    if (!signature) {
      throw new BadRequestException('Missing signature');
    }
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);

    const event = this.stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
    );

    await this.processEvent(event);
  }

  private async processEvent(event: Event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.onCheckoutCompleted(
            event.id,
            event.type,
            event.data.object,
          );
          break;

        case 'checkout.session.expired':
          await this.onCheckoutExpired(event.id, event.type, event.data.object);
          break;

        case 'charge.refunded':
          await this.onChargeRefunded(event.id, event.type, event.data.object);
          break;

        default:
          this.trackService.capture({
            distinctId: 'system',
            event: 'stripe_webhook_unhandled',
            properties: {
              type: event.type,
            },
          });
      }
    } catch (error) {
      this.trackService.error(error as Error, {
        distinctId: 'system',
        properties: {
          type: event.type,
        },
      });
    }
  }

  private async onCheckoutCompleted(
    id: string,
    type: string,
    session: Session,
  ) {
    const isProcessed = await this.isAlreadyProcessed(id, type);

    if (isProcessed) {
      return;
    }

    const bookingId = session.metadata?.bookingId;
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!bookingId) {
      this.trackService.error(new Error('Stripe webhook missing metadata'), {
        distinctId: 'system',
        properties: {
          type,
          id,
          session,
        },
      });

      await this.markProcessed(id);
      return;
    }

    const payment = await this.paymentsRepository.findByBookingId(bookingId);

    if (!payment) {
      this.trackService.error(
        new Error(`Payment not found for booking ${bookingId}`),
        {
          distinctId: 'system',
          properties: {
            type,
            id,
            session,
          },
        },
      );

      await this.markProcessed(id);
      return;
    }

    if (payment.status === PaymentStatus.PAID) {
      await this.markProcessed(id);
      return;
    }

    await this.paymentsRepository.updateByBookingId(bookingId, {
      status: PaymentStatus.PAID,
      stripePaymentIntent: paymentIntentId,
      paidAt: new Date(),
    });

    const { booking } = payment;
    const amount = session.amount_total ?? Number(payment.amount) * 100;

    await this.queueService.dispatchBookingConfirmed({
      bookingId,
      userId: booking.user.id,
      userEmail: booking.user.email,
      userName: booking.user.name,
      serviceName: booking.slot.service.name,
      providerName: booking.slot.provider.name,
      startTime: booking.slot.startTime.toISOString(),
      endTime: booking.slot.endTime.toISOString(),
      amount,
      currency: session.currency ?? 'usd',
    });

    await this.markProcessed(id);

    this.trackService.capture({
      distinctId: 'system',
      event: 'stripe_checkout_completed',
      properties: {
        bookingId,
        paymentId: payment.id,
      },
    });
  }

  private async onCheckoutExpired(id: string, type: string, session: Session) {
    const isProcessed = await this.isAlreadyProcessed(id, type);

    if (isProcessed) {
      return;
    }

    const bookingId = session.metadata?.bookingId;
    if (!bookingId) {
      this.trackService.error(new Error('Stripe webhook missing metadata'), {
        distinctId: 'system',
        properties: {
          type,
          id,
          session,
        },
      });

      await this.markProcessed(id);
      return;
    }

    await this.paymentsRepository.updateExpired(bookingId);

    await this.markProcessed(id);

    this.trackService.capture({
      distinctId: 'system',
      event: 'stripe_checkout_expired',
      properties: {
        bookingId,
      },
    });
  }

  private async onChargeRefunded(id: string, type: string, charge: Charge) {
    const isProcessed = await this.isAlreadyProcessed(id, type);

    if (isProcessed) {
      return;
    }

    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
      await this.markProcessed(id);
      return;
    }

    const payment =
      await this.paymentsRepository.findByPaymentIntent(paymentIntentId);

    if (!payment) {
      this.trackService.error(
        new Error(`Payment not found for payment intent ${paymentIntentId}`),
        {
          distinctId: 'system',
          properties: {
            type,
            id,
            charge,
          },
        },
      );

      await this.markProcessed(id);
      return;
    }

    await this.paymentsRepository.update(payment.id, {
      status: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
    });

    await this.queueService.dispatchBookingCancelled({
      bookingId: payment.bookingId,
      userId: payment.booking.user.id,
      userEmail: payment.booking.user.email,
      userName: payment.booking.user.name,
      serviceName: payment.booking.slot.service.name,
      startTime: payment.booking.slot.startTime.toISOString(),
      refunded: true,
    });

    await this.markProcessed(id);

    this.trackService.capture({
      distinctId: 'system',
      event: 'stripe_charge_refunded',
      properties: {
        bookingId: payment.bookingId,
        paymentId: payment.id,
      },
    });
  }

  private async isAlreadyProcessed(id: string, type: string) {
    const event = await this.stripeEventsRepository.upsert({
      eventType: type,
      stripeEventId: id,
    });

    return event.processed;
  }

  private async markProcessed(id: string) {
    await this.stripeEventsRepository.markProcessed(id);
  }
}
