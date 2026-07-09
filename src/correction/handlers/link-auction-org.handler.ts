import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorrectionHandler } from '../correction-handler.interface';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';
import { AuctionOrganization } from '@/database/entities/auction-organization.entity';
import { createLogger } from '@/common/logger';
import { truncate } from '@/common/utils';

/**
 * LinkAuctionOrgHandler - Link auction_org_id cho notices.
 *
 * Logic:
 * 1. Chỉ xử lý notices có auction_org_id = NULL
 * 2. Lấy auction_org_name từ notice
 * 3. Tìm kiếm trong auction_organizations theo fullname (normalize: lowercase + trim)
 * 4. Update auction_org_id nếu tìm thấy match duy nhất
 *
 * Confidence:
 * - High: Tìm thấy 1 match duy nhất → auto-fix
 * - Low: Nhiều matches hoặc không tìm thấy → skip + log
 */
@Injectable()
export class LinkAuctionOrgHandler implements CorrectionHandler {
  readonly name = 'link-auction-org';
  private readonly logger = createLogger('LinkAuctionOrgHandler');

  // Cache organizations để tránh query lặp lại
  private orgCache: Map<string, number> | null = null;

  constructor(
    @InjectRepository(AuctionOrganization)
    private readonly orgRepo: Repository<AuctionOrganization>,
  ) {}

  async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
    // 1. Skip nếu đã có auction_org_id
    if (notice.auctionOrgId) {
      return null;
    }

    // 2. Skip nếu không có auction_org_name
    if (!notice.auctionOrgName || !notice.auctionOrgName.trim()) {
      return null;
    }

    // 3. Load cache lần đầu tiên
    if (!this.orgCache) {
      await this.loadOrgCache();
    }

    // 4. Normalize và tìm kiếm
    const normalizedName = this.normalizeName(notice.auctionOrgName);
    const orgId = this.orgCache!.get(normalizedName);

    if (!orgId) {
      this.logger.debug(
        `No match found for notice ${notice.id}: "${truncate(notice.auctionOrgName, 50)}"`,
      );
      return null;
    }

    // 5. Tìm thấy match → update
    this.logger.log(
      `Linking notice ${notice.id} (${truncate(notice.auctionOrgName, 40)}) ` + `→ org ${orgId}`,
    );

    return {
      auctionOrgId: orgId,
    };
  }

  /**
   * Load tất cả organizations vào cache.
   * Key = normalized fullname, Value = id
   *
   * Nếu có duplicate normalized names → chỉ lấy ID đầu tiên và log warning.
   */
  private async loadOrgCache(): Promise<void> {
    this.logger.log('Loading auction organizations cache...');

    const orgs = await this.orgRepo.find({
      select: ['id', 'fullName'],
    });

    this.orgCache = new Map();
    const duplicates = new Set<string>();

    for (const org of orgs) {
      const normalized = this.normalizeName(org.fullName);

      if (this.orgCache.has(normalized)) {
        // Duplicate detected - skip và log warning
        duplicates.add(normalized);
        continue;
      }

      this.orgCache.set(normalized, org.id);
    }

    this.logger.log(`Loaded ${this.orgCache.size} organizations into cache`);

    if (duplicates.size > 0) {
      this.logger.warn(
        `Found ${duplicates.size} duplicate organization names (skipped for safety)`,
      );

      // Log một vài ví dụ
      const examples = Array.from(duplicates).slice(0, 5);
      examples.forEach((name) => {
        this.logger.debug(`Duplicate: "${name}"`);
      });
    }
  }

  /**
   * Normalize organization name để so sánh.
   * - Lowercase
   * - Trim
   * - Remove extra whitespaces
   */
  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' '); // Multiple spaces → single space
  }

  /**
   * Clear cache (dùng khi cần reload).
   */
  clearCache(): void {
    this.orgCache = null;
    this.logger.log('Organization cache cleared');
  }
}
