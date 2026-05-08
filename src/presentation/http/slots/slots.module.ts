import { Module } from '@nestjs/common';
import { SlotsController } from './slots.controller';

import { CreateSlotUseCase } from '@application/slot/use-cases/create-slot.use-case';
import { FindSlotUseCase } from '@application/slot/use-cases/find-slot.use-case';
import { UpdateSlotUseCase } from '@application/slot/use-cases/update-slot.use-case';
import { FindAllSlotsUseCase } from '@app/application/slot/use-cases/find-all-slots.use-case';
import { CancelSlotUseCase } from '@app/application/slot/use-cases/cancel-slot.use-case';

@Module({
  controllers: [SlotsController],
  providers: [
    CreateSlotUseCase,
    FindSlotUseCase,
    UpdateSlotUseCase,
    FindAllSlotsUseCase,
    CancelSlotUseCase,
  ],
})
export class SlotsModule {}
