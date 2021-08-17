import { Subjects } from './subject';

type EmailFormat = {
  type: 'userRegistration' | 'forgotPassword' | 'emailUpdated' | 'informAdmin';
  recipient: {
    email: string;
    name?: string;
  };
  payload: {
    username: string;
    token?: string;
    content?: string;
  };
};
export interface EmailNotifyEvent {
  subject: Subjects.EmailNotify;
  data: EmailFormat;
}
