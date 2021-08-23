import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import * as multer from 'multer';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import {
  deleteFileorFolder,
  fileOrPathExists, fileSizeMb,
} from '../utils/utilityfunctions';
import {fetchLines, writeLiftoverFile} from '../utils/validateFile';
import { JobStatus } from './models/liftover.jobs.model';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../decorators/get-user.decorator';
import { GetJobsDto } from './dto/getjobs.dto';

const storageOpts = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync('/tmp/summaryStats')) {
      fs.mkdirSync('/tmp/summaryStats', { recursive: true });
    }
    cb(null, '/tmp/summaryStats'); //destination
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '__' + file.originalname);
  },
});

@UseGuards(AuthGuard())
@Controller('api/liftover/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: storageOpts }))
  async create(
    @Body(ValidationPipe) createJobDto: CreateJobDto,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user,
  ) {
    if (!file) {
      throw new BadRequestException('Please upload a file');
    }

    if (file.mimetype !== 'text/plain') {
      throw new BadRequestException('Please upload a text file');
    }

    const numberColumns = [
      'marker_name',
      'chromosome',
      'position',
    ];

    const columns = numberColumns.map((column) => {
      return parseInt(createJobDto[column], 10);
    });

    const wrongColumn = columns.some((value) => value < 1 || value > 12);

    if (wrongColumn) {
      throw new BadRequestException('Column numbers must be between 1 and 12');
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

    const filename = `/pv/analysis/${jobUID}/input/${file.filename}`;

    //write the exact columns needed by the analysis
    writeLiftoverFile(file.path, filename, {
      marker_name: parseInt(createJobDto.marker_name, 10) - 1,
      chr: parseInt(createJobDto.chromosome, 10) - 1,
      pos: parseInt(createJobDto.position, 10) - 1,
    });

    deleteFileorFolder(file.path).then(() => {
      // console.log('deleted');
    });

    // console.log(createJobDto);
    console.log(jobUID);
    // console.log(filename);

    //call service
    return await this.jobsService.create(createJobDto, jobUID, filename, user);

  }


  @Get()
  findAll(@Query(ValidationPipe) jobsDto: GetJobsDto, @GetUser() user) {
    return this.jobsService.findAll(jobsDto, user);
  }

  @Get('test')
  test(@Param('id') id: string) {
    return {
      success: true,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetUser() user) {
    const job = await this.jobsService.getJobByID(id, user);

    job.user = null;
    return job;
  }

  @Get('/output/:id/:file')
  async getOutput(
      @Param('id') id: string,
      @Param('file') file_key: string,
      @GetUser() user,
  ) {
    const job = await this.jobsService.getJobByID(id, user);
    const fileExists = await fileOrPathExists(job[file_key]);
    if (fileExists) {
      try {
        const stat = await fileSizeMb(job[file_key]);
        if (stat && stat > 2) {
          //  get first 1000 lines
          const lines = fetchLines(job[file_key]);
          return lines;
        } else {
          const file = fs.createReadStream(job[file_key]);

          return new StreamableFile(file);
        }
      } catch (e) {
        console.log(e);
        throw new BadRequestException(e.message);
      }
    } else {
      throw new BadRequestException(
          'File not available! Job probably still running or parameter not selected',
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @GetUser() user) {
    return await this.jobsService.deleteJob(id, user);
  }

  @Delete()
  async deleteMany(@Param('id') id: string, @GetUser() user) {
    const jobs = await this.jobsService.deleteManyJobs(user);

    if (jobs.length > 0) {
      //  check if job is running
      const jobRunning = jobs.some(
        (job) =>
          job.status === JobStatus.RUNNING || job.status === JobStatus.QUEUED,
      );

      if (jobRunning) {
        throw new BadRequestException(
          'Some Jobs are still running, wait for it to complete',
        );
      }

      const deletedJobs = jobs.map(async (job) => {
        // if job is not running, delete in database
        await job.remove();

        //delete all files in jobUID folder
        await deleteFileorFolder(`/pv/analysis/${job.jobUID}`);
      });

      try {
        await Promise.all(deletedJobs);
      } catch (e) {
        console.log(e);
        throw new InternalServerErrorException('Please try again');
      }
    }

    return { success: true };
  }

  // @Post(':id/abort')
  // async abortJob(@Param('id') id: string) {
  //   //  check if job is existing
  //   const job = await this.getJob(id);
  //   //  check if job is running
  //   if (job.status === JobStatus.COMPLETED) {
  //     throw new BadRequestException('Job is completed');
  //   }
  //   //  send abort event to
  //   console.log('Abort job event sent');
  //   await this.abortJobPublisher.publish({
  //     jobId: id,
  //   });
  //
  //   //  return to client
  //   return { success: true };
  // }
}
