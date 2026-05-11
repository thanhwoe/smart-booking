import { Test, TestingModule } from '@nestjs/testing';
import { CreateBookingUseCase } from '@application/booking/use-cases/create-booking.use-case';
import { CancelBookingUseCase } from '@application/booking/use-cases/cancel-booking.use-case';
import { ConfirmBookingUseCase } from '@application/booking/use-cases/confirm-booking.use-case';
import { RefundBookingUseCase } from '@application/booking/use-cases/refund-booking.use-case';
import { FindBookingUseCase } from '@application/booking/use-cases/find-booking.use-case';
import { FindAllBookingsUseCase } from '@application/booking/use-cases/find-all-bookings.use-case';
import { CancelExpiredBookingsUseCase } from '@application/booking/use-cases/cancel-expired-bookings.use-case';
import { IBookingRepository } from '@domain/booking/booking.repository';
import { ISlotRepository } from '@domain/slot/slot.repository';
import { ILockService } from '@application/common/ports/lock.port';
import { IQueueService } from '@application/common/ports/queue.port';
import { ICacheService } from '@application/common/ports/cache.port';
import { BookingStatus } from '@domain/booking/booking.entity';
import { PaymentStatus } from '@domain/payment/payment.entity';
import { SlotStatus } from '@domain/slot/slot.entity';
import { UserRole } from '@domain/user/user.entity';
import type { User } from '@domain/user/user.entity';
import type { Slot } from '@domain/slot/slot.entity';
import type { Booking } from '@domain/booking/booking.entity';
import type {
  BookingWithPayment,
  BookingCanceled,
} from '@domain/booking/booking.repository';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

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

const mockBookingWithPayment: BookingWithPayment = {
  ...mockBooking,
  payment: {
    id: 'payment-1',
    bookingId: 'booking-1',
    status: PaymentStatus.PAID,
    stripeSessionId: 'cs_123',
    stripePaymentIntent: 'pi_123',
    amount: new Decimal(50),
    currency: 'usd',
    paidAt: new Date(),
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  slot: {
    service: {
      id: 'service-1',
      name: 'Test Service',
      description: null,
      durationMinutes: 60,
      price: new Decimal(50),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    provider: { id: 'provider-1', name: 'Provider', email: 'p@test.com' },
  },
};

const mockBookingCanceled: BookingCanceled = {
  id: 'booking-1',
  slotId: 'slot-1',
  user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
  slot: {
    service: { name: 'Test Service' },
    startTime: new Date('2026-05-01T10:00:00Z'),
  },
  payment: null,
};

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeBookingRepo(): jest.Mocked<IBookingRepository> {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    findByIdempotencyKey: jest.fn(),
    findAll: jest.fn(),
    cancel: jest.fn(),
    cancelExpired: jest.fn(),
  };
}

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

function makeQueueService(): jest.Mocked<IQueueService> {
  return {
    dispatchBookingConfirmed: jest.fn().mockResolvedValue(undefined),
    dispatchBookingCancelled: jest.fn().mockResolvedValue(undefined),
  };
}

function makeLockService(): jest.Mocked<ILockService> {
  return {
    withLock: jest
      .fn()
      .mockImplementation((_id: string, fn: () => Promise<unknown>) => fn()),
  };
}

// ─── CreateBookingUseCase ─────────────────────────────────────────────────────

describe('CreateBookingUseCase', () => {
  let useCase: CreateBookingUseCase;
  let bookingRepo: jest.Mocked<IBookingRepository>;
  let slotRepo: jest.Mocked<ISlotRepository>;
  let lockService: jest.Mocked<ILockService>;

  beforeEach(async () => {
    bookingRepo = makeBookingRepo();
    slotRepo = makeSlotRepo();
    lockService = makeLockService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBookingUseCase,
        { provide: IBookingRepository, useValue: bookingRepo },
        { provide: ISlotRepository, useValue: slotRepo },
        { provide: ILockService, useValue: lockService },
      ],
    }).compile();

    useCase = module.get(CreateBookingUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return existing booking for duplicate idempotency key', async () => {
    bookingRepo.findByIdempotencyKey.mockResolvedValue(mockBookingWithPayment);

    const result = await useCase.execute({
      slotId: 'slot-1',
      userId: 'user-1',
      idempotencyKey: 'idem-1',
    });

    expect(result).toEqual(mockBookingWithPayment);
    expect(slotRepo.findOne).not.toHaveBeenCalled();
  });

  it('should create a new booking with distributed lock', async () => {
    bookingRepo.findByIdempotencyKey.mockResolvedValue(null);
    slotRepo.findOne.mockResolvedValue(mockSlot);
    bookingRepo.create.mockResolvedValue(mockBookingWithPayment);

    const result = await useCase.execute({
      slotId: 'slot-1',
      userId: 'user-1',
      idempotencyKey: 'idem-2',
    });

    expect(result).toEqual(mockBookingWithPayment);
    expect(lockService.withLock).toHaveBeenCalledWith(
      'slot-1',
      expect.any(Function),
      'booking',
    );
  });

  it('should throw ConflictException if slot is cancelled', async () => {
    bookingRepo.findByIdempotencyKey.mockResolvedValue(null);
    slotRepo.findOne.mockResolvedValue({
      ...mockSlot,
      status: SlotStatus.CANCELLED,
    });

    await expect(
      useCase.execute({
        slotId: 'slot-1',
        userId: 'user-1',
        idempotencyKey: 'idem-3',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw ConflictException if slot is full', async () => {
    bookingRepo.findByIdempotencyKey.mockResolvedValue(null);
    slotRepo.findOne.mockResolvedValue({
      ...mockSlot,
      bookedCount: 5,
      capacity: 5,
    });

    await expect(
      useCase.execute({
        slotId: 'slot-1',
        userId: 'user-1',
        idempotencyKey: 'idem-4',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException if slot does not exist', async () => {
    bookingRepo.findByIdempotencyKey.mockResolvedValue(null);
    slotRepo.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute({
        slotId: 'nonexistent',
        userId: 'user-1',
        idempotencyKey: 'idem-5',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── FindBookingUseCase ───────────────────────────────────────────────────────

describe('FindBookingUseCase', () => {
  let useCase: FindBookingUseCase;
  let bookingRepo: jest.Mocked<IBookingRepository>;
  let cacheService: jest.Mocked<ICacheService>;

  beforeEach(async () => {
    bookingRepo = makeBookingRepo();
    cacheService = makeCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindBookingUseCase,
        { provide: IBookingRepository, useValue: bookingRepo },
        { provide: ICacheService, useValue: cacheService },
      ],
    }).compile();

    useCase = module.get(FindBookingUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return booking by id', async () => {
    bookingRepo.findOne.mockResolvedValue(mockBookingWithPayment);

    const result = await useCase.execute('booking-1');

    expect(result).toEqual(mockBookingWithPayment);
  });

  it('should throw NotFoundException if booking not found', async () => {
    bookingRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ─── FindAllBookingsUseCase ───────────────────────────────────────────────────

describe('FindAllBookingsUseCase', () => {
  let useCase: FindAllBookingsUseCase;
  let bookingRepo: jest.Mocked<IBookingRepository>;

  beforeEach(async () => {
    bookingRepo = makeBookingRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllBookingsUseCase,
        { provide: IBookingRepository, useValue: bookingRepo },
      ],
    }).compile();

    useCase = module.get(FindAllBookingsUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return paginated bookings', async () => {
    bookingRepo.findAll.mockResolvedValue([[mockBooking], 1]);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.data).toEqual([mockBooking]);
    expect(result.meta.total).toBe(1);
  });

  it('should filter by userId', async () => {
    bookingRepo.findAll.mockResolvedValue([[mockBooking], 1]);

    await useCase.execute({ page: 1, limit: 10, userId: 'user-1' });

    expect(bookingRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
  });
});

// ─── ConfirmBookingUseCase ────────────────────────────────────────────────────

describe('ConfirmBookingUseCase', () => {
  let useCase: ConfirmBookingUseCase;
  let bookingRepo: jest.Mocked<IBookingRepository>;
  let cacheService: jest.Mocked<ICacheService>;
  let findBookingUseCase: jest.Mocked<FindBookingUseCase>;

  beforeEach(async () => {
    bookingRepo = makeBookingRepo();
    cacheService = makeCacheService();
    findBookingUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmBookingUseCase,
        { provide: IBookingRepository, useValue: bookingRepo },
        { provide: ICacheService, useValue: cacheService },
        { provide: FindBookingUseCase, useValue: findBookingUseCase },
      ],
    }).compile();

    useCase = module.get(ConfirmBookingUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should confirm a pending booking with successful payment', async () => {
    findBookingUseCase.execute.mockResolvedValue(mockBookingWithPayment);
    const confirmed = {
      ...mockBookingWithPayment,
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    };
    bookingRepo.update.mockResolvedValue(confirmed);

    const result = await useCase.execute('booking-1');

    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(cacheService.del).toHaveBeenCalledWith('booking:booking-1');
  });

  it('should throw BadRequestException if booking is not pending', async () => {
    findBookingUseCase.execute.mockResolvedValue({
      ...mockBookingWithPayment,
      status: BookingStatus.CONFIRMED,
    });

    await expect(useCase.execute('booking-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if payment is not paid', async () => {
    findBookingUseCase.execute.mockResolvedValue({
      ...mockBookingWithPayment,
      payment: { ...mockBookingWithPayment.payment!, status: PaymentStatus.PENDING },
    });

    await expect(useCase.execute('booking-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});

// ─── CancelBookingUseCase ─────────────────────────────────────────────────────

describe('CancelBookingUseCase', () => {
  let useCase: CancelBookingUseCase;
  let bookingRepo: jest.Mocked<IBookingRepository>;
  let queueService: jest.Mocked<IQueueService>;
  let cacheService: jest.Mocked<ICacheService>;
  let findBookingUseCase: jest.Mocked<FindBookingUseCase>;

  beforeEach(async () => {
    bookingRepo = makeBookingRepo();
    queueService = makeQueueService();
    cacheService = makeCacheService();
    findBookingUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelBookingUseCase,
        { provide: IBookingRepository, useValue: bookingRepo },
        { provide: IQueueService, useValue: queueService },
        { provide: ICacheService, useValue: cacheService },
        { provide: FindBookingUseCase, useValue: findBookingUseCase },
      ],
    }).compile();

    useCase = module.get(CancelBookingUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should cancel own booking', async () => {
    findBookingUseCase.execute.mockResolvedValue(mockBookingWithPayment);
    bookingRepo.cancel.mockResolvedValue(mockBookingCanceled);

    const result = await useCase.execute({
      id: 'booking-1',
      userId: 'user-1',
      userRole: UserRole.CUSTOMER,
    });

    expect(result).toEqual(mockBookingCanceled);
    expect(queueService.dispatchBookingCancelled).toHaveBeenCalled();
    expect(cacheService.del).toHaveBeenCalledWith('booking:booking-1');
  });

  it('should allow admin to cancel any booking', async () => {
    findBookingUseCase.execute.mockResolvedValue(mockBookingWithPayment);
    bookingRepo.cancel.mockResolvedValue(mockBookingCanceled);

    await useCase.execute({
      id: 'booking-1',
      userId: 'admin-1',
      userRole: UserRole.ADMIN,
    });

    expect(bookingRepo.cancel).toHaveBeenCalledWith('booking-1');
  });

  it('should throw BadRequestException if non-owner non-admin cancels', async () => {
    findBookingUseCase.execute.mockResolvedValue(mockBookingWithPayment);

    await expect(
      useCase.execute({
        id: 'booking-1',
        userId: 'user-999',
        userRole: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if booking already cancelled', async () => {
    findBookingUseCase.execute.mockResolvedValue({
      ...mockBookingWithPayment,
      status: BookingStatus.CANCELLED,
    });

    await expect(
      useCase.execute({
        id: 'booking-1',
        userId: 'user-1',
        userRole: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if booking is refunded', async () => {
    findBookingUseCase.execute.mockResolvedValue({
      ...mockBookingWithPayment,
      status: BookingStatus.REFUNDED,
    });

    await expect(
      useCase.execute({
        id: 'booking-1',
        userId: 'user-1',
        userRole: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── RefundBookingUseCase ─────────────────────────────────────────────────────

describe('RefundBookingUseCase', () => {
  let useCase: RefundBookingUseCase;
  let bookingRepo: jest.Mocked<IBookingRepository>;
  let slotRepo: jest.Mocked<ISlotRepository>;
  let cacheService: jest.Mocked<ICacheService>;
  let findBookingUseCase: jest.Mocked<FindBookingUseCase>;

  beforeEach(async () => {
    bookingRepo = makeBookingRepo();
    slotRepo = makeSlotRepo();
    cacheService = makeCacheService();
    findBookingUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundBookingUseCase,
        { provide: IBookingRepository, useValue: bookingRepo },
        { provide: ISlotRepository, useValue: slotRepo },
        { provide: ICacheService, useValue: cacheService },
        { provide: FindBookingUseCase, useValue: findBookingUseCase },
      ],
    }).compile();

    useCase = module.get(RefundBookingUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should refund a confirmed booking and decrement slot count', async () => {
    const confirmedBooking = {
      ...mockBookingWithPayment,
      status: BookingStatus.CONFIRMED,
    };
    findBookingUseCase.execute.mockResolvedValue(confirmedBooking);
    slotRepo.findOne.mockResolvedValue({ ...mockSlot, bookedCount: 1 });
    slotRepo.update.mockResolvedValue({ ...mockSlot, bookedCount: 0 });
    const refunded = {
      ...mockBookingWithPayment,
      status: BookingStatus.REFUNDED,
    };
    bookingRepo.update.mockResolvedValue(refunded);

    const result = await useCase.execute('booking-1');

    expect(result.status).toBe(BookingStatus.REFUNDED);
    expect(slotRepo.update).toHaveBeenCalledWith(
      'slot-1',
      expect.objectContaining({ bookedCount: { decrement: 1 } }),
    );
    expect(cacheService.del).toHaveBeenCalledWith('booking:booking-1');
  });

  it('should throw BadRequestException if already refunded', async () => {
    findBookingUseCase.execute.mockResolvedValue({
      ...mockBookingWithPayment,
      status: BookingStatus.REFUNDED,
    });

    await expect(useCase.execute('booking-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});

// ─── CancelExpiredBookingsUseCase ─────────────────────────────────────────────

describe('CancelExpiredBookingsUseCase', () => {
  let useCase: CancelExpiredBookingsUseCase;
  let bookingRepo: jest.Mocked<IBookingRepository>;
  let queueService: jest.Mocked<IQueueService>;

  beforeEach(async () => {
    bookingRepo = makeBookingRepo();
    queueService = makeQueueService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelExpiredBookingsUseCase,
        { provide: IBookingRepository, useValue: bookingRepo },
        { provide: IQueueService, useValue: queueService },
      ],
    }).compile();

    useCase = module.get(CancelExpiredBookingsUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should cancel expired bookings and dispatch events', async () => {
    bookingRepo.cancelExpired.mockResolvedValue([mockBookingCanceled]);

    await useCase.execute();

    expect(queueService.dispatchBookingCancelled).toHaveBeenCalledTimes(1);
    expect(queueService.dispatchBookingCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'booking-1' }),
    );
  });

  it('should do nothing when no expired bookings', async () => {
    bookingRepo.cancelExpired.mockResolvedValue([]);

    await useCase.execute();

    expect(queueService.dispatchBookingCancelled).not.toHaveBeenCalled();
  });
});
