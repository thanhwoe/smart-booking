import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, CreateUserData } from '@domain/user/user.repository';
import type { User } from '@domain/user/user.entity';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  execute(data: CreateUserData): Promise<User> {
    return this.userRepository.create(data);
  }
}
