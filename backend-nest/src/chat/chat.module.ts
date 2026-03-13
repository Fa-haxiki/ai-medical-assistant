import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ConversationModule } from '../conversation/conversation.module';
import { AppConfigService } from '../config/config.service';

@Module({
  imports: [RagModule, ConversationModule],
  providers: [ChatService, AppConfigService],
  controllers: [ChatController],
})
export class ChatModule {}

