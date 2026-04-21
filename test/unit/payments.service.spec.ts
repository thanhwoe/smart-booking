import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '@app/modules/payments/payments.service';
import { BookingsService } from '@app/modules/bookings/bookings.service';
import { StripeService } from '@app/modules/payments/stripe/stripe.service';
import { PaymentsRepository } from '@app/modules/payments/payments.repository';
import { QueueService } from '@app/modules/shared/queue/queue.service';
import {
  BookingStatus,
  PaymentStatus,
  UserRole,
  type User,
} from '@app/generated/prisma/client';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Decimal } from '@app/generated/prisma/internal/prismaNamespace';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let bookingsService: jest.Mocked<BookingsService>;
  let stripeService: jest.Mocked<StripeService>;
  let paymentsRepository: jest.Mocked<PaymentsRepository>;
  let queueService: jest.Mocked<QueueService>;

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

  const mockBooking = {
    id: 'booking-1',
    userId: 'user-1',
    slotId: 'slot-1',
    status: BookingStatus.PENDING,
    idempotencyKey: 'idem-1',
    expiresAt: new Date(),
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
      startTime: new Date('2026-05-01T10:00:00Z'),
    },
  };

  const mockPaymentWithBooking = {
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
      id: 'booking-1',
      user: mockUser,
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
        provider: { name: 'Provider' },
        startTime: new Date('2026-05-01T10:00:00Z'),
        endTime: new Date('2026-05-01T11:00:00Z'),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: BookingsService,
          useValue: {
            findOne: jest.fn(),
            refund: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            createSession: jest.fn(),
            createRefund: jest.fn(),
          },
        },
        {
          provide: PaymentsRepository,
          useValue: {
            findByBookingId: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            dispatchBookingCancelled: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    bookingsService = module.get(BookingsService);
    stripeService = module.get(StripeService);
    paymentsRepository = module.get(PaymentsRepository);
    queueService = module.get(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session', async () => {
      bookingsService.findOne.mockResolvedValue(mockBooking);
      stripeService.createSession.mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/test',
      } as any);
      paymentsRepository.update.mockResolvedValue({} as any);

      const result = await service.createCheckoutSession(
        'booking-1',
        mockUser,
        {
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        },
      );

      expect(result.url).toBe('https://checkout.stripe.com/test');
      expect(result.id).toBe('cs_123');
    });

    it('should throw UnauthorizedException if user does not own booking', async () => {
      bookingsService.findOne.mockResolvedValue(mockBooking);
      const otherUser = { ...mockUser, id: 'user-999' };

      await expect(
        service.createCheckoutSession('booking-1', otherUser, {
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if booking is not pending', async () => {
      bookingsService.findOne.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
      });

      await expect(
        service.createCheckoutSession('booking-1', mockUser, {
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment already paid', async () => {
      bookingsService.findOne.mockResolvedValue({
        ...mockBooking,
        payment: { ...mockBooking.payment, status: PaymentStatus.PAID },
      });

      await expect(
        service.createCheckoutSession('booking-1', mockUser, {
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no payment record', async () => {
      bookingsService.findOne.mockResolvedValue({
        ...mockBooking,
        payment: null,
      });

      await expect(
        service.createCheckoutSession('booking-1', mockUser, {
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return payment for own booking', async () => {
      paymentsRepository.findByBookingId.mockResolvedValue(
        mockPaymentWithBooking,
      );

      const result = await service.findOne('booking-1', mockUser);

      expect(result).toEqual(mockPaymentWithBooking);
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentsRepository.findByBookingId.mockResolvedValue(null);

      await expect(service.findOne('booking-1', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user does not own booking', async () => {
      paymentsRepository.findByBookingId.mockResolvedValue(
        mockPaymentWithBooking,
      );
      const otherUser = { ...mockUser, id: 'user-999' };

      await expect(service.findOne('booking-1', otherUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refund', () => {
    it('should refund a paid payment', async () => {
      paymentsRepository.findByBookingId.mockResolvedValue(
        mockPaymentWithBooking,
      );
      stripeService.createRefund.mockResolvedValue({} as any);
      const refundedPayment = {
        ...mockPaymentWithBooking,
        status: PaymentStatus.REFUNDED,
      };
      paymentsRepository.update.mockResolvedValue(refundedPayment);
      bookingsService.refund.mockResolvedValue({} as any);

      const result = await service.refund('booking-1');

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(stripeService.createRefund).toHaveBeenCalledWith(
        'booking-1',
        'pi_123',
      );
      expect(bookingsService.refund).toHaveBeenCalledWith('booking-1');
      expect(queueService.dispatchBookingCancelled).toHaveBeenCalled();
    });

    it('should return payment if already refunded', async () => {
      const alreadyRefunded = {
        ...mockPaymentWithBooking,
        status: PaymentStatus.REFUNDED,
      };
      paymentsRepository.findByBookingId.mockResolvedValue(alreadyRefunded);

      const result = await service.refund('booking-1');

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(stripeService.createRefund).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if payment not paid', async () => {
      const pendingPayment = {
        ...mockPaymentWithBooking,
        status: PaymentStatus.PENDING,
      };
      paymentsRepository.findByBookingId.mockResolvedValue(pendingPayment);

      await expect(service.refund('booking-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no payment intent', async () => {
      const noIntent = {
        ...mockPaymentWithBooking,
        stripePaymentIntent: null,
      };
      paymentsRepository.findByBookingId.mockResolvedValue(noIntent);

      await expect(service.refund('booking-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentsRepository.findByBookingId.mockResolvedValue(null);

      await expect(service.refund('booking-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
