import { AuctionNotice } from '@/database/entities/auction-notice.entity';

/**
 * Interface cho một correction handler.
 * Mỗi handler = một logic sửa dữ liệu độc lập.
 * 
 * Bạn thêm logic sau bằng cách implement interface này.
 */
export interface CorrectionHandler {
  /**
   * Tên handler (dùng cho log, CLI, audit).
   * Ví dụ: 'fix-status', 'sanitize-owner', ...
   */
  readonly name: string;

  /**
   * Nhận một notice, trả về các field cần update.
   * 
   * @param notice - Bản ghi từ auction_notices
   * @returns Partial object chứa field cần đổi, hoặc null nếu không sửa gì
   * 
   * Ví dụ:
   * ```ts
   * async correct(notice: AuctionNotice) {
   *   if (notice.status === 'UPCOMING' && notice.auctionDatetime < new Date()) {
   *     return { status: 'COMPLETED' };
   *   }
   *   return null;
   * }
   * ```
   */
  correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null>;
}

/**
 * Metadata khi apply correction - dùng cho audit log sau này.
 */
export interface CorrectionMeta {
  handler: string;
  before: Record<string, unknown>;
}

/**
 * Kết quả một lần chạy scanner.
 */
export interface ScanResult {
  scanned: number;
  batches: number;
  durationMs: number;
}
