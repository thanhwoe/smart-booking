import { PaginationDto } from '@app/utils/pagination';
import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request } from 'express';

export const PaginationQuery = createParamDecorator(
  async (_data: unknown, ctx: ExecutionContext): Promise<PaginationDto> => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const { page, limit } = request.query || {};

    const dto = plainToInstance(PaginationDto, { page, limit });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });

    if (errors.length > 0) {
      const messages = errors.map((error) => ({
        field: error.property,
        errors: Object.values(error.constraints ?? {}),
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return dto;
  },
);
