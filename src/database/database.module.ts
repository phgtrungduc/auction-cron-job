import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuctionNotice } from './entities/auction-notice.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [AuctionNotice],
        synchronize: false, // Schema do .NET migration quản lý
        logging: configService.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
        ssl: configService.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([AuctionNotice]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
