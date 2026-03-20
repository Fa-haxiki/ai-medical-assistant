import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { AppConfigService } from '../config/config.service';
import { RagService } from '../rag/rag.service';
import { RerankService } from '../rag/rerank.service';

describe('ChatService', () => {
  let service: ChatService;
  const ragMock = {
    getRetriever: jest.fn().mockReturnValue(null),
    formatDocs: jest.fn(),
  };

  beforeEach(async () => {
    ragMock.getRetriever.mockReset();
    ragMock.getRetriever.mockReturnValue(null);
    ragMock.formatDocs.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: AppConfigService,
          useValue: {
            dashscopeApiKey: 'test-key',
            chromaCollectionName: 'test-collection',
            ragContextMaxChars: 7000,
            chatModelName: 'qwen-turbo',
            chatFallbackWithHistoryTemplate:
              '根据我的记忆，您之前问了关于"{summary}"的问题。\n\n很抱歉，我目前遇到了一些技术问题，无法提供完整的回答。请稍后再试，或者重新表述您的问题，我会尽力帮助您。',
            chatFallbackGeneralTemplate:
              '很抱歉，我目前遇到了一些技术问题，无法处理您的请求。这可能是由于以下原因：\n\n1. 服务器负载过高\n2. API调用限制\n3. 网络连接问题\n\n请稍后再试，或者重新表述您的问题，我会尽力帮助您。如果问题持续存在，请联系技术支持。\n感谢您的理解。',
          },
        },
        {
          provide: RagService,
          useValue: ragMock,
        },
        {
          provide: RerankService,
          useValue: {
            rerank: jest.fn(async (_q: string, docs: unknown[]) => docs),
          },
        },
      ],
    })
      // ChatService 内部使用了私有的 createChatModel，这里在编译后用 any 方式替换为简单的 mock
      .compile();

    service = module.get<ChatService>(ChatService);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).createChatModel = () => ({
      invoke: jest.fn().mockResolvedValue({ content: 'mock response' }),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('smartAnswer should fall back to pure model answer when RAG is disabled', async () => {
    const answer = await service.smartAnswer('测试问题', []);
    expect(answer).toBe('mock response');
  });

  it('smartAnswer should fall back to pure model answer when retriever returns empty docs', async () => {
    ragMock.getRetriever.mockReturnValue({
      invoke: jest.fn().mockResolvedValue([]),
    });
    const answer = await service.smartAnswer('测试问题', []);
    expect(answer).toBe('mock response');
  });
});

