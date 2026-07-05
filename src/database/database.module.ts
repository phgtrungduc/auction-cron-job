import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuctionNotice } from './entities/auction-notice.entity';

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
        return {
          type: 'postgres',
          url: dbUrl,
          entities: [AuctionNotice],
          synchronize: false, // Schema do .NET migration quản lý
          logging: configService.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
          ssl: configService.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    TypeOrmModule.forFeature([AuctionNotice]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
