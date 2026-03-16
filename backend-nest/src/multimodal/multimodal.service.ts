import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

const DASHSCOPE_MULTIMODAL_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

interface ChatMessage {
  role: string;
  content: string;
}

@Injectable()
export class MultimodalService {
  constructor(private readonly config: AppConfigService) {}

  private async callDashscopeWithRetry(
    url: string,
    body: unknown,
  ): Promise<Response> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.dashscopeApiKey}`,
    };
    const payload = JSON.stringify(body);

    let lastError: unknown;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: payload,
        });

        if (res.ok) {
          return res;
        }

        const text = await res.text();
        // DashScope 一般会返回 JSON 错误体，尽量解析出 code / message
        let code: string | number | undefined;
        let msg: string | undefined;
        let requestId: string | undefined;
        try {
          const data = JSON.parse(text) as any;
          code = data.code ?? data.error_code;
          msg = data.message ?? data.error_msg ?? data.error?.message;
          requestId = data.request_id ?? data.requestId;
        } catch {
          // ignore parse error, fall back to原始文本
        }

        // 根据 HTTP 状态和 DashScope 错误码映射更友好的信息
        const base =
          msg ??
          (text.length > 200 ? `${text.slice(0, 200)}...` : text) ??
          '百炼接口返回未知错误';

        // 配额 / 限流
        if (res.status === 429 || code === 'QuotaExceed' || code === 'TooManyRequests') {
          throw new BadRequestException({
            message: '当前调用过于频繁或额度已用完，请稍后再试',
            providerMessage: base,
            providerCode: code,
            requestId,
          });
        }

        // 无效密钥 / 权限问题
        if (res.status === 401 || res.status === 403) {
          throw new ServiceUnavailableException({
            message: '多模态服务认证失败，请检查 DashScope API Key 配置',
            providerMessage: base,
            providerCode: code,
            requestId,
          });
        }

        // 输入问题（包含尺寸/格式不支持等）
        if (res.status === 400) {
          // 尝试根据 message 提示图片/参数问题
          if (
            base.includes('size') ||
            base.includes('dimension') ||
            base.includes('resolution') ||
            base.includes('format')
          ) {
            throw new BadRequestException({
              message: '图片参数不合法（可能是尺寸或格式不受支持），请调整后重试',
              providerMessage: base,
              providerCode: code,
              requestId,
            });
          }
          throw new BadRequestException({
            message: '请求参数不合法，请检查输入后重试',
            providerMessage: base,
            providerCode: code,
            requestId,
          });
        }

        // 5xx 或其他情况：视为服务端或网络异常
        if (res.status >= 500) {
          lastError = new ServiceUnavailableException({
            message: '多模态服务暂时不可用，请稍后再试',
            providerMessage: base,
            providerCode: code,
            requestId,
          });
        } else {
          // 非 5xx 直接抛出，上层不再重试
          throw new ServiceUnavailableException({
            message: '调用多模态服务时发生错误',
            providerMessage: base,
            providerCode: code,
            requestId,
          });
        }
      } catch (e) {
        lastError = e;
      }

      // 简单退避等待再重试（仅针对 5xx/网络异常）
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }

    // 最终仍然失败，抛出上次错误或通用错误
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new ServiceUnavailableException('多模态服务暂时不可用，请稍后再试');
  }

  async multimodalChat(
    text: string,
    imageBase64: string,
    history: ChatMessage[] = [],
  ): Promise<string> {
    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const messages: Array<{
      role: string;
      content: Array<{ text?: string; image?: string }>;
    }> = [];

    for (const msg of history) {
      messages.push({ role: msg.role, content: [{ text: msg.content }] });
    }
    messages.push({
      role: 'user',
      content: [{ image: imageUrl }, { text }],
    });

    const body = {
      model: 'qwen-vl-plus',
      input: { messages },
    };

    const res = await this.callDashscopeWithRetry(
      DASHSCOPE_MULTIMODAL_URL,
      body,
    );

    const data = (await res.json()) as {
      output?: {
        choices?: Array<{ message?: { content?: Array<{ text?: string }> } }>;
      };
    };
    const contentList = data.output?.choices?.[0]?.message?.content ?? [];
    const textParts = contentList.map((c) => c.text).filter(Boolean);
    return textParts.join('') || '未收到有效回复。';
  }

  async textToImage(
    prompt: string,
    options: { negative_prompt?: string; n?: number; size?: string } = {},
  ): Promise<string[]> {
    const url =
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';

    const body = {
      model: 'wanx2.1-t2i-turbo',
      input: {
        prompt,
        negative_prompt: options.negative_prompt,
        n: options.n ?? 1,
        size: options.size ?? '1024*1024',
      },
    };

    const res = await this.callDashscopeWithRetry(url, body);

    const data = (await res.json()) as {
      output?: { results?: Array<{ url?: string }> };
    };
    const results = data.output?.results ?? [];
    return results.map((r) => r.url!).filter(Boolean);
  }
}

