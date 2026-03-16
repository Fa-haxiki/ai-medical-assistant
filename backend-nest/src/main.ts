import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: config.corsOrigin || '*',
    credentials: true,
  });

  // 全局入参校验：DTO 校验 + 自动转型
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 全局错误格式统一
  app.useGlobalFilters(new AllExceptionsFilter());

  const host = config.host;
  const port = config.port;

  await app.listen(port, host);

  const url = await app.getUrl();
  logger.log(`后端已启动: ${url}`);
}

bootstrap();
