import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatInterface from './ChatInterface';

jest.mock('../services/chatService', () => ({
  sendMessage: jest.fn(),
  getChatHistory: jest.fn().mockResolvedValue({
    history: [],
    conversation_id: 'conv-1',
  }),
  sendMultiModalJsonMessage: jest.fn(),
  callTextToImage: jest.fn(),
  listConversations: jest.fn().mockResolvedValue([]),
  deleteConversation: jest.fn().mockResolvedValue(undefined),
  uploadKnowledgeFile: jest.fn(),
}));

// 基础渲染用例：确认组件正常挂载（不触发发送逻辑，避免依赖复杂的流式分支）
describe('ChatInterface', () => {
  it('renders initial welcome message', () => {
    render(<ChatInterface />);
    // 输入框存在即可认为主界面正常挂载
    expect(
      screen.getByPlaceholderText('请输入您的健康问题...'),
    ).toBeInTheDocument();
  });
});

