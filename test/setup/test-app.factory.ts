import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  type ExecutionContext,
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { AppModule } from '@app/app.module';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { TestPrismaService } from './test-prisma.service';
import {
  mockCacheService,
  mockClerkClient,
  mockPostHogClient,
  mockRedisClient,
  mockStripeClient,
  mockQueue,
} from './mock-providers';
import { ICacheService } from '@application/common/ports/cache.port';
import { RedisClient } from '@infrastructure/redis/redis.config';
import { PostHogClient } from '@infrastructure/tracking/posthog/posthog.config';
import { CLERK_CLIENT } from '@infrastructure/auth/clerk/clerk-client.provider';
import { STRIPE_CLIENT } from '@infrastructure/payment-gateway/stripe/stripe-client.provider';
import { JwtAuthGuard } from '@presentation/guards/jwt-auth.guard';
import { User, UserRole } from '@domain/user/user.entity';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUES } from '@infrastructure/queue/queue.constants';
import { EmailProcessor } from '@infrastructure/queue/processors/email.processor';
import { ILockService } from '@application/common/ports/lock.port';

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
    .overrideProvider(ILockService)
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
