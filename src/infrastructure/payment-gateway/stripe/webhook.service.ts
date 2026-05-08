import { TrackService } from '@infrastructure/tracking/track.service';
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
import type { Charge } from 'node_modules/stripe/cjs/resources/Charges';
import { IQueueService } from '@application/common/ports/queue.port';
import { IPaymentRepository } from '@domain/payment/payment.repository';
import { StripeEventsRepository } from './stripe-events.repository';
import { PaymentStatus } from '@domain/payment/payment.entity';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class StripeWebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly trackService: TrackService,
    @Inject(IQueueService)
    private readonly queueService: IQueueService,
    @Inject(STRIPE_CLIENT)
    private readonly stripeClient: Stripe,
    @Inject(IPaymentRepository)
    private readonly paymentsRepository: IPaymentRepository,
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
            properties: { type: event.type },
          });
      }
    } catch (error) {
      Sentry.captureException(error);
      this.trackService.error(error as Error, {
        distinctId: 'system',
        properties: { type: event.type },
      });
    }
  }

  private async onCheckoutCompleted(
    id: string,
    type: string,
    session: Session,
  ) {
    if (await this.isAlreadyProcessed(id, type)) return;

    const bookingId = session.metadata?.bookingId;
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!bookingId) {
      await this.trackErrorAndMark(
        'Stripe webhook missing metadata',
        id,
        type,
        session,
      );
      return;
    }

    const payment = await this.paymentsRepository.findByBookingId(bookingId);
    if (!payment) {
      await this.trackErrorAndMark(
        `Payment not found for booking ${bookingId}`,
        id,
        type,
        session,
      );
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

    await this.queueService.dispatchBookingConfirmed({
      bookingId,
      userId: payment.booking.user.id,
      userEmail: payment.booking.user.email,
      userName: payment.booking.user.name,
      serviceName: payment.booking.slot.service.name,
      providerName: payment.booking.slot.provider.name,
      startTime: payment.booking.slot.startTime.toISOString(),
      endTime: payment.booking.slot.endTime.toISOString(),
      amount: session.amount_total ?? Number(payment.amount) * 100,
      currency: session.currency ?? 'usd',
    });

    await this.markProcessed(id);
    this.trackService.capture({
      distinctId: 'system',
      event: 'stripe_checkout_completed',
      properties: { bookingId, paymentId: payment.id },
    });
  }

  private async onCheckoutExpired(id: string, type: string, session: Session) {
    if (await this.isAlreadyProcessed(id, type)) return;

    const bookingId = session.metadata?.bookingId;
    if (!bookingId) {
      await this.trackErrorAndMark(
        'Stripe webhook missing metadata',
        id,
        type,
        session,
      );
      return;
    }

    await this.paymentsRepository.updateExpired(bookingId);
    await this.markProcessed(id);
    this.trackService.capture({
      distinctId: 'system',
      event: 'stripe_checkout_expired',
      properties: { bookingId },
    });
  }

  private async onChargeRefunded(id: string, type: string, charge: Charge) {
    if (await this.isAlreadyProcessed(id, type)) return;

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
      await this.trackErrorAndMark(
        `Payment not found for intent ${paymentIntentId}`,
        id,
        type,
        charge,
      );
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
      properties: { bookingId: payment.bookingId, paymentId: payment.id },
    });
  }

  private async trackErrorAndMark(
    message: string,
    id: string,
    type: string,
    data: unknown,
  ) {
    this.trackService.error(new Error(message), {
      distinctId: 'system',
      properties: { type, id, data },
    });
    await this.markProcessed(id);
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
