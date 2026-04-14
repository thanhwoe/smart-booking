import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeModule } from './stripe/stripe.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsRepository } from './payments.repository';

@Module({
  imports: [StripeModule, BookingsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService],
})
export class PaymentsModule {}
