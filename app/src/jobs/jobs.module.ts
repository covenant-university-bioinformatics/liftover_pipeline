import { Global, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { QueueModule } from '../jobqueue/queue.module';
import {JobsNoAuthController} from "./jobs.noauth.controller";

@Global()
@Module({
  imports: [
    QueueModule,
  ],
  controllers: [JobsController, JobsNoAuthController],
  providers: [JobsService],
  exports: [
  ],
})
export class JobsModule {
}
