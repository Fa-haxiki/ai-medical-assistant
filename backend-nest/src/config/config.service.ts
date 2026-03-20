import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: NestConfigService) {}

  get port(): number {
    return this.config.get<number>('PORT') ?? 8000;
  }

  get host(): string {
    return this.config.get<string>('HOST') ?? 'localhost';
  }

  get corsOrigin(): string {
    return (
      this.config.get<string>('CORS_ALLOW_ORIGINS') ?? 'http://localhost:3000'
    );
  }

  get dashscopeApiKey(): string {
    const keyFromDashscope = this.config.get<string>('DASHSCOPE_API_KEY');
    const keyFromAlibaba = this.config.get<string>('ALIBABA_API_KEY');
    return keyFromDashscope || keyFromAlibaba || '';
  }

  get chromaUrl(): string {
    return (
      this.config.get<string>('CHROMA_URL') ??
      this.config.get<string>('CHROMA_HOST') ??
      ''
    );
  }

  get chromaHost(): string {
    const u = this.chromaUrl;
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://')) {
      try {
        return new URL(u).hostname;
      } catch {
        return 'localhost';
      }
    }
    return u.split(':')[0] || 'localhost';
  }

  get chromaPort(): number {
    const u = this.chromaUrl;
    if (!u) return 8010;
    if (u.startsWith('http://') || u.startsWith('https://')) {
      try {
        const p = new URL(u).port;
        return p ? parseInt(p, 10) : 8010;
      } catch {
        return 8010;
      }
    }
    const parts = u.split(':');
    return parts[1] ? parseInt(parts[1], 10) : 8010;
  }

  get chromaCollectionName(): string {
    return this.config.get<string>('CHROMA_COLLECTION') ?? 'medical-knowledge';
  }

  get rerankEnabled(): boolean {
    const v = this.config.get<string>('RERANK_ENABLED');
    if (v === undefined) return true;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  }

  get rerankProvider(): string {
    return this.config.get<string>('RERANK_PROVIDER') ?? 'dashscope';
  }

  get rerankModel(): string {
    return this.config.get<string>('RERANK_MODEL') ?? 'qwen3-vl-rerank';
  }

  get rerankTopK(): number {
    const v = this.config.get<string>('RERANK_TOP_K');
    const parsed = v ? parseInt(v, 10) : 20;
    return Number.isFinite(parsed) ? Math.max(1, parsed) : 20;
  }

  get rerankTopN(): number {
    const v = this.config.get<string>('RERANK_TOP_N');
    const parsed = v ? parseInt(v, 10) : 5;
    const safe = Number.isFinite(parsed) ? Math.max(1, parsed) : 5;
    return Math.min(safe, this.rerankTopK);
  }

  get rerankTimeoutMs(): number {
    const v = this.config.get<string>('RERANK_TIMEOUT_MS');
    const parsed = v ? parseInt(v, 10) : 1200;
    return Number.isFinite(parsed) ? Math.max(100, parsed) : 1200;
  }

  get ragContextMaxChars(): number {
    const v = this.config.get<string>('RAG_CONTEXT_MAX_CHARS');
    const parsed = v ? parseInt(v, 10) : 7000;
    return Number.isFinite(parsed) ? Math.max(1000, parsed) : 7000;
  }

  get maxZipFileCount(): number {
    const v = this.config.get<string>('MAX_ZIP_FILE_COUNT');
    const parsed = v ? parseInt(v, 10) : 200;
    return Number.isFinite(parsed) ? Math.max(1, parsed) : 200;
  }

  get maxZipUncompressedBytes(): number {
    const v = this.config.get<string>('MAX_ZIP_UNCOMPRESSED_MB');
    const mb = v ? parseFloat(v) : 200;
    return Math.floor(Math.max(1, mb) * 1024 * 1024);
  }

  get zipJobTimeoutMs(): number {
    const v = this.config.get<string>('ZIP_JOB_TIMEOUT_MS');
    const parsed = v ? parseInt(v, 10) : 300000;
    return Number.isFinite(parsed) ? Math.max(1000, parsed) : 300000;
  }

  get knowledgePath(): string | null {
    const explicit = this.config.get<string>('KNOWLEDGE_PATH');
    if (explicit) {
      return explicit;
    }
    return null;
  }

  /** MySQL 会话持久化：未配置 MYSQL_DATABASE 则使用内存 */
  get mysqlHost(): string {
    return this.config.get<string>('MYSQL_HOST') ?? 'localhost';
  }
  get mysqlPort(): number {
    const v = this.config.get<string>('MYSQL_PORT');
    return v ? parseInt(v, 10) : 3306;
  }
  get mysqlUser(): string {
    return this.config.get<string>('MYSQL_USER') ?? 'root';
  }
  get mysqlPassword(): string {
    return this.config.get<string>('MYSQL_PASSWORD') ?? '';
  }
  get mysqlDatabase(): string {
    return this.config.get<string>('MYSQL_DATABASE') ?? 'medical_assistant';
  }
  get mysqlEnabled(): boolean {
    return !!this.config.get<string>('MYSQL_DATABASE');
  }

  /** 会话超过多少天未活跃则删除（默认 30） */
  get conversationInactiveDays(): number {
    const v = this.config.get<string>('CONVERSATION_INACTIVE_DAYS');
    return v ? parseInt(v, 10) : 30;
  }
  /** 单会话最多保留消息条数（默认 200） */
  get maxMessagesPerConversation(): number {
    const v = this.config.get<string>('MAX_MESSAGES_PER_CONVERSATION');
    return v ? parseInt(v, 10) : 200;
  }

  // ---------- 参数与限流校验 ----------
  /** 单条消息最大字符数（默认 10000） */
  get maxMessageLength(): number {
    const v = this.config.get<string>('MAX_MESSAGE_LENGTH');
    return v ? parseInt(v, 10) : 10000;
  }
  /** 请求体中的 chat_history 最大条数（默认 50） */
  get maxChatHistoryLength(): number {
    const v = this.config.get<string>('MAX_CHAT_HISTORY_LENGTH');
    return v ? parseInt(v, 10) : 50;
  }
  /** 图片 base64 最大字节数（默认 5MB） */
  get maxImageSizeBytes(): number {
    const v = this.config.get<string>('MAX_IMAGE_SIZE_MB');
    const mb = v ? parseFloat(v) : 5;
    return Math.floor(mb * 1024 * 1024);
  }
  /** 上传知识库文件最大字节数（默认 10MB） */
  get maxUploadFileSizeBytes(): number {
    const v = this.config.get<string>('MAX_UPLOAD_FILE_SIZE_MB');
    const mb = v ? parseFloat(v) : 10;
    return Math.floor(mb * 1024 * 1024);
  }
  /** 限流：时间窗口秒数（默认 60） */
  get throttleTtlSeconds(): number {
    const v = this.config.get<string>('THROTTLE_TTL_SECONDS');
    return v ? parseInt(v, 10) : 60;
  }
  /** 限流：时间窗口内每 IP 最大请求数（默认 120） */
  get throttleLimit(): number {
    const v = this.config.get<string>('THROTTLE_LIMIT');
    return v ? parseInt(v, 10) : 120;
  }
  /** 同一 IP 允许的并发流式/对话请求数（默认 3） */
  get maxConcurrentChatPerIp(): number {
    const v = this.config.get<string>('MAX_CONCURRENT_CHAT_PER_IP');
    return v ? parseInt(v, 10) : 3;
  }
}

