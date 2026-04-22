import { Test, TestingModule } from '@nestjs/testing';
import { SlotsService } from '@app/modules/slots/slots.service';
import { SlotsRepository } from '@app/modules/slots/slots.repository';
import { ICacheService } from '@app/interfaces/cache.interface';
import { Slot, SlotStatus, UserRole } from '@app/generated/prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServicesService } from '@app/modules/services/services.service';

describe('SlotsService', () => {
  let service: SlotsService;
  let slotsRepository: jest.Mocked<SlotsRepository>;
  let cacheService: jest.Mocked<ICacheService>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService,
        {
          provide: SlotsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findOverlapping: jest.fn(),
          },
        },
        {
          provide: ServicesService,
          useValue: {
            findOne: jest.fn(),
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

    service = module.get<SlotsService>(SlotsService);
    slotsRepository = module.get(SlotsRepository);
    cacheService = module.get(ICacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a slot when no overlap exists', async () => {
      slotsRepository.findOverlapping.mockResolvedValue(null);
      slotsRepository.create.mockResolvedValue(mockSlot);

      const result = await service.create('provider-1', {
        serviceId: 'service-1',
        startTime: '2026-05-01T10:00:00Z',
        endTime: '2026-05-01T11:00:00Z',
        capacity: 5,
      });

      expect(result).toEqual(mockSlot);
    });

    it('should throw BadRequestException when overlapping slot exists', async () => {
      slotsRepository.findOverlapping.mockResolvedValue(mockSlot);

      await expect(
        service.create('provider-1', {
          serviceId: 'service-1',
          startTime: '2026-05-01T10:00:00Z',
          endTime: '2026-05-01T11:00:00Z',
          capacity: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated slots', async () => {
      slotsRepository.findAll.mockResolvedValue([[mockSlot], 1]);

      const result = await service.findAll({ page: 1, limit: 10 }, {});

      expect(result.data).toEqual([mockSlot]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a slot by id', async () => {
      slotsRepository.findOne.mockResolvedValue(mockSlot);

      const result = await service.findOne('slot-1');

      expect(result).toEqual(mockSlot);
    });

    it('should throw NotFoundException if slot not found', async () => {
      slotsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const adminUser = {
      id: 'admin-1',
      clerkId: 'clerk_admin',
      email: 'admin@test.com',
      name: 'Admin',
      phone: null,
      role: UserRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const providerUser = {
      id: 'provider-1',
      clerkId: 'clerk_provider',
      email: 'provider@test.com',
      name: 'Provider',
      phone: null,
      role: UserRole.PROVIDER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should cancel slot for the owner', async () => {
      slotsRepository.findOne.mockResolvedValue(mockSlot);
      const updated = { ...mockSlot, status: SlotStatus.CANCELLED };
      slotsRepository.update.mockResolvedValue(updated);

      const result = await service.remove('slot-1', providerUser);

      expect(result.status).toBe(SlotStatus.CANCELLED);
      expect(cacheService.del).toHaveBeenCalledWith('slot:slot-1');
    });

    it('should cancel slot for admin', async () => {
      slotsRepository.findOne.mockResolvedValue(mockSlot);
      const updated = { ...mockSlot, status: SlotStatus.CANCELLED };
      slotsRepository.update.mockResolvedValue(updated);

      const result = await service.remove('slot-1', adminUser);

      expect(result.status).toBe(SlotStatus.CANCELLED);
    });

    it('should throw BadRequestException for non-owner non-admin', async () => {
      slotsRepository.findOne.mockResolvedValue(mockSlot);
      const otherUser = {
        ...providerUser,
        id: 'other-provider',
        role: UserRole.CUSTOMER,
      };

      await expect(service.remove('slot-1', otherUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if slot already cancelled', async () => {
      const cancelledSlot = { ...mockSlot, status: SlotStatus.CANCELLED };
      slotsRepository.findOne.mockResolvedValue(cancelledSlot);

      await expect(service.remove('slot-1', adminUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('decreaseBookingCount', () => {
    it('should decrease booking count', async () => {
      const slotWithBooking = { ...mockSlot, bookedCount: 1 };
      slotsRepository.findOne.mockResolvedValue(slotWithBooking);
      slotsRepository.update.mockResolvedValue({
        ...slotWithBooking,
        bookedCount: 0,
      });

      await service.decreaseBookingCount('slot-1');

      expect(slotsRepository.update).toHaveBeenCalledWith('slot-1', {
        bookedCount: { decrement: 1 },
        status: 'AVAILABLE',
      });
      expect(cacheService.del).toHaveBeenCalledWith('slot:slot-1');
    });

    it('should throw BadRequestException if booked count is 0', async () => {
      slotsRepository.findOne.mockResolvedValue(mockSlot);

      await expect(service.decreaseBookingCount('slot-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
