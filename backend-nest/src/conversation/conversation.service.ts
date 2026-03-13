import { Injectable } from '@nestjs/common';

export interface StoredMessage {
  role: string;
  content: string;
  timestamp: string;
  image_url?: string;
}

interface Conversation {
  messages: StoredMessage[];
}

@Injectable()
export class ConversationService {
  private readonly store: Record<string, Conversation> = {};

  getOrCreateConversation(conversationId: string): Conversation {
    if (!this.store[conversationId]) {
      this.store[conversationId] = { messages: [] };
    }
    return this.store[conversationId];
  }

  appendMessage(
    conversationId: string,
    role: string,
    content: string,
    image_url?: string,
  ): void {
    const conv = this.getOrCreateConversation(conversationId);
    conv.messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      ...(image_url && { image_url }),
    });
  }

  getHistory(conversationId: string): StoredMessage[] {
    const conv = this.store[conversationId];
    return conv ? conv.messages : [];
  }
}

