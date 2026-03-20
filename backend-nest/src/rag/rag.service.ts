import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { VectorStoreRetriever } from '@langchain/core/vectorstores';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { OllamaEmbeddings } from '@langchain/ollama';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private retriever: VectorStoreRetriever | null = null;
  private embeddings: EmbeddingsInterface | null = null;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeRag();
  }

  getRetriever(): VectorStoreRetriever | null {
    return this.retriever;
  }

  getEmbeddings(): EmbeddingsInterface | null {
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
      throw new Error('RAG 未启用：嵌入模型未初始化（Ollama）');
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
    try {
      this.embeddings = new OllamaEmbeddings({
        baseUrl: this.config.ollamaBaseUrl,
        model: this.config.ollamaEmbeddingModel,
      });
      this.logger.log(
        `Ollama 嵌入模型初始化成功: provider=${this.config.ragEmbeddingProvider}, model=${this.config.ollamaEmbeddingModel}, baseUrl=${this.config.ollamaBaseUrl}`,
      );
    } catch (e) {
      this.logger.warn(`Ollama 嵌入模型初始化失败: ${String(e)}`);
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

      this.logger.log(
        `复用已有 Chroma 集合: collection=${this.config.chromaCollectionName}, 文档数=${docCount}`,
      );

      this.retriever = vectorStore.asRetriever({ k: this.config.rerankTopK });
      this.logger.log('Chroma 向量库与 RAG 检索器初始化成功');
      return this.retriever;
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      this.logger.warn(`初始化 RAG 失败: ${msg}`);
      return null;
    }
  }
}

