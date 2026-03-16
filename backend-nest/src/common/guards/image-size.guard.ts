import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import type { Request } from 'express';

/**
 * 校验多模态请求中 base64 图片的字节大小，不超过配置上限。
 */
@Injectable()
export class MultimodalImageSizeGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const body = req.body as { image_data?: string };
    if (!body?.image_data || typeof body.image_data !== 'string') return true;

    let base64 = body.image_data.trim();
    if (base64.includes(';base64,')) base64 = base64.split(';base64,')[1] ?? '';
    else if (base64.includes(',')) base64 = base64.split(',')[1] ?? '';

    try {
      const buf = Buffer.from(base64, 'base64');
      const maxBytes = this.config.maxImageSizeBytes;
      if (buf.length > maxBytes) {
        const mb = (maxBytes / (1024 * 1024)).toFixed(1);
        throw new BadRequestException(
          `图片大小不得超过 ${mb}MB，当前约 ${(buf.length / (1024 * 1024)).toFixed(1)}MB`,
        );
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('image_data 不是合法的 base64');
    }
    return true;
  }
}
