import { User, UserRole } from '@app/generated/prisma/client';
import { TestPrismaService } from '../setup/test-prisma.service';
import { randomUUID } from 'crypto';

export interface CreateTestUserOptions {
  clerkId?: string;
  email?: string;
  name?: string;
  phone?: string;
  role?: UserRole;
}

export async function createTestUser(
  prisma: TestPrismaService,
  options: CreateTestUserOptions = {},
): Promise<User> {
  const id = randomUUID();
  return prisma.user.create({
    data: {
      clerkId: options.clerkId ?? `clerk_${id}`,
      email: options.email ?? `user-${id}@test.com`,
      name: options.name ?? `Test User ${id.slice(0, 8)}`,
      phone: options.phone ?? null,
      role: options.role ?? UserRole.CUSTOMER,
    },
  });
}

export async function createTestAdmin(
  prisma: TestPrismaService,
  options: Partial<CreateTestUserOptions> = {},
): Promise<User> {
  return createTestUser(prisma, { role: UserRole.ADMIN, ...options });
}

export async function createTestProvider(
  prisma: TestPrismaService,
  options: Partial<CreateTestUserOptions> = {},
): Promise<User> {
  return createTestUser(prisma, { role: UserRole.PROVIDER, ...options });
}
