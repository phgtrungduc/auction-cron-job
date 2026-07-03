import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * TypeORM entity mapping bảng auction_notices.
 * Schema do Auction-Project (.NET) quản lý - không synchronize.
 */
@Entity('auction_notices')
export class AuctionNotice {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'source_id', type: 'varchar', length: 50 })
  sourceId: string;

  @Column({ name: 'source_notice_id', type: 'varchar', length: 100 })
  sourceNoticeId: string;

  @Column({ name: 'source_url', type: 'text', nullable: true })
  sourceUrl: string | null;

  @Column({ name: 'title', type: 'text' })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'auction_org_id', type: 'bigint', nullable: true })
  auctionOrgId: number | null;

  @Column({ name: 'auction_org_name', type: 'varchar', nullable: true })
  auctionOrgName: string | null;

  @Column({ name: 'auction_org_address', type: 'text', nullable: true })
  auctionOrgAddress: string | null;

  @Column({ name: 'asset_owner_name', type: 'varchar', nullable: true })
  assetOwnerName: string | null;

  @Column({ name: 'asset_owner_address', type: 'text', nullable: true })
  assetOwnerAddress: string | null;

  @Column({ name: 'doc_sale_start', type: 'timestamptz', nullable: true })
  docSaleStart: Date | null;

  @Column({ name: 'doc_sale_end', type: 'timestamptz', nullable: true })
  docSaleEnd: Date | null;

  @Column({ name: 'viewing_start', type: 'timestamptz', nullable: true })
  viewingStart: Date | null;

  @Column({ name: 'viewing_end', type: 'timestamptz', nullable: true })
  viewingEnd: Date | null;

  @Column({ name: 'auction_datetime', type: 'timestamptz', nullable: true })
  auctionDatetime: Date | null;

  @Column({ name: 'publish_date', type: 'timestamptz', nullable: true })
  publishDate: Date | null;

  @Column({ name: 'auction_location', type: 'text', nullable: true })
  auctionLocation: string | null;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'UPCOMING' })
  status: string;

  @Column({ name: 'status_self_reported', type: 'boolean', default: false })
  statusSelfReported: boolean;

  @Column({ name: 'auction_method', type: 'varchar', nullable: true })
  auctionMethod: string | null;

  @Column({ name: 'auction_formality', type: 'varchar', length: 50, nullable: true })
  auctionFormality: string | null;

  @Column({ name: 'max_round_auction', type: 'smallint', nullable: true })
  maxRoundAuction: number | null;

  @Column({ name: 'actual_round_auction', type: 'smallint', nullable: true })
  actualRoundAuction: number | null;

  @Column({ name: 'auction_participants', type: 'smallint', nullable: true })
  auctionParticipants: number | null;

  @Column({ name: 'auction_service_contract', type: 'varchar', length: 50, nullable: true })
  auctionServiceContract: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', nullable: true })
  contactPhone: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contactEmail: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'varchar', nullable: true })
  deletedBy: string | null;
}
