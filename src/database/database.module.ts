import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuctionNotice } from './entities/auction-notice.entity';
import { AuctionOrganization } from './entities/auction-organization.entity';
import { AssetOwnerEntity } from './entities/asset-owner-entity.entity';
import { AssetOwnerNoticeLink } from './entities/asset-owner-notice-link.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        if (!dbUrl) {
          throw new Error(
            'DATABASE_URL is required. Set it via .env file or environment variable.',
          );
        }

        // SSL configuration
        const enableSsl = configService.get<string>('DATABASE_SSL', 'true') === 'true';

        return {
          type: 'postgres',
          url: dbUrl,
          entities: [AuctionNotice, AuctionOrganization, AssetOwnerEntity, AssetOwnerNoticeLink],
          synchronize: false,
          logging: configService.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
          ssl: enableSsl ? { rejectUnauthorized: false } : false,
          extra: {
            max: configService.get<number>('DATABASE_POOL_MAX', 10),
            connectionTimeoutMillis: 30000,
            idleTimeoutMillis: 30000,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([AuctionNotice, AuctionOrganization, AssetOwnerEntity, AssetOwnerNoticeLink]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
