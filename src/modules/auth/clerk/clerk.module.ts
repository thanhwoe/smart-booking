import { forwardRef, Module } from '@nestjs/common';
import { ClerkClientProvider } from './clerk-client.provider';
import { WebhookController } from './webhook.controller';
import { UsersModule } from '@app/modules/users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [WebhookController],
  providers: [ClerkClientProvider],
  exports: [ClerkClientProvider],
})
export class ClerkModule {}
