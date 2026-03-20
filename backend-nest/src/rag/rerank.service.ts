import { Injectable, Logger } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { AppConfigService } from '../config/config.service';

type DashscopeRerankResult = {
  index: number;
  relevance_score: number;
};

type DashscopeRerankResponse = {
  output?: {
    results?: DashscopeRerankResult[];
  };
  message?: string;
};

@Injectable()
export class RerankService {
  private readonly logger = new Logger(RerankService.name);
  private readonly endpoint =
    'https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank';

  constructor(private readonly config: AppConfigService) {}

  isEnabled(): boolean {
    return this.config.rerankEnabled && !!this.config.dashscopeApiKey;
  }

  async rerank(question: string, docs: Document[]): Promise<Document[]> {
    if (!docs.length) return docs;
    if (!this.isEnabled()) return docs;
    if (this.config.rerankProvider !== 'dashscope') return docs;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.rerankTimeoutMs,
    );

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.dashscopeApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.rerankModel,
          input: {
            query: question,
            documents: docs.map((d) => d.pageContent),
          },
          parameters: {
            top_n: Math.min(this.config.rerankTopN, docs.length),
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(
          `Rerank 请求失败(${response.status})，将降级向量检索: ${text}`,
        );
        return docs.slice(0, this.config.rerankTopN);
      }

      const payload = (await response.json()) as DashscopeRerankResponse;
      const results = payload.output?.results ?? [];
      if (!results.length) {
        this.logger.warn('Rerank 返回空结果，将降级向量检索');
        return docs.slice(0, this.config.rerankTopN);
      }

      const ranked = results
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .map((r) => docs[r.index])
        .filter((d): d is Document => !!d);

      if (!ranked.length) {
        return docs.slice(0, this.config.rerankTopN);
      }
      return ranked;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Rerank 异常，将降级向量检索: ${msg}`);
      return docs.slice(0, this.config.rerankTopN);
    } finally {
      clearTimeout(timeout);
    }
  }
}
