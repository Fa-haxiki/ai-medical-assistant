import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    DatabaseModule,
    RagModule,
    ChatModule,
    ConversationModule,
    MultimodalModule,
    KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppConfigService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
