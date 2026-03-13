import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: config.corsOrigin || '*',
    credentials: true,
  });

  const host = config.host;
  const port = config.port;

  await app.listen(port, host);

  const url = await app.getUrl();
  logger.log(`后端已启动: ${url}`);
}

bootstrap();
