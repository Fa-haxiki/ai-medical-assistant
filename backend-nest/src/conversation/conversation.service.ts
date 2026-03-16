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
      if (role === 'user') {
        const short =
          content.trim().replace(/\s+/g, ' ').slice(0, 10) || '新问题';
        const suffix =
          conversationId.length > 6
            ? conversationId.slice(-6)
            : conversationId || '';
        const title = `${short}|${suffix}`;
        await this.repo.updateTitleIfEmpty(conversationId, title);
      }
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

  async listConversations(limit = 20): Promise<
    { id: string; title: string; updated_at: string }[]
  > {
    if (this.config.mysqlEnabled) {
      const rows = await this.repo.listRecent(limit);
      return rows.map((r) => ({
        id: r.id,
        title: (r as any).title || '',
        updated_at: new Date(r.updated_at).toISOString(),
      }));
    }
    const entries = Object.entries(this.memoryStore).map(([id, conv]) => {
      const last =
        conv.messages[conv.messages.length - 1]?.timestamp ??
        new Date(0).toISOString();
      const firstUser = conv.messages.find((m) => m.role === 'user');
      const short =
        firstUser?.content?.trim().replace(/\s+/g, ' ').slice(0, 10) ||
        '对话';
      const suffix = id.length > 6 ? id.slice(-6) : id;
      const title = `${short}|${suffix}`;
      return { id, title, updated_at: last };
    });
    return entries
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, limit);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    if (this.config.mysqlEnabled) {
      await this.repo.deleteConversation(conversationId);
      return;
    }
    delete this.memoryStore[conversationId];
  }
}
