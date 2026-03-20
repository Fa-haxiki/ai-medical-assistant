import type { Request } from 'express';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationService } from '../conversation/conversation.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: jest.Mocked<ChatService>;
  let conversationService: jest.Mocked<ConversationService>;

  beforeEach(() => {
    chatService = {
      smartAnswer: jest.fn().mockResolvedValue('answer from model'),
    } as any;

    conversationService = {
      getHistory: jest.fn().mockResolvedValue([]),
      appendMessage: jest.fn().mockResolvedValue(undefined),
    } as any;

    controller = new ChatController(
      chatService as any,
      conversationService as any,
      { chatFallbackGeneralTemplate: 'fallback' } as any,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('chat() should call ChatService.smartAnswer and append messages', async () => {
    const req = {
      query: {},
      headers: {},
    } as unknown as Request;

    const body = {
      message: '你好',
      chat_history: [],
    };

    const result = await controller.chat(body, req);

    expect(chatService.smartAnswer).toHaveBeenCalledWith('你好', []);
    expect(conversationService.appendMessage).toHaveBeenCalledTimes(2);
    expect(result).toHaveProperty('response', 'answer from model');
    expect(result).toHaveProperty('conversation_id');
  });
});

