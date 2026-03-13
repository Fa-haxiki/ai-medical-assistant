import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [KnowledgeController],
})
export class KnowledgeModule {}

