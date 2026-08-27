import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  POOL_PRESSURE_THRESHOLD,
  PoolPressureMonitor,
  PoolStats,
} from './pool-pressure';

/**
 * DB-POOL-1210: Wires the {@link PoolPressureMonitor} to the live
 * node-postgres pool used by TypeORM. Every acquire/release/connect
 * event refreshes the utilization snapshot; once utilization reaches
 * 90% (or clients are queued waiting for a slot) a backpressure warning
 * is emitted so operators and orchestrators can react before the pool
 * is fully exhausted.
 */
@Injectable()
export class PoolPressureService implements OnModuleInit {
  private readonly logger = new Logger(PoolPressureService.name);
  private readonly monitor = new PoolPressureMonitor();
  private pool: {
    totalCount?: number;
    idleCount?: number;
    waitingCount?: number;
    on?: (event: string, listener: () => void) => void;
  } | null = null;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    const driver = this.dataSource.driver as {
      master?: typeof this.pool;
      pool?: typeof this.pool;
    };
    this.pool = driver?.master ?? driver?.pool ?? null;
    if (!this.pool || typeof this.pool.on !== 'function') {
      this.logger.warn({
        msg: 'db.pool.monitor_unavailable',
        reason: 'no_pg_pool_on_driver',
      });
      return;
    }

    this.pool.on('connect', () => this.refresh());
    this.pool.on('acquire', () => this.refresh());
    this.pool.on('release', () => this.refresh());
    this.pool.on('remove', () => this.refresh());
    this.logger.log({ msg: 'db.pool.monitor_started' });
  }

  /** Current pool stats, or null when the pg pool is not available. */
  getStats(): PoolStats | null {
    if (!this.pool) return null;
    const total = this.pool.totalCount ?? 0;
    const idle = this.pool.idleCount ?? 0;
    const waiting = this.pool.waitingCount ?? 0;
    return { total, idle, waiting, used: Math.max(total - idle, 0) };
  }

  /** True when the pool is at or above the 90% pressure threshold. */
  isUnderPressure(): boolean {
    const stats = this.getStats();
    if (!stats) return false;
    return this.monitor.evaluate(stats).underPressure;
  }

  private refresh(): void {
    const stats = this.getStats();
    if (!stats) return;
    const decision = this.monitor.evaluate(stats);
    if (decision.underPressure) {
      this.logger.warn({
        msg: 'db.pool.under_pressure',
        utilization: Number(decision.utilization.toFixed(3)),
        threshold: POOL_PRESSURE_THRESHOLD,
        ...stats,
        suggestedBackoffMs: decision.suggestedBackoffMs,
      });
    }
  }
}
