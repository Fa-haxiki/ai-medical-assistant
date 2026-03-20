import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { AppConfigService } from '../config/config.service';
import { KnowledgeIngestService } from './knowledge-ingest.service';

export type ZipIngestStatus = 'queued' | 'processing' | 'done' | 'failed';

export type ZipIngestResultItem = {
  filename: string;
  status: 'success' | 'failed';
  chunks: number;
  error?: string;
};

export type ZipIngestJob = {
  jobId: string;
  status: ZipIngestStatus;
  zipFilename: string;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  totalChunks: number;
  results: ZipIngestResultItem[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class KnowledgeBatchService {
  private readonly logger = new Logger(KnowledgeBatchService.name);
  private readonly jobs = new Map<string, ZipIngestJob>();

  constructor(
    private readonly ingestService: KnowledgeIngestService,
    private readonly config: AppConfigService,
  ) {}

  createZipIngestJob(zipBuffer: Buffer, zipFilename: string): ZipIngestJob {
    const normalizedZipName = zipFilename || 'knowledge.zip';
    if (!normalizedZipName.toLowerCase().endsWith('.zip')) {
      throw new Error('仅支持 .zip 压缩文件');
    }

    const now = new Date().toISOString();
    const jobId = this.generateJobId();
    const job: ZipIngestJob = {
      jobId,
      status: 'queued',
      zipFilename: normalizedZipName,
      totalFiles: 0,
      successCount: 0,
      failedCount: 0,
      totalChunks: 0,
      results: [],
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(jobId, job);

    setTimeout(() => {
      void this.processZipJob(jobId, zipBuffer);
    }, 0);

    return job;
  }

  getJob(jobId: string): ZipIngestJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  private async processZipJob(jobId: string, zipBuffer: Buffer): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'processing';
    job.updatedAt = new Date().toISOString();

    const startedAt = Date.now();
    try {
      const zip = new AdmZip(zipBuffer);
      const entries = zip
        .getEntries()
        .filter((e) => !e.isDirectory)
        .filter((e) => e.entryName.toLowerCase().endsWith('.pdf'))
        .filter((e) => !this.isUnsafeEntryName(e.entryName))
        // macOS 打包常见：AppleDouble 资源分叉（._文件名）与 __MACOSX 目录，非真实 PDF
        .filter((e) => !this.isMacOsJunkPdfEntry(e.entryName));

      if (!entries.length) {
        throw new Error('压缩包中未找到可处理的 PDF 文件');
      }

      if (entries.length > this.config.maxZipFileCount) {
        throw new Error(
          `压缩包内 PDF 数量超限（${entries.length} > ${this.config.maxZipFileCount}）`,
        );
      }

      const totalUncompressed = entries.reduce(
        (sum, e) => sum + e.header.size,
        0,
      );
      if (totalUncompressed > this.config.maxZipUncompressedBytes) {
        throw new Error('压缩包解压后总大小超限');
      }

      job.totalFiles = entries.length;

      for (const entry of entries) {
        if (Date.now() - startedAt > this.config.zipJobTimeoutMs) {
          throw new Error('批量任务处理超时');
        }

        const fileName = entry.entryName.split('/').pop() || entry.entryName;
        try {
          const out = await this.ingestService.ingestBuffer(entry.getData(), fileName);
          job.successCount += 1;
          job.totalChunks += out.chunks;
          job.results.push({
            filename: out.filename,
            status: 'success',
            chunks: out.chunks,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          job.failedCount += 1;
          job.results.push({
            filename: fileName,
            status: 'failed',
            chunks: 0,
            error: msg,
          });
        }
        job.updatedAt = new Date().toISOString();
      }

      job.status = 'done';
      this.logger.log(
        `ZIP 入库任务完成: jobId=${job.jobId}, success=${job.successCount}, failed=${job.failedCount}, chunks=${job.totalChunks}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      job.status = 'failed';
      job.error = msg;
      job.updatedAt = new Date().toISOString();
      this.logger.warn(`ZIP 入库任务失败: jobId=${job.jobId}, error=${msg}`);
    }
  }

  private isUnsafeEntryName(name: string): boolean {
    return name.includes('..') || name.startsWith('/') || name.startsWith('\\');
  }

  /** 跳过 Finder/zip 在 macOS 上产生的元数据条目，避免 pdf-parse 报 Invalid PDF structure */
  private isMacOsJunkPdfEntry(entryName: string): boolean {
    const norm = entryName.replace(/\\/g, '/');
    if (norm.includes('__MACOSX/')) return true;
    const base = norm.split('/').pop() ?? '';
    return base.startsWith('._');
  }

  private generateJobId(): string {
    return `zip_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }
}
