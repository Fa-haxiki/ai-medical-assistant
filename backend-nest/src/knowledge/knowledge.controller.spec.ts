import { Test, TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeRepository } from './knowledge.repository';
import { KnowledgeIngestService } from './knowledge-ingest.service';
import { KnowledgeBatchService } from './knowledge-batch.service';

describe('KnowledgeController', () => {
  let controller: KnowledgeController;
  let repo: jest.Mocked<KnowledgeRepository>;
  let ingestService: jest.Mocked<KnowledgeIngestService>;
  let batchService: jest.Mocked<KnowledgeBatchService>;

  beforeEach(async () => {
    repo = {
      existsByFilename: jest.fn().mockResolvedValue(false),
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
    ingestService = {
      ingestBuffer: jest.fn().mockResolvedValue({
        success: true,
        filename: 'a.md',
        chunks: 10,
        message: 'ok',
      }),
    } as any;
    batchService = {
      createZipIngestJob: jest.fn().mockReturnValue({
        jobId: 'job_1',
        status: 'queued',
      }),
      getJob: jest.fn().mockReturnValue({
        jobId: 'job_1',
        status: 'done',
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        { provide: KnowledgeRepository, useValue: repo },
        { provide: KnowledgeIngestService, useValue: ingestService },
        { provide: KnowledgeBatchService, useValue: batchService },
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
    ingestService.ingestBuffer.mockRejectedValueOnce(
      new Error('目前仅支持 .md、.txt、.pdf 和 .docx 文件'),
    );
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
    expect(ingestService.ingestBuffer).toHaveBeenCalledWith(
      Buffer.from('# hello'),
      'a.md',
    );
    expect(res).toMatchObject({
      success: true,
      filename: 'a.md',
      chunks: 10,
    });
  });

  it('uploadZipKnowledge should create async job', async () => {
    const file = {
      originalname: 'batch.zip',
      buffer: Buffer.from('zip-content'),
    } as Express.Multer.File;
    const res = await controller.uploadZipKnowledge(file);
    expect(batchService.createZipIngestJob).toHaveBeenCalled();
    expect(res).toEqual({ success: true, jobId: 'job_1', status: 'queued' });
  });

  it('getUploadJob should return not found when missing', async () => {
    batchService.getJob.mockReturnValueOnce(null as any);
    const res = await controller.getUploadJob('missing');
    expect(res).toEqual({ error: '任务不存在' });
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

