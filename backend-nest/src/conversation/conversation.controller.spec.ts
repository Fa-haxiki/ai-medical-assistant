import type { Request } from 'express';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';

describe('ConversationController', () => {
  let controller: ConversationController;
  let service: jest.Mocked<ConversationService>;

  beforeEach(() => {
    service = {
      getHistory: jest.fn().mockResolvedValue([
        { role: 'user', content: 'hi', timestamp: new Date().toISOString() },
      ]),
      listConversations: jest.fn().mockResolvedValue([
        { id: 'conv-1', title: '对话1', updated_at: new Date().toISOString() },
      ]),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
    } as any;

    controller = new ConversationController(service as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getHistory should call service and wrap response', async () => {
    const res = await controller.getHistory('conv-1');
    expect(service.getHistory).toHaveBeenCalledWith('conv-1');
    expect(res.conversation_id).toBe('conv-1');
    expect(res.history).toHaveLength(1);
  });

  it('listConversations should pass parsed limit to service', async () => {
    const res = await controller.listConversations('5');
    expect(service.listConversations).toHaveBeenCalledWith(5);
    expect(res.conversations).toHaveLength(1);
  });

  it('deleteConversation should delegate to service', async () => {
    const res = await controller.deleteConversation('conv-del');
    expect(service.deleteConversation).toHaveBeenCalledWith('conv-del');
    expect(res).toEqual({ success: true, conversation_id: 'conv-del' });
  });
});

