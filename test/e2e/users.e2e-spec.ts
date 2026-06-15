import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestPrismaService } from '../setup/test-prisma.service';
import { createTestApp, setTestUser } from '../setup/test-app.factory';
import { createTestUser, createTestAdmin } from '../factories/user.factory';
import { resetAllMocks } from '../setup/mock-providers';

describe('Users E2E', () => {
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

  describe('GET /api/v1/users/me', () => {
    it('should return current user', async () => {
      const dbUser = await createTestUser(prisma, {
        email: 'me@test.com',
        name: 'Me User',
      });
      setTestUser(dbUser);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(200);

      expect(res.body).toHaveProperty('id', dbUser.id);
      expect(res.body).toHaveProperty('email', 'me@test.com');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should update current user name', async () => {
      const dbUser = await createTestUser(prisma);
      setTestUser(dbUser);

      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'New Name');
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return paginated users for admin', async () => {
      const admin = await createTestAdmin(prisma);
      await createTestUser(prisma, { email: 'user1@test.com' });
      await createTestUser(prisma, { email: 'user2@test.com' });
      setTestUser(admin);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3); // admin + 2 users
    });

    it('should return 403 for non-admin', async () => {
      const user = await createTestUser(prisma);
      setTestUser(user);

      await request(app.getHttpServer()).get('/api/v1/users').expect(403);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user by id for admin', async () => {
      const admin = await createTestAdmin(prisma);
      const user = await createTestUser(prisma, { email: 'target@test.com' });
      setTestUser(admin);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${user.id}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', user.id);
      expect(res.body).toHaveProperty('email', 'target@test.com');
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createTestAdmin(prisma);
      setTestUser(admin);

      await request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should update user for admin', async () => {
      const admin = await createTestAdmin(prisma);
      const user = await createTestUser(prisma);
      setTestUser(admin);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${user.id}`)
        .send({ name: 'Admin Updated' })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'Admin Updated');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user for admin', async () => {
      const admin = await createTestAdmin(prisma);
      const user = await createTestUser(prisma);
      setTestUser(admin);

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${user.id}`)
        .expect(200);

      // Verify user is deleted
      const deleted = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 403 for non-admin', async () => {
      const user = await createTestUser(prisma);
      const target = await createTestUser(prisma, { email: 'del@test.com' });
      setTestUser(user);

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${target.id}`)
        .expect(403);
    });
  });
});
