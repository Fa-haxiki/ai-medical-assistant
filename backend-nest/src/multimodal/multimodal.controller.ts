import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { MultimodalService } from './multimodal.service';
import { ConversationService } from '../conversation/conversation.service';

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
export class MultimodalController {
  constructor(
    private readonly multimodalService: MultimodalService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('chat/multimodal-json')
  @HttpCode(HttpStatus.OK)
  async multimodalJson(
    @Body()
    body: {
      message?: string;
      chat_history?: Array<{ role: string; content: string }>;
      image_data?: string;
    },
    @Req() req: Request,
  ) {
    const conversationId = getConversationId(req);
    const { message, chat_history = [], image_data } = body;

    if (!message || !image_data) {
      return {
        error: '需要 message 和 image_data (base64)',
      };
    }

    let base64 = image_data;
    if (base64.includes(';base64,')) base64 = base64.split(';base64,')[1];
    else if (base64.includes(',')) base64 = base64.split(',')[1];

    const history = (chat_history.length
      ? chat_history
      : this.conversationService
          .getHistory(conversationId)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }))) as Array<{
      role: string;
      content: string;
    }>;

    const responseText = await this.multimodalService.multimodalChat(
      message,
      base64,
      history,
    );
    this.conversationService.appendMessage(conversationId, 'user', message);
    this.conversationService.appendMessage(
      conversationId,
      'assistant',
      responseText,
    );

    return { response: responseText, conversation_id: conversationId };
  }

  @Post('text2image')
  @HttpCode(HttpStatus.OK)
  async text2image(
    @Body()
    body: {
      prompt?: string;
      negative_prompt?: string;
      n?: number;
      size?: string;
    },
    @Req() req: Request,
  ) {
    const conversationId = getConversationId(req);
    const { prompt, negative_prompt, n = 1, size = '1024*1024' } = body ?? {};
    if (!prompt) {
      return { error: '需要 prompt' };
    }

    const urls = await this.multimodalService.textToImage(prompt, {
      negative_prompt,
      n,
      size,
    });

    this.conversationService.appendMessage(
      conversationId,
      'user',
      `请根据以下描述生成图片: ${prompt}`,
    );
    if (urls[0]) {
      this.conversationService.appendMessage(
        conversationId,
        'assistant',
        `已根据您的描述生成图片: ${prompt}`,
        urls[0],
      );
    }

    return { image_urls: urls, conversation_id: conversationId };
  }
}

