import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { AppConfigService } from '../config/config.service';
import { RagService } from '../rag/rag.service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: AppConfigService,
          useValue: {
            dashscopeApiKey: 'test-key',
            chromaCollectionName: 'test-collection',
          },
        },
        {
          provide: RagService,
          useValue: {
            getRetriever: jest.fn().mockReturnValue(null),
            formatDocs: jest.fn(),
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

  it('getFallbackResponse should mention history when question refers to previous messages', () => {
    const question = '你刚才说的那个用药方案是啥？';
    const history = [
      { role: 'user', content: '我有高血压，怎么用药更安全？' },
      { role: 'assistant', content: '这里是关于高血压用药的一些建议。' },
    ];

    const result = service.getFallbackResponse(question, history);
    expect(result).toContain('根据我的记忆');
    expect(result).toContain('我有高血压，怎么用药更安全？');
  });

  it('smartAnswer should fall back to pure model answer when RAG is disabled', async () => {
    const answer = await service.smartAnswer('测试问题', []);
    expect(answer).toBe('mock response');
  });
});

