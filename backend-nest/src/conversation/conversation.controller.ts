import { Controller, Get, Param } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Controller('api')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get('history/:conversationId')
  async getHistory(@Param('conversationId') conversationId: string) {
    const messages = await this.conversationService.getHistory(conversationId);
    return { history: messages, conversation_id: conversationId };
  }
}

