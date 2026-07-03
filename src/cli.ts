import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorrectionRunner } from './correction/correction.runner';
import { Logger } from '@nestjs/common';

/**
 * CLI entry point cho các command chạy tay.
 * 
 * Usage:
 *   npm run correction:scan                    # quét full
 *   npm run correction:scan -- --notice-id=123 # quét 1 notice
 *   npm run correction:scan -- --batch-size=100
 *   npm run correction:run -- --handler=fix-xxx --dry-run
 */
async function cli() {
  const logger = new Logger('CLI');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const runner = app.get(CorrectionRunner);
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'scan':
        await handleScan(runner, args, logger);
        break;

      case 'run':
        await handleRun(runner, args, logger);
        break;

      default:
        logger.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Command failed: ${error.message}`, error.stack);
    await app.close();
    process.exit(1);
  }
}

async function handleScan(runner: CorrectionRunner, args: string[], logger: Logger) {
  const noticeId = getArg(args, '--notice-id');
  const batchSize = getArg(args, '--batch-size');
  const mode = getArg(args, '--dry-run') !== null ? 'dry-run' : 'apply';

  logger.log(`Running scan: mode=${mode}`);

  const result = await runner.runAll({
    mode: mode as any,
    scanOptions: {
      noticeId: noticeId ? parseInt(noticeId, 10) : undefined,
      batchSize: batchSize ? parseInt(batchSize, 10) : undefined,
    },
  });

  logger.log(`Scan result: ${JSON.stringify(result)}`);
}

async function handleRun(runner: CorrectionRunner, args: string[], logger: Logger) {
  const handler = getArg(args, '--handler');
  const mode = getArg(args, '--dry-run') !== null ? 'dry-run' : 'apply';

  if (!handler) {
    logger.error('--handler is required for run command');
    process.exit(1);
  }

  logger.log(`Running handler: ${handler}, mode=${mode}`);

  const result = await runner.runAll({
    mode: mode as any,
    handlers: [handler],
  });

  logger.log(`Run result: ${JSON.stringify(result)}`);
}

function getArg(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function printUsage() {
  console.log(`
Usage:
  npm run correction:scan                    # Quét full batch
  npm run correction:scan -- --notice-id=123 # Quét 1 notice
  npm run correction:scan -- --batch-size=100
  npm run correction:run -- --handler=fix-xxx --dry-run
  `);
}

cli();
