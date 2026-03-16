import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import type { Request } from 'express';

/**
 * 按配置校验聊天请求体：消息长度、历史条数。
 * 在 ValidationPipe 之后执行，使用 env 配置的上限。
 */
@Injectable()
export class ChatBodyLimitGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const body = req.body as { message?: string; chat_history?: unknown[] };
    if (!body) return true;

    const maxMsg = this.config.maxMessageLength;
    if (typeof body.message === 'string' && body.message.length > maxMsg) {
      throw new BadRequestException(
        `单条消息不得超过 ${maxMsg} 字符，当前 ${body.message.length} 字`,
      );
    }

    const maxHistory = this.config.maxChatHistoryLength;
    if (Array.isArray(body.chat_history) && body.chat_history.length > maxHistory) {
      throw new BadRequestException(
        `chat_history 最多 ${maxHistory} 条，当前 ${body.chat_history.length} 条`,
      );
    }
    return true;
  }
}
