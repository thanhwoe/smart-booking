import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestPrismaService } from '../setup/test-prisma.service';
import { createTestApp, setTestUser } from '../setup/test-app.factory';
import { createTestAdmin, createTestUser } from '../factories/user.factory';
import { createTestService } from '../factories/service.factory';
import { resetAllMocks } from '../setup/mock-providers';

describe('Services E2E', () => {
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

  describe('POST /api/v1/services', () => {
    it('should create a service (admin)', async () => {
      const admin = await createTestAdmin(prisma);
      setTestUser(admin);

      const res = await request(app.getHttpServer())
        .post('/api/v1/services')
        .send({
          name: 'Haircut',
          description: 'A basic haircut service',
          price: 25,
          durationMinutes: 30,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Haircut');
      expect(res.body).toHaveProperty('durationMinutes', 30);
    });

    it('should return 403 for non-admin', async () => {
      const user = await createTestUser(prisma);
      setTestUser(user);

      await request(app.getHttpServer())
        .post('/api/v1/services')
        .send({
          name: 'Haircut',
          description: 'A basic haircut service',
          price: 25,
          durationMinutes: 30,
        })
        .expect(403);
    });

    it('should return 400 for invalid payload', async () => {
      const admin = await createTestAdmin(prisma);
      setTestUser(admin);

      await request(app.getHttpServer())
        .post('/api/v1/services')
        .send({ name: '' }) // missing required fields
        .expect(400);
    });
  });

  describe('GET /api/v1/services', () => {
    it('should return paginated services', async () => {
      const admin = await createTestAdmin(prisma);
      setTestUser(admin);

      await createTestService(prisma, { name: 'Service A' });
      await createTestService(prisma, { name: 'Service B' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/services')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('should respect pagination params', async () => {
      const admin = await createTestAdmin(prisma);
      setTestUser(admin);

      for (let i = 0; i < 5; i++) {
        await createTestService(prisma, { name: `Service ${i}` });
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/services?page=1&limit=2')
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(5);
      expect(res.body.meta.hasNextPage).toBe(true);
    });
  });

  describe('GET /api/v1/services/:id', () => {
    it('should return service by id', async () => {
      const admin = await createTestAdmin(prisma);
      setTestUser(admin);

      const svc = await createTestService(prisma, { name: 'Massage' });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/services/${svc.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', svc.id);
      expect(res.body).toHaveProperty('name', 'Massage');
    });

    it('should return 404 for non-existent service', async () => {
      const admin = await createTestAdmin(prisma);
      setTestUser(admin);

      await request(app.getHttpServer())
        .get('/api/v1/services/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/services/:id', () => {
    it('should update a service', async () => {
      const admin = await createTestAdmin(prisma);
      setTestUser(admin);

      const svc = await createTestService(prisma);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/services/${svc.id}`)
        .send({ name: 'Updated Service', isActive: false })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'Updated Service');
      expect(res.body).toHaveProperty('isActive', false);
    });
  });

  describe('DELETE /api/v1/services/:id', () => {
    it('should delete a service', async () => {
      const admin = await createTestAdmin(prisma);
      setTestUser(admin);

      const svc = await createTestService(prisma);

      await request(app.getHttpServer())
        .delete(`/api/v1/services/${svc.id}`)
        .expect(200);

      const deleted = await prisma.service.findUnique({
        where: { id: svc.id },
      });
      expect(deleted).toBeNull();
    });
  });
});
