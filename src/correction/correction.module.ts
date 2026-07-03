import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { NoticeScanner } from './notice.scanner';
import { NoticeApplier } from './notice.applier';
import { CorrectionRunner } from './correction.runner';
import { CorrectionScheduler } from './correction.scheduler';

// Đăng ký các handlers ở đây khi đã có
const HANDLERS = [
  // FixStatusHandler,
  // SanitizeOwnerHandler,
  // ...
];

@Module({
  imports: [DatabaseModule],
  providers: [
    NoticeScanner,
    NoticeApplier,
    CorrectionRunner,
    CorrectionScheduler,
    ...HANDLERS,
    // Provider danh sách handlers
    // {
    //   provide: 'CORRECTION_HANDLERS',
    //   useFactory: (...handlers) => handlers,
    //   inject: HANDLERS,
    // },
  ],
  exports: [CorrectionRunner],
})
export class CorrectionModule {}
