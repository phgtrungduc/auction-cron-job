import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger';

async function bootstrap() {
  const logger = new AppLogger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Auction Cron Job service running on port ${port}`);
  logger.log(`Cron enabled: ${process.env.CRON_ENABLED !== 'false'}`);
  logger.log(`Correction mode: ${process.env.CORRECTION_MODE || 'dry-run'}`);
  logger.log(`Timezone: ${process.env.TZ || 'Asia/Ho_Chi_Minh'}`);
  logger.log(`Database: ${process.env.DATABASE_URL ? '***connected***' : 'not configured'}`);
}

bootstrap();
