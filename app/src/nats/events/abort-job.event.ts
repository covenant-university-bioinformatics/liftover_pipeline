import { Subjects } from './subject';

export interface AbortJobEvent {
  subject: Subjects.AbortJob;
  data: {
    jobId: string;
  };
}
