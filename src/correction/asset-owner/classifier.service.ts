import { Injectable } from '@nestjs/common';
import { AssetOwnerNormalizer } from './normalizer.service';

/**
 * OrgType constants - khớp với enum trong database.
 */
export const OrgType = {
  NGAN_HANG: 'NGAN_HANG',
  AMC: 'AMC',
  THI_HANH_AN: 'THI_HANH_AN',
  CO_QUAN_NHA_NUOC: 'CO_QUAN_NHA_NUOC',
  QUAN_TAI_VIEN: 'QUAN_TAI_VIEN',
  CA_NHAN: 'CA_NHAN',
  KHAC: 'KHAC',
} as const;

/**
 * AssetOwnerClassifier - phân loại tổ chức owner.
 * 
 * Port từ logic Python trong generate_asset_owner_metadata_seed.py
 * và AssetOwnerMetadataClassifier.cs
 */
@Injectable()
export class AssetOwnerClassifier {
  constructor(private readonly normalizer: AssetOwnerNormalizer) {}

  /**
   * Classify organization type based on name.
   * 
   * Returns org_type string hoặc null nếu không xác định.
   */
  classify(name: string): string {
    const key = this.normalizer.normalizeKey(name);

    // Thi hành án
    if (this.containsAny(key, ['thi hanh an', 'tha ds', 'thads'])) {
      return OrgType.THI_HANH_AN;
    }

    // Cơ quan nhà nước
    if (
      this.containsAny(key, [
        'ubnd',
        'uy ban nhan dan',
        'uy ban',
        ' so ',
        ' phong ',
        ' ban quan',
        ' ban ',
        ' cuc ',
        ' trung tam',
        ' don ',
        ' truong ',
        ' benh vien',
        ' vien ',
        ' toa an',
        ' vien kiem sat',
        ' cong an',
        ' hoi ',
        ' doan ',
      ]) ||
      this.startsWithAny(key, ['so ', 'phong ', 'ban ', 'ubnd', 'truong ', 'dong '])
    ) {
      return OrgType.CO_QUAN_NHA_NUOC;
    }

    // AMC (Asset Management Company / Công ty quản lý nợ)
    if (this.containsAny(key, [' amc', 'quan ly no', 'xuly no', 'xu ly no'])) {
      return OrgType.AMC;
    }

    // Quản tài viên
    if (key.includes('quan tai vien')) {
      return OrgType.QUAN_TAI_VIEN;
    }

    // Ngân hàng
    if (
      this.containsAny(key, [
        'ngan hang',
        'tctd',
        ' bank',
        'nh tmcp',
        'vietcombank',
        'bidv',
        'agribank',
        'sacombank',
        'techcombank',
        'tpbank',
        'eximbank',
        'hdbank',
        'pvcombank',
        'vietinbank',
        'mbbank',
        'acb ',
        'cho thue tai chinh',
      ])
    ) {
      return OrgType.NGAN_HANG;
    }

    // Cá nhân (simple heuristic)
    if (this.looksLikePersonName(name, key)) {
      return OrgType.CA_NHAN;
    }

    // Default
    return OrgType.KHAC;
  }

  /**
   * Check if text contains any of the keywords.
   */
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }

  /**
   * Check if text starts with any of the prefixes.
   */
  private startsWithAny(text: string, prefixes: string[]): boolean {
    return prefixes.some((p) => text.startsWith(p));
  }

  /**
   * Heuristic: check if name looks like a person name.
   * 
   * Criteria:
   * - 2-4 words
   * - Only letters, spaces, dots
   * - Length <= 45 characters
   * - No organization keywords
   */
  private looksLikePersonName(originalName: string, normalizedKey: string): boolean {
    const words = originalName.trim().split(/\s+/);

    // Check word count
    if (words.length < 2 || words.length > 4) {
      return false;
    }

    // Check length
    if (originalName.length > 45) {
      return false;
    }

    // Check if contains only letters, spaces, dots
    const hasOnlyLetters = /^[a-zA-ZÀ-ỹĐđ\s\.]+$/.test(originalName);
    if (!hasOnlyLetters) {
      return false;
    }

    // Check for organization keywords
    const hasOrganizationKeywords = this.containsAny(normalizedKey, [
      'cong ty',
      'ngan hang',
      'chi nhanh',
      'ubnd',
      'phong',
      'ban',
      'truong',
    ]);

    if (hasOrganizationKeywords) {
      return false;
    }

    return true;
  }
}
