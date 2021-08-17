import { Message } from 'node-nats-streaming';
import { Listener } from './base-listener';
import { Subjects } from '../events/subject';
import { Inject, Injectable } from '@nestjs/common';
import { AuthService } from '../../auth/services/auth.service';
import { UserEmailConfirmChangeEvent } from '../dto/user-email-confirm-change.event';

@Injectable()
export class UserEmailConfirmChangeListener extends Listener<UserEmailConfirmChangeEvent> {
  queueGroupName = 'jobs-service';
  readonly subject: Subjects.EmailConfirmChange = Subjects.EmailConfirmChange;

  @Inject(AuthService)
  private authService: AuthService;
  async onMessage(
    data: UserEmailConfirmChangeEvent['data'],
    msg: Message,
  ): Promise<void> {
    // console.log('Jobs Event data!', data);

    const result = await this.authService.emailConfirmChange(data);
    if (result.success) {
      msg.ack();
    }
  }
}
