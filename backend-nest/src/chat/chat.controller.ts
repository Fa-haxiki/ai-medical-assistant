import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { ChatMessage } from './chat.types';
import { ConversationService } from '../conversation/conversation.service';

interface ChatRequestBody {
  message?: string;
  chat_history?: Array<{ role: string; content: string }>;
}

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
  async chat(
    @Body() body: ChatRequestBody,
    @Req() req: Request,
  ): Promise<{ response: string; conversation_id: string }> {
    const conversationId = getConversationId(req);
    const { message, chat_history = [] } = body;

    if (!message || typeof message !== 'string') {
      throw new Error('缺少 message');
    }

    let history: ChatMessage[] = chat_history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (!history.length) {
      history = this.conversationService
        .getHistory(conversationId)
        .map((m) => ({ role: m.role, content: m.content }));
    }

    const responseContent = await this.chatService.smartAnswer(
      message,
      history,
    );
    this.conversationService.appendMessage(conversationId, 'user', message);
    this.conversationService.appendMessage(
      conversationId,
      'assistant',
      responseContent,
    );
    return { response: responseContent, conversation_id: conversationId };
  }

  @Post('chat/stream')
  async chatStream(
    @Body() body: ChatRequestBody,
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

    if (!message || typeof message !== 'string') {
      sendMessageChunk('请输入您的问题');
      send(
        'done',
        JSON.stringify({
          message: 'Stream completed',
          conversation_id: conversationId,
        }),
      );
      res.end();
      return;
    }

    let history: ChatMessage[] = chat_history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (!history.length) {
      history = this.conversationService
        .getHistory(conversationId)
        .map((m) => ({ role: m.role, content: m.content }));
    }

    try {
      this.conversationService.appendMessage(conversationId, 'user', message);
      const fullResponse = await this.chatService.smartAnswer(
        message,
        history,
      );
      for (const char of fullResponse) sendMessageChunk(char);
      this.conversationService.appendMessage(
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

