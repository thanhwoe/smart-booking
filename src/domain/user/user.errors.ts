import { NotFoundException } from '@nestjs/common';

export class UserNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`User with ID "${id}" not found`);
  }
}
