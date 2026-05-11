import { NotFoundException } from '@nestjs/common';

export class ServiceNotFoundError extends NotFoundException {
  constructor(id: string) {
    super(`Service with ID "${id}" not found`);
  }
}
