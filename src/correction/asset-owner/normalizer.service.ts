import { Injectable } from '@nestjs/common';

/**
 * AssetOwnerNormalizer - normalize asset owner name/address.
 * 
 * Single source of truth cho normalization logic.
 * Port từ logic Python ban đầu trong generate_asset_owner_metadata_seed.py
 */
@Injectable()
export class AssetOwnerNormalizer {
  /**
   * Sanitize name hoặc address.
   * 
   * Logic:
   * - Remove null bytes
   * - Normalize whitespace (newlines → spaces)
   * - Replace semicolons with commas
   * - Trim and collapse multiple spaces
   */
  sanitize(value: string | null): string {
    if (!value || !value.trim()) {
      return '';
    }

    let cleaned = value.replace(/\0/g, ''); // Remove null bytes
    cleaned = cleaned.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' '); // Newlines → space
    cleaned = cleaned.replace(/;/g, ','); // Semicolon → comma
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/\s+/g, ' '); // Collapse multiple spaces

    return cleaned;
  }

  /**
   * Normalize name + address pair.
   * Returns normalized values ready for database lookup.
   */
  pair(name: string | null, address: string | null): {
    normalizedName: string;
    normalizedAddress: string;
  } {
    return {
      normalizedName: this.sanitize(name),
      normalizedAddress: this.sanitize(address),
    };
  }

  /**
   * Normalize key for classification/matching.
   * 
   * - Strip accents
   * - Lowercase
   * - Replace đ → d
   * - Remove punctuation
   * - Collapse spaces
   */
  normalizeKey(value: string): string {
    let normalized = value.toLowerCase();

    // Strip accents (NFD decomposition + remove combining marks)
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Replace đ → d (Vietnamese specific)
    normalized = normalized.replace(/đ/g, 'd');

    // Remove punctuation except spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ');

    // Collapse multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }
}
