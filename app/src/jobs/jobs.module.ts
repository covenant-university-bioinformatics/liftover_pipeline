import { Global, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { QueueModule } from '../jobqueue/queue.module';

@Global()
@Module({
  imports: [
    QueueModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [
  ],
})
export class JobsModule {
}
