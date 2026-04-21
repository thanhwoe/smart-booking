import { Slot, SlotStatus } from '@app/generated/prisma/client';
import { TestPrismaService } from '../setup/test-prisma.service';

export interface CreateTestSlotOptions {
  serviceId: string;
  providerId: string;
  startTime?: Date;
  endTime?: Date;
  capacity?: number;
  status?: SlotStatus;
}

export async function createTestSlot(
  prisma: TestPrismaService,
  options: CreateTestSlotOptions,
): Promise<Slot> {
  const now = new Date();
  const startTime = options.startTime ?? new Date(now.getTime() + 3600000); // 1 hour from now
  const endTime =
    options.endTime ?? new Date(startTime.getTime() + 3600000); // 1 hour duration

  return prisma.slot.create({
    data: {
      serviceId: options.serviceId,
      providerId: options.providerId,
      startTime,
      endTime,
      capacity: options.capacity ?? 1,
      status: options.status ?? SlotStatus.AVAILABLE,
    },
  });
}
