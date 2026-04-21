import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  type ExecutionContext,
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { AppModule } from '@app/app.module';
import { PrismaService } from '@app/database/prisma/prisma.service';
import { TestPrismaService } from './test-prisma.service';
import {
  mockCacheService,
  mockClerkClient,
  mockPostHogClient,
  mockRedisClient,
  mockStripeClient,
  mockQueue,
} from './mock-providers';
import { ICacheService } from '@app/interfaces/cache.interface';
import { RedisClient } from '@app/modules/shared/redis/redis.config';
import { PostHogClient } from '@app/modules/shared/track/posthog/posthob.config';
import { CLERK_CLIENT } from '@app/modules/auth/clerk/clerk-client.provider';
import { STRIPE_CLIENT } from '@app/modules/payments/stripe/stripe-client.provider';
import { JwtAuthGuard } from '@app/guards/jwt-auth.guard';
import { User, UserRole } from '@app/generated/prisma/client';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUES } from '@app/modules/shared/queue/queue.constants';
import { EmailProcessor } from '@app/modules/shared/queue/processors/email.processor';
import { DistributedLockService } from '@app/modules/shared/lock/distributed-lock.service';

/**
 * The mock guard that bypasses Clerk JWT verification.
 * It injects the `testUser` set via `setTestUser()` into request.user.
 */
let currentTestUser: User | null = null;

export function setTestUser(user: User | null) {
  currentTestUser = user;
}

export function getTestUser(): User | null {
  return currentTestUser;
}

export async function createTestApp(): Promise<{
  app: INestApplication;
  module: TestingModule;
  prisma: TestPrismaService;
}> {
  const prisma = new TestPrismaService();
  await prisma.onModuleInit();

  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  // Override providers
  moduleBuilder
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(DistributedLockService)
    .useValue({
      withLock: jest.fn().mockImplementation(async (id, fn) => fn()),
      onModuleInit: jest.fn(),
    })
    .overrideProvider(ICacheService)
    .useValue(mockCacheService)
    .overrideProvider(RedisClient)
    .useValue(mockRedisClient)
    .overrideProvider(PostHogClient)
    .useValue(mockPostHogClient)
    .overrideProvider(CLERK_CLIENT)
    .useValue(mockClerkClient)
    .overrideProvider(STRIPE_CLIENT)
    .useValue(mockStripeClient)
    // Queue overrides
    .overrideProvider(getQueueToken(QUEUES.EMAIL))
    .useValue(mockQueue)
    .overrideProvider(EmailProcessor)
    .useValue({ process: jest.fn() });

  const module = await moduleBuilder.compile();

  const app = module.createNestApplication();

  // Bypass JwtAuthGuard globally using jest spy
  jest
    .spyOn(JwtAuthGuard.prototype, 'canActivate')
    .mockImplementation((context: ExecutionContext) => {
      if (!currentTestUser) return true;
      const request = context
        .switchToHttp()
        .getRequest<Request & { user: User }>();
      request.user = currentTestUser;
      return Promise.resolve(true);
    });

  // Apply the same setup as main.ts
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          errors: Object.values(error.constraints || {}),
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  await app.init();

  return { app, module, prisma };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    clerkId: 'clerk_test_user',
    email: 'test@test.com',
    name: 'Test User',
    phone: null,
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeAdmin(overrides: Partial<User> = {}): User {
  return makeUser({
    id: 'admin-user-id',
    clerkId: 'clerk_admin_user',
    email: 'admin@test.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
    ...overrides,
  });
}

export function makeProvider(overrides: Partial<User> = {}): User {
  return makeUser({
    id: 'provider-user-id',
    clerkId: 'clerk_provider_user',
    email: 'provider@test.com',
    name: 'Provider User',
    role: UserRole.PROVIDER,
    ...overrides,
  });
}
