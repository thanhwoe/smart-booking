import { Test, TestingModule } from '@nestjs/testing';
import { CreateSlotUseCase } from '@application/slot/use-cases/create-slot.use-case';
import { FindSlotUseCase } from '@application/slot/use-cases/find-slot.use-case';
import { FindAllSlotsUseCase } from '@application/slot/use-cases/find-all-slots.use-case';
import { CancelSlotUseCase } from '@application/slot/use-cases/cancel-slot.use-case';
import { ISlotRepository } from '@domain/slot/slot.repository';
import { IServiceRepository } from '@domain/service/service.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import { SlotStatus } from '@domain/slot/slot.entity';
import { UserRole } from '@domain/user/user.entity';
import type { Slot } from '@domain/slot/slot.entity';
import type { Service } from '@domain/service/service.entity';
import { ServiceNotFoundError } from '@domain/service/service.errors';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const mockSlot: Slot = {
  id: 'slot-1',
  serviceId: 'service-1',
  providerId: 'provider-1',
  startTime: new Date('2026-05-01T10:00:00Z'),
  endTime: new Date('2026-05-01T11:00:00Z'),
  capacity: 5,
  bookedCount: 0,
  status: SlotStatus.AVAILABLE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockService: Service = {
  id: 'service-1',
  name: 'Haircut',
  description: null,
  durationMinutes: 60,
  price: new Decimal(50),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const providerUser = {
  id: 'provider-1',
  role: UserRole.PROVIDER,
};

const adminUser = {
  id: 'admin-1',
  role: UserRole.ADMIN,
};

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeSlotRepo(): jest.Mocked<ISlotRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOverlapping: jest.fn(),
  };
}

function makeServiceRepo(): jest.Mocked<IServiceRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

function makeCacheService(): jest.Mocked<ICacheService> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    wrap: jest
      .fn()
      .mockImplementation(
        (_key: string, _ttl: number, fetcher: () => Promise<unknown>) =>
          fetcher(),
      ),
  };
}

// ─── CreateSlotUseCase ────────────────────────────────────────────────────────

describe('CreateSlotUseCase', () => {
  let useCase: CreateSlotUseCase;
  let slotRepo: jest.Mocked<ISlotRepository>;
  let serviceRepo: jest.Mocked<IServiceRepository>;

  beforeEach(async () => {
    slotRepo = makeSlotRepo();
    serviceRepo = makeServiceRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSlotUseCase,
        { provide: ISlotRepository, useValue: slotRepo },
        { provide: IServiceRepository, useValue: serviceRepo },
      ],
    }).compile();

    useCase = module.get(CreateSlotUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create a slot when no overlap exists', async () => {
    serviceRepo.findOne.mockResolvedValue(mockService);
    slotRepo.findOverlapping.mockResolvedValue(null);
    slotRepo.create.mockResolvedValue(mockSlot);

    const result = await useCase.execute('provider-1', {
      serviceId: 'service-1',
      startTime: '2026-05-01T10:00:00Z',
      endTime: '2026-05-01T11:00:00Z',
      capacity: 5,
    });

    expect(result).toEqual(mockSlot);
    expect(slotRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: SlotStatus.AVAILABLE }),
    );
  });

  it('should throw ServiceNotFoundError if service does not exist', async () => {
    serviceRepo.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute('provider-1', {
        serviceId: 'nonexistent',
        startTime: '2026-05-01T10:00:00Z',
        endTime: '2026-05-01T11:00:00Z',
      }),
    ).rejects.toThrow(ServiceNotFoundError);
  });

  it('should throw BadRequestException when overlapping slot exists', async () => {
    serviceRepo.findOne.mockResolvedValue(mockService);
    slotRepo.findOverlapping.mockResolvedValue(mockSlot);

    await expect(
      useCase.execute('provider-1', {
        serviceId: 'service-1',
        startTime: '2026-05-01T10:00:00Z',
        endTime: '2026-05-01T11:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── FindSlotUseCase ──────────────────────────────────────────────────────────

describe('FindSlotUseCase', () => {
  let useCase: FindSlotUseCase;
  let slotRepo: jest.Mocked<ISlotRepository>;
  let cacheService: jest.Mocked<ICacheService>;

  beforeEach(async () => {
    slotRepo = makeSlotRepo();
    cacheService = makeCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindSlotUseCase,
        { provide: ISlotRepository, useValue: slotRepo },
        { provide: ICacheService, useValue: cacheService },
      ],
    }).compile();

    useCase = module.get(FindSlotUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return a slot by id', async () => {
    slotRepo.findOne.mockResolvedValue(mockSlot);

    const result = await useCase.execute('slot-1');

    expect(result).toEqual(mockSlot);
  });

  it('should throw NotFoundException if slot not found', async () => {
    slotRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ─── FindAllSlotsUseCase ──────────────────────────────────────────────────────

describe('FindAllSlotsUseCase', () => {
  let useCase: FindAllSlotsUseCase;
  let slotRepo: jest.Mocked<ISlotRepository>;

  beforeEach(async () => {
    slotRepo = makeSlotRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllSlotsUseCase,
        { provide: ISlotRepository, useValue: slotRepo },
      ],
    }).compile();

    useCase = module.get(FindAllSlotsUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return paginated slots', async () => {
    slotRepo.findAll.mockResolvedValue([[mockSlot], 1]);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.data).toEqual([mockSlot]);
    expect(result.meta.total).toBe(1);
  });

  it('should filter by serviceId', async () => {
    slotRepo.findAll.mockResolvedValue([[mockSlot], 1]);

    await useCase.execute({ page: 1, limit: 10, serviceId: 'service-1' });

    expect(slotRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: 'service-1' }),
    );
  });
});

// ─── CancelSlotUseCase ────────────────────────────────────────────────────────

describe('CancelSlotUseCase', () => {
  let useCase: CancelSlotUseCase;
  let slotRepo: jest.Mocked<ISlotRepository>;
  let cacheService: jest.Mocked<ICacheService>;
  let findSlotUseCase: jest.Mocked<FindSlotUseCase>;

  beforeEach(async () => {
    slotRepo = makeSlotRepo();
    cacheService = makeCacheService();
    findSlotUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelSlotUseCase,
        { provide: ISlotRepository, useValue: slotRepo },
        { provide: ICacheService, useValue: cacheService },
        { provide: FindSlotUseCase, useValue: findSlotUseCase },
      ],
    }).compile();

    useCase = module.get(CancelSlotUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should cancel slot for the owner', async () => {
    findSlotUseCase.execute.mockResolvedValue(mockSlot);
    const updated = { ...mockSlot, status: SlotStatus.CANCELLED };
    slotRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute('slot-1', providerUser);

    expect(result.status).toBe(SlotStatus.CANCELLED);
    expect(cacheService.del).toHaveBeenCalledWith('slot:slot-1');
  });

  it('should cancel slot for admin', async () => {
    findSlotUseCase.execute.mockResolvedValue(mockSlot);
    const updated = { ...mockSlot, status: SlotStatus.CANCELLED };
    slotRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute('slot-1', adminUser);

    expect(result.status).toBe(SlotStatus.CANCELLED);
  });

  it('should throw BadRequestException for non-owner non-admin', async () => {
    findSlotUseCase.execute.mockResolvedValue(mockSlot);

    await expect(
      useCase.execute('slot-1', { id: 'other-provider', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ConflictException if slot already cancelled', async () => {
    findSlotUseCase.execute.mockResolvedValue({
      ...mockSlot,
      status: SlotStatus.CANCELLED,
    });

    await expect(useCase.execute('slot-1', adminUser)).rejects.toThrow(
      ConflictException,
    );
  });
});
