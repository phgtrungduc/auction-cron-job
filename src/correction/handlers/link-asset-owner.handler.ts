import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CorrectionHandler } from '../correction-handler.interface';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';
import { AssetOwnerEntity } from '@/database/entities/asset-owner-entity.entity';
import { AssetOwnerNoticeLink } from '@/database/entities/asset-owner-notice-link.entity';
import { AssetOwnerNormalizer } from '../asset-owner/normalizer.service';
import { AssetOwnerClassifier } from '../asset-owner/classifier.service';
import { AssetOwnerParentDetector } from '../asset-owner/parent-detector.service';
import { createLogger } from '@/common/logger';
import { truncate } from '@/common/utils';

/**
 * LinkAssetOwnerHandler - Link asset owner entity cho notices.
 *
 * Logic:
 * 1. Chỉ xử lý notices có asset_owner_name
 * 2. Normalize name + address
 * 3. Tìm hoặc tạo owner_entity
 * 4. Tạo notice_owner_link nếu chưa có
 * 5. Update statistics của entity
 *
 * Note: Handler này ghi trực tiếp vào database (owner_entities và notice_owner_links).
 * Không sử dụng NoticeApplier pattern vì không update bảng notices.
 */
@Injectable()
export class LinkAssetOwnerHandler implements CorrectionHandler {
  readonly name = 'link-asset-owner';
  private readonly logger = createLogger('LinkAssetOwnerHandler');

  constructor(
    @InjectRepository(AssetOwnerEntity)
    private readonly entityRepo: Repository<AssetOwnerEntity>,
    @InjectRepository(AssetOwnerNoticeLink)
    private readonly linkRepo: Repository<AssetOwnerNoticeLink>,
    private readonly normalizer: AssetOwnerNormalizer,
    private readonly classifier: AssetOwnerClassifier,
    private readonly parentDetector: AssetOwnerParentDetector,
  ) {}

  /**
   * Filter: Chỉ scan notices chưa có owner link và có asset_owner_name.
   * 
   * LEFT JOIN với asset_owner_notice_links để tìm notices chưa được link.
   */
  getFilterQuery(qb: SelectQueryBuilder<AuctionNotice>): void {
    qb.leftJoin('asset_owner_notice_links', 'l', 'l.notice_id = n.id')
      .andWhere('l.id IS NULL')
      .andWhere('n.asset_owner_name IS NOT NULL');
  }

  async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
    // 1. Skip if no asset owner data
    if (!notice.assetOwnerName || !notice.assetOwnerName.trim()) {
      return null;
    }

    // 2. Normalize name + address
    // Note: No need to check existingLink here because filter already excludes linked notices
    const { normalizedName, normalizedAddress } = this.normalizer.pair(
      notice.assetOwnerName,
      notice.assetOwnerAddress,
    );

    // 3. Find existing entity
    let entity = await this.entityRepo.findOne({
      where: {
        normalizedName,
        normalizedAddress,
      },
    });

    // 4. Create new entity if not found
    if (!entity) {
      const orgType = this.classifier.classify(notice.assetOwnerName);

      entity = this.entityRepo.create({
        normalizedName,
        normalizedAddress,
        displayName: notice.assetOwnerName,
        displayAddress: notice.assetOwnerAddress,
        orgType,
        parentId: null, // Will be set later
        noticesCount: 0,
        firstSeenAt: notice.createdAt,
        lastSeenAt: notice.createdAt,
      });

      await this.entityRepo.save(entity);

      this.logger.log(
        `Created owner entity ${entity.id}: ` +
          `"${truncate(entity.displayName, 50)}" (${entity.orgType})`,
      );

      // Detect and set parent after creation
      const parentId = await this.parentDetector.detectParent(entity);
      if (parentId) {
        entity.parentId = parentId;
        await this.entityRepo.save(entity);
        this.logger.log(`Set parent ${parentId} for entity ${entity.id}`);
      }
    }

    // 5. Create link
    const link = this.linkRepo.create({
      noticeId: notice.id,
      ownerEntityId: entity.id,
      createdBy: 'cronjob',
    });

    await this.linkRepo.save(link);

    // 6. Update entity statistics
    entity.noticesCount += 1;
    entity.lastSeenAt = notice.createdAt > entity.lastSeenAt ? notice.createdAt : entity.lastSeenAt;
    await this.entityRepo.save(entity);

    this.logger.log(
      `Linked notice ${notice.id} (${truncate(notice.assetOwnerName, 40)}) → ` +
        `owner entity ${entity.id}`,
    );

    // Handler đã xử lý xong, không cần update notice
    return null;
  }
}
