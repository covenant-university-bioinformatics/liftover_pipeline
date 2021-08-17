import config from '../config/bullmq.config';
import { WorkerJob } from '../jobqueue/queue';
import { Worker, Job, QueueScheduler } from 'bullmq';
import {
  LiftoverJobsModel,
  JobStatus,
} from '../jobs/models/liftover.jobs.model';
import * as path from 'path';
import { LiftoverModel } from '../jobs/models/liftover.model';

let scheduler;

const createScheduler = () => {
  scheduler = new QueueScheduler(config.queueName, {
    connection: config.connection,
    // maxStalledCount: 10,
    // stalledInterval: 15000,
  });
};

export var runningJobs = {
  value: 0,
};

const processorFile = path.join(__dirname, 'worker.js');

export const createWorkers = async () => {
  createScheduler();
  for (let i = 0; i < config.numWorkers; i++) {
    console.log('Creating worker ' + i);

    const worker = new Worker<WorkerJob>(config.queueName, processorFile, {
      connection: config.connection,
      // concurrency: config.concurrency,
      limiter: config.limiter,
    });

    worker.on('completed', async (job: Job, returnvalue: any) => {
      console.log('worker ' + i + ' completed ' + returnvalue);

      // save in mongo database
      // job is complete

      const pathToOutputDir = `/pv/analysis/${job.data.jobUID}/liftover/output`;
      await LiftoverJobsModel.findByIdAndUpdate(
        job.data.jobId,
        {
          status: JobStatus.COMPLETED,
          outputFile: `${pathToOutputDir}/liftedOver.txt`,
          unliftedFile: `${pathToOutputDir}/unlifted.bed`,
        },
        { new: true },
      );
    });

    worker.on('failed', async (job: Job) => {
      console.log('worker ' + i + ' failed ' + job.failedReason);
      //update job in database as failed
      //save in mongo database
      await LiftoverJobsModel.findByIdAndUpdate(
        job.data.jobId,
        {
          status: JobStatus.FAILED,
          failed_reason: job.failedReason,
        },
        { new: true },
      );
    });

    // worker.on('close', () => {
    //   console.log('worker ' + i + ' closed');
    // });

    process.on('SIGINT', () => {
      worker.close();
      console.log('worker ' + i + ' closed');
    });

    process.on('SIGTERM', () => {
      worker.close();
      console.log('worker ' + i + ' closed');
    });

    process.on('SIGBREAK', () => {
      worker.close();
      console.log('worker ' + i + ' closed');
    });

    console.log('Worker ' + i + ' created');
  }
};
