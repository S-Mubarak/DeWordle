import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RedisHealthIndicator } from './redis-health.indicator';

/**
 * HEALTH-1209: Standardized /health endpoint for container orchestrators.
 *
 * Reports the status of the PostgreSQL connection and the Redis
 * connection/queue used by the backend.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Service health check',
    description:
      'Returns liveness of the PostgreSQL database and Redis connection/queue.',
  })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      () => this.redis.check('redis'),
    ]);
  }
}
