import { Subjects } from './subject';
import { NewUserDto } from '../dto/new-user.dto';

export interface UserApprovedEvent {
  subject: Subjects.UserApproved;
  data: NewUserDto;
}
