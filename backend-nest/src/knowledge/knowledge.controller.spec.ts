import { Test, TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { KnowledgeController } from './knowledge.controller';
import { RagService } from '../rag/rag.service';
import { KnowledgeRepository } from './knowledge.repository';

describe('KnowledgeController', () => {
  let controller: KnowledgeController;
  let ragService: jest.Mocked<RagService>;
  let repo: jest.Mocked<KnowledgeRepository>;

  beforeEach(async () => {
    ragService = {
      addKnowledgeFromText: jest.fn().mockResolvedValue(10),
    } as any;

    repo = {
      recordUpload: jest.fn().mockResolvedValue(undefined),
      listRecent: jest.fn().mockResolvedValue([
        {
          id: 1,
          filename: 'a.md',
          tag: null,
          chunk_count: 5,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ]),
      stats: jest.fn().mockResolvedValue({
        total_files: 1,
        total_chunks: 5,
        last_uploaded_at: '2026-01-01T00:00:00.000Z',
      }),
      deleteByFilename: jest.fn().mockResolvedValue(1),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        { provide: RagService, useValue: ragService },
        { provide: KnowledgeRepository, useValue: repo },
      ],
    }).compile();

    controller = module.get<KnowledgeController>(KnowledgeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('uploadKnowledge should return error when file missing', async () => {
    const res = await controller.uploadKnowledge(undefined);
    expect(res).toEqual({ error: '请通过字段 file 上传文件' });
  });

  it('uploadKnowledge should reject unsupported extension', async () => {
    const file = {
      originalname: 'a.exe',
      buffer: Buffer.from('abc'),
    } as Express.Multer.File;

    const res = await controller.uploadKnowledge(file);
    expect(res).toEqual({
      error: '目前仅支持 .md、.txt、.pdf 和 .docx 文件',
    });
  });

  it('uploadKnowledge should call ragService for md file', async () => {
    const file = {
      originalname: 'a.md',
      buffer: Buffer.from('# hello'),
    } as Express.Multer.File;

    const res = await controller.uploadKnowledge(file);
    expect(ragService.addKnowledgeFromText).toHaveBeenCalledWith(
      '# hello',
      'a.md',
    );
    expect(repo.recordUpload).toHaveBeenCalledWith('a.md', 10);
    expect(res).toMatchObject({
      success: true,
      filename: 'a.md',
      chunks: 10,
    });
  });

  it('files() should return list from repository', async () => {
    const res = await controller.listFiles('10');
    expect(repo.listRecent).toHaveBeenCalledWith(10);
    expect(res.files).toHaveLength(1);
    expect(res.files[0].filename).toBe('a.md');
  });

  it('stats() should return stats from repository', async () => {
    const res = await controller.stats();
    expect(repo.stats).toHaveBeenCalled();
    expect(res.stats.total_files).toBe(1);
  });
});

