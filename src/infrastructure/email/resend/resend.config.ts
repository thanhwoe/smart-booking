import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export const ResendClient = Symbol('ResendClient');

export const resendFactory = (config: ConfigService) => {
  return new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
};
