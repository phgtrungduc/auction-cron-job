import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';
import { CorrectionMeta } from './correction-handler.interface';

export type CorrectionMode = 'dry-run' | 'apply';

/**
 * NoticeApplier - ghi các thay đổi vào DB.
 *
 * Giai đoạn hiện tại: stub, chưa ghi thật.
 * Sau khi có handler + data_correction_log: implement transaction UPDATE + INSERT log.
 */
@Injectable()
export class NoticeApplier {
  private readonly logger = new Logger(NoticeApplier.name);

  constructor(
    @InjectRepository(AuctionNotice)
    private readonly noticeRepo: Repository<AuctionNotice>,
  ) {}

  /**
   * Apply các thay đổi vào 1 notice.
   *
   * @param noticeId - ID bản ghi cần update
   * @param patch - Field cần đổi
   * @param meta - Metadata để audit
   * @param mode - 'dry-run' = chỉ log, 'apply' = ghi DB
   */
  async apply(
    noticeId: number,
    patch: Partial<AuctionNotice>,
    meta: CorrectionMeta,
    mode: CorrectionMode,
  ): Promise<void> {
    const fields = Object.keys(patch);

    if (mode === 'dry-run') {
      this.logger.log(
        `[DRY-RUN] Would update notice ${noticeId} via ${meta.handler}: ${fields.join(', ')}`,
      );
      this.logger.debug(`Patch: ${JSON.stringify(patch)}`);
      return;
    }

    // TODO: Implement transaction khi có handler thật
    // await this.noticeRepo.manager.transaction(async (tx) => {
    //   await tx.update(AuctionNotice, noticeId, {
    //     ...patch,
    //     updatedAt: new Date(),
    //     updatedBy: `cron:${meta.handler}`,
    //   });
    //   // INSERT vào data_correction_log
    // });

    this.logger.log(`[APPLY] Updated notice ${noticeId} via ${meta.handler}: ${fields.join(', ')}`);
  }
}
