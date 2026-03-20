import { Injectable } from '@nestjs/common';
import path from 'node:path';
import { RagService } from '../rag/rag.service';
import { KnowledgeRepository } from './knowledge.repository';

// mammoth 为 CommonJS，用 require 加载
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const mammoth: any = require('mammoth');

export type KnowledgeIngestResult = {
  success: boolean;
  filename: string;
  chunks: number;
  message: string;
};

@Injectable()
export class KnowledgeIngestService {
  constructor(
    private readonly ragService: RagService,
    private readonly knowledgeRepo: KnowledgeRepository,
  ) {}

  async ingestBuffer(
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<KnowledgeIngestResult> {
    const normalizedName = this.normalizeFilename(originalName);
    const ext = path.extname(normalizedName).toLowerCase();
    const raw = await this.extractText(ext, fileBuffer);

    if (!raw.trim()) {
      throw new Error('文件内容为空或无法解析为文本');
    }

    const chunks = await this.ragService.addKnowledgeFromText(raw, normalizedName);
    try {
      await this.knowledgeRepo.recordUpload(normalizedName, chunks);
    } catch {
      // ignore metadata error
    }

    return {
      success: true,
      filename: normalizedName,
      chunks,
      message: `文件已成功写入向量库，共 ${chunks} 个片段`,
    };
  }

  private normalizeFilename(originalName: string): string {
    let normalizedName = originalName ?? '';
    try {
      const converted = Buffer.from(originalName, 'latin1').toString('utf8');
      if (/[\u4e00-\u9fa5]/.test(converted)) {
        normalizedName = converted;
      }
    } catch {
      // ignore convert errors
    }
    return normalizedName;
  }

  private async extractText(ext: string, fileBuffer: Buffer): Promise<string> {
    if (['.md', '.txt'].includes(ext)) {
      return fileBuffer.toString('utf-8');
    }

    if (ext === '.pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: fileBuffer });
      const result = await parser.getText();
      await parser.destroy();
      return result?.text ?? '';
    }

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value ?? '';
    }

    throw new Error('目前仅支持 .md、.txt、.pdf 和 .docx 文件');
  }
}
