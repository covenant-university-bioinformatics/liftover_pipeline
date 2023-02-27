import { SandboxedJob } from 'bullmq';
import * as fs from 'fs';
import {
  JobStatus,
  LiftoverJobsModel,
} from '../jobs/models/liftover.jobs.model';
import { LiftoverDoc, LiftoverModel } from '../jobs/models/liftover.model';
import { spawnSync } from 'child_process';
import connectDB, {closeDB} from '../mongoose';
import {deleteFileorFolder, fileOrPathExists, writeLiftoverFile} from "@cubrepgwas/pgwascommon";
import * as extract from "extract-zip";
import * as globby from "globby";

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

  //--1
  let fileInput = jobParams.inputFile;

  //check if file is a zipped file
  if(/[^.]+$/.exec(jobParams.inputFile)[0] === 'zip'){
    fs.mkdirSync(`/pv/analysis/${jobParams.jobUID}/zip`, { recursive: true });
    await extract(jobParams.inputFile, {dir: `/pv/analysis/${jobParams.jobUID}/zip/`});
    const paths = await globby(`/pv/analysis/${jobParams.jobUID}/zip/*.*`);
    if (paths.length === 0){
      throw new Error('Zip had no files')
    }
    if (paths.length > 1){
      throw new Error('Zip had too many files')
    }
    fileInput = paths[0]
  }

  //create input file and folder
  let filename;

  //--2
  //extract file name
  const name = fileInput.split(/(\\|\/)/g).pop();

  if (parameters.useTest === false) {
    filename = `/pv/analysis/${jobParams.jobUID}/input/${name}`;
  } else {
    filename = `/pv/analysis/${jobParams.jobUID}/input/test.txt`;
  }

  //write the exact columns needed by the analysis
  //--3
  writeLiftoverFile(fileInput, filename, {
    marker_name: parameters.marker_name - 1,
    chr: parameters.chromosome - 1,
    pos: parameters.position - 1,
  });

  if (parameters.useTest === false) {
    deleteFileorFolder(jobParams.inputFile).then(() => {
      console.log('deleted');
    });
  }

  //--4
  if(/[^.]+$/.exec(jobParams.inputFile)[0] === 'zip'){
    deleteFileorFolder(fileInput).then(() => {
      console.log('deleted');
    });
  }

  //assemble job parameters
  const pathToInputFile = filename;
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
  await sleep(3000);
  const start = Date.now();
  const jobSpawn = spawnSync(
    './pipeline_scripts/liftOver.sh',
    jobParameters,
    // { detached: true },
  );
  console.log('Spawn command log');
  console.log(jobSpawn?.stdout?.toString());
  console.log('=====================================');
  console.log('Spawn error log');
  const error_msg = jobSpawn?.stderr?.toString();
  console.log(error_msg);

  const value = await fileOrPathExists(`${pathToOutputDir}/liftedOver.txt`);

  closeDB();

  if (value) {
    console.log(`${job?.data?.jobName} spawn done!`);
    return true;
  } else {
    throw new Error(error_msg || 'Unable to execute program');
  }
};
