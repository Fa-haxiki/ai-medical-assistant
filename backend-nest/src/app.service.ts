import { Injectable } from '@nestjs/common';
import { RagService } from './rag/rag.service';

@Injectable()
export class AppService {
  constructor(private readonly ragService: RagService) {}

  getStatus() {
    const hasRag = this.ragService.isRagEnabled();
    return {
      status: 'ok',
      message: 'AI医疗助手系统正在运行',
      version: '1.0.0',
      rag_status: hasRag ? 'enabled' : 'disabled',
      timestamp: new Date().toISOString(),
    };
  }
}
