import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl, url, headers, query } = req;

    const convHeader = headers['x-conversation-id'];
    const convQuery = (query?.conversation_id ??
      query?.conversationId) as string | string[] | undefined;
    const conversationId =
      (Array.isArray(convHeader) ? convHeader[0] : convHeader) ||
      (Array.isArray(convQuery) ? convQuery[0] : convQuery) ||
      undefined;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const path = originalUrl || url;
      const statusCode = res.statusCode;
      const convPart = conversationId ? ` conv=${conversationId}` : '';
      const msg = `${method} ${path} ${statusCode} +${duration}ms${convPart}`;
      const line = `[${new Date().toISOString()}] ${msg}\n`;
      // 写 stderr，方便在多进程/并发环境下查看原始日志
      process.stderr.write(line);
      this.logger.debug(msg);
    });

    next();
  }
}

