import { Module, OnModuleInit } from '@nestjs/common';
import { createWorkers } from '../workers/main';
import { JobQueue } from './queue';

@Module({
  imports: [],
  providers: [JobQueue],
  exports: [JobQueue],
})
export class QueueModule implements OnModuleInit {
  async onModuleInit() {
    // createScheduler();
    await createWorkers();
  }
}
