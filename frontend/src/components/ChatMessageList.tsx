import React from 'react';
import type { Message } from '../services/chatService';
import { MarkdownContent } from './MarkdownContent';
import './ChatInterface.css';

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList = React.memo(function ChatMessageList({
  messages,
  isLoading,
  messagesEndRef,
}: ChatMessageListProps) {
  return (
    <>
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1;
        return (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-bubble">
              {message.image_url && (
                <div className="message-image-container">
                  <img
                    src={message.image_url}
                    alt="用户上传的图片"
                    className="message-image"
                    onClick={() => window.open(message.image_url, '_blank')}
                  />
                </div>
              )}
              {message.role === 'assistant' ? (
                <MarkdownContent content={message.content ?? ''} />
              ) : (
                message.content
              )}
            </div>
            <div className="message-info">
              {message.role === 'user'
                ? '您'
                : message.role === 'system'
                ? '系统消息'
                : 'AI医疗助手'}
              ·
              {new Date(message.timestamp || '').toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {isLoading && isLast && (
                <div className="loading-bar" aria-hidden="true" />
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </>
  );
});

