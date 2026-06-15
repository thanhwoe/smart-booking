import { Public } from '@app/decorators/public.decorator';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    const result = await this.healthService.readiness();

    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }

  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  liveness() {
    return this.healthService.liveness();
  }

  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async readiness() {
    const result = await this.healthService.readiness();

    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
