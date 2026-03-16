import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

/**
 * 按 key（如 IP）限制并发数，用于防止同一 IP 同时发起过多流式/对话请求。
 */
@Injectable()
export class ConcurrencyService {
  private readonly store = new Map<string, number>();
  private readonly max: number;

  constructor(private readonly config: AppConfigService) {
    this.max = Math.max(1, this.config.maxConcurrentChatPerIp);
  }

  /** 尝试占用一个槽位，成功返回 true，已达上限返回 false */
  acquire(key: string): boolean {
    const n = (this.store.get(key) ?? 0) + 1;
    if (n > this.max) return false;
    this.store.set(key, n);
    return true;
  }

  /** 释放一个槽位 */
  release(key: string): void {
    const n = this.store.get(key);
    if (n === undefined) return;
    if (n <= 1) this.store.delete(key);
    else this.store.set(key, n - 1);
  }
}
