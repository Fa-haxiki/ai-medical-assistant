import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createPool, Pool, RowDataPacket } from 'mysql2/promise';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private schemaRun = false;

  constructor(private readonly config: AppConfigService) {}

  getPool(): Pool | null {
    if (!this.config.mysqlEnabled) return null;
    if (!this.pool) {
      this.pool = createPool({
        host: this.config.mysqlHost,
        port: this.config.mysqlPort,
        user: this.config.mysqlUser,
        password: this.config.mysqlPassword,
        database: this.config.mysqlDatabase,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      this.logger.log('MySQL 连接池已创建');
    }
    return this.pool;
  }

  async ensureSchema(): Promise<void> {
    if (!this.config.mysqlEnabled || this.schemaRun) return;
    const pool = this.getPool();
    if (!pool) return;
    try {
      let schemaPath = path.join(__dirname, 'schema.sql');
      if (!fs.existsSync(schemaPath)) {
        schemaPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
      }
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      const statements = sql
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));
      for (const stmt of statements) {
        if (stmt) await pool.execute(stmt + ';');
      }
      this.schemaRun = true;
      this.logger.log('MySQL 表结构已就绪');
    } catch (e) {
      this.logger.warn(
        `执行 schema 失败（可手动执行 schema.sql）: ${(e as Error)?.message}`,
      );
    }
  }

  async query<T = RowDataPacket>(sql: string, params?: (string | number | null)[]): Promise<T[]> {
    const pool = this.getPool();
    if (!pool)
      throw new Error('MySQL 未配置，请设置 MYSQL_DATABASE 等环境变量');
    const [rows] = await pool.execute(sql, params ?? []);
    return (Array.isArray(rows) ? rows : []) as T[];
  }

  async execute(sql: string, params?: (string | number | null)[]): Promise<void> {
    const pool = this.getPool();
    if (!pool) throw new Error('MySQL 未配置');
    await pool.execute(sql, params ?? []);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.log('MySQL 连接池已关闭');
    }
  }
}
