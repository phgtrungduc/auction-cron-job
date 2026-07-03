# Ví dụ handler stub - chưa có logic sửa thật

import { Injectable } from '@nestjs/common';
import { CorrectionHandler } from '../correction-handler.interface';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';

/**
 * Handler mẫu (no-op) - để test pipeline.
 * 
 * Khi bạn có logic sửa thật, tạo file mới trong thư mục này:
 * 
 * 1. Tạo file: src/correction/handlers/fix-xxx.handler.ts
 * 2. Implement interface CorrectionHandler
 * 3. Đăng ký trong correction.module.ts (HANDLERS array)
 * 
 * Ví dụ:
 * 
 * @Injectable()
 * export class FixStatusHandler implements CorrectionHandler {
 *   readonly name = 'fix-status';
 * 
 *   async correct(notice: AuctionNotice) {
 *     // Logic của bạn
 *     if (notice.auctionDatetime < new Date() && notice.status === 'UPCOMING') {
 *       return { status: 'COMPLETED' };
 *     }
 *     return null;
 *   }
 * }
 */
@Injectable()
export class NoOpHandler implements CorrectionHandler {
  readonly name = 'noop';

  async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
    // Không sửa gì - để test pipeline
    return null;
  }
}
