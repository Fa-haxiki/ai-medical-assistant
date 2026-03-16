import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ConcurrencyService } from '../concurrency.service';
import type { Request } from 'express';

export const CONCURRENCY_KEY = '_concurrencyKey' as const;

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
  if (Array.isArray(xff) && xff[0]) return String(xff[0]).trim();
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

/**
 * 限制同一 IP 的并发对话/流式请求数。需配合 ConcurrencyInterceptor 在响应结束时 release。
 */
@Injectable()
export class ConcurrencyGuard implements CanActivate {
  constructor(private readonly concurrency: ConcurrencyService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = getClientIp(req);
    if (!this.concurrency.acquire(key)) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: 429,
        error: 'Too Many Requests',
        message: '当前并发请求过多，请稍后再试',
      });
      return false;
    }
    (req as Request & Record<typeof CONCURRENCY_KEY, string>)[CONCURRENCY_KEY] = key;
    return true;
  }
}

export function getConcurrencyKey(req: Request): string | undefined {
  return (req as Request & { [CONCURRENCY_KEY]?: string })[CONCURRENCY_KEY];
}
