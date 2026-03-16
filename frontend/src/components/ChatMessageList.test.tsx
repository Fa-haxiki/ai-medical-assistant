import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatMessageList } from './ChatMessageList';
import type { Message } from '../services/chatService';

test('ChatMessageList renders messages and loading bar for last message', () => {
  const messages: Message[] = [
    { role: 'user', content: '你好', timestamp: new Date().toISOString() },
    {
      role: 'assistant',
      content: '您好，有什么可以帮您？',
      timestamp: new Date().toISOString(),
    },
  ];

  const ref = { current: null } as React.RefObject<HTMLDivElement | null>;

  render(
    <ChatMessageList messages={messages} isLoading={true} messagesEndRef={ref} />,
  );

  expect(screen.getByText('你好')).toBeInTheDocument();
  // loading bar should appear for the last message
  const loadingBar = document.querySelector('.loading-bar');
  expect(loadingBar).not.toBeNull();
});

