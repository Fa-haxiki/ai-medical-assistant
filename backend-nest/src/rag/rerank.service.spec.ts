import { Document } from '@langchain/core/documents';
import { RerankService } from './rerank.service';
import { AppConfigService } from '../config/config.service';

describe('RerankService', () => {
  let service: RerankService;

  const config = {
    rerankEnabled: true,
    dashscopeApiKey: 'test-key',
    rerankProvider: 'dashscope',
    rerankModel: 'qwen3-vl-rerank',
    rerankTopN: 2,
    rerankTimeoutMs: 1200,
  } as AppConfigService;

  beforeEach(() => {
    service = new RerankService(config);
    jest.restoreAllMocks();
  });

  it('should return reranked docs when API success', async () => {
    const docs = [
      new Document({ pageContent: 'doc-0' }),
      new Document({ pageContent: 'doc-1' }),
      new Document({ pageContent: 'doc-2' }),
    ];
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        output: {
          results: [
            { index: 2, relevance_score: 0.9 },
            { index: 1, relevance_score: 0.8 },
          ],
        },
      }),
    } as Response);

    const out = await service.rerank('q', docs);
    expect(out.map((d) => d.pageContent)).toEqual(['doc-2', 'doc-1']);
  });

  it('should fallback to vector topN when API failed', async () => {
    const docs = [
      new Document({ pageContent: 'doc-0' }),
      new Document({ pageContent: 'doc-1' }),
      new Document({ pageContent: 'doc-2' }),
    ];
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'failed',
    } as Response);

    const out = await service.rerank('q', docs);
    expect(out.map((d) => d.pageContent)).toEqual(['doc-0', 'doc-1']);
  });

  it('should fallback to vector topN on exception', async () => {
    const docs = [
      new Document({ pageContent: 'doc-0' }),
      new Document({ pageContent: 'doc-1' }),
      new Document({ pageContent: 'doc-2' }),
    ];
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));

    const out = await service.rerank('q', docs);
    expect(out.map((d) => d.pageContent)).toEqual(['doc-0', 'doc-1']);
  });
});
