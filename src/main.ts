import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Auction Cron Job service running on port ${port}`);
  logger.log(`Cron enabled: ${process.env.CRON_ENABLED !== 'false'}`);
  logger.log(`Correction mode: ${process.env.CORRECTION_MODE || 'dry-run'}`);
  logger.log(`Timezone: ${process.env.TZ || 'Asia/Ho_Chi_Minh'}`);
}

bootstrap();
