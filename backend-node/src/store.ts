export interface StoredMessage {
  role: string;
  content: string;
  timestamp: string;
  image_url?: string;
}

const conversationStore: Record<string, { messages: StoredMessage[] }> = {};

export function getOrCreateConversation(conversationId: string): { messages: StoredMessage[] } {
  if (!conversationStore[conversationId]) {
    conversationStore[conversationId] = { messages: [] };
  }
  return conversationStore[conversationId];
}

export function appendMessage(
  conversationId: string,
  role: string,
  content: string,
  image_url?: string
): void {
  const conv = getOrCreateConversation(conversationId);
  conv.messages.push({
    role,
    content,
    timestamp: new Date().toISOString(),
    ...(image_url && { image_url }),
  });
}

export function getHistory(conversationId: string): StoredMessage[] {
  const conv = conversationStore[conversationId];
  return conv ? conv.messages : [];
}
