import { AuctionNotice } from '@/database/entities/auction-notice.entity';
import { SelectQueryBuilder } from 'typeorm';

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

  /**
   * (Optional) Apply filter conditions to query builder.
   * Handler tự định nghĩa điều kiện để chỉ load notices cần xử lý.
   *
   * Giúp tối ưu performance - chỉ scan notices thực sự cần, thay vì load all rồi skip.
   *
   * @param qb - TypeORM SelectQueryBuilder với alias 'n' cho auction_notices
   *
   * Ví dụ:
   * ```ts
   * getFilterQuery(qb: SelectQueryBuilder<AuctionNotice>) {
   *   qb.andWhere('n.auction_org_id IS NULL')
   *     .andWhere('n.auction_org_name IS NOT NULL');
   * }
   * ```
   */
  getFilterQuery?(qb: SelectQueryBuilder<AuctionNotice>): void;

  /**
   * (Optional) In-memory filter - check trước khi call correct().
   * Dùng khi logic filter phức tạp không thể express trong SQL.
   *
   * @param notice - Bản ghi từ database
   * @returns true nếu handler cần xử lý notice này
   */
  shouldProcess?(notice: AuctionNotice): boolean | Promise<boolean>;
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
