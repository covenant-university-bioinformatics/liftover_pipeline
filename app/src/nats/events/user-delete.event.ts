import { Subjects } from './subject';
import { UserDeletedDto } from '../dto/userDeleted.dto';

export interface UserDeletedEvent {
  subject: Subjects.UserDeleted;
  data: UserDeletedDto;
}
