import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AdminQueuesController } from './admin-queues.controller';
import { JobService } from '../common/job.service';
import { JwtAuthGuard } from '../auth/guards/jwt-guard.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('AdminQueuesController', () => {
  let controller: AdminQueuesController;
  let jobService: JobService;

  const queueStats = {
    reward_calculation: { waiting: 1, active: 2, completed: 100, failed: 3 },
    achievement_check: { waiting: 0, active: 1, completed: 50, failed: 0 },
    analytics_aggregate: { waiting: 4, active: 0, completed: 200, failed: 1 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminQueuesController],
      providers: [
        {
          provide: JobService,
          useValue: { getQueueStats: jest.fn().mockResolvedValue(queueStats) },
        },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminQueuesController>(AdminQueuesController);
    jobService = module.get<JobService>(JobService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return active, waiting, completed, and failed counts for all queues', async () => {
    const result = await controller.getQueueMetrics();

    expect(jobService.getQueueStats).toHaveBeenCalled();
    expect(result).toEqual(queueStats);
    for (const queueName of Object.keys(queueStats)) {
      expect(result[queueName]).toHaveProperty('waiting');
      expect(result[queueName]).toHaveProperty('active');
      expect(result[queueName]).toHaveProperty('completed');
      expect(result[queueName]).toHaveProperty('failed');
    }
  });

  it('should expose the endpoint under the admin queues metrics path', () => {
    const route = Reflect.getMetadata('path', controller.getQueueMetrics);
    expect(route).toBe('metrics');

    const controllerPath = Reflect.getMetadata('path', AdminQueuesController);
    expect(controllerPath).toBe('admin/queues');
  });

  it('should be guarded by JwtAuthGuard and RolesGuard with admin role', () => {
    const guards = Reflect.getMetadata('__guards__', AdminQueuesController);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);

    const roles = Reflect.getMetadata('roles', AdminQueuesController);
    expect(roles).toContain('admin');
  });
});
