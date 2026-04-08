import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsRepository } from './bookings.repository';
import {
  BookingStatus,
  SlotStatus,
  User,
  UserRole,
} from '@app/generated/prisma/client';
import { SlotsService } from '../slots/slots.service';
import { DistributedLockService } from '../shared/lock/distributed-lock.service';
import { paginate, PaginationDto } from '@app/utils/pagination';
import { QueryBookingDto } from './dto/query-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly slotsService: SlotsService,
    private readonly distributedLockService: DistributedLockService,
  ) {}

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
      async () =>
        this.bookingsRepository.create({
          slotId: createBookingDto.slotId,
          userId: user.id,
          idempotencyKey: createBookingDto.idempotencyKey,
        }),
      'booking',
    );
  }

  async findAll(pagination: PaginationDto, query: QueryBookingDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.bookingsRepository.findAll({
      skip,
      take: limit,
      status: query.status,
    });

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const booking = await this.bookingsRepository.findOne(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ${id} not found`);
    }
    return booking;
  }

  async findByUser(
    user: User,
    pagination: PaginationDto,
    query: QueryBookingDto,
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.bookingsRepository.findAll({
      skip,
      take: limit,
      userId: user.id,
      status: query.status,
    });

    return paginate(data, total, page, limit);
  }

  async confirm(id: string) {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('You can only confirm pending bookings');
    }

    return this.bookingsRepository.update(id, {
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    });
  }

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

    return this.bookingsRepository.cancel(id);
  }

  cancelExpired() {
    return this.bookingsRepository.cancelExpired();
  }
}
