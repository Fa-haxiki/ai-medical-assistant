import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { MultimodalService } from './multimodal.service';
import { ConversationService } from '../conversation/conversation.service';
import { MultimodalRequestDto } from './dto/multimodal-request.dto';
import { Text2ImageRequestDto } from './dto/text2image-request.dto';
import { MultimodalImageSizeGuard } from '../common/guards/image-size.guard';
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
export class MultimodalController {
  constructor(
    private readonly multimodalService: MultimodalService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('chat/multimodal-json')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ConcurrencyGuard, MultimodalImageSizeGuard)
  @UseInterceptors(ConcurrencyReleaseInterceptor)
  async multimodalJson(
    @Body() body: MultimodalRequestDto,
    @Req() req: Request,
  ) {
    const conversationId = getConversationId(req);
    const { message, chat_history = [], image_data } = body;

    let base64 = image_data;
    if (base64.includes(';base64,')) base64 = base64.split(';base64,')[1];
    else if (base64.includes(',')) base64 = base64.split(',')[1];

    const storedHistory = chat_history.length
      ? chat_history
      : (await this.conversationService.getHistory(conversationId))
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));
    const history = storedHistory as Array<{ role: string; content: string }>;

    const responseText = await this.multimodalService.multimodalChat(
      message,
      base64,
      history,
    );
    await this.conversationService.appendMessage(conversationId, 'user', message);
    await this.conversationService.appendMessage(
      conversationId,
      'assistant',
      responseText,
    );

    return { response: responseText, conversation_id: conversationId };
  }

  @Post('text2image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ConcurrencyGuard)
  @UseInterceptors(ConcurrencyReleaseInterceptor)
  async text2image(
    @Body() body: Text2ImageRequestDto,
    @Req() req: Request,
  ) {
    const conversationId = getConversationId(req);
    const { prompt, negative_prompt, n = 1, size = '1024*1024' } = body;

    const urls = await this.multimodalService.textToImage(prompt, {
      negative_prompt,
      n,
      size,
    });

    await this.conversationService.appendMessage(
      conversationId,
      'user',
      `请根据以下描述生成图片: ${prompt}`,
    );
    if (urls[0]) {
      await this.conversationService.appendMessage(
        conversationId,
        'assistant',
        `已根据您的描述生成图片: ${prompt}`,
        urls[0],
      );
    }

    return { image_urls: urls, conversation_id: conversationId };
  }
}

