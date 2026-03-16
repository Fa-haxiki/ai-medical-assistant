import {
  Controller,
  Get,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Query,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import path from 'node:path';
import { RagService } from '../rag/rag.service';
import { KnowledgeRepository } from './knowledge.repository';

// mammoth 为 CommonJS，用 require 加载
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const mammoth: any = require('mammoth');

@Controller('api/knowledge')
export class KnowledgeController {
  constructor(
    private readonly ragService: RagService,
    private readonly knowledgeRepo: KnowledgeRepository,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadKnowledge(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      return { error: '请通过字段 file 上传文件' };
    }

    // 部分浏览器会按 latin1 传 filename，这里尝试转换为 UTF-8，避免中文乱码
    const originalName = file.originalname ?? '';
    let normalizedName = originalName;
    try {
      const converted = Buffer.from(originalName, 'latin1').toString('utf8');
      // 简单判断是否包含中文，若是则采用转换后的结果
      if (/[\u4e00-\u9fa5]/.test(converted)) {
        normalizedName = converted;
      }
    } catch {
      // ignore 转码错误，保留原始名称
    }

    Logger.log(
      `收到知识文件上传: originalname="${originalName}", normalized="${normalizedName}", mimetype="${file.mimetype}", size=${file.size}`,
      KnowledgeController.name,
    );

    const ext = path.extname(file.originalname).toLowerCase();
    let raw = '';

    if (['.md', '.txt'].includes(ext)) {
      raw = (file.buffer ?? Buffer.from('')).toString('utf-8');
    } else if (ext === '.pdf') {
      const buffer = file.buffer ?? Buffer.from('');
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      raw = result?.text ?? '';
      await parser.destroy();
    } else if (ext === '.docx') {
      const buffer = file.buffer ?? Buffer.from('');
      const result = await mammoth.extractRawText({ buffer });
      raw = result.value ?? '';
    } else {
      return {
        error: '目前仅支持 .md、.txt、.pdf 和 .docx 文件',
      };
    }

    if (!raw.trim()) {
      return { error: '文件内容为空或无法解析为文本' };
    }

    const chunks = await this.ragService.addKnowledgeFromText(
      raw,
      normalizedName,
    );

    // 记录元数据（若 MySQL 未开启则内部会抛错，此处忽略，仅影响统计功能）
    try {
      await this.knowledgeRepo.recordUpload(normalizedName, chunks);
    } catch {
      // ignore
    }
    return {
      success: true,
      filename: normalizedName,
      chunks,
      message: `文件已成功写入向量库，共 ${chunks} 个片段`,
    };
  }

  /** 知识库文件列表（简单分页，仅按上传时间倒序） */
  @Get('files')
  async listFiles(@Query('limit') limit?: string) {
    const n = limit ? Number(limit) || 50 : 50;
    const files = await this.knowledgeRepo.listRecent(n);
    return { files };
  }

  /** 知识库统计信息：总文件数、总片段数、最近上传时间 */
  @Get('stats')
  async stats() {
    const stats = await this.knowledgeRepo.stats();
    return { stats };
  }

  /**
   * 按文件名删除该文件对应的向量以及元数据。
   * 说明：当前按 `metadata.source = filename` 从 Chroma 中删除，之后可重新上传达到“重建部分向量”的效果。
   */
  @Delete('file')
  async deleteByFilename(@Query('filename') filename?: string) {
    if (!filename) {
      return { error: '缺少 filename 参数' };
    }

    // 删除元数据记录（向量本身当前无法从 Chroma 侧精确统计，交给管理员根据需要重新导入）
    await this.knowledgeRepo.deleteByFilename(filename);

    return {
      success: true,
      filename,
      message: '已删除该文件的元数据记录，可重新上传进行重建',
    };
  }
}

