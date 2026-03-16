import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { ChatMessage } from './chat.types';
import { ConversationService } from '../conversation/conversation.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatBodyLimitGuard } from '../common/guards/body-limit.guard';
import { ConcurrencyGuard } from '../common/guards/concurrency.guard';
import { ConcurrencyReleaseInterceptor } from '../common/concurrency-release.interceptor';

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v.length && typeof v[0] === 'string') return v[0];
  return undefined;
}

function getConversationId(req: Request): string {
  const id =
    asString(req.query.conversation_id) ||
    asString(req.headers['x-conversation-id']) ||
    String(Date.now());
  return id;
}

@Controller('api')
export class ChatController {

  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ConcurrencyGuard, ChatBodyLimitGuard)
  @UseInterceptors(ConcurrencyReleaseInterceptor)
  async chat(
    @Body() body: ChatRequestDto,
    @Req() req: Request,
  ): Promise<{ response: string; conversation_id: string }> {
    const conversationId = getConversationId(req);
    const { message, chat_history = [] } = body;

    let history: ChatMessage[] = (chat_history ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (!history.length) {
      const stored = await this.conversationService.getHistory(conversationId);
      history = stored.map((m) => ({ role: m.role, content: m.content }));
    }

    const responseContent = await this.chatService.smartAnswer(
      message,
      history,
    );
    await this.conversationService.appendMessage(conversationId, 'user', message);
    await this.conversationService.appendMessage(
      conversationId,
      'assistant',
      responseContent,
    );
    return { response: responseContent, conversation_id: conversationId };
  }

  @Post('chat/stream')
  @UseGuards(ConcurrencyGuard, ChatBodyLimitGuard)
  @UseInterceptors(ConcurrencyReleaseInterceptor)
  async chatStream(
    @Body() body: ChatRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const conversationId = getConversationId(req);
    const { message, chat_history = [] } = body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    (res as Response & { flushHeaders?: () => void }).flushHeaders?.();

    const send = (event: string, data: string) => {
      res.write(`event: ${event}\ndata: ${data}\n\n`);
    };
    const sendMessageChunk = (chunk: string) => {
      send('message', JSON.stringify(chunk));
    };

    let history: ChatMessage[] = (chat_history ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (!history.length) {
      const stored = await this.conversationService.getHistory(conversationId);
      history = stored.map((m) => ({ role: m.role, content: m.content }));
    }

    try {
      await this.conversationService.appendMessage(conversationId, 'user', message);
      const fullResponse = await this.chatService.smartAnswer(
        message,
        history,
      );
      for (const char of fullResponse) sendMessageChunk(char);
      await this.conversationService.appendMessage(
        conversationId,
        'assistant',
        fullResponse,
      );
      send(
        'done',
        JSON.stringify({
          message: 'Stream completed',
          conversation_id: conversationId,
        }),
      );
    } catch (e) {
      const err = e as Error;
      const fallback = this.chatService.getFallbackResponse(
        message,
        history,
      );
      for (const char of fallback) sendMessageChunk(char);
      await this.conversationService.appendMessage(
        conversationId,
        'assistant',
        fallback,
      );
      send(
        'done',
        JSON.stringify({
          message: 'Stream completed with fallback',
          conversation_id: conversationId,
          error: err?.message ?? String(e),
        }),
      );
    }
    res.end();
  }
}

