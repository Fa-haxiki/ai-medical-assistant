import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import path from 'node:path';
import { RagService } from '../rag/rag.service';

// mammoth 为 CommonJS，用 require 加载
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const mammoth: any = require('mammoth');

@Controller('api/knowledge')
export class KnowledgeController {
  constructor(private readonly ragService: RagService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadKnowledge(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      return { error: '请通过字段 file 上传文件' };
    }

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
      file.originalname,
    );
    return {
      success: true,
      filename: file.originalname,
      chunks,
      message: `文件已成功写入向量库，共 ${chunks} 个片段`,
    };
  }
}

