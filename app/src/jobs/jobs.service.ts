import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable, InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import {
  LiftoverJobsModel,
  JobStatus,
} from './models/liftover.jobs.model';
import { LiftoverModel } from './models/liftover.model';
import { JobQueue } from '../jobqueue/queue';
import { UserDoc } from '../auth/models/user.model';
import { GetJobsDto } from './dto/getjobs.dto';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  deleteFileorFolder,
  fileOrPathExists,
  findAllJobs, removeManyUserJobs,
  removeUserJob,
} from "@cubrepgwas/pgwascommon";

//production
const testPath = '/local/datasets/pgwas_test_files/liftover/celiac_filtered.txt';
//development
// const testPath = '/local/datasets/data/liftover/celiac_filtered.txt';

@Injectable()
export class JobsService {
  constructor(
    @Inject(JobQueue)
    private jobQueue: JobQueue,
  ) {}

  async create(
    createJobDto: CreateJobDto,
    file: Express.Multer.File,
    user?: UserDoc,
  ) {

    if (createJobDto.useTest === 'false') {
      if (!file) {
        throw new BadRequestException('Please upload a file');
      }

      if (file.mimetype !== 'text/plain') {
        throw new BadRequestException('Please upload a text file');
      }
    }

    if (!user && !createJobDto.email) {
      throw new BadRequestException(
          'Job cannot be null, check job parameters, and try again',
      );
    }

    if (user && createJobDto.email) {
      throw new BadRequestException('User signed in, no need for email');
    }

    const numberColumns = [
      'marker_name',
      'chromosome',
      'position',
    ];

    const columns = numberColumns.map((column) => {
      return parseInt(createJobDto[column], 10);
    });

    const wrongColumn = columns.some((value) => value < 1 || value > 15);

    if (wrongColumn) {
      throw new BadRequestException('Column numbers must be between 1 and 15');
    }

    const duplicates = new Set(columns).size !== columns.length;

    if (duplicates) {
      throw new BadRequestException('Column numbers must not have duplicates');
    }

    //create jobUID
    const jobUID = uuidv4();

    //create folder with job uid and create input folder in job uid folder
    const value = await fileOrPathExists(`/pv/analysis/${jobUID}`);

    if (!value) {
      fs.mkdirSync(`/pv/analysis/${jobUID}/input`, { recursive: true });
    } else {
      throw new InternalServerErrorException();
    }

    const session = await LiftoverJobsModel.startSession();
    const sessionTest = await LiftoverModel.startSession();
    session.startTransaction();
    sessionTest.startTransaction();

    try {
      // console.log('DTO: ', createJobDto);
      const opts = { session };
      const optsTest = { session: sessionTest };

      const filepath = createJobDto.useTest === 'true' ? testPath : file.path;

      let newJob;

      //save job parameters, folder path, filename in database
      if(user){
        newJob = LiftoverJobsModel.build({
          job_name: createJobDto.job_name,
          jobUID,
          inputFile: filepath,
          status: JobStatus.QUEUED,
          user: user.id,
        });
      }

      if(createJobDto.email){
        newJob = LiftoverJobsModel.build({
          job_name: createJobDto.job_name,
          jobUID,
          inputFile: filepath,
          status: JobStatus.QUEUED,
          email: createJobDto.email,
        });
      }

      if (!newJob) {
        throw new BadRequestException(
            'Job cannot be null, check job parameters',
        );
      }

      //let the models be created per specific analysis
      const liftover = LiftoverModel.build({
        ...createJobDto,
        job: newJob.id,
      });

      await liftover.save(optsTest);
      await newJob.save(opts);

      //add job to queue
      if (user) {
        await this.jobQueue.addJob({
          jobId: newJob.id,
          jobName: newJob.job_name,
          jobUID: newJob.jobUID,
          username: user.username,
          email: user.email,
        });
      }

      if (createJobDto.email) {
        await this.jobQueue.addJob({
          jobId: newJob.id,
          jobName: newJob.job_name,
          jobUID: newJob.jobUID,
          username: 'User',
          email: createJobDto.email,
        });
      }

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

  async getJobByIDNoAuth(id: string) {
    const job = await LiftoverJobsModel.findById(id)
        .populate('liftoverparams')
        .populate('user')
        .exec();

    if (!job) {
      throw new NotFoundException();
    }

    if (job?.user?.username) {
      throw new ForbiddenException('Access not allowed');
    }

    return job;
  }

  async removeJob(id: string, user: UserDoc) {
    const job = await this.getJobByID(id, user);

    return await removeUserJob(id, job);
  }

  async removeJobNoAuth(id: string) {
    const job = await this.getJobByIDNoAuth(id);

    return await removeUserJob(id, job);
  }

  async deleteManyJobs(user: UserDoc) {
    return await removeManyUserJobs(user, LiftoverJobsModel);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
