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
import { resetAllMocks } from '../setup/mock-providers';
import { SlotStatus } from '@domain/slot/slot.entity';

describe('Slots E2E', () => {
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

  describe('POST /api/v1/slots', () => {
    it('should create a slot (provider)', async () => {
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      setTestUser(provider);

      const startTime = new Date(Date.now() + 86400000).toISOString(); // tomorrow
      const endTime = new Date(Date.now() + 86400000 + 3600000).toISOString();

      const res = await request(app.getHttpServer())
        .post('/api/v1/slots')
        .send({
          serviceId: svc.id,
          startTime,
          endTime,
          capacity: 3,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('capacity', 3);
      expect(res.body).toHaveProperty('status', SlotStatus.AVAILABLE);
    });

    it('should return 403 for customer', async () => {
      const customer = await createTestUser(prisma);
      const svc = await createTestService(prisma);
      setTestUser(customer);

      await request(app.getHttpServer())
        .post('/api/v1/slots')
        .send({
          serviceId: svc.id,
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        })
        .expect(403);
    });

    it('should return 400 for missing fields', async () => {
      const provider = await createTestProvider(prisma);
      setTestUser(provider);

      await request(app.getHttpServer())
        .post('/api/v1/slots')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/slots', () => {
    it('should return paginated slots', async () => {
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      setTestUser(provider);

      await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
      });
      await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
        startTime: new Date(Date.now() + 7200000),
        endTime: new Date(Date.now() + 10800000),
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/slots')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBe(2);
    });

    it('should filter by serviceId', async () => {
      const provider = await createTestProvider(prisma);
      const svc1 = await createTestService(prisma, { name: 'Svc 1' });
      const svc2 = await createTestService(prisma, { name: 'Svc 2' });
      setTestUser(provider);

      await createTestSlot(prisma, {
        serviceId: svc1.id,
        providerId: provider.id,
      });
      await createTestSlot(prisma, {
        serviceId: svc2.id,
        providerId: provider.id,
        startTime: new Date(Date.now() + 7200000),
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/slots?serviceId=${svc1.id}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/slots/:id', () => {
    it('should return slot by id', async () => {
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      setTestUser(provider);

      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/slots/${slot.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', slot.id);
    });

    it('should return 404 for non-existent slot', async () => {
      const provider = await createTestProvider(prisma);
      setTestUser(provider);

      await request(app.getHttpServer())
        .get('/api/v1/slots/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('DELETE /api/v1/slots/:id', () => {
    it('should cancel slot by owner', async () => {
      const provider = await createTestProvider(prisma);
      const svc = await createTestService(prisma);
      setTestUser(provider);

      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/slots/${slot.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('status', SlotStatus.CANCELLED);
    });

    it('should cancel slot by admin', async () => {
      const provider = await createTestProvider(prisma);
      const admin = await createTestAdmin(prisma);
      const svc = await createTestService(prisma);

      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
      });

      setTestUser(admin);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/slots/${slot.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('status', SlotStatus.CANCELLED);
    });

    it('should return 400 for non-owner customer', async () => {
      const provider = await createTestProvider(prisma);
      const customer = await createTestUser(prisma);
      const svc = await createTestService(prisma);

      const slot = await createTestSlot(prisma, {
        serviceId: svc.id,
        providerId: provider.id,
      });

      setTestUser(customer);

      await request(app.getHttpServer())
        .delete(`/api/v1/slots/${slot.id}`)
        .expect(400);
    });
  });
});
