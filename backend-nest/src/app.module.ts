import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigService } from './config/config.service';
import { RagModule } from './rag/rag.module';
import { ChatModule } from './chat/chat.module';
import { ConversationModule } from './conversation/conversation.module';
import { MultimodalModule } from './multimodal/multimodal.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { RequestLoggerMiddleware } from './common/logger.middleware';
import { DatabaseModule } from './database/database.module';
import { ConcurrencyService } from './common/concurrency.service';
import { ChatBodyLimitGuard } from './common/guards/body-limit.guard';
import { MultimodalImageSizeGuard } from './common/guards/image-size.guard';
import { ConcurrencyGuard } from './common/guards/concurrency.guard';
import { ConcurrencyReleaseInterceptor } from './common/concurrency-release.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl:
              (parseInt(
                config.get<string>('THROTTLE_TTL_SECONDS') ?? '60',
                10,
              ) || 60) * 1000,
            limit:
              parseInt(config.get<string>('THROTTLE_LIMIT') ?? '120', 10) ||
              120,
          },
        ],
      }),
    }),
    DatabaseModule,
    RagModule,
    ChatModule,
    ConversationModule,
    MultimodalModule,
    KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppConfigService,
    ConcurrencyService,
    ChatBodyLimitGuard,
    MultimodalImageSizeGuard,
    ConcurrencyGuard,
    ConcurrencyReleaseInterceptor,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
