import { KnowledgeIngestService } from './knowledge-ingest.service';
import { RagService } from '../rag/rag.service';
import { KnowledgeRepository } from './knowledge.repository';
import { AppConfigService } from '../config/config.service';

describe('KnowledgeIngestService', () => {
  let service: KnowledgeIngestService;
  let rag: jest.Mocked<RagService>;
  let repo: jest.Mocked<KnowledgeRepository>;
  let config: jest.Mocked<AppConfigService>;

  beforeEach(() => {
    rag = {
      addKnowledgeFromText: jest.fn().mockResolvedValue(3),
    } as any;
    repo = {
      existsByFilename: jest.fn().mockResolvedValue(false),
      recordUpload: jest.fn().mockResolvedValue(undefined),
    } as any;
    config = {
      mysqlEnabled: true,
    } as any;
    service = new KnowledgeIngestService(rag, repo, config);
  });

  it('should reject when filename already exists in knowledge_files', async () => {
    repo.existsByFilename.mockResolvedValueOnce(true);
    await expect(
      service.ingestBuffer(Buffer.from('# x'), 'dup.md'),
    ).rejects.toThrow('文档库中已存在同名文件');
    expect(rag.addKnowledgeFromText).not.toHaveBeenCalled();
  });

  it('should skip duplicate check when MySQL disabled', async () => {
    (config as any).mysqlEnabled = false;
    await service.ingestBuffer(Buffer.from('# hello'), 'new.md');
    expect(repo.existsByFilename).not.toHaveBeenCalled();
    expect(rag.addKnowledgeFromText).toHaveBeenCalled();
  });

  it('should ingest when name is new', async () => {
    await service.ingestBuffer(Buffer.from('# hello'), 'new.md');
    expect(repo.existsByFilename).toHaveBeenCalledWith('new.md');
    expect(rag.addKnowledgeFromText).toHaveBeenCalled();
  });
});
