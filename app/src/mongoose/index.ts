import * as mongoose from 'mongoose';
import { config } from '../config/mongoose';
import { User } from '../auth/models/user.model';
const connectDB = async () => {
  try {
    console.log('config ', config);
    await mongoose.connect(
      `mongodb://${config.user}:${config.password}@${config.podName}-0.${config.host}:27017,${config.podName}-1.${config.host}:27017,${config.podName}-2.${config.host}:27017/?authSource=admin&replicaSet=rs0`,
      {
        dbName: config.dbName,
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
      },
    );
    console.log('Connected to Mongo DB');
    const users = await User.find({});
    console.log('users ', users);
  } catch (e) {
    console.log(e);
  }
};

export default connectDB;
