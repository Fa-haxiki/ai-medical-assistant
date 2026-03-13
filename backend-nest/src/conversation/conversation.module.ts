import { Module } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { ConversationRepository } from './conversation.repository';

@Module({
  providers: [ConversationService, ConversationRepository, AppConfigService],
  controllers: [ConversationController],
  exports: [ConversationService],
})
export class ConversationModule {}

