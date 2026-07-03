import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CorrectionRunner } from './correction.runner';

/**
 * CorrectionScheduler - cron jobs tự động.
 * 
 * - Mỗi 15 phút: quét incremental
 * - 03:00 mỗi ngày: quét full
 */
@Injectable()
export class CorrectionScheduler {
  private readonly logger = new Logger(CorrectionScheduler.name);
  private readonly cronEnabled: boolean;
  private isRunning = false;

  constructor(
    private readonly runner: CorrectionRunner,
    private readonly configService: ConfigService,
  ) {
    this.cronEnabled = this.configService.get<boolean>('CRON_ENABLED', true);
    
    if (!this.cronEnabled) {
      this.logger.warn('Cron jobs disabled via CRON_ENABLED=false');
    }
  }

  /**
   * Job chạy mỗi 15 phút (hoặc theo NOTICE_SCAN_CRON).
   */
  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: 'notice-scan',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handlePeriodicScan() {
    if (!this.cronEnabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting periodic notice scan (15min)');

    try {
      const result = await this.runner.runAll();
      this.logger.log(`Periodic scan completed: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Periodic scan failed: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Job chạy mỗi ngày lúc 03:00 (full scan / đối soát).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'notice-scan-daily',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleDailyScan() {
    if (!this.cronEnabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting daily full scan (03:00)');

    try {
      const result = await this.runner.runAll({
        scanOptions: { startFromId: 0 }, // Full scan từ đầu
      });
      this.logger.log(`Daily scan completed: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Daily scan failed: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }
}
