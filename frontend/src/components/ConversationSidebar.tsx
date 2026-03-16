import React from 'react';
import type { ConversationSummary } from '../services/chatService';
import './ChatInterface.css';

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  currentConversationId?: string;
  isLoading: boolean;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => Promise<void> | void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  currentConversationId,
  isLoading,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}) => {
  return (
    <aside className="conversation-sidebar">
      <button
        className="new-conversation-link"
        onClick={onNewConversation}
        disabled={isLoading}
      >
        ＋ 新建会话
      </button>
      <div className="conversation-list-vertical">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`conversation-chip-row${
              conv.id === currentConversationId ? ' active' : ''
            }`}
          >
            <button
              className="conversation-chip"
              onClick={() => onSelectConversation(conv.id)}
              disabled={isLoading}
              title={conv.id}
            >
              <div className="conversation-chip-title">
                {conv.title ||
                  (conv.id.length > 10 ? conv.id.slice(-10) : conv.id)}
              </div>
              <div className="conversation-chip-time">
                {new Date(conv.updated_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div
                className="conversation-chip-delete"
                title="删除会话"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (
                    !window.confirm(
                      '确定要删除该会话吗？此操作不可恢复。',
                    )
                  )
                    return;
                  await onDeleteConversation(conv.id);
                }}
              >
                ×
              </div>
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
};

