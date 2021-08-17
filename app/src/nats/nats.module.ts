import { Module, OnModuleInit } from '@nestjs/common';
import { natsFactory } from './natsclient.factory';
import { UserApprovedListener } from './listeners/user-approved-listener';
import { UserUpdatedListener } from './listeners/user-updated-listener';
import { UserDeletedListener } from './listeners/user-delete-listener';
import { UserEmailConfirmChangeListener } from './listeners/user-email-confirm-change-listener';

@Module({
  providers: [
    natsFactory,
    UserApprovedListener,
    UserUpdatedListener,
    UserDeletedListener,
    UserEmailConfirmChangeListener,
  ],
  exports: [
    UserApprovedListener,
    UserUpdatedListener,
    UserDeletedListener,
    UserEmailConfirmChangeListener,
  ],
})
export class NatsModule implements OnModuleInit {
  onModuleInit() {
    console.log(`The NATS module has been initialized.`);
  }
}
