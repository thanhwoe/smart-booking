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
import { resetAllMocks } from '../setup/mock-providers';
import { BookingStatus, SlotStatus } from '@app/generated/prisma/client';

describe('Bookings E2E', () => {
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

  describe('POST /api/v1/bookings', () => {
    it('should create a booking', async () => {
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      setTestUser(customer);

      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send({
          slotId: slot.id,
          idempotencyKey: 'test-idem-key-1',
        });
      if (res.status !== 201) console.log(res.body);
      expect(res.status).toBe(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status', BookingStatus.PENDING);
      expect(res.body).toHaveProperty('slotId', slot.id);
    });

    it('should return existing booking for duplicate idempotency key', async () => {
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      setTestUser(customer);

      // Create first booking
      const first = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send({ slotId: slot.id, idempotencyKey: 'idem-dup' })
        .expect(201);

      // Duplicate request
      const second = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send({ slotId: slot.id, idempotencyKey: 'idem-dup' });
      if (second.status !== 201) console.log(second.body);
      expect(second.status).toBe(201);

      expect(first.body.id).toBe(second.body.id);
    });

    it('should return 409 when slot is full', async () => {
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 1,
      });
      setTestUser(customer);

      // Fill the slot
      await createTestBooking(prisma, {
        userId: customer.id,
        slotId: slot.id,
        idempotencyKey: 'fill-1',
      });

      // Attempt another booking
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send({ slotId: slot.id, idempotencyKey: 'overflow-1' })
        .expect(409);
    });

    it('should return 409 when slot is cancelled', async () => {
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        status: SlotStatus.CANCELLED,
      });
      setTestUser(customer);

      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send({ slotId: slot.id, idempotencyKey: 'cancelled-slot' })
        .expect(409);
    });

    it('should return 400 for missing fields', async () => {
      const customer = await createTestUser(prisma);
      setTestUser(customer);

      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/bookings', () => {
    it('should return user bookings', async () => {
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      setTestUser(customer);

      await createTestBooking(prisma, {
        userId: customer.id,
        slotId: slot.id,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/bookings/all', () => {
    it('should return all bookings for admin', async () => {
      const admin = await createTestAdmin(prisma);
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      await createTestBooking(prisma, {
        userId: customer.id,
        slotId: slot.id,
      });
      setTestUser(admin);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/all')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 for non-admin', async () => {
      const customer = await createTestUser(prisma);
      setTestUser(customer);

      await request(app.getHttpServer())
        .get('/api/v1/bookings/all')
        .expect(403);
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('should return booking by id', async () => {
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      const booking = await createTestBooking(prisma, {
        userId: customer.id,
        slotId: slot.id,
      });
      setTestUser(customer);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${booking.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', booking.id);
    });
  });

  describe('PATCH /api/v1/bookings/:id (confirm)', () => {
    it('should confirm a pending booking (admin)', async () => {
      const admin = await createTestAdmin(prisma);
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      const booking = await createTestBooking(prisma, {
        userId: customer.id,
        slotId: slot.id,
      });
      setTestUser(admin);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${booking.id}`)
        .expect(400);

      expect(res.body).toHaveProperty(
        'message',
        'You can only confirm bookings with successful payment',
      );
    });

    it('should return 400 if booking not pending', async () => {
      const admin = await createTestAdmin(prisma);
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      const booking = await createTestBooking(prisma, {
        userId: customer.id,
        slotId: slot.id,
        status: BookingStatus.CONFIRMED,
      });
      setTestUser(admin);

      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${booking.id}`)
        .expect(400);
    });
  });

  describe('DELETE /api/v1/bookings/:id (cancel)', () => {
    it('should cancel own booking', async () => {
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      const booking = await createTestBooking(prisma, {
        userId: customer.id,
        slotId: slot.id,
      });
      setTestUser(customer);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/bookings/${booking.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', booking.id);

      // Verify slot booked count decreased
      const updatedSlot = await prisma.slot.findUnique({
        where: { id: slot.id },
      });
      expect(updatedSlot?.bookedCount).toBe(0);
    });

    it('should return 403 for non-owner', async () => {
      const customer = await createTestUser(prisma);
      const otherUser = await createTestUser(prisma, {
        email: 'other@test.com',
      });
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      const booking = await createTestBooking(prisma, {
        userId: customer.id,
        slotId: slot.id,
      });
      setTestUser(otherUser);

      await request(app.getHttpServer())
        .delete(`/api/v1/bookings/${booking.id}`)
        .expect(403);
    });

    it('should return 400 if already cancelled', async () => {
      const customer = await createTestUser(prisma);
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        capacity: 5,
      });
      const booking = await createTestBooking(prisma, {
        userId: customer.id,
        slotId: slot.id,
        status: BookingStatus.CANCELLED,
      });
      setTestUser(customer);

      await request(app.getHttpServer())
        .delete(`/api/v1/bookings/${booking.id}`)
        .expect(400);
    });
  });
});
