import { Subjects } from '../events/subject';

export interface UserEmailConfirmChangeEvent {
  subject: Subjects.EmailConfirmChange;
  data: {
    username: string;
    email: string;
    emailConfirmed: boolean;
  };
}
