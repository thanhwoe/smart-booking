import { Module } from '@nestjs/common';
import { DistributedLockService } from './distributed-lock.service';
import { PostHogModule } from '../posthog/posthog.module';

@Module({
  imports: [PostHogModule],
  providers: [DistributedLockService],
  exports: [DistributedLockService],
})
export class LockModule {}
