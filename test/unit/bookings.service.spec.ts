import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from '@app/modules/bookings/bookings.service';
import { BookingsRepository } from '@app/modules/bookings/bookings.repository';
import { SlotsService } from '@app/modules/slots/slots.service';
import { DistributedLockService } from '@app/modules/shared/lock/distributed-lock.service';
import { QueueService } from '@app/modules/shared/queue/queue.service';
import { ICacheService } from '@app/interfaces/cache.interface';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  Slot,
  SlotStatus,
  User,
  UserRole,
} from '@app/generated/prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingsRepository: jest.Mocked<BookingsRepository>;
  let slotsService: jest.Mocked<SlotsService>;
  let lockService: jest.Mocked<DistributedLockService>;
  let queueService: jest.Mocked<QueueService>;
  let cacheService: jest.Mocked<ICacheService>;

  const mockUser: User = {
    id: 'user-1',
    clerkId: 'clerk_1',
    email: 'test@test.com',
    name: 'Test User',
    phone: null,
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSlot: Slot = {
    id: 'slot-1',
    serviceId: 'service-1',
    providerId: 'provider-1',
    startTime: new Date('2026-05-01T10:00:00Z'),
    endTime: new Date('2026-05-01T11:00:00Z'),
    capacity: 5,
    bookedCount: 1,
    status: SlotStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBooking: Booking = {
    id: 'booking-1',
    userId: 'user-1',
    slotId: 'slot-1',
    status: BookingStatus.PENDING,
    idempotencyKey: 'idem-1',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    confirmedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBookingWithRelations = {
    ...mockBooking,
    payment: {
      status: PaymentStatus.PAID,
    },
    slot: {
      service: {
        id: 'service-1',
        name: 'Test Service',
        description: null,
        durationMinutes: 60,
        price: 50,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      provider: { id: 'provider-1', name: 'Provider', email: 'p@test.com' },
      startTime: new Date('2026-05-01T10:00:00Z'),
    },
    user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: BookingsRepository,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findAll: jest.fn(),
            findByIdempotencyKey: jest.fn(),
            update: jest.fn(),
            cancel: jest.fn(),
            cancelExpired: jest.fn(),
          },
        },
        {
          provide: SlotsService,
          useValue: {
            findOne: jest.fn(),
            decreaseBookingCount: jest.fn(),
          },
        },
        {
          provide: DistributedLockService,
          useValue: {
            withLock: jest
              .fn()
              .mockImplementation(
                async (_id: string, fn: () => Promise<unknown>) => fn(),
              ),
          },
        },
        {
          provide: QueueService,
          useValue: {
            dispatchBookingConfirmed: jest.fn().mockResolvedValue(undefined),
            dispatchBookingCancelled: jest.fn().mockResolvedValue(undefined),
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

    service = module.get<BookingsService>(BookingsService);
    bookingsRepository = module.get(BookingsRepository);
    slotsService = module.get(SlotsService);
    lockService = module.get(DistributedLockService);
    queueService = module.get(QueueService);
    cacheService = module.get(ICacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should return existing booking for duplicate idempotency key', async () => {
      bookingsRepository.findByIdempotencyKey.mockResolvedValue(mockBooking);

      const result = await service.create(mockUser, {
        slotId: 'slot-1',
        idempotencyKey: 'idem-1',
      });

      expect(result).toEqual(mockBooking);
      expect(slotsService.findOne).not.toHaveBeenCalled();
    });

    it('should create a new booking with distributed lock', async () => {
      bookingsRepository.findByIdempotencyKey.mockResolvedValue(null);
      slotsService.findOne.mockResolvedValue(mockSlot);
      bookingsRepository.create.mockResolvedValue(mockBookingWithRelations);

      const result = await service.create(mockUser, {
        slotId: 'slot-1',
        idempotencyKey: 'idem-2',
      });

      expect(result).toEqual(mockBookingWithRelations);
      expect(lockService.withLock).toHaveBeenCalledWith(
        'slot-1',
        expect.any(Function),
        'booking',
      );
    });

    it('should throw ConflictException if slot is cancelled', async () => {
      bookingsRepository.findByIdempotencyKey.mockResolvedValue(null);
      slotsService.findOne.mockResolvedValue({
        ...mockSlot,
        status: SlotStatus.CANCELLED,
      });

      await expect(
        service.create(mockUser, {
          slotId: 'slot-1',
          idempotencyKey: 'idem-3',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if slot is full', async () => {
      bookingsRepository.findByIdempotencyKey.mockResolvedValue(null);
      slotsService.findOne.mockResolvedValue({
        ...mockSlot,
        bookedCount: 5,
        capacity: 5,
      });

      await expect(
        service.create(mockUser, {
          slotId: 'slot-1',
          idempotencyKey: 'idem-4',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return booking by id', async () => {
      bookingsRepository.findOne.mockResolvedValue(mockBookingWithRelations);

      const result = await service.findOne('booking-1');

      expect(result).toEqual(mockBookingWithRelations);
    });

    it('should throw NotFoundException if booking not found', async () => {
      bookingsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('confirm', () => {
    it('should confirm a pending booking', async () => {
      bookingsRepository.findOne.mockResolvedValue(mockBookingWithRelations);
      const confirmed = {
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
        payment: {
          status: PaymentStatus.PAID,
        },
      };
      bookingsRepository.update.mockResolvedValue(confirmed);

      const result = await service.confirm('booking-1');

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(cacheService.del).toHaveBeenCalledWith('booking:booking-1');
    });

    it('should throw BadRequestException if booking is not pending', async () => {
      bookingsRepository.findOne.mockResolvedValue({
        ...mockBookingWithRelations,
        status: BookingStatus.CONFIRMED,
      });

      await expect(service.confirm('booking-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel own booking', async () => {
      const cancelledBooking = {
        ...mockBookingWithRelations,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      };
      bookingsRepository.findOne.mockResolvedValue(mockBookingWithRelations);
      bookingsRepository.cancel.mockResolvedValue(cancelledBooking);

      const result = await service.cancel('booking-1', mockUser);

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(queueService.dispatchBookingCancelled).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledWith('booking:booking-1');
    });

    it('should allow admin to cancel any booking', async () => {
      const adminUser = { ...mockUser, id: 'admin-1', role: UserRole.ADMIN };
      const cancelledBooking = {
        ...mockBookingWithRelations,
        status: BookingStatus.CANCELLED,
      };
      bookingsRepository.findOne.mockResolvedValue(mockBookingWithRelations);
      bookingsRepository.cancel.mockResolvedValue(cancelledBooking);

      await service.cancel('booking-1', adminUser);

      expect(bookingsRepository.cancel).toHaveBeenCalledWith('booking-1');
    });

    it('should throw ForbiddenException if non-owner non-admin cancels', async () => {
      const otherUser = { ...mockUser, id: 'user-999' };
      bookingsRepository.findOne.mockResolvedValue(mockBookingWithRelations);

      await expect(service.cancel('booking-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if booking already cancelled', async () => {
      bookingsRepository.findOne.mockResolvedValue({
        ...mockBookingWithRelations,
        status: BookingStatus.CANCELLED,
      });

      await expect(service.cancel('booking-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if booking is refunded', async () => {
      bookingsRepository.findOne.mockResolvedValue({
        ...mockBookingWithRelations,
        status: BookingStatus.REFUNDED,
      });

      await expect(service.cancel('booking-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refund', () => {
    it('should refund a confirmed booking', async () => {
      const confirmed = {
        ...mockBookingWithRelations,
        status: BookingStatus.CONFIRMED,
      };
      bookingsRepository.findOne.mockResolvedValue(confirmed);
      const refunded = { ...mockBooking, status: BookingStatus.REFUNDED };
      bookingsRepository.update.mockResolvedValue(refunded);

      const result = await service.refund('booking-1');

      expect(result.status).toBe(BookingStatus.REFUNDED);
      expect(slotsService.decreaseBookingCount).toHaveBeenCalledWith('slot-1');
      expect(cacheService.del).toHaveBeenCalledWith('booking:booking-1');
    });

    it('should throw BadRequestException if already refunded', async () => {
      bookingsRepository.findOne.mockResolvedValue({
        ...mockBookingWithRelations,
        status: BookingStatus.REFUNDED,
      });

      await expect(service.refund('booking-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated bookings', async () => {
      bookingsRepository.findAll.mockResolvedValue([[mockBooking], 1]);

      const result = await service.findAll({ page: 1, limit: 10 }, {});

      expect(result.data).toEqual([mockBooking]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findByUser', () => {
    it('should return user bookings', async () => {
      bookingsRepository.findAll.mockResolvedValue([[mockBooking], 1]);

      const result = await service.findByUser(
        mockUser,
        { page: 1, limit: 10 },
        {},
      );

      expect(result.data).toEqual([mockBooking]);
      expect(bookingsRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });

  describe('cancelExpired', () => {
    it('should cancel expired bookings and dispatch events', async () => {
      const expiredBooking = {
        ...mockBookingWithRelations,
        id: 'expired-1',
      };
      bookingsRepository.cancelExpired.mockResolvedValue([expiredBooking]);

      await service.cancelExpired();

      expect(queueService.dispatchBookingCancelled).toHaveBeenCalledTimes(1);
    });
  });
});
