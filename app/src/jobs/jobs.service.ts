import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import {
  LiftoverJobsDoc,
  LiftoverJobsModel,
  JobStatus,
} from './models/liftover.jobs.model';
import { LiftoverModel } from './models/liftover.model';
import { JobQueue } from '../jobqueue/queue';
import { UserDoc } from '../auth/models/user.model';
import { deleteFileorFolder } from '../utils/utilityfunctions';
import { GetJobsDto } from './dto/getjobs.dto';

@Injectable()
export class JobsService {
  constructor(
    @Inject(JobQueue)
    private jobQueue: JobQueue,
  ) {}

  async create(
    createJobDto: CreateJobDto,
    jobUID: string,
    filename: string,
    user: UserDoc,
  ) {
    const session = await LiftoverJobsModel.startSession();
    const sessionTest = await LiftoverModel.startSession();
    session.startTransaction();
    sessionTest.startTransaction();

    try {
      // console.log('DTO: ', createJobDto);
      const opts = { session };
      const optsTest = { session: sessionTest };

      //save job parameters, folder path, filename in database
      const newJob = LiftoverJobsModel.build({
        job_name: createJobDto.job_name,
        jobUID,
        inputFile: filename,
        status: JobStatus.QUEUED,
        user: user.id,
      });

      //let the models be created per specific analysis
      const liftover = LiftoverModel.build({
        ncbi_build: createJobDto.ncbi_build,
        job: newJob.id,
      });

      await liftover.save(optsTest);
      await newJob.save(opts);

      //add job to queue
      await this.jobQueue.addJob({
        jobId: newJob.id,
        jobName: newJob.job_name,
        jobUID: newJob.jobUID,
      });

      // console.log('Job added ');

      await session.commitTransaction();
      await sessionTest.commitTransaction();
      return {
        success: true,
        jobId: newJob.id,
      };
    } catch (e) {
      if (e.code === 11000) {
        throw new ConflictException('Duplicate job not allowed: ' + e.message);
      }
      await session.abortTransaction();
      await sessionTest.abortTransaction();
      deleteFileorFolder(`/pv/analysis/${jobUID}`).then(() => {
        // console.log('deleted');
      });
      throw new BadRequestException(e.message);
    } finally {
      session.endSession();
      sessionTest.endSession();
    }
  }

  async findAll(getJobsDto: GetJobsDto, user: UserDoc) {
    // await sleep(1000);
    const sortVariable = getJobsDto.sort ? getJobsDto.sort : 'createdAt';
    const limit = getJobsDto.limit ? parseInt(getJobsDto.limit, 10) : 2;
    const page =
      getJobsDto.page || getJobsDto.page === '0'
        ? parseInt(getJobsDto.page, 10)
        : 1;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const result = await LiftoverJobsModel.aggregate([
      { $match: { user: user._id } },
      { $sort: { [sortVariable]: -1 } },
      {
        $lookup: {
          from: 'liftovers',
          localField: '_id',
          foreignField: 'job',
          as: 'liftoverparams',
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          job_name: 1,
          createdAt: 1,
          unliftedFile: 1,
          outputFile: 1,
          inputFile: 1,
          failed_reason: 1,
        },
      },
      {
        $facet: {
          count: [{ $group: { _id: null, count: { $sum: 1 } } }],
          sample: [{ $skip: startIndex }, { $limit: limit }],
        },
      },
      { $unwind: '$count' },
      {
        $project: {
          count: '$count.count',
          data: '$sample',
        },
      },
    ]);

    if (result[0]) {
      const { count, data } = result[0];

      const pagination: any = {};

      if (endIndex < count) {
        pagination.next = { page: page + 1, limit };
      }

      if (startIndex > 0) {
        pagination.prev = {
          page: page - 1,
          limit,
        };
      }

      return {
        success: true,
        count: data.length,
        total: count,
        pagination,
        data,
      };
    }
    return {
      success: true,
      count: 0,
      total: 0,
      data: [],
    };
  }

  // async findOne(id: string) {
  //   return await this.jobsModel.findById(id).exec();
  // }

  async getJobByID(id: string, user: UserDoc) {
    const job = await LiftoverJobsModel.findById(id)
      .populate('liftoverparams')
      .populate('user')
      .exec();

    if (!job) {
      throw new NotFoundException();
    }

    if (job.user.username !== user.username) {
      throw new ForbiddenException('Access not allowed');
    }

    return job;
  }

  async deleteJob(id: string, user: UserDoc) {
    console.log("Deleting...");
    const session = await LiftoverJobsModel.startSession();
    session.startTransaction();
    const opts = { session };
    try {
      const opts = { session };
      const job = await this.getJobByID(id, user);
      if (job.status === JobStatus.RUNNING) {
        throw new Error('Job is currently running, wait for it complete');
      }
      await job.remove(opts);
      await deleteFileorFolder(`/pv/analysis/${job.jobUID}`);
      await session.commitTransaction();
      return {
        success: true,
      };
    } catch (e) {
      await session.abortTransaction();
      throw new BadRequestException(e.message);
    } finally {
      session.endSession();
    }
  }

  async deleteManyJobs(user: UserDoc): Promise<LiftoverJobsDoc[]> {
    return await LiftoverJobsModel.find({ user: user._id }).exec();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
