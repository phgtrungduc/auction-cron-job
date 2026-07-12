import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { AssetOwnerNoticeLink } from './asset-owner-notice-link.entity';

/**
 * TypeORM entity cho bảng asset_owner_entities.
 * Metadata chủ tài sản được build từ auction_notices.
 * 
 * Schema do cronjob quản lý và build.
 */
@Entity('asset_owner_entities')
export class AssetOwnerEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  // Normalized keys (for matching)
  @Column({ name: 'normalized_name', type: 'varchar', length: 500 })
  normalizedName: string;

  @Column({ name: 'normalized_address', type: 'text', default: '' })
  normalizedAddress: string;

  // Display values (pick "best" version from notices)
  @Column({ name: 'display_name', type: 'varchar', length: 500 })
  displayName: string;

  @Column({ name: 'display_address', type: 'text', nullable: true })
  displayAddress: string | null;

  // Classification (optional)
  @Column({ name: 'org_type', type: 'varchar', length: 50, nullable: true })
  orgType: string | null;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @ManyToOne(() => AssetOwnerEntity, entity => entity.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: AssetOwnerEntity | null;

  @OneToMany(() => AssetOwnerEntity, entity => entity.parent)
  children: AssetOwnerEntity[];

  // Statistics
  @Column({ name: 'notices_count', type: 'int', default: 0 })
  noticesCount: number;

  @Column({ name: 'first_seen_at', type: 'timestamptz' })
  firstSeenAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  // Audit
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => AssetOwnerNoticeLink, link => link.ownerEntity)
  noticeLinks: AssetOwnerNoticeLink[];
}
