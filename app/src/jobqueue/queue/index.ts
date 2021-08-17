import { Queue } from 'bullmq';
import config from '../../config/bullmq.config';
import { Injectable } from '@nestjs/common';

export interface WorkerJob {
  jobId: string;
  jobName: string;
  jobUID: string;
}

@Injectable()
export class JobQueue {
  queue: Queue<WorkerJob, any, string>;

  constructor() {
    this.queue = new Queue<WorkerJob>(config.queueName, {
      connection: config.connection,
      // limiter: { groupKey: config.limiter.groupKey },
    });
  }

  async addJob(jobData: WorkerJob) {
    return await this.queue.add(jobData.jobName, jobData);
  }
}
