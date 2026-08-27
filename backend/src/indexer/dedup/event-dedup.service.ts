import { Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';

/**
 * IDX-DEDUP-1214: Event deduplication for the indexer.
 *
 * Soroban RPC can redeliver the same event multiple times during network
 * reconnects. Each event is uniquely identified by its (txHash,
 * eventIndex) pair; we remember seen pairs in Redis for 24 hours so
 * redelivered events are skipped instead of double-processed.
 */

/** Deduplication cache entries expire after 24 hours. */
export const EVENT_DEDUP_TTL_SECONDS = 24 * 60 * 60;

export const EVENT_DEDUP_KEY_PREFIX = 'indexer:dedup:event';

/** Minimal cache abstraction so the service is trivially unit-testable. */
export interface EventDedupCache {
  has(key: string): Promise<boolean>;
  set(key: string, ttlSeconds: number): Promise<void>;
}

/** Redis-backed implementation using SETNX-style exists + set with TTL. */
export class RedisEventDedupCache implements EventDedupCache {
  constructor(private readonly client: Redis) {}

  async has(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async set(key: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, '1', 'EX', ttlSeconds);
  }
}

@Injectable()
export class EventDedupService {
  private readonly logger = new Logger(EventDedupService.name);

  constructor(private readonly cache: EventDedupCache) {}

  /** Builds the Redis key for a (txHash, eventIndex) pair. */
  buildKey(txHash: string, eventIndex: number): string {
    return `${EVENT_DEDUP_KEY_PREFIX}:${txHash}:${eventIndex}`;
  }

  /**
   * Returns true when the event was already seen and processed within
   * the TTL window, otherwise records the event and returns false.
   */
  async isDuplicate(txHash: string, eventIndex: number): Promise<boolean> {
    const key = this.buildKey(txHash, eventIndex);
    if (await this.cache.has(key)) {
      this.logger.debug({
        msg: 'indexer.dedup.hit',
        txHash,
        eventIndex,
        key,
      });
      return true;
    }
    await this.cache.set(key, EVENT_DEDUP_TTL_SECONDS);
    return false;
  }
}
