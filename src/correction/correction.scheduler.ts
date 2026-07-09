import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CorrectionRunner } from './correction.runner';
import { createLogger } from '@/common/logger';
import { formatNumber, formatDuration } from '@/common/utils';

/**
 * CorrectionScheduler - cron jobs tự động.
 *
 * - Mỗi 15 phút: quét incremental
 * - 03:00 mỗi ngày: quét full
 */
@Injectable()
export class CorrectionScheduler {
  private readonly logger = createLogger(CorrectionScheduler.name);
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
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'notice-scan',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handlePeriodicScan() {
    if (!this.cronEnabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting periodic notice scan (15min)');

    const startTime = Date.now();

    try {
      const result = await this.runner.runAll();
      const duration = Date.now() - startTime;

      this.logger.log(
        `Periodic scan completed: ${formatNumber(result.scanned)} notices ` +
          `in ${formatDuration(duration)}`,
      );
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

    const startTime = Date.now();

    try {
      const result = await this.runner.runAll({
        scanOptions: { startFromId: 0 }, // Full scan từ đầu
      });
      const duration = Date.now() - startTime;

      this.logger.log(
        `Daily scan completed: ${formatNumber(result.scanned)} notices, ` +
          `${result.batches} batches in ${formatDuration(duration)}`,
      );
    } catch (error) {
      this.logger.error(`Daily scan failed: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }
}
