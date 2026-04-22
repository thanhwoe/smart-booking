import { Module } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { SlotsController } from './slots.controller';
import { SlotsRepository } from './slots.repository';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [SlotsController],
  providers: [SlotsService, SlotsRepository],
  exports: [SlotsService],
})
export class SlotsModule {}
