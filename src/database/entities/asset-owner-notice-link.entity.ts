import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AuctionNotice } from './auction-notice.entity';
import { AssetOwnerEntity } from './asset-owner-entity.entity';

/**
 * TypeORM entity cho bảng asset_owner_notice_links.
 * Mapping 1-1 giữa auction_notices và asset_owner_entities.
 */
@Entity('asset_owner_notice_links')
export class AssetOwnerNoticeLink {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'notice_id', type: 'int' })
  noticeId: number;

  @Column({ name: 'owner_entity_id', type: 'int' })
  ownerEntityId: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50, default: 'cronjob' })
  createdBy: string;

  // Relations
  @ManyToOne(() => AuctionNotice, { nullable: false })
  @JoinColumn({ name: 'notice_id' })
  notice: AuctionNotice;

  @ManyToOne(() => AssetOwnerEntity, entity => entity.noticeLinks, { nullable: false })
  @JoinColumn({ name: 'owner_entity_id' })
  ownerEntity: AssetOwnerEntity;
}
