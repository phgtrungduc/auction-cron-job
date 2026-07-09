/**
 * Ví dụ handler sử dụng common utilities.
 * File này để demo - KHÔNG chạy trong production.
 */

import { Injectable } from '@nestjs/common';
import { CorrectionHandler } from '../correction-handler.interface';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';
import { createLogger } from '@/common/logger';
import { formatDate, formatNumber, truncate } from '@/common/utils';

/**
 * Example handler - demo cách dùng logger và utils.
 *
 * Để sử dụng:
 * 1. Uncomment trong correction.module.ts
 * 2. Chạy: npm run correction:run -- --handler=example --dry-run
 */
@Injectable()
export class ExampleHandler implements CorrectionHandler {
  readonly name = 'example';
  private readonly logger = createLogger('ExampleHandler');

  async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
    // ❌ Không dùng console.log
    // console.log('Processing...');

    // ✅ Dùng logger với format đẹp
    this.logger.log(`Processing notice #${notice.id}`);

    // ✅ Format date theo VN timezone
    if (notice.auctionDatetime) {
      const auctionDate = formatDate(notice.auctionDatetime, 'datetime');
      this.logger.log(`Auction date: ${auctionDate}`);
    }

    // ✅ Format thông tin
    this.logger.log(`Title: ${truncate(notice.title, 50)}`);
    this.logger.log(`Status: ${notice.status}`);
    this.logger.log(`Organization: ${notice.auctionOrgName || 'N/A'}`);

    // ✅ Log với level khác nhau
    this.logger.debug(`Debug info for notice ${notice.id}`);
    this.logger.verbose('Verbose details');

    // Demo: tính số ngày từ publish date
    if (notice.publishDate) {
      const days = Math.floor(
        (Date.now() - new Date(notice.publishDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      this.logger.log(`Published ${formatNumber(days)} days ago`);
    }

    // Demo warning
    if (!notice.auctionDatetime) {
      this.logger.warn(`Notice ${notice.id} missing auction datetime`);
    }

    // Không sửa gì - chỉ demo log
    return null;
  }
}

/**
 * Output ví dụ:
 *
 * [09/07/2026 09:30:45] [LOG    ] [ExampleHandler] Processing notice #123
 * [09/07/2026 09:30:45] [LOG    ] [ExampleHandler] Auction date: 15/08/2026 14:00
 * [09/07/2026 09:30:45] [LOG    ] [ExampleHandler] Title: Đấu giá tài sản tại Hà Nội...
 * [09/07/2026 09:30:45] [LOG    ] [ExampleHandler] Status: UPCOMING
 * [09/07/2026 09:30:45] [LOG    ] [ExampleHandler] Starting price: 1.500.000.000 đ
 * [09/07/2026 09:30:45] [DEBUG  ] [ExampleHandler] { noticeId: 123 }
 * [09/07/2026 09:30:45] [LOG    ] [ExampleHandler] Published 5 days ago
 */
