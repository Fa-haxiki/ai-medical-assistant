import { Controller, Get, Param, Query, Delete } from '@nestjs/common';
import { ConversationService } from './conversation.service';

@Controller('api')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get('history/:conversationId')
  async getHistory(@Param('conversationId') conversationId: string) {
    const messages = await this.conversationService.getHistory(conversationId);
    return { history: messages, conversation_id: conversationId };
  }

  @Get('conversations')
  async listConversations(@Query('limit') limit?: string) {
    const n = limit ? Number(limit) || 20 : 20;
    const conversations = await this.conversationService.listConversations(n);
    return { conversations };
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(@Param('conversationId') conversationId: string) {
    await this.conversationService.deleteConversation(conversationId);
    return { success: true, conversation_id: conversationId };
  }
}

