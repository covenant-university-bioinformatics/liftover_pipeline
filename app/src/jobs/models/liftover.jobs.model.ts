import * as mongoose from 'mongoose';
import { UserDoc } from '../../auth/models/user.model';
import { LiftoverDoc } from './liftover.model';

export enum JobStatus {
  COMPLETED = 'completed',
  RUNNING = 'running',
  FAILED = 'failed',
  ABORTED = 'aborted',
  NOTSTARTED = 'not-started',
  QUEUED = 'queued',
}

//Interface that describe the properties that are required to create a new job
interface JobsAttrs {
  jobUID: string;
  job_name: string;
  status: JobStatus;
  user: string;
  inputFile: string;
}

// An interface that describes the extra properties that a model has
//collection level methods
interface JobsModel extends mongoose.Model<LiftoverJobsDoc> {
  build(attrs: JobsAttrs): LiftoverJobsDoc;
}

//An interface that describes a properties that a document has
export interface LiftoverJobsDoc extends mongoose.Document {
  id: string;
  jobUID: string;
  job_name: string;
  inputFile: string;
  status: JobStatus;
  user: UserDoc;
  outputFile: string;
  unliftedFile: string;
  failed_reason: string;
  liftoverparams: LiftoverDoc;
  version: number;
}

const LiftoverJobSchema = new mongoose.Schema<LiftoverJobsDoc, JobsModel>(
  {
    jobUID: {
      type: String,
      required: [true, 'Please add a Job UID'],
      unique: true,
      trim: true,
    },

    job_name: {
      type: String,
      unique: true,
      required: [true, 'Please add a name'],
    },

    inputFile: {
      type: String,
      required: [true, 'Please add a input filename'],
      unique: true,
      trim: true,
    },

    outputFile: {
      type: String,
      trim: true,
    },

    unliftedFile: {
      type: String,
      trim: true,
    },

    failed_reason: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        JobStatus.COMPLETED,
        JobStatus.NOTSTARTED,
        JobStatus.RUNNING,
        JobStatus.FAILED,
        JobStatus.ABORTED,
        JobStatus.QUEUED,
      ],
      default: JobStatus.NOTSTARTED,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    version: {
      type: Number,
    },
  },
  {
    timestamps: true,
    versionKey: 'version',
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        // delete ret._id;
        // delete ret.__v;
      },
    },
  },
);

//collection level methods
LiftoverJobSchema.statics.build = (attrs: JobsAttrs) => {
  return new LiftoverJobsModel(attrs);
};

//Cascade delete main job parameters when job is deleted
LiftoverJobSchema.pre('remove', async function (next) {
  console.log('Job parameters being removed!');
  await this.model('Liftover').deleteMany({
    job: this.id,
  });
  next();
});

//reverse populate jobs with main job parameters
LiftoverJobSchema.virtual('liftoverparams', {
  ref: 'Liftover',
  localField: '_id',
  foreignField: 'job',
  required: true,
  justOne: true,
});

LiftoverJobSchema.set('versionKey', 'version');

//create mongoose model
const LiftoverJobsModel = mongoose.model<LiftoverJobsDoc, JobsModel>(
  'LiftoverJob',
  LiftoverJobSchema,
  'liftoverjobs',
);

export { LiftoverJobsModel };
