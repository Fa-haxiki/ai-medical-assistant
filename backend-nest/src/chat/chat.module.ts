import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ConversationModule } from '../conversation/conversation.module';
import { AppConfigService } from '../config/config.service';
import { ConcurrencyService } from '../common/concurrency.service';
import { ChatBodyLimitGuard } from '../common/guards/body-limit.guard';
import { ConcurrencyGuard } from '../common/guards/concurrency.guard';
import { ConcurrencyReleaseInterceptor } from '../common/concurrency-release.interceptor';

@Module({
  imports: [RagModule, ConversationModule],
  providers: [
    ChatService,
    AppConfigService,
    ConcurrencyService,
    ChatBodyLimitGuard,
    ConcurrencyGuard,
    ConcurrencyReleaseInterceptor,
  ],
  controllers: [ChatController],
})
export class ChatModule {}

