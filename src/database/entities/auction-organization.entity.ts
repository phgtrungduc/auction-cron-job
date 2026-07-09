import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * TypeORM entity mapping bảng auction_organizations.
 * Schema do Auction-Project (.NET) quản lý - không synchronize.
 */
@Entity('auction_organizations')
export class AuctionOrganization {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'source_id', type: 'text' })
  sourceId: string;

  @Column({ name: 'moj_org_id', type: 'integer' })
  mojOrgId: number;

  @Column({ name: 'source_detail_url', type: 'text', nullable: true })
  sourceDetailUrl: string | null;

  @Column({ name: 'org_type_code', type: 'smallint' })
  orgTypeCode: number;

  @Column({ name: 'parent_moj_org_id', type: 'integer', nullable: true })
  parentMojOrgId: number | null;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({ name: 'address', type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'city_id', type: 'integer', nullable: true })
  cityId: number | null;

  @Column({ name: 'district_id', type: 'integer', nullable: true })
  districtId: number | null;

  @Column({ name: 'phone', type: 'text', nullable: true })
  phone: string | null;

  @Column({ name: 'fax', type: 'text', nullable: true })
  fax: string | null;

  @Column({ name: 'email', type: 'text', nullable: true })
  email: string | null;

  @Column({ name: 'website_url', type: 'text', nullable: true })
  websiteUrl: string | null;

  @Column({ name: 'legal_representative', type: 'text', nullable: true })
  legalRepresentative: string | null;

  @Column({ name: 'total_auctioneers', type: 'integer', nullable: true })
  totalAuctioneers: number | null;

  @Column({ name: 'list_lead_auctioneer_name', type: 'text', nullable: true })
  listLeadAuctioneerName: string | null;

  @Column({ name: 'list_quantity_auctioneer', type: 'integer', nullable: true })
  listQuantityAuctioneer: number | null;

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'short_name', type: 'varchar', length: 255, nullable: true })
  shortName: string | null;

  @Column({ name: 'tax_code', type: 'varchar', length: 20, nullable: true })
  taxCode: string | null;

  @Column({ name: 'operating_status', type: 'varchar', length: 30, nullable: true })
  operatingStatus: string | null;

  @Column({ name: 'founded_year', type: 'smallint', nullable: true })
  foundedYear: number | null;

  @Column({ name: 'slogan', type: 'varchar', length: 255, nullable: true })
  slogan: string | null;

  @Column({ name: 'description_markdown', type: 'text', nullable: true })
  descriptionMarkdown: string | null;

  @Column({ name: 'total_employees', type: 'integer', nullable: true })
  totalEmployees: number | null;

  @Column({ name: 'total_sessions_completed', type: 'integer', nullable: true })
  totalSessionsCompleted: number | null;

  @Column({ name: 'contact_phone_confirmed_at', type: 'timestamptz', nullable: true })
  contactPhoneConfirmedAt: Date | null;

  @Column({ name: 'contact_email_confirmed_at', type: 'timestamptz', nullable: true })
  contactEmailConfirmedAt: Date | null;

  @Column({ name: 'slug', type: 'varchar', length: 255, nullable: true })
  slug: string | null;

  @Column({ name: 'phone_secondary', type: 'text', nullable: true })
  phoneSecondary: string | null;

  @Column({ name: 'email_secondary', type: 'text', nullable: true })
  emailSecondary: string | null;

  @Column({ name: 'province_code', type: 'varchar', length: 10, nullable: true })
  provinceCode: string | null;

  @Column({ name: 'district_code', type: 'varchar', length: 10, nullable: true })
  districtCode: string | null;

  @Column({ name: 'ward_code', type: 'varchar', length: 10, nullable: true })
  wardCode: string | null;

  @Column({ name: 'province_code_new', type: 'varchar', length: 10, nullable: true })
  provinceCodeNew: string | null;

  @Column({ name: 'ward_code_new', type: 'varchar', length: 10, nullable: true })
  wardCodeNew: string | null;

  @Column({ name: 'owner_user_id', type: 'integer', nullable: true })
  ownerUserId: number | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
