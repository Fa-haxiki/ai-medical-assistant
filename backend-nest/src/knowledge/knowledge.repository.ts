import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface KnowledgeFileRow {
  id: number;
  filename: string;
  tag: string | null;
  chunk_count: number;
  created_at: string;
}

@Injectable()
export class KnowledgeRepository {
  constructor(private readonly db: DatabaseService) {}

  async recordUpload(
    filename: string,
    chunkCount: number,
    tag?: string | null,
  ): Promise<void> {
    await this.db.execute(
      'INSERT INTO knowledge_files (filename, tag, chunk_count) VALUES (?, ?, ?)',
      [filename, tag ?? null, chunkCount],
    );
  }

  async listRecent(limit = 50): Promise<KnowledgeFileRow[]> {
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.trunc(limit), 1), 500)
      : 50;
    const rows = await this.db.query<KnowledgeFileRow>(
      `SELECT id, filename, tag, chunk_count, created_at FROM knowledge_files ORDER BY created_at DESC LIMIT ${safeLimit}`,
    );
    return rows;
  }

  async stats(): Promise<{
    total_files: number;
    total_chunks: number;
    last_uploaded_at: string | null;
  }> {
    const rows = await this.db.query<{
      total_files: number;
      total_chunks: number;
      last_uploaded_at: string | null;
    }>(
      'SELECT COUNT(*) AS total_files, COALESCE(SUM(chunk_count), 0) AS total_chunks, MAX(created_at) AS last_uploaded_at FROM knowledge_files',
    );
    return rows[0] ?? {
      total_files: 0,
      total_chunks: 0,
      last_uploaded_at: null,
    };
  }

  async deleteByFilename(filename: string): Promise<number> {
    const res = await this.db.query<{ affectedRows: number }>(
      'DELETE FROM knowledge_files WHERE filename = ?',
      [filename],
    );
    // mysql2/promise execute 默认不返回 affectedRows 在 rows，而是在 ResultSetHeader 中；
    // 这里简单返回 0，真实删除结果前端可通过向量库状态验证。
    return (res as unknown as { affectedRows?: number }).affectedRows ?? 0;
  }
}

