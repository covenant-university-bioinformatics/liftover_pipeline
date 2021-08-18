import { SandboxedJob } from 'bullmq';
import * as fs from 'fs';
import {
  JobStatus,
  LiftoverJobsModel,
} from '../jobs/models/liftover.jobs.model';
import { LiftoverDoc, LiftoverModel } from '../jobs/models/liftover.model';
import { spawnSync } from 'child_process';
import connectDB from '../mongoose';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJobParameters(parameters: LiftoverDoc) {
  return [String(parameters.ncbi_build)];
}

export default async (job: SandboxedJob) => {
  //executed for each job
  console.log(
    'Worker ' +
      ' processing job ' +
      JSON.stringify(job.data.jobId) +
      ' Job name: ' +
      JSON.stringify(job.data.jobName),
  );

  await connectDB();
  await sleep(2000);

  //fetch job parameters from database
  const parameters = await LiftoverModel.findOne({
    job: job.data.jobId,
  }).exec();

  const jobParams = await LiftoverJobsModel.findById(job.data.jobId).exec();

  //assemble job parameters
  const pathToInputFile = `${jobParams.inputFile}`;
  const pathToOutputDir = `/pv/analysis/${job.data.jobUID}/liftover/output`;
  const jobParameters = getJobParameters(parameters);
  jobParameters.unshift(pathToInputFile, pathToOutputDir);

  // console.log(jobParameters);
  //make output directory
  fs.mkdirSync(pathToOutputDir, { recursive: true });

  // save in mongo database
  await LiftoverJobsModel.findByIdAndUpdate(
    job.data.jobId,
    {
      status: JobStatus.RUNNING,
    },
    { new: true },
  );

  //spawn process
  const start = Date.now();
  const jobSpawn = spawnSync(
    './pipeline_scripts/liftOver.sh',
    jobParameters,
    // { detached: true },
  );
  console.log(jobSpawn?.stdout?.toString());
  console.log("=====================================");
  console.log(jobSpawn?.stderr?.toString());
  console.log(`${job?.data?.jobName} spawn done!`);
  return true;
};
