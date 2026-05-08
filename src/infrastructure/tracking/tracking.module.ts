import { Global, Module } from '@nestjs/common';
import { TrackService } from './track.service';
import { PostHogModule } from './posthog/posthog.module';

@Global()
@Module({
  imports: [PostHogModule],
  providers: [TrackService],
  exports: [TrackService],
})
export class TrackingModule {}
