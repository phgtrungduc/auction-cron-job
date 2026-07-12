import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { NoticeScanner } from './notice.scanner';
import { CorrectionRunner } from './correction.runner';
import { CorrectionScheduler } from './correction.scheduler';
import { LinkAuctionOrgHandler } from './handlers/link-auction-org.handler';
import { LinkAssetOwnerHandler } from './handlers/link-asset-owner.handler';
import { AssetOwnerNormalizer } from './asset-owner/normalizer.service';
import { AssetOwnerClassifier } from './asset-owner/classifier.service';
import { AssetOwnerParentDetector } from './asset-owner/parent-detector.service';

// Đăng ký các handlers ở đây khi đã có
const HANDLERS = [
  LinkAuctionOrgHandler, // ← Handler đầu tiên: link auction_org_id
  LinkAssetOwnerHandler, // ← Handler thứ hai: link asset owner entity
  // FixStatusHandler,
  // SanitizeOwnerHandler,
  // ...
];

@Module({
  imports: [DatabaseModule],
  providers: [
    NoticeScanner,
    CorrectionRunner,
    CorrectionScheduler,
    // Asset owner services
    AssetOwnerNormalizer,
    AssetOwnerClassifier,
    AssetOwnerParentDetector,
    // Handlers
    ...HANDLERS,
    // Provider danh sách handlers
    {
      provide: 'CORRECTION_HANDLERS',
      useFactory: (...handlers) => handlers,
      inject: HANDLERS,
    },
  ],
  exports: [CorrectionRunner],
})
export class CorrectionModule {}
