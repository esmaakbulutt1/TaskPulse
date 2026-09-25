import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsScheduler } from './notifications.scheduler';

@Module({
	imports: [AuthModule],
	controllers: [NotificationsController],
	providers: [NotificationsService, NotificationsScheduler],
})
export class NotificationsModule {}
