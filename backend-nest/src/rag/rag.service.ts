import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { AlibabaTongyiEmbeddings } from '@langchain/community/embeddings/alibaba_tongyi';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private retriever: VectorStoreRetriever | null = null;
  private embeddings: AlibabaTongyiEmbeddings | null = null;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeRag();
  }

  getRetriever(): VectorStoreRetriever | null {
    return this.retriever;
  }

  getEmbeddings(): AlibabaTongyiEmbeddings | null {
    return this.embeddings;
  }

  isRagEnabled(): boolean {
    return !!this.retriever;
  }

  formatDocs(docs: Document[]): string {
    if (!docs?.length) return '';
    return docs.map((d) => d.pageContent).join('\n\n');
  }

  private buildChromaConfig() {
    const collectionName = this.config.chromaCollectionName;
    const baseUrl = this.config.chromaUrl.startsWith('http')
      ? this.config.chromaUrl
      : `http://${this.config.chromaHost}:${this.config.chromaPort}`;
    return {
      collectionName,
      url: baseUrl,
    };
  }

  async addKnowledgeFromText(raw: string, source: string): Promise<number> {
    if (!this.embeddings) {
      throw new Error('RAG 未启用：嵌入模型未初始化或百炼 API Key 未配置');
    }
    if (!this.config.chromaUrl) {
      throw new Error('RAG 未启用：未配置 CHROMA_URL/CHROMA_HOST');
    }

    const docs = [
      new Document({
        pageContent: raw,
        metadata: { source },
      }),
    ];

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 200,
    });
    const splits = await splitter.splitDocuments(docs);
    if (!splits.length) {
      throw new Error('上传文件内容为空或无法切分为有效片段');
    }

    const chromaConfig = this.buildChromaConfig();
    const vectorStore = await Chroma.fromExistingCollection(
      this.embeddings,
      chromaConfig,
    );
    await vectorStore.addDocuments(splits);
    this.logger.log(
      `新增知识文档已写入向量库: ${source}, 片段数: ${splits.length}`,
    );
    return splits.length;
  }

  private async initializeRag(): Promise<VectorStoreRetriever | null> {
    if (!this.config.dashscopeApiKey) {
      this.logger.warn('未设置 DASHSCOPE_API_KEY/ALIBABA_API_KEY，RAG 已禁用');
      return null;
    }

    try {
      this.embeddings = new AlibabaTongyiEmbeddings({
        apiKey: this.config.dashscopeApiKey,
        modelName: 'text-embedding-v2',
      });
      this.logger.log('百炼嵌入模型初始化成功');
    } catch (e) {
      this.logger.warn(`百炼嵌入模型初始化失败: ${String(e)}`);
      return null;
    }

    if (!this.config.chromaUrl) {
      this.logger.warn('未设置 CHROMA_URL，RAG 已禁用');
      return null;
    }

    const chromaConfig = this.buildChromaConfig();

    try {
      const vectorStore = await Chroma.fromExistingCollection(
        this.embeddings,
        chromaConfig,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const count =
        ((vectorStore as any).collection?.count?.() as Promise<number>) ?? 0;

      const docCount = await count;

      if (docCount === 0) {
        this.logger.warn('Chroma 集合为空，RAG 已禁用');
        return null;
      }

      this.logger.log(`复用已有 Chroma 集合，文档数: ${docCount}`);

      this.retriever = vectorStore.asRetriever({ k: 3 });
      this.logger.log('Chroma 向量库与 RAG 检索器初始化成功');
      return this.retriever;
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      this.logger.warn(`初始化 RAG 失败: ${msg}`);
      if (
        msg.includes('FreeTierOnly') ||
        msg.includes('free tier') ||
        msg.includes('quota') ||
        msg.includes('额度')
      ) {
        this.logger.warn(
          '→ 阿里云百炼免费额度已用尽。请在百炼控制台关闭「仅用免费」或开通按量付费后重试。当前将仅使用大模型对话（无知识库检索）。',
        );
      }
      return null;
    }
  }
}

