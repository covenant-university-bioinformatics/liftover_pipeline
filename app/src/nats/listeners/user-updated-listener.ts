import { Message } from 'node-nats-streaming';
import { Listener } from './base-listener';
import { Inject, Injectable } from '@nestjs/common';
import { AuthService } from '../../auth/services/auth.service';
import {Subjects, UserUpdatedEvent} from "@cubrepgwas/pgwascommon";

@Injectable()
export class UserUpdatedListener extends Listener<UserUpdatedEvent> {
  queueGroupName = 'liftover-jobs-service';
  readonly subject: Subjects.UserUpdated = Subjects.UserUpdated;

  @Inject(AuthService)
  private authService: AuthService;
  async onMessage(data: UserUpdatedEvent['data'], msg: Message): Promise<void> {
    // console.log('Personnel Event data!', data);

    const result = await this.authService.update(data);
    if (result.success) {
      msg.ack();
    }
  }
}
