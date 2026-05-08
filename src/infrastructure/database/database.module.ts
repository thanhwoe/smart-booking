import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { IUserRepository } from '@domain/user/user.repository';
import { UserPrismaRepository } from './repositories/user.prisma.repository';
import { IBookingRepository } from '@domain/booking/booking.repository';
import { BookingPrismaRepository } from './repositories/booking.prisma.repository';
import { ISlotRepository } from '@domain/slot/slot.repository';
import { SlotPrismaRepository } from './repositories/slot.prisma.repository';
import { IServiceRepository } from '@domain/service/service.repository';
import { ServicePrismaRepository } from './repositories/service.prisma.repository';
import { IPaymentRepository } from '@domain/payment/payment.repository';
import { PaymentPrismaRepository } from './repositories/payment.prisma.repository';
import { IEmailLogRepository } from '@domain/email-log/email-log.repository';
import { EmailLogPrismaRepository } from './repositories/email-log.prisma.repository';
import { IEmailSuppressionRepository } from '@app/domain/email-suppression/email-suppression.repository';
import { EmailSuppressionRepository } from './repositories/email-suppression.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    { provide: IUserRepository, useClass: UserPrismaRepository },
    { provide: IBookingRepository, useClass: BookingPrismaRepository },
    { provide: ISlotRepository, useClass: SlotPrismaRepository },
    { provide: IServiceRepository, useClass: ServicePrismaRepository },
    { provide: IPaymentRepository, useClass: PaymentPrismaRepository },
    { provide: IEmailLogRepository, useClass: EmailLogPrismaRepository },
    {
      provide: IEmailSuppressionRepository,
      useClass: EmailSuppressionRepository,
    },
  ],
  exports: [
    IUserRepository,
    IBookingRepository,
    ISlotRepository,
    IServiceRepository,
    IPaymentRepository,
    IEmailLogRepository,
    IEmailSuppressionRepository,
    PrismaModule,
  ],
})
export class DatabaseModule {}
