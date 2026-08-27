import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_HEALTH_CLIENT } from './health.constants';

/**
 * HEALTH-1209: Redis liveness indicator for the /health endpoint.
 *
 * Verifies the Redis connection with a PING round-trip and reports the
 * connected-client count from the server INFO output so orchestrators can
 * see both connectivity and queue-related load at a glance.
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(
    @Inject(REDIS_HEALTH_CLIENT) private readonly client: Redis,
  ) {
    super();
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.client.ping();
      if (pong !== 'PONG') {
        throw new Error(`redis ping returned unexpected response: ${pong}`);
      }

      let connectedClients: number | undefined;
      try {
        const info = await this.client.info('clients');
        const match = /connected_clients:(\d+)/.exec(info ?? '');
        connectedClients = match ? Number.parseInt(match[1], 10) : undefined;
      } catch {
        // INFO is best-effort; connectivity was already proven by PING.
      }

      return this.getStatus(key, true, {
        queueStatus: 'ready',
        connectedClients,
      });
    } catch (err) {
      this.logger.warn({
        msg: 'health.redis.unavailable',
        error: err instanceof Error ? err.message : String(err),
      });
      throw new HealthCheckError(
        `${key} check failed`,
        this.getStatus(key, false, {
          queueStatus: 'down',
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
