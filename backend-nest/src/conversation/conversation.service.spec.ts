import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { AppConfigService } from '../config/config.service';
import { DatabaseService } from '../database/database.service';
import { ConversationRepository } from './conversation.repository';

describe('ConversationService', () => {
  let service: ConversationService;
  let config: jest.Mocked<AppConfigService>;
  let db: jest.Mocked<DatabaseService>;
  let repo: jest.Mocked<ConversationRepository>;

  beforeEach(async () => {
    config = {
      mysqlEnabled: false,
      conversationInactiveDays: 30,
      maxMessagesPerConversation: 200,
    } as any;

    db = {
      ensureSchema: jest.fn().mockResolvedValue(undefined),
    } as any;

    repo = {
      appendMessage: jest.fn().mockResolvedValue(undefined),
      getHistory: jest.fn().mockResolvedValue([]),
      listRecent: jest.fn().mockResolvedValue([]),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversationsOlderThan: jest
        .fn()
        .mockResolvedValue(0),
      updateTitleIfEmpty: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: AppConfigService, useValue: config },
        { provide: DatabaseService, useValue: db },
        { provide: ConversationRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('appendMessage should store in memory when mysql disabled', async () => {
    await service.appendMessage('conv-1', 'user', 'hello');
    const history = await service.getHistory('conv-1');
    expect(history).toHaveLength(1);
    expect(history[0].content).toBe('hello');
  });

  it('listConversations should derive titles from memory when mysql disabled', async () => {
    await service.appendMessage('conv-abc123', 'user', '第一次问诊内容');
    const list = await service.listConversations(10);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('conv-abc123');
    expect(list[0].title).toContain('第一次问诊内容'.slice(0, 10));
  });

  it('deleteConversation should remove from memory when mysql disabled', async () => {
    await service.appendMessage('conv-del', 'user', 'test');
    let history = await service.getHistory('conv-del');
    expect(history).toHaveLength(1);
    await service.deleteConversation('conv-del');
    history = await service.getHistory('conv-del');
    expect(history).toHaveLength(0);
  });

  it('appendMessage should delegate to repo when mysql enabled and set title on first user message', async () => {
    config.mysqlEnabled = true;
    await service.appendMessage('conv-mysql', 'user', '首条问题内容');
    expect(repo.appendMessage).toHaveBeenCalledWith(
      'conv-mysql',
      'user',
      '首条问题内容',
      undefined,
    );
    expect(repo.updateTitleIfEmpty).toHaveBeenCalled();
  });
});

