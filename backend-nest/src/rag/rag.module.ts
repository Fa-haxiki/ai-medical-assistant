import { Module } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { RagService } from './rag.service';

@Module({
  providers: [RagService, AppConfigService],
  exports: [RagService],
})
export class RagModule {}

