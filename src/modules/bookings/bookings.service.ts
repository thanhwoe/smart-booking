import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsRepository } from './bookings.repository';
import {
  BookingStatus,
  PaymentStatus,
  SlotStatus,
  User,
  UserRole,
} from '@app/generated/prisma/client';
import { SlotsService } from '../slots/slots.service';
import { DistributedLockService } from '../shared/lock/distributed-lock.service';
import { paginate } from '@app/utils/pagination';
import { QueryBookingDto } from './dto/query-booking.dto';
import { QueueService } from '../shared/queue/queue.service';
import { ICacheService } from '@app/interfaces/cache.interface';
import { CACHE_KEY, CACHE_TTL } from '@app/constants/cache.constants';

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly slotsService: SlotsService,
    private readonly distributedLockService: DistributedLockService,
    private readonly queueService: QueueService,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {}

  /**
   * Create a new booking
   * @param user User creating the booking
   * @param createBookingDto Booking creation data
   * @returns The created booking
   */
  async create(user: User, createBookingDto: CreateBookingDto) {
    const existing = await this.bookingsRepository.findByIdempotencyKey(
      createBookingDto.idempotencyKey,
    );
    if (existing) {
      return existing;
    }

    const slot = await this.slotsService.findOne(createBookingDto.slotId);

    if (slot.status === SlotStatus.CANCELLED) {
      throw new ConflictException(
        `Slot ${createBookingDto.slotId} is cancelled`,
      );
    }
    if (slot.bookedCount >= slot.capacity) {
      throw new ConflictException(`Slot ${createBookingDto.slotId} is full`);
    }

    return this.distributedLockService.withLock(
      createBookingDto.slotId,
      async () => {
        // await new Promise((r) => setTimeout(r, 2000));
        return this.bookingsRepository.create({
          slotId: createBookingDto.slotId,
          userId: user.id,
          idempotencyKey: createBookingDto.idempotencyKey,
        });
      },
      'booking',
    );
  }

  /**
   * Retrieve all bookings with pagination and optional filtering
   * @param query Query and pagination parameters
   * @returns Paginated list of bookings
   */
  async findAll(query: QueryBookingDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const [data, total] = await this.bookingsRepository.findAll({
      skip,
      take: limit,
      status: query.status,
    });

    return paginate(data, total, page, limit);
  }

  /**
   * Retrieve a specific booking by its ID, utilizing cache
   * @param id Booking ID
   * @returns The booking
   */
  async findOne(id: string) {
    return this.cacheService.wrap(
      CACHE_KEY.BOOKING_BY_ID(id),
      CACHE_TTL.BOOKING,
      async () => {
        const booking = await this.bookingsRepository.findOne(id);
        if (!booking) {
          throw new NotFoundException(`Booking with ${id} not found`);
        }
        return booking;
      },
    );
  }

  /**
   * Retrieve all bookings made by a specific user
   * @param user The user who made the bookings
   * @param query Query and pagination parameters
   * @returns Paginated list of bookings
   */
  async findByUser(user: User, query: QueryBookingDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const [data, total] = await this.bookingsRepository.findAll({
      skip,
      take: limit,
      userId: user.id,
      status: query.status,
    });

    return paginate(data, total, page, limit);
  }

  /**
   * Retrieve all bookings for a specific provider
   * @param user The provider user
   * @param query Query and pagination parameters
   * @returns Paginated list of bookings
   */
  async findByProvider(user: User, query: QueryBookingDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const [data, total] = await this.bookingsRepository.findAll({
      skip,
      take: limit,
      status: query.status,
      providerId: user.id,
    });

    return paginate(data, total, page, limit);
  }

  /**
   * Confirm a booking after successful payment
   * @param id Booking ID
   * @returns The confirmed booking
   */
  async confirm(id: string) {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('You can only confirm pending bookings');
    }
    if (booking.payment?.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        'You can only confirm bookings with successful payment',
      );
    }

    const updated = await this.bookingsRepository.update(id, {
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    });

    await this.cacheService.del(CACHE_KEY.BOOKING_BY_ID(id));

    return updated;
  }

  /**
   * Cancel an existing booking
   * @param id Booking ID
   * @param user User initiating the cancellation
   * @returns The canceled booking
   */
  async cancel(id: string, user: User) {
    const booking = await this.findOne(id);

    if (user.role !== UserRole.ADMIN && booking.userId !== user.id) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.REFUNDED) {
      throw new BadRequestException('Cannot cancel a refunded booking');
    }

    const canceledBooking = await this.bookingsRepository.cancel(id);

    await this.cacheService.del(CACHE_KEY.BOOKING_BY_ID(id));

    await this.queueService.dispatchBookingCancelled({
      bookingId: canceledBooking.id,
      userEmail: canceledBooking.user.email,
      userName: canceledBooking.user.name,
      serviceName: canceledBooking.slot.service.name,
      startTime: canceledBooking.slot.startTime.toISOString(),
      refunded: false,
      userId: canceledBooking.user.id,
    });

    return canceledBooking;
  }

  /**
   * Refund a canceled booking
   * @param id Booking ID
   * @returns The refunded booking
   */
  async refund(id: string) {
    const booking = await this.findOne(id);
    if (booking.status === BookingStatus.REFUNDED) {
      throw new BadRequestException('Booking is already refunded');
    }

    await this.slotsService.decreaseBookingCount(booking.slotId);

    const updated = await this.bookingsRepository.update(id, {
      status: BookingStatus.REFUNDED,
      cancelledAt: new Date(),
    });

    await this.cacheService.del(CACHE_KEY.BOOKING_BY_ID(id));

    return updated;
  }

  /**
   * Automatically cancel pending bookings that have expired
   */
  async cancelExpired() {
    const bookings = await this.bookingsRepository.cancelExpired();

    for (const booking of bookings) {
      await this.queueService.dispatchBookingCancelled({
        bookingId: booking.id,
        userEmail: booking.user.email,
        userName: booking.user.name,
        serviceName: booking.slot.service.name,
        startTime: booking.slot.startTime.toISOString(),
        refunded: false,
        userId: booking.user.id,
      });
    }
  }
}
