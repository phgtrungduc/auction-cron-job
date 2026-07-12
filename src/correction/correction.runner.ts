import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { NoticeScanner, ScanOptions } from './notice.scanner';
import { CorrectionHandler, ScanResult } from './correction-handler.interface';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';
import { createLogger } from '@/common/logger';
import { formatNumber } from '@/common/utils';

export interface RunOptions {
  handlers?: string[]; // Chỉ chạy các handler cụ thể (theo name)
  scanOptions?: ScanOptions;
}

/**
 * CorrectionRunner - orchestrator chính.
 *
 * - Quét batch từ NoticeScanner
 * - Gọi các CorrectionHandler đã đăng ký
 * - Handlers tự xử lý việc ghi vào DB
 */
@Injectable()
export class CorrectionRunner {
  private readonly logger = createLogger(CorrectionRunner.name);

  constructor(
    private readonly scanner: NoticeScanner,
    @Inject('CORRECTION_HANDLERS') private readonly handlers: CorrectionHandler[],
  ) {}

  /**
   * Chạy tất cả handlers (hoặc subset) trên toàn bộ auction_notices.
   * Mỗi handler chạy riêng với filter tối ưu của nó.
   */
  async runAll(options: RunOptions = {}): Promise<ScanResult> {
    const handlers = this.getActiveHandlers(options.handlers);

    this.logger.log(
      `Starting correction run: handlers=${handlers.length} ` +
        `(${handlers.map((h) => h.name).join(', ')})`,
    );

    if (handlers.length === 0) {
      this.logger.warn('No handlers registered - skipping correction logic');
      return { scanned: 0, batches: 0, durationMs: 0 };
    }

    const startTime = Date.now();
    let totalScanned = 0;
    let totalBatches = 0;

    // Run each handler separately with its own filter
    for (const handler of handlers) {
      this.logger.log(`Running handler: ${handler.name}`);

      let handlerScanned = 0;
      let handlerBatches = 0;

      for await (const batch of this.scanner.scanBatchesForHandler(handler, options.scanOptions)) {
        handlerBatches++;
        handlerScanned += batch.length;

        await this.processBatch(batch, [handler]);
      }

      totalScanned += handlerScanned;
      totalBatches += handlerBatches;

      this.logger.log(
        `Handler ${handler.name} completed: ` +
          `scanned=${formatNumber(handlerScanned)}, batches=${handlerBatches}`,
      );
    }

    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Correction run completed: scanned=${formatNumber(totalScanned)}, ` +
        `batches=${totalBatches}, duration=${durationMs}ms`,
    );

    return { scanned: totalScanned, batches: totalBatches, durationMs };
  }

  /**
   * Xử lý một batch notices.
   */
  private async processBatch(
    notices: AuctionNotice[],
    handlers: CorrectionHandler[],
  ): Promise<void> {
    for (const notice of notices) {
      // Bỏ qua notice protected
      if (this.isProtected(notice)) {
        continue;
      }

      for (const handler of handlers) {
        try {
          // Handler tự xử lý việc ghi vào DB
          await handler.correct(notice);
        } catch (error) {
          this.logger.error(
            `Handler ${handler.name} failed for notice ${notice.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    }
  }

  /**
   * Kiểm tra xem notice có protected không (không được sửa).
   * - Đã soft-deleted
   * - status_self_reported = true (tổ chức tự báo cáo)
   */
  private isProtected(notice: AuctionNotice): boolean {
    return notice.deletedAt !== null || notice.statusSelfReported;
  }

  /**
   * Lọc handlers theo name (nếu có).
   */
  private getActiveHandlers(filterNames?: string[]): CorrectionHandler[] {
    if (!filterNames || filterNames.length === 0) {
      return this.handlers;
    }
    return this.handlers.filter((h) => filterNames.includes(h.name));
  }
}
