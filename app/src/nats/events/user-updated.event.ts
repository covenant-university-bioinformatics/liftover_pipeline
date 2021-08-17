import { Subjects } from './subject';
import { UserUpdatedDto } from '../dto/userUpdated.dto';

export interface UserUpdatedEvent {
  subject: Subjects.UserUpdated;
  data: UserUpdatedDto;
}
