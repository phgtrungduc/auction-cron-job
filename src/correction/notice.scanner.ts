import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';
import { CorrectionHandler } from './correction-handler.interface';
import { createLogger } from '@/common/logger';
import { formatNumber } from '@/common/utils';

export interface ScanOptions {
  batchSize?: number;
  startFromId?: number;
  noticeId?: number; // Chỉ quét 1 notice cụ thể
}

/**
 * NoticeScanner - đọc auction_notices theo batch từ PostgreSQL.
 *
 * - Quét theo cursor id ASC
 * - Bỏ qua soft-deleted (deleted_at IS NOT NULL)
 * - Batch size configurable
 */
@Injectable()
export class NoticeScanner {
  private readonly logger = createLogger(NoticeScanner.name);
  private readonly defaultBatchSize: number;

  constructor(
    @InjectRepository(AuctionNotice)
    private readonly noticeRepo: Repository<AuctionNotice>,
    private readonly configService: ConfigService,
  ) {
    this.defaultBatchSize = this.configService.get<number>('SCAN_BATCH_SIZE', 500);
  }

  /**
   * Quét toàn bộ auction_notices theo batch.
   * Generator - yield mỗi batch để caller xử lý.
   */
  async *scanBatches(options: ScanOptions = {}): AsyncGenerator<AuctionNotice[]> {
    const batchSize = options.batchSize ?? this.defaultBatchSize;
    let lastId = options.startFromId ?? 0;
    let batchCount = 0;

    // Trường hợp đặc biệt: quét 1 notice cụ thể
    if (options.noticeId) {
      const notice = await this.noticeRepo.findOne({
        where: { id: options.noticeId, deletedAt: IsNull() },
      });
      if (notice) {
        this.logger.log(`Scanning single notice id=${options.noticeId}`);
        yield [notice];
      } else {
        this.logger.warn(`Notice id=${options.noticeId} not found or deleted`);
      }
      return;
    }

    this.logger.log(
      `Starting batch scan: batchSize=${formatNumber(batchSize)}, startFromId=${lastId}`,
    );

    while (true) {
      const batch = await this.noticeRepo.find({
        where: {
          id: MoreThan(lastId),
          deletedAt: IsNull(),
        },
        order: { id: 'ASC' },
        take: batchSize,
      });

      if (batch.length === 0) {
        break;
      }

      batchCount++;
      lastId = batch[batch.length - 1].id;

      this.logger.debug(
        `Batch ${batchCount}: ${formatNumber(batch.length)} notices (id ${batch[0].id} - ${lastId})`,
      );

      yield batch;
    }

    this.logger.log(`Scan completed: ${batchCount} batches`);
  }

  /**
   * Quét auction_notices cho một handler cụ thể (với filter của handler).
   * Generator - yield mỗi batch để caller xử lý.
   */
  async *scanBatchesForHandler(
    handler: CorrectionHandler,
    options: ScanOptions = {},
  ): AsyncGenerator<AuctionNotice[]> {
    const batchSize = options.batchSize ?? this.defaultBatchSize;
    let lastId = options.startFromId ?? 0;
    let batchCount = 0;

    // Special case: single notice
    if (options.noticeId) {
      const notice = await this.noticeRepo.findOne({
        where: { id: options.noticeId, deletedAt: IsNull() },
      });
      if (notice) {
        // Apply in-memory filter if provided
        if (handler.shouldProcess) {
          const shouldProcess = await handler.shouldProcess(notice);
          if (shouldProcess) {
            this.logger.log(`Scanning single notice id=${options.noticeId} for handler ${handler.name}`);
            yield [notice];
          }
        } else {
          this.logger.log(`Scanning single notice id=${options.noticeId} for handler ${handler.name}`);
          yield [notice];
        }
      } else {
        this.logger.warn(`Notice id=${options.noticeId} not found or deleted`);
      }
      return;
    }

    this.logger.log(
      `Starting batch scan for handler "${handler.name}": batchSize=${formatNumber(batchSize)}, startFromId=${lastId}`,
    );

    while (true) {
      // Build query with base conditions
      const qb = this.noticeRepo
        .createQueryBuilder('n')
        .where('n.id > :lastId', { lastId })
        .andWhere('n.deleted_at IS NULL');

      // Apply handler-specific filter
      if (handler.getFilterQuery) {
        handler.getFilterQuery(qb);
      }

      const batch = await qb.orderBy('n.id', 'ASC').take(batchSize).getMany();

      if (batch.length === 0) {
        break;
      }

      batchCount++;
      lastId = batch[batch.length - 1].id;

      // Apply in-memory filter if provided
      const filtered = handler.shouldProcess ? await this.filterBatch(batch, handler) : batch;

      if (filtered.length > 0) {
        this.logger.debug(
          `Batch ${batchCount}: ${formatNumber(filtered.length)} notices (id ${filtered[0].id} - ${lastId})`,
        );
        yield filtered;
      }
    }

    this.logger.log(`Scan completed for handler "${handler.name}": ${batchCount} batches`);
  }

  /**
   * Apply in-memory filter using handler.shouldProcess().
   */
  private async filterBatch(
    batch: AuctionNotice[],
    handler: CorrectionHandler,
  ): Promise<AuctionNotice[]> {
    const results = await Promise.all(
      batch.map(async (notice) => ({
        notice,
        shouldProcess: await handler.shouldProcess!(notice),
      })),
    );
    return results.filter((r) => r.shouldProcess).map((r) => r.notice);
  }

  /**
   * Đếm tổng số notice có thể quét (chưa deleted).
   */
  async countScannable(): Promise<number> {
    return this.noticeRepo.count({
      where: { deletedAt: IsNull() },
    });
  }
}
