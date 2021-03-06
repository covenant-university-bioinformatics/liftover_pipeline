import * as mongoose from 'mongoose';

//Interface that describe the properties that are required to create a new job
interface LiftoverAttrs {
  useTest: string;
  marker_name: string;
  chromosome: string;
  position: string;
  ncbi_build: string;
  job: string;
}

// An interface that describes the extra properties that a ticket model has
//collection level methods
interface LiftoverModel extends mongoose.Model<LiftoverDoc> {
  build(attrs: LiftoverAttrs): LiftoverDoc;
}

//An interface that describes a properties that a document has
export interface LiftoverDoc extends mongoose.Document {
  id: string;
  version: number;
  useTest: boolean;
  marker_name: number;
  chromosome: number;
  position: number;
  ncbi_build: number;
}

const LiftoverSchema = new mongoose.Schema<LiftoverDoc, LiftoverModel>(
  {
    useTest: {
      type: Boolean,
      trim: true,
    },
    marker_name: {
      type: Number,
      trim: true,
    },
    chromosome: {
      type: Number,
      trim: true,
    },
    position: {
      type: Number,
      trim: true,
    },
    ncbi_build: {
      type: Number,
      trim: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiftoverJob',
      required: true,
    },
    version: {
      type: Number,
    },
  },
  {
    timestamps: true,
    versionKey: 'version',
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        // delete ret._id;
        // delete ret.__v;
      },
    },
  },
);

//increments version when document updates
LiftoverSchema.set('versionKey', 'version');

//collection level methods
LiftoverSchema.statics.build = (attrs: LiftoverAttrs) => {
  return new LiftoverModel(attrs);
};

//create mongoose model
const LiftoverModel = mongoose.model<LiftoverDoc, LiftoverModel>(
  'Liftover',
  LiftoverSchema,
  'liftovers',
);

export { LiftoverModel };
