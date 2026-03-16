import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { KnowledgeController } from './knowledge.controller';
import { RagModule } from '../rag/rag.module';
import { KnowledgeRepository } from './knowledge.repository';

@Module({
  imports: [
    RagModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          // 默认为 10MB，可通过 MAX_UPLOAD_FILE_SIZE_MB 覆盖
          fileSize:
            (parseFloat(
              config.get<string>('MAX_UPLOAD_FILE_SIZE_MB') ?? '10',
            ) || 10) *
            1024 *
            1024,
        },
      }),
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeRepository],
  exports: [KnowledgeRepository],
})
export class KnowledgeModule {}

