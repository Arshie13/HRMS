import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationEvents } from './notification.events';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationEvents],
  exports: [NotificationService],
})
export class NotificationsModule {}
