import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';

import { FindAllServicesUseCase } from '@application/service/use-cases/find-all-services.use-case';
import { FindServiceUseCase } from '@application/service/use-cases/find-service.use-case';
import { CreateServiceUseCase } from '@app/application/service/use-cases/create-service.use-case';
import { UpdateServiceUseCase } from '@app/application/service/use-cases/update-service.use-case';
import { DeleteServiceUseCase } from '@app/application/service/use-cases/delete-service.use-case';

@Module({
  controllers: [ServicesController],
  providers: [
    FindServiceUseCase,
    FindAllServicesUseCase,
    CreateServiceUseCase,
    UpdateServiceUseCase,
    DeleteServiceUseCase,
  ],
})
export class ServicesModule {}
