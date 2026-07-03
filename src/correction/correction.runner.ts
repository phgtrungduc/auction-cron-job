import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NoticeScanner, ScanOptions } from './notice.scanner';
import { NoticeApplier, CorrectionMode } from './notice.applier';
import { CorrectionHandler, ScanResult } from './correction-handler.interface';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';

export interface RunOptions {
  mode?: CorrectionMode;
  handlers?: string[]; // Chỉ chạy các handler cụ thể (theo name)
  scanOptions?: ScanOptions;
}

/**
 * CorrectionRunner - orchestrator chính.
 * 
 * - Quét batch từ NoticeScanner
 * - Gọi các CorrectionHandler đã đăng ký
 * - Gửi patch tới NoticeApplier
 */
@Injectable()
export class CorrectionRunner {
  private readonly logger = new Logger(CorrectionRunner.name);
  private readonly defaultMode: CorrectionMode;

  constructor(
    private readonly scanner: NoticeScanner,
    private readonly applier: NoticeApplier,
    private readonly configService: ConfigService,
    // Inject danh sách handlers sau khi có
    // @Inject('CORRECTION_HANDLERS') private readonly handlers: CorrectionHandler[],
  ) {
    this.defaultMode = this.configService.get<CorrectionMode>('CORRECTION_MODE', 'dry-run');
  }

  /**
   * Chạy tất cả handlers (hoặc subset) trên toàn bộ auction_notices.
   */
  async runAll(options: RunOptions = {}): Promise<ScanResult> {
    const mode = options.mode ?? this.defaultMode;
    const handlers = this.getActiveHandlers(options.handlers);

    this.logger.log(`Starting correction run: mode=${mode}, handlers=${handlers.length}`);

    if (handlers.length === 0) {
      this.logger.warn('No handlers registered - skipping correction logic');
    }

    const startTime = Date.now();
    let scanned = 0;
    let batches = 0;

    for await (const batch of this.scanner.scanBatches(options.scanOptions)) {
      batches++;
      scanned += batch.length;

      await this.processBatch(batch, handlers, mode);
    }

    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Correction run completed: scanned=${scanned}, batches=${batches}, duration=${durationMs}ms`,
    );

    return { scanned, batches, durationMs };
  }

  /**
   * Xử lý một batch notices.
   */
  private async processBatch(
    notices: AuctionNotice[],
    handlers: CorrectionHandler[],
    mode: CorrectionMode,
  ): Promise<void> {
    for (const notice of notices) {
      // Bỏ qua notice protected
      if (this.isProtected(notice)) {
        continue;
      }

      for (const handler of handlers) {
        try {
          const patch = await handler.correct(notice);

          if (!patch || Object.keys(patch).length === 0) {
            continue;
          }

          await this.applier.apply(
            notice.id,
            patch,
            {
              handler: handler.name,
              before: this.extractBefore(notice, patch),
            },
            mode,
          );
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
   * Lấy giá trị trước khi đổi (cho audit log).
   */
  private extractBefore(notice: AuctionNotice, patch: Partial<AuctionNotice>): Record<string, unknown> {
    const before: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      before[key] = notice[key];
    }
    return before;
  }

  /**
   * Lọc handlers theo name (nếu có).
   * Hiện tại chưa có handlers nên return [].
   */
  private getActiveHandlers(filterNames?: string[]): CorrectionHandler[] {
    // TODO: Khi có handlers, filter theo name
    // if (!filterNames) return this.handlers;
    // return this.handlers.filter(h => filterNames.includes(h.name));
    return [];
  }
}
