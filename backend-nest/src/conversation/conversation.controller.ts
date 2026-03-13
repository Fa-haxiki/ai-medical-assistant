import { Controller, Get, Param } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Controller('api')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get('history/:conversationId')
  getHistory(@Param('conversationId') conversationId: string) {
    const messages = this.conversationService.getHistory(conversationId);
    return { history: messages, conversation_id: conversationId };
  }
}

