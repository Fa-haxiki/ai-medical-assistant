import { Injectable } from '@nestjs/common';
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

    const res = await fetch(DASHSCOPE_MULTIMODAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.dashscopeApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`百炼多模态接口错误: ${res.status} ${err}`);
    }

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

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.dashscopeApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`百炼文生图接口错误: ${res.status} ${err}`);
    }

    const data = (await res.json()) as {
      output?: { results?: Array<{ url?: string }> };
    };
    const results = data.output?.results ?? [];
    return results.map((r) => r.url!).filter(Boolean);
  }
}

