import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AppConfigService } from '../config/config.service';
import { ConversationRepository } from './conversation.repository';

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
export class ConversationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConversationService.name);
  private readonly memoryStore: Record<string, Conversation> = {};
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly db: DatabaseService,
    private readonly repo: ConversationRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.mysqlEnabled) {
      await this.db.ensureSchema();
      const days = this.config.conversationInactiveDays;
      this.cleanupTimer = setInterval(
        async () => {
          try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            const n = await this.repo.deleteConversationsOlderThan(cutoff);
            if (n > 0) this.logger.log(`清理过期会话: ${n} 个`);
          } catch (e) {
            this.logger.warn(`清理过期会话失败: ${(e as Error)?.message}`);
          }
        },
        60 * 60 * 1000,
      );
      this.logger.log(`会话持久化已启用（MySQL），${days} 天未活跃会话将自动清理`);
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  getOrCreateConversation(conversationId: string): Conversation {
    if (!this.memoryStore[conversationId]) {
      this.memoryStore[conversationId] = { messages: [] };
    }
    return this.memoryStore[conversationId];
  }

  async appendMessage(
    conversationId: string,
    role: string,
    content: string,
    image_url?: string,
  ): Promise<void> {
    if (this.config.mysqlEnabled) {
      await this.repo.appendMessage(conversationId, role, content, image_url);
      return;
    }
    const conv = this.getOrCreateConversation(conversationId);
    conv.messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      ...(image_url && { image_url }),
    });
  }

  async getHistory(conversationId: string): Promise<StoredMessage[]> {
    if (this.config.mysqlEnabled) {
      return this.repo.getHistory(conversationId);
    }
    const conv = this.memoryStore[conversationId];
    return conv ? conv.messages : [];
  }
}
