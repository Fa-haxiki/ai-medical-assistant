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

  get knowledgePath(): string | null {
    const explicit = this.config.get<string>('KNOWLEDGE_PATH');
    if (explicit) {
      return explicit;
    }
    return null;
  }
}

