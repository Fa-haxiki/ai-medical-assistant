import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';
import { AppConfigService } from '../config/config.service';
import { Document } from '@langchain/core/documents';

jest.mock('@langchain/community/vectorstores/chroma', () => ({
  Chroma: {
    fromExistingCollection: jest.fn(),
  },
}));

jest.mock('@langchain/community/embeddings/alibaba_tongyi', () => ({
  AlibabaTongyiEmbeddings: jest.fn().mockImplementation(() => ({})),
}));

const { Chroma } = jest.requireMock(
  '@langchain/community/vectorstores/chroma',
) as { Chroma: { fromExistingCollection: jest.Mock } };

describe('RagService', () => {
  let service: RagService;
  let config: jest.Mocked<AppConfigService>;

  beforeEach(async () => {
    config = {
      dashscopeApiKey: 'test-key',
      chromaUrl: 'http://localhost:8010',
      chromaCollectionName: 'test-collection',
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: AppConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('formatDocs should join contents with blank line', () => {
    const docs = [
      new Document({ pageContent: 'a' }),
      new Document({ pageContent: 'b' }),
    ];
    const s = service.formatDocs(docs);
    expect(s).toBe('a\n\nb');
  });

  it('formatDocs should return empty string when docs empty', () => {
    expect(service.formatDocs([])).toBe('');
  });

  it('addKnowledgeFromText should throw when embeddings not initialized', async () => {
    // @ts-expect-error private access for test
    service['embeddings'] = null;
    await expect(
      service.addKnowledgeFromText('abc', 'test.txt'),
    ).rejects.toThrow('RAG 未启用');
  });

  it('addKnowledgeFromText should throw when text is empty', async () => {
    // @ts-expect-error private access for test
    service['embeddings'] = {} as any;
    (config as any).chromaUrl = 'http://localhost:8010';

    await expect(
      service.addKnowledgeFromText('', 'empty.txt'),
    ).rejects.toThrow('上传文件内容为空或无法切分为有效片段');
  });

  it('addKnowledgeFromText should call Chroma.fromExistingCollection when ok', async () => {
    // @ts-expect-error private access for test
    service['embeddings'] = {} as any;
    (config as any).chromaUrl = 'http://localhost:8010';

    const addDocuments = jest.fn().mockResolvedValue(undefined);
    Chroma.fromExistingCollection.mockResolvedValue({
      addDocuments,
    });

    const count = await service.addKnowledgeFromText('有效内容', 'file.md');
    expect(Chroma.fromExistingCollection).toHaveBeenCalled();
    expect(addDocuments).toHaveBeenCalled();
    expect(count).toBeGreaterThan(0);
  });
});

