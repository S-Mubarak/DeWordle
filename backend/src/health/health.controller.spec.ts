import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';

describe('HEALTH-1209: HealthController', () => {
  let controller: HealthController;
  let healthCheckService: {
    check: jest.Mock;
  };
  let dbIndicator: {
    pingCheck: jest.Mock;
  };
  let redisIndicator: {
    check: jest.Mock;
  };

  beforeEach(async () => {
    healthCheckService = { check: jest.fn() };
    dbIndicator = { pingCheck: jest.fn() };
    redisIndicator = { check: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: dbIndicator },
        { provide: RedisHealthIndicator, useValue: redisIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('exposes GET /health that runs database and redis checks', async () => {
    const result: HealthCheckResult = {
      status: 'ok',
      info: {
        database: { status: 'up' },
        redis: { status: 'up' },
      },
      error: {},
      details: {
        database: { status: 'up' },
        redis: { status: 'up' },
      },
    };
    healthCheckService.check.mockResolvedValue(result);

    const output = await controller.check();

    expect(output.status).toBe('ok');
    expect(output.info.database.status).toBe('up');
    expect(output.info.redis.status).toBe('up');
    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
  });

  it('registers the database ping indicator', async () => {
    dbIndicator.pingCheck.mockResolvedValue({
      database: { status: 'up' },
    });
    healthCheckService.check.mockImplementation(
      async (checks: Array<() => Promise<unknown>>) => {
        const results = await Promise.all(checks.map((c) => c()));
        return { status: 'ok', info: Object.assign({}, ...results), error: {}, details: Object.assign({}, ...results) };
      },
    );

    await controller.check();

    expect(dbIndicator.pingCheck).toHaveBeenCalledWith('database', {
      timeout: 1500,
    });
  });

  it('registers the redis indicator', async () => {
    redisIndicator.check.mockResolvedValue({
      redis: { status: 'up', queueStatus: 'ready' },
    });
    healthCheckService.check.mockImplementation(
      async (checks: Array<() => Promise<unknown>>) => {
        const results = await Promise.all(checks.map((c) => c()));
        return { status: 'ok', info: Object.assign({}, ...results), error: {}, details: Object.assign({}, ...results) };
      },
    );

    await controller.check();

    expect(redisIndicator.check).toHaveBeenCalledWith('redis');
  });
});
