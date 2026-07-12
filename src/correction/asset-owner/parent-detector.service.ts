import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetOwnerEntity } from '@/database/entities/asset-owner-entity.entity';
import { createLogger } from '@/common/logger';

/**
 * AssetOwnerParentDetector - Phát hiện parent-child relationships.
 *
 * Logic:
 * 1. Check if entity name contains branch keywords
 * 2. Extract potential parent name by removing branch suffix
 * 3. Find matching parent entity (same org_type, parent_id = null)
 * 4. Return parent_id or null
 *
 * Examples:
 * - "Ngân hàng BIDV - Chi nhánh Hà Nội" → parent: "Ngân hàng BIDV"
 * - "Cục Thi hành án TP.HCM - Phòng GD Quận 1" → parent: "Cục Thi hành án TP.HCM"
 */
@Injectable()
export class AssetOwnerParentDetector {
  private readonly logger = createLogger('AssetOwnerParentDetector');

  // Branch/child keywords (case-insensitive)
  private readonly branchKeywords = [
    'chi nhánh',
    'phòng giao dịch',
    'pgd',
    'branch',
    'chi cục',
    'văn phòng đại diện',
    'vp đại diện',
    'vpđd',
    'trung tâm',
    'đơn vị trực thuộc',
  ];

  // Patterns to remove for parent name extraction
  private readonly branchPatterns = [
    / - chi nhánh.*$/i,
    / - phòng giao dịch.*$/i,
    / - pgd.*$/i,
    / - branch.*$/i,
    / - chi cục.*$/i,
    / - văn phòng đại diện.*$/i,
    / - vp đại diện.*$/i,
    / - vpđd.*$/i,
    / - trung tâm.*$/i,
    / chi nhánh.*$/i,
    / phòng giao dịch.*$/i,
    / pgd.*$/i,
    / chi cục.*$/i,
    / văn phòng.*$/i,
    / trung tâm.*$/i,
  ];

  constructor(
    @InjectRepository(AssetOwnerEntity)
    private readonly entityRepo: Repository<AssetOwnerEntity>,
  ) {}

  /**
   * Detect parent entity cho một entity.
   * Returns parent_id hoặc null nếu là root entity.
   */
  async detectParent(entity: AssetOwnerEntity): Promise<number | null> {
    // 1. Check if this is a branch/child entity
    if (!this.isBranch(entity.displayName)) {
      return null;
    }

    // 2. Extract potential parent name
    const parentName = this.extractParentName(entity.displayName);

    if (!parentName || parentName === entity.displayName) {
      // Could not extract meaningful parent name
      return null;
    }

    // 3. Normalize parent name for search
    const normalizedParentName = this.normalize(parentName);

    // 4. Find matching parent entity
    // Build where clause conditionally based on orgType
    const whereClause: any = {
      normalizedName: normalizedParentName,
      parentId: null, // Only match root entities
    };

    // Only add orgType filter if entity has orgType
    if (entity.orgType !== null) {
      whereClause.orgType = entity.orgType;
    }

    const parent = await this.entityRepo.findOne({
      where: whereClause,
      select: ['id', 'displayName'],
    });

    if (parent) {
      this.logger.debug(
        `Detected parent for "${entity.displayName}": ` +
          `"${parent.displayName}" (ID: ${parent.id})`,
      );
      return parent.id;
    }

    // 5. No parent found
    this.logger.debug(`No parent found for branch: "${entity.displayName}"`);
    return null;
  }

  /**
   * Check if entity name indicates it's a branch/child.
   */
  private isBranch(name: string): boolean {
    const lower = name.toLowerCase();
    return this.branchKeywords.some((kw) => lower.includes(kw));
  }

  /**
   * Extract parent name by removing branch suffixes.
   */
  private extractParentName(branchName: string): string {
    let result = branchName;

    // Apply all patterns to remove branch suffixes
    for (const pattern of this.branchPatterns) {
      result = result.replace(pattern, '').trim();
    }

    // Clean up trailing separators
    result = result.replace(/[\s\-,]+$/, '').trim();

    return result;
  }

  /**
   * Simple normalize for parent name matching.
   * Should match the normalize logic in normalizer.service.ts.
   */
  private normalize(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces → single space
      .replace(/[^\w\sàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi, ''); // Remove special chars
  }

  /**
   * Batch detect parents for multiple entities.
   * Useful for initial backfill.
   */
  async detectParentsForEntities(entities: AssetOwnerEntity[]): Promise<Map<number, number | null>> {
    const results = new Map<number, number | null>();

    for (const entity of entities) {
      if (entity.parentId !== null) {
        // Already has parent
        results.set(entity.id, entity.parentId);
        continue;
      }

      const parentId = await this.detectParent(entity);
      results.set(entity.id, parentId);
    }

    return results;
  }
}
