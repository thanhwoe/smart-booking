import { Inject, Injectable } from '@nestjs/common';
import { IBookingRepository } from '@domain/booking/booking.repository';
import { BookingStatus } from '@domain/booking/booking.entity';
import { paginate } from '@app/utils/pagination';

export type FindAllBookingsInput = {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  providerId?: string;
  userId?: string;
};

@Injectable()
export class FindAllBookingsUseCase {
  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async execute(input: FindAllBookingsInput) {
    const { page = 1, limit = 10 } = input;
    const skip = (page - 1) * limit;
    const [data, total] = await this.bookingRepository.findAll({
      skip,
      take: limit,
      status: input.status,
      providerId: input.providerId,
      userId: input.userId,
    });
    return paginate(data, total, page, limit);
  }
}
