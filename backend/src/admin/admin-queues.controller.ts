import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-guard.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { JobService } from '../common/job.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/queues')
export class AdminQueuesController {
  constructor(private readonly jobService: JobService) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Inspect active BullMQ queue job metrics',
    description:
      'Returns active, waiting, completed, and failed job counts for all queues.',
  })
  async getQueueMetrics() {
    return this.jobService.getQueueStats();
  }
}
