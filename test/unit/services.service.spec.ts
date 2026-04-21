import { Test, TestingModule } from '@nestjs/testing';
import { ServicesService } from '@app/modules/services/services.service';
import { ServiceRepository } from '@app/modules/services/services.repository';
import { ICacheService } from '@app/interfaces/cache.interface';
import { Service } from '@app/generated/prisma/client';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@app/generated/prisma/internal/prismaNamespace';

describe('ServicesService', () => {
  let service: ServicesService;
  let serviceRepository: jest.Mocked<ServiceRepository>;
  let cacheService: jest.Mocked<ICacheService>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: ServiceRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ICacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            wrap: jest
              .fn()
              .mockImplementation(
                async (
                  _key: string,
                  _ttl: number,
                  fetcher: () => Promise<unknown>,
                ) => fetcher(),
              ),
          },
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    serviceRepository = module.get(ServiceRepository);
    cacheService = module.get(ICacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a service', async () => {
      serviceRepository.create.mockResolvedValue(mockService);

      const result = await service.create({
        name: 'Haircut',
        description: 'A basic haircut',
        durationMinutes: 30,
        price: 25.0,
      });

      expect(result).toEqual(mockService);
    });
  });

  describe('findAll', () => {
    it('should return paginated services', async () => {
      serviceRepository.findAll.mockResolvedValue([[mockService], 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([mockService]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a service by id', async () => {
      serviceRepository.findOne.mockResolvedValue(mockService);

      const result = await service.findOne('service-1');

      expect(result).toEqual(mockService);
    });

    it('should throw NotFoundException if service not found', async () => {
      serviceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a service and invalidate cache', async () => {
      const updated = { ...mockService, name: 'Updated Haircut' };
      serviceRepository.findOne.mockResolvedValue(mockService);
      serviceRepository.update.mockResolvedValue(updated);

      const result = await service.update('service-1', {
        name: 'Updated Haircut',
      });

      expect(result).toEqual(updated);
      expect(cacheService.del).toHaveBeenCalledWith('service:service-1');
    });
  });

  describe('remove', () => {
    it('should delete a service and invalidate cache', async () => {
      serviceRepository.findOne.mockResolvedValue(mockService);
      serviceRepository.delete.mockResolvedValue(mockService);

      const result = await service.remove('service-1');

      expect(result).toEqual(mockService);
      expect(cacheService.del).toHaveBeenCalledWith('service:service-1');
    });

    it('should throw NotFoundException if service not found', async () => {
      serviceRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
