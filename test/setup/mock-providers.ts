import { ICacheService } from '@app/interfaces/cache.interface';
import { PostHogClient } from '@app/modules/shared/track/posthog/posthob.config';
import { RedisClient } from '@app/modules/shared/redis/redis.config';
import { CLERK_CLIENT } from '@app/modules/auth/clerk/clerk-client.provider';
import { STRIPE_CLIENT } from '@app/modules/payments/stripe/stripe-client.provider';
import { Provider } from '@nestjs/common';

// ---------- Cache ----------
export const mockCacheService: ICacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  wrap: jest
    .fn()
    .mockImplementation(
      async (_key: string, _ttl: number, fetcher: () => Promise<unknown>) =>
        fetcher(),
    ),
};

export const MockCacheProvider: Provider = {
  provide: ICacheService,
  useValue: mockCacheService,
};

// ---------- Redis ----------
export const mockRedisClient = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn().mockResolvedValue('OK'),
  on: jest.fn(),
  duplicate: jest.fn().mockReturnThis(),
};

export const MockRedisProvider: Provider = {
  provide: RedisClient,
  useValue: mockRedisClient,
};

// ---------- PostHog ----------
export const mockPostHogClient = {
  capture: jest.fn(),
  captureException: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
};

export const MockPostHogProvider: Provider = {
  provide: PostHogClient,
  useValue: mockPostHogClient,
};

// ---------- Clerk ----------
export const mockClerkClient = {
  users: {
    getUser: jest.fn().mockResolvedValue({
      id: 'clerk_test_user',
      emailAddresses: [{ emailAddress: 'test@test.com' }],
      firstName: 'Test',
      lastName: 'User',
    }),
    deleteUser: jest.fn().mockResolvedValue({}),
  },
};

export const MockClerkProvider: Provider = {
  provide: CLERK_CLIENT,
  useValue: mockClerkClient,
};

// ---------- Stripe ----------
export const mockStripeClient = {
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      }),
    },
  },
  refunds: {
    create: jest.fn().mockResolvedValue({
      id: 're_test_123',
      status: 'succeeded',
    }),
  },
};

export const MockStripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  useValue: mockStripeClient,
};

// ---------- Queue (BullMQ) ----------
export const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job_1' }),
  close: jest.fn().mockResolvedValue(undefined),
};

// ---------- Helpers ----------
export function resetAllMocks() {
  jest.clearAllMocks();
}
