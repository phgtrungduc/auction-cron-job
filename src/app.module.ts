import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CorrectionModule } from './correction/correction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: false, // Cho phép chạy mà không có .env (đọc từ system env)
    }),
    ScheduleModule.forRoot(),
    CorrectionModule,
  ],
})
export class AppModule {}
