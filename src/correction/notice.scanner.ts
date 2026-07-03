import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';

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
  private readonly logger = new Logger(NoticeScanner.name);
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

    this.logger.log(`Starting batch scan: batchSize=${batchSize}, startFromId=${lastId}`);

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

      this.logger.debug(`Batch ${batchCount}: ${batch.length} notices (id ${batch[0].id} - ${lastId})`);

      yield batch;
    }

    this.logger.log(`Scan completed: ${batchCount} batches`);
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
