/**
 * DB-POOL-1210: Connection pool exhaustion guard.
 *
 * During peak indexer activity the Postgres connection pool can be
 * exhausted, which surfaces as unhandled "timeout exceeded when trying
 * to connect" errors. This module provides:
 *
 *  - a {@link PoolPressureMonitor} that tracks live pool utilization and
 *    flags backpressure once usage reaches 90% (or when clients are
 *    already queued waiting for a connection), and
 *  - a {@link withConnectionRetry} helper that retries a pool-bound
 *    operation with exponential backoff when the failure is pool
 *    exhaustion related.
 */

export const POOL_PRESSURE_THRESHOLD = 0.9; // 90% utilization
export const POOL_RETRY_DEFAULT_MAX = 3;
export const POOL_RETRY_DEFAULT_BASE_DELAY_MS = 200;

export interface PoolStats {
  /** Total connections in the pool (pool max). */
  total: number;
  /** Connections currently idle. */
  idle: number;
  /** Clients queued waiting for a connection slot. */
  waiting: number;
  /** Connections currently checked out / in use. */
  used: number;
}

export interface PoolPressureDecision {
  /** True when the pool is at or above the pressure threshold. */
  underPressure: boolean;
  /** Current pool utilization in the range [0, 1]. */
  utilization: number;
  /** Suggested backoff delay before the next attempt (ms). */
  suggestedBackoffMs: number;
  /** Number of consecutive pressure events observed. */
  retryCount: number;
  /** Maximum retries allowed before giving up. */
  maxRetries: number;
}

/**
 * Tracks pool utilization and produces backpressure decisions.
 * Pure logic — no I/O — so it is trivially unit-testable.
 */
export class PoolPressureMonitor {
  private consecutiveRetries = 0;

  constructor(
    private readonly threshold: number = POOL_PRESSURE_THRESHOLD,
    readonly maxRetries: number = POOL_RETRY_DEFAULT_MAX,
    private readonly baseDelayMs: number = POOL_RETRY_DEFAULT_BASE_DELAY_MS,
  ) {}

  /**
   * Evaluate current pool stats and return a backpressure decision.
   * Does not mutate internal state; use {@link recordRetry} to advance
   * the backoff sequence.
   */
  evaluate(stats: PoolStats): PoolPressureDecision {
    const utilization =
      stats.total > 0 ? stats.used / stats.total : 0;
    const underPressure =
      utilization >= this.threshold || stats.waiting > 0;

    return {
      underPressure,
      utilization,
      suggestedBackoffMs: underPressure
        ? this.baseDelayMs * 2 ** Math.min(this.consecutiveRetries, 5)
        : 0,
      retryCount: this.consecutiveRetries,
      maxRetries: this.maxRetries,
    };
  }

  /** Record a retry attempt (advances the exponential backoff window). */
  recordRetry(): void {
    this.consecutiveRetries = Math.min(
      this.consecutiveRetries + 1,
      this.maxRetries,
    );
  }

  /** Reset the backoff window after a successful acquisition. */
  reset(): void {
    this.consecutiveRetries = 0;
  }
}

/** True when the error is consistent with connection pool exhaustion. */
export function isPoolExhaustionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message ?? '';
  const code = (err as { code?: string }).code ?? '';
  const haystack = `${message} ${code}`;
  return /timeout|ETIMEDOUT|ECONNREFUSED|ECONNRESET|57P01|pool/i.test(
    haystack,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a pool-bound operation, retrying with exponential backoff when
 * the failure is caused by connection pool exhaustion (acquisition
 * timeouts, refused/reset connections, or an exhausted pool).
 *
 * Non-pool errors propagate immediately; the operation gives up after
 * `maxRetries` retries or once `timeoutMs` elapses.
 */
export async function withConnectionRetry<T>(
  operation: () => Promise<T>,
  monitor: PoolPressureMonitor,
  options?: { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const deadline = Date.now() + timeoutMs;

  for (let attempt = 0; attempt <= monitor.maxRetries; attempt++) {
    try {
      const result = await operation();
      monitor.reset();
      return result;
    } catch (err) {
      if (!isPoolExhaustionError(err)) throw err;
      if (attempt >= monitor.maxRetries || Date.now() >= deadline) throw err;

      monitor.recordRetry();
      const decision = monitor.evaluate({
        total: 0,
        idle: 0,
        waiting: 1,
        used: 0,
      });
      await sleep(decision.suggestedBackoffMs);
    }
  }

  throw new Error('withConnectionRetry exhausted attempts');
}
