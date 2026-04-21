import { Service } from '@app/generated/prisma/client';
import { TestPrismaService } from '../setup/test-prisma.service';

export interface CreateTestServiceOptions {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  isActive?: boolean;
}

export async function createTestService(
  prisma: TestPrismaService,
  options: CreateTestServiceOptions = {},
): Promise<Service> {
  return prisma.service.create({
    data: {
      name: options.name ?? 'Test Service',
      description: options.description ?? 'A test service',
      durationMinutes: options.durationMinutes ?? 60,
      price: options.price ?? 50.0,
      isActive: options.isActive ?? true,
    },
  });
}
