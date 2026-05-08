import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { ClerkWebhookController } from '../webhooks/clerk-webhook.controller';

import { CreateUserUseCase } from '@application/user/use-cases/create-user.use-case';
import { FindUserUseCase } from '@application/user/use-cases/find-user.use-case';
import { UpdateUserUseCase } from '@application/user/use-cases/update-user.use-case';
import { DeleteUserUseCase } from '@application/user/use-cases/delete-user.use-case';
import { FindAllUsersUseCase } from '@app/application/user/use-cases/find-all-users.use-case';

@Module({
  controllers: [UsersController, ClerkWebhookController],
  providers: [
    CreateUserUseCase,
    FindUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    FindAllUsersUseCase,
  ],
  exports: [FindUserUseCase, DeleteUserUseCase],
})
export class UsersModule {}
