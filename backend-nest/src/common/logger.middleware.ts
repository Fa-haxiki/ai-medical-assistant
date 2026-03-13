import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, _res: Response, next: NextFunction) {
    const line = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
    // 与原实现保持一致：写 stderr，避免某些环境下看不到输出
    process.stderr.write(line);
    this.logger.debug(line.trim());
    next();
  }
}

