import { Message } from 'node-nats-streaming';
import { Listener } from './base-listener';
import { Subjects } from '../events/subject';
import { Inject, Injectable } from '@nestjs/common';
import { AuthService } from '../../auth/services/auth.service';
import { UserDeletedEvent } from '../events/user-delete.event';

@Injectable()
export class UserDeletedListener extends Listener<UserDeletedEvent> {
  queueGroupName = 'liftover-jobs-service';
  readonly subject: Subjects.UserDeleted = Subjects.UserDeleted;

  @Inject(AuthService)
  private authService: AuthService;
  async onMessage(data: UserDeletedEvent['data'], msg: Message): Promise<void> {
    // console.log('Jobs Event data!', data);

    const result = await this.authService.remove(data);
    if (result.success) {
      msg.ack();
    }
  }
}
