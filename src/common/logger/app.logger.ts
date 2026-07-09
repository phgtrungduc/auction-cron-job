import { LoggerService } from '@nestjs/common';
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Pino-based logger với multiple transports:
 * - Console: pretty print với màu sắc (development)
 * - File: JSON logs với daily rotation
 *
 * Features:
 * - Timestamp VN timezone
 * - Color coding (console)
 * - Context tracking
 * - Structured logging (file)
 * - Daily log rotation
 * - Auto cleanup old logs
 */
export class AppLogger implements LoggerService {
  private logger: pino.Logger;
  private context?: string;

  constructor(context?: string) {
    this.context = context;
    this.logger = this.createLogger();

    if (context) {
      this.logger = this.logger.child({ context });
    }
  }

  /**
   * Set context cho logger instance này.
   */
  setContext(context: string) {
    this.context = context;
    this.logger = this.logger.child({ context });
  }

  /**
   * Log level: verbose (trace)
   */
  verbose(message: any, context?: string) {
    const ctx = context || this.context;
    this.logger.trace({ context: ctx }, this.formatMessage(message));
  }

  /**
   * Log level: debug
   */
  debug(message: any, context?: string) {
    const ctx = context || this.context;
    this.logger.debug({ context: ctx }, this.formatMessage(message));
  }

  /**
   * Log level: log (info)
   */
  log(message: any, context?: string) {
    const ctx = context || this.context;
    this.logger.info({ context: ctx }, this.formatMessage(message));
  }

  /**
   * Log level: warn
   */
  warn(message: any, context?: string) {
    const ctx = context || this.context;
    this.logger.warn({ context: ctx }, this.formatMessage(message));
  }

  /**
   * Log level: error
   */
  error(message: any, stack?: string, context?: string) {
    const ctx = context || this.context;
    this.logger.error({ context: ctx, stack }, this.formatMessage(message));
  }

  /**
   * Format message to string.
   */
  private formatMessage(message: any): string {
    return typeof message === 'object' ? JSON.stringify(message) : String(message);
  }

  /**
   * Create Pino logger với multiple transports.
   */
  private createLogger(): pino.Logger {
    const isDev = process.env.NODE_ENV !== 'production';
    const logLevel = process.env.LOG_LEVEL || 'info';

    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const targets: any[] = [];

    // Target 1: Console output
    if (isDev) {
      // Development: Pretty print với màu
      targets.push({
        target: 'pino-pretty',
        level: 'debug',
        options: {
          colorize: true,
          translateTime: 'SYS:dd/mm/yyyy HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      });
    } else {
      // Production: JSON format cho Docker/K8s logs
      targets.push({
        target: 'pino/file',
        level: logLevel,
        options: {
          destination: 1, // stdout
        },
      });
    }

    // Target 2: File logs - All logs (info+)
    targets.push({
      target: 'pino/file',
      level: 'info',
      options: {
        destination: this.getDailyLogPath('app'),
        mkdir: true,
      },
    });

    // Target 3: File logs - Errors only
    targets.push({
      target: 'pino/file',
      level: 'error',
      options: {
        destination: this.getDailyLogPath('error'),
        mkdir: true,
      },
    });

    return pino({
      level: logLevel,
      transport: {
        targets,
      },
    });
  }

  /**
   * Get log file path với format theo ngày.
   * Format: logs/app-YYYY-MM-DD.log
   */
  private getDailyLogPath(prefix: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return path.join(process.cwd(), 'logs', `${prefix}-${dateStr}.log`);
  }
}

/**
 * Factory để tạo logger với context.
 *
 * @example
 * const logger = createLogger('NoticeScanner');
 * logger.log('Starting scan...');
 */
export function createLogger(context: string): AppLogger {
  return new AppLogger(context);
}
