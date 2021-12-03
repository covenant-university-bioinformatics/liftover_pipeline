import { Message } from 'node-nats-streaming';
import { Listener } from './base-listener';
import { Inject, Injectable } from '@nestjs/common';
import { AuthService } from '../../auth/services/auth.service';
import {Subjects, UserApprovedEvent} from "@cubrepgwas/pgwascommon";

@Injectable()
export class UserApprovedListener extends Listener<UserApprovedEvent> {
  queueGroupName = 'liftover-jobs-service';
  readonly subject: Subjects.UserApproved = Subjects.UserApproved;

  @Inject(AuthService)
  private authService: AuthService;
  async onMessage(
    data: UserApprovedEvent['data'],
    msg: Message,
  ): Promise<void> {
    console.log('Personnel Event data!', data);

    const result = await this.authService.register(data);
    if (result.success) {
      console.log('user added');
      msg.ack();
    }
  }
}
