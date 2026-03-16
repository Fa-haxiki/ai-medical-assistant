import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Response } from 'express';
import type { Request } from 'express';
import { ConcurrencyService } from './concurrency.service';
import { getConcurrencyKey } from './guards/concurrency.guard';

/**
 * 在响应结束时释放并发槽位（与 ConcurrencyGuard 配合使用）。
 */
@Injectable()
export class ConcurrencyReleaseInterceptor implements NestInterceptor {
  constructor(private readonly concurrency: ConcurrencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = getConcurrencyKey(req);
    const release = () => {
      if (key) this.concurrency.release(key);
    };
    res.once('finish', release);
    res.once('close', release); // 客户端断开时也释放
    return next.handle();
  }
}
