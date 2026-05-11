import { Test, TestingModule } from '@nestjs/testing';
import { CreateCheckoutUseCase } from '@application/payment/use-cases/create-checkout.use-case';
import { RefundPaymentUseCase } from '@application/payment/use-cases/refund-payment.use-case';
import { RefundBookingUseCase } from '@application/booking/use-cases/refund-booking.use-case';
import { FindBookingUseCase } from '@application/booking/use-cases/find-booking.use-case';
import { IPaymentRepository } from '@domain/payment/payment.repository';
import { IPaymentGateway } from '@application/payment/ports/payment-gateway.port';
import { IQueueService } from '@application/common/ports/queue.port';
import { BookingStatus } from '@domain/booking/booking.entity';
import { PaymentStatus } from '@domain/payment/payment.entity';
import { UserRole } from '@domain/user/user.entity';
import type { User } from '@domain/user/user.entity';
import type { BookingWithPayment } from '@domain/booking/booking.repository';
import type { PaymentWithBooking } from '@domain/payment/payment.repository';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
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

const mockBookingWithPayment: BookingWithPayment = {
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
  payment: {
    id: 'payment-1',
    bookingId: 'booking-1',
    stripeSessionId: null,
    stripePaymentIntent: null,
    amount: new Decimal(50),
    currency: 'usd',
    status: PaymentStatus.PENDING,
    paidAt: null,
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

const mockPaymentWithBooking: PaymentWithBooking = {
  id: 'payment-1',
  bookingId: 'booking-1',
  stripeSessionId: 'cs_123',
  stripePaymentIntent: 'pi_123',
  amount: new Decimal(50),
  currency: 'usd',
  status: PaymentStatus.PAID,
  paidAt: new Date(),
  refundedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  booking: {
    user: mockUser,
    slot: {
      service: { name: 'Test Service' },
      provider: { name: 'Provider' },
      startTime: new Date('2026-05-01T10:00:00Z'),
      endTime: new Date('2026-05-01T11:00:00Z'),
    },
  },
};

// ─── Mock factories ───────────────────────────────────────────────────────────

function makePaymentRepo(): jest.Mocked<IPaymentRepository> {
  return {
    create: jest.fn(),
    update: jest.fn(),
    updateByBookingId: jest.fn(),
    updateExpired: jest.fn(),
    findOne: jest.fn(),
    findByBookingId: jest.fn(),
    findByPaymentIntent: jest.fn(),
  };
}

function makePaymentGateway(): jest.Mocked<IPaymentGateway> {
  return {
    createCheckoutSession: jest.fn().mockResolvedValue({
      id: 'cs_test_123',
      clientSecret: 'https://checkout.stripe.com/test',
    }),
    createRefund: jest.fn().mockResolvedValue(undefined),
  };
}

function makeQueueService(): jest.Mocked<IQueueService> {
  return {
    dispatchBookingConfirmed: jest.fn().mockResolvedValue(undefined),
    dispatchBookingCancelled: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── CreateCheckoutUseCase ────────────────────────────────────────────────────

describe('CreateCheckoutUseCase', () => {
  let useCase: CreateCheckoutUseCase;
  let paymentRepo: jest.Mocked<IPaymentRepository>;
  let paymentGateway: jest.Mocked<IPaymentGateway>;
  let findBookingUseCase: jest.Mocked<FindBookingUseCase>;

  beforeEach(async () => {
    paymentRepo = makePaymentRepo();
    paymentGateway = makePaymentGateway();
    findBookingUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCheckoutUseCase,
        { provide: IPaymentRepository, useValue: paymentRepo },
        { provide: IPaymentGateway, useValue: paymentGateway },
        { provide: FindBookingUseCase, useValue: findBookingUseCase },
      ],
    }).compile();

    useCase = module.get(CreateCheckoutUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create a checkout session', async () => {
    findBookingUseCase.execute.mockResolvedValue(mockBookingWithPayment);
    paymentRepo.update.mockResolvedValue({} as any);

    const result = await useCase.execute({
      bookingId: 'booking-1',
      user: mockUser,
      successUrl: 'https://example.com/success',
    });

    expect(result.clientSecret).toBe('https://checkout.stripe.com/test');
    expect(result.id).toBe('cs_test_123');
    expect(paymentGateway.createCheckoutSession).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if user does not own booking', async () => {
    findBookingUseCase.execute.mockResolvedValue(mockBookingWithPayment);
    const otherUser = { ...mockUser, id: 'user-999' };

    await expect(
      useCase.execute({
        bookingId: 'booking-1',
        user: otherUser,
        successUrl: 'https://example.com/success',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw BadRequestException if booking is not pending', async () => {
    findBookingUseCase.execute.mockResolvedValue({
      ...mockBookingWithPayment,
      status: BookingStatus.CONFIRMED,
    });

    await expect(
      useCase.execute({
        bookingId: 'booking-1',
        user: mockUser,
        successUrl: 'https://example.com/success',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if payment is already paid', async () => {
    findBookingUseCase.execute.mockResolvedValue({
      ...mockBookingWithPayment,
      payment: {
        ...mockBookingWithPayment.payment!,
        status: PaymentStatus.PAID,
      },
    });

    await expect(
      useCase.execute({
        bookingId: 'booking-1',
        user: mockUser,
        successUrl: 'https://example.com/success',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if no payment record', async () => {
    findBookingUseCase.execute.mockResolvedValue({
      ...mockBookingWithPayment,
      payment: null,
    });

    await expect(
      useCase.execute({
        bookingId: 'booking-1',
        user: mockUser,
        successUrl: 'https://example.com/success',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── RefundPaymentUseCase ─────────────────────────────────────────────────────

describe('RefundPaymentUseCase', () => {
  let useCase: RefundPaymentUseCase;
  let paymentRepo: jest.Mocked<IPaymentRepository>;
  let paymentGateway: jest.Mocked<IPaymentGateway>;
  let queueService: jest.Mocked<IQueueService>;
  let refundBookingUseCase: jest.Mocked<RefundBookingUseCase>;

  beforeEach(async () => {
    paymentRepo = makePaymentRepo();
    paymentGateway = makePaymentGateway();
    queueService = makeQueueService();
    refundBookingUseCase = { execute: jest.fn().mockResolvedValue({}) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundPaymentUseCase,
        { provide: IPaymentRepository, useValue: paymentRepo },
        { provide: IPaymentGateway, useValue: paymentGateway },
        { provide: IQueueService, useValue: queueService },
        { provide: RefundBookingUseCase, useValue: refundBookingUseCase },
      ],
    }).compile();

    useCase = module.get(RefundPaymentUseCase);
  });

  afterEach(() => jest.clearAllMocks());

  it('should refund a paid payment', async () => {
    paymentRepo.findByBookingId.mockResolvedValue(mockPaymentWithBooking);
    const refundedPayment = {
      ...mockPaymentWithBooking,
      status: PaymentStatus.REFUNDED,
    };
    paymentRepo.update.mockResolvedValue(refundedPayment);

    const result = await useCase.execute('booking-1');

    expect(result.status).toBe(PaymentStatus.REFUNDED);
    expect(paymentGateway.createRefund).toHaveBeenCalledWith('booking-1', 'pi_123');
    expect(refundBookingUseCase.execute).toHaveBeenCalledWith('booking-1');
    expect(queueService.dispatchBookingCancelled).toHaveBeenCalled();
  });

  it('should return payment early if already refunded', async () => {
    const alreadyRefunded = {
      ...mockPaymentWithBooking,
      status: PaymentStatus.REFUNDED,
    };
    paymentRepo.findByBookingId.mockResolvedValue(alreadyRefunded);

    const result = await useCase.execute('booking-1');

    expect(result.status).toBe(PaymentStatus.REFUNDED);
    expect(paymentGateway.createRefund).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if payment is not paid', async () => {
    paymentRepo.findByBookingId.mockResolvedValue({
      ...mockPaymentWithBooking,
      status: PaymentStatus.PENDING,
    });

    await expect(useCase.execute('booking-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if no payment intent', async () => {
    paymentRepo.findByBookingId.mockResolvedValue({
      ...mockPaymentWithBooking,
      stripePaymentIntent: null,
    });

    await expect(useCase.execute('booking-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw NotFoundException if payment not found', async () => {
    paymentRepo.findByBookingId.mockResolvedValue(null);

    await expect(useCase.execute('booking-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('findOne', () => {
    it('should return payment for own booking', async () => {
      paymentRepo.findByBookingId.mockResolvedValue(mockPaymentWithBooking);

      const result = await useCase.findOne('booking-1', mockUser);

      expect(result).toEqual(mockPaymentWithBooking);
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentRepo.findByBookingId.mockResolvedValue(null);

      await expect(useCase.findOne('booking-1', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user does not own the payment', async () => {
      paymentRepo.findByBookingId.mockResolvedValue(mockPaymentWithBooking);
      const otherUser = { ...mockUser, id: 'user-999' };

      await expect(useCase.findOne('booking-1', otherUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
