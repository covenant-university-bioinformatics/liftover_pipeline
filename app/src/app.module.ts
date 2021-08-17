import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {AuthModule} from "./auth/auth.module";
import {QueueModule} from "./jobqueue/queue.module";
import {JobsModule} from "./jobs/jobs.module";

@Module({
  imports: [
    AuthModule,
    JobsModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
