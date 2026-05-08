import { Module, Global } from '@nestjs/common';
import { ILockService } from '@application/common/ports/lock.port';
import { RedlockService } from './redlock.service';

@Global()
@Module({
  providers: [
    {
      provide: ILockService,
      useClass: RedlockService,
    },
  ],
  exports: [ILockService],
})
export class LockModule {}
