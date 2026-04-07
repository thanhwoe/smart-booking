import { Module } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { SlotsController } from './slots.controller';
import { SlotsRepository } from './slots.repository';

@Module({
  controllers: [SlotsController],
  providers: [SlotsService, SlotsRepository],
})
export class SlotsModule {}
