import { Module } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { RagService } from './rag.service';
import { RerankService } from './rerank.service';

@Module({
  providers: [RagService, RerankService, AppConfigService],
  exports: [RagService, RerankService],
})
export class RagModule {}

