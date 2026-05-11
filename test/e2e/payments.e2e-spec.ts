import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestPrismaService } from '../setup/test-prisma.service';
import { createTestApp, setTestUser } from '../setup/test-app.factory';
import {
  createTestAdmin,
  createTestProvider,
  createTestUser,
} from '../factories/user.factory';
import { createTestService } from '../factories/service.factory';
import { createTestSlot } from '../factories/slot.factory';
import { createTestBooking } from '../factories/booking.factory';
import { mockStripeClient, resetAllMocks } from '../setup/mock-providers';
import { PaymentStatus } from '@domain/payment/payment.entity';

describe('Payments E2E', () => {
  let app: INestApplication;
  let prisma: TestPrismaService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
    await prisma.onModuleDestroy();
  });

  beforeEach(async () => {
    await prisma.cleanDatabase();
    resetAllMocks();
  });

  async function setupBookingWithPayment() {
    const customer = await createTestUser(prisma);
    const provider = await createTestProvider(prisma);
    const svc = await createTestService(prisma, { price: 50 });
    const slot = await createTestSlot(prisma, {
      serviceId: svc.id,
      providerId: provider.id,
      capacity: 5,
    });
    const booking = await createTestBooking(prisma, {
      userId: customer.id,
      slotId: slot.id,
      paymentAmount: 50,
    });

    return { customer, provider, svc, slot, booking };
  }

  describe('POST /api/v1/payments/checkout/:bookingId', () => {
    it('should create a checkout session', async () => {
      const { customer, booking } = await setupBookingWithPayment();
      setTestUser(customer);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/payments/checkout/${booking.id}`)
        .send({
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(201);

      expect(res.body).toHaveProperty('clientSecret');
      expect(res.body).toHaveProperty('id');
    });

    it('should return 401 for non-owner', async () => {
      const { booking } = await setupBookingWithPayment();
      const otherUser = await createTestUser(prisma, {
        email: 'other@test.com',
      });
      setTestUser(otherUser);

      await request(app.getHttpServer())
        .post(`/api/v1/payments/checkout/${booking.id}`)
        .send({
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(401);
    });

    it('should return 400 for already paid booking', async () => {
      const { customer, booking } = await setupBookingWithPayment();
      setTestUser(customer);

      // Mark payment as paid
      await prisma.payment.update({
        where: { bookingId: booking.id },
        data: { status: PaymentStatus.PAID },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/payments/checkout/${booking.id}`)
        .send({
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
        .expect(400);
    });

    it('should return 400 for invalid URLs', async () => {
      const { customer, booking } = await setupBookingWithPayment();
      setTestUser(customer);

      await request(app.getHttpServer())
        .post(`/api/v1/payments/checkout/${booking.id}`)
        .send({
          successUrl: 'not-a-url',
          cancelUrl: 'not-a-url',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/payments/:bookingId', () => {
    it('should return payment for own booking', async () => {
      const { customer, booking } = await setupBookingWithPayment();
      setTestUser(customer);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/${booking.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('bookingId', booking.id);
      expect(res.body).toHaveProperty('status', PaymentStatus.PENDING);
    });

    it('should return 401 for non-owner', async () => {
      const { booking } = await setupBookingWithPayment();
      const otherUser = await createTestUser(prisma, {
        email: 'other@test.com',
      });
      setTestUser(otherUser);

      await request(app.getHttpServer())
        .get(`/api/v1/payments/${booking.id}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/payments/refund/:bookingId', () => {
    it('should refund a paid booking (admin)', async () => {
      const admin = await createTestAdmin(prisma);
      const { booking } = await setupBookingWithPayment();
      setTestUser(admin);

      // Mark payment as paid with stripe payment intent
      await prisma.payment.update({
        where: { bookingId: booking.id },
        data: {
          status: PaymentStatus.PAID,
          stripePaymentIntent: 'pi_test_123',
          paidAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/payments/refund/${booking.id}`)
        .expect(201);

      expect(res.body).toHaveProperty('status', PaymentStatus.REFUNDED);
      expect(mockStripeClient.refunds.create).toHaveBeenCalled();
    });

    it('should return 403 for non-admin', async () => {
      const { customer, booking } = await setupBookingWithPayment();
      setTestUser(customer);

      await request(app.getHttpServer())
        .post(`/api/v1/payments/refund/${booking.id}`)
        .expect(403);
    });

    it('should return 400 for non-paid payment', async () => {
      const admin = await createTestAdmin(prisma);
      const { booking } = await setupBookingWithPayment();
      setTestUser(admin);

      await request(app.getHttpServer())
        .post(`/api/v1/payments/refund/${booking.id}`)
        .expect(400);
    });
  });
});
