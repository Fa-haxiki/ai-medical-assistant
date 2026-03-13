import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AppConfigService } from '../config/config.service';
import type { StoredMessage } from './conversation.service';

@Injectable()
export class ConversationRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: AppConfigService,
  ) {}

  async ensureConversation(conversationId: string): Promise<void> {
    const pool = this.db.getPool();
    if (!pool) return;
    await pool.execute(
      `INSERT INTO conversations (id, created_at, updated_at)
       VALUES (?, NOW(6), NOW(6))
       ON DUPLICATE KEY UPDATE updated_at = NOW(6)`,
      [conversationId],
    );
  }

  async appendMessage(
    conversationId: string,
    role: string,
    content: string,
    image_url?: string,
  ): Promise<void> {
    const pool = this.db.getPool();
    if (!pool) return;
    await this.ensureConversation(conversationId);
    await pool.execute(
      `INSERT INTO messages (conversation_id, role, content, timestamp, image_url)
       VALUES (?, ?, ?, NOW(6), ?)`,
      [conversationId, role, content, image_url ?? null],
    );
    await this.trimMessages(conversationId);
  }

  private async trimMessages(conversationId: string): Promise<void> {
    const max = this.config.maxMessagesPerConversation || 200;
    const pool = this.db.getPool();
    if (!pool) return;
    const sql = `DELETE FROM messages
       WHERE conversation_id = ?
         AND id NOT IN (
           SELECT id FROM (
             SELECT id FROM messages
             WHERE conversation_id = ?
             ORDER BY timestamp DESC
             LIMIT ${max}
           ) t
         )`;
    await pool.execute(sql, [conversationId, conversationId]);
  }

  async getHistory(conversationId: string): Promise<StoredMessage[]> {
    const rows = await this.db.query<{
      role: string;
      content: string;
      timestamp: Date;
      image_url: string | null;
    }>(
      `SELECT role, content, timestamp, image_url
       FROM messages
       WHERE conversation_id = ?
       ORDER BY timestamp ASC`,
      [conversationId],
    );
    return rows.map((r) => ({
      role: r.role,
      content: r.content,
      timestamp: new Date(r.timestamp).toISOString(),
      ...(r.image_url && { image_url: r.image_url }),
    }));
  }

  async deleteConversationsOlderThan(cutoff: Date): Promise<number> {
    const pool = this.db.getPool();
    if (!pool) return 0;
    const [header] = await pool.execute('DELETE FROM conversations WHERE updated_at < ?', [
      cutoff,
    ]);
    const result = header as { affectedRows?: number };
    return result?.affectedRows ?? 0;
  }
}
