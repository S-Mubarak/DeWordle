import { Module } from '@nestjs/common';
import { AdminQueuesController } from './admin-queues.controller';
import { JobModule } from '../common/job.module';

@Module({
  imports: [JobModule],
  controllers: [AdminQueuesController],
})
export class AdminModule {}
