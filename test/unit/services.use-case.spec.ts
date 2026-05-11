import { Test, TestingModule } from '@nestjs/testing';
import { CreateServiceUseCase } from '@application/service/use-cases/create-service.use-case';
import { FindServiceUseCase } from '@application/service/use-cases/find-service.use-case';
import { FindAllServicesUseCase } from '@application/service/use-cases/find-all-services.use-case';
import { UpdateServiceUseCase } from '@application/service/use-cases/update-service.use-case';
import { DeleteServiceUseCase } from '@application/service/use-cases/delete-service.use-case';
import { IServiceRepository } from '@domain/service/service.repository';
import { ICacheService } from '@application/common/ports/cache.port';
import type { Service } from '@domain/service/service.entity';
import { ServiceNotFoundError } from '@domain/service/service.errors';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const mockService: Service = {
  id: 'service-1',
  name: 'Haircut',
  description: 'A basic haircut',
  durationMinutes: 30,
  price: new Decimal(25.0),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Mock factories ───────────────────────────────────────────────────────────

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

// ─── CreateServiceUseCase ─────────────────────────────────────────────────────

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;
  let serviceRepo: jest.Mocked<IServiceRepository>;

  beforeEach(async () => {
    serviceRepo = makeServiceRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateServiceUseCase,
        { provide: IServiceRepository, useValue: serviceRepo },
      ],
    }).compile();

    useCase = module.get(CreateServiceUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create a service', async () => {
    serviceRepo.create.mockResolvedValue(mockService);

    const result = await useCase.execute({
      name: 'Haircut',
      description: 'A basic haircut',
      durationMinutes: 30,
      price: 25.0,
    });

    expect(result).toEqual(mockService);
    expect(serviceRepo.create).toHaveBeenCalled();
  });
});

// ─── FindServiceUseCase ───────────────────────────────────────────────────────

describe('FindServiceUseCase', () => {
  let useCase: FindServiceUseCase;
  let serviceRepo: jest.Mocked<IServiceRepository>;
  let cacheService: jest.Mocked<ICacheService>;

  beforeEach(async () => {
    serviceRepo = makeServiceRepo();
    cacheService = makeCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindServiceUseCase,
        { provide: IServiceRepository, useValue: serviceRepo },
        { provide: ICacheService, useValue: cacheService },
      ],
    }).compile();

    useCase = module.get(FindServiceUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return a service by id', async () => {
    serviceRepo.findOne.mockResolvedValue(mockService);

    const result = await useCase.execute('service-1');

    expect(result).toEqual(mockService);
  });

  it('should throw ServiceNotFoundError if service not found', async () => {
    serviceRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(
      ServiceNotFoundError,
    );
  });
});

// ─── FindAllServicesUseCase ───────────────────────────────────────────────────

describe('FindAllServicesUseCase', () => {
  let useCase: FindAllServicesUseCase;
  let serviceRepo: jest.Mocked<IServiceRepository>;

  beforeEach(async () => {
    serviceRepo = makeServiceRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllServicesUseCase,
        { provide: IServiceRepository, useValue: serviceRepo },
      ],
    }).compile();

    useCase = module.get(FindAllServicesUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return paginated services', async () => {
    serviceRepo.findAll.mockResolvedValue([[mockService], 1]);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.data).toEqual([mockService]);
    expect(result.meta.total).toBe(1);
  });
});

// ─── UpdateServiceUseCase ─────────────────────────────────────────────────────

describe('UpdateServiceUseCase', () => {
  let useCase: UpdateServiceUseCase;
  let serviceRepo: jest.Mocked<IServiceRepository>;
  let cacheService: jest.Mocked<ICacheService>;
  let findServiceUseCase: jest.Mocked<FindServiceUseCase>;

  beforeEach(async () => {
    serviceRepo = makeServiceRepo();
    cacheService = makeCacheService();
    findServiceUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateServiceUseCase,
        { provide: IServiceRepository, useValue: serviceRepo },
        { provide: ICacheService, useValue: cacheService },
        { provide: FindServiceUseCase, useValue: findServiceUseCase },
      ],
    }).compile();

    useCase = module.get(UpdateServiceUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should update a service and invalidate cache', async () => {
    const updated = { ...mockService, name: 'Updated Haircut' };
    findServiceUseCase.execute.mockResolvedValue(mockService);
    serviceRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute('service-1', {
      name: 'Updated Haircut',
    });

    expect(result).toEqual(updated);
    expect(cacheService.del).toHaveBeenCalledWith('service:service-1');
  });

  it('should throw NotFoundException if service does not exist', async () => {
    findServiceUseCase.execute.mockRejectedValue(new NotFoundException());

    await expect(
      useCase.execute('nonexistent', { name: 'Updated' }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── DeleteServiceUseCase ─────────────────────────────────────────────────────

describe('DeleteServiceUseCase', () => {
  let useCase: DeleteServiceUseCase;
  let serviceRepo: jest.Mocked<IServiceRepository>;
  let cacheService: jest.Mocked<ICacheService>;
  let findServiceUseCase: jest.Mocked<FindServiceUseCase>;

  beforeEach(async () => {
    serviceRepo = makeServiceRepo();
    cacheService = makeCacheService();
    findServiceUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteServiceUseCase,
        { provide: IServiceRepository, useValue: serviceRepo },
        { provide: ICacheService, useValue: cacheService },
        { provide: FindServiceUseCase, useValue: findServiceUseCase },
      ],
    }).compile();

    useCase = module.get(DeleteServiceUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should delete a service and invalidate cache', async () => {
    findServiceUseCase.execute.mockResolvedValue(mockService);
    serviceRepo.delete.mockResolvedValue(mockService);

    const result = await useCase.execute('service-1');

    expect(result).toEqual(mockService);
    expect(cacheService.del).toHaveBeenCalledWith('service:service-1');
  });

  it('should throw NotFoundException if service does not exist', async () => {
    findServiceUseCase.execute.mockRejectedValue(new NotFoundException());

    await expect(useCase.execute('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
