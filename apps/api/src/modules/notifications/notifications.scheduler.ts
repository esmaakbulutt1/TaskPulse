import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, isNull, lte, ne } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../core/db/drizzle.module';
import { notifications, tasks } from '../../core/db/schema';
import { EventsGateway } from '../../core/realtime/events.gateway';

@Injectable()
export class NotificationsScheduler {
	private readonly logger = new Logger(NotificationsScheduler.name);

	constructor(
		@Inject(DRIZZLE) private readonly db: Database,
		private readonly eventsGateway: EventsGateway,
	) {}

	@Cron(CronExpression.EVERY_SECOND, { waitForCompletion: true })
	async createDueNotifications(): Promise<void> {
		const now = new Date();
		const dueTasks = await this.db
			.select({
				id: tasks.id,
				userId: tasks.userId,
				title: tasks.title,
			})
			.from(tasks)
			.where(and(lte(tasks.dueAt, now), ne(tasks.status, 'completed'), eq(tasks.isDeleted, false), isNull(tasks.reminderSentAt)));

		for (const task of dueTasks) {
			try {
				const notification = await this.db.transaction(async (tx) => {
					const [claimedTask] = await tx
						.update(tasks)
						.set({ reminderSentAt: now, updatedAt: now })
						.where(and(eq(tasks.id, task.id), lte(tasks.dueAt, now), ne(tasks.status, 'completed'), eq(tasks.isDeleted, false), isNull(tasks.reminderSentAt)))
						.returning({ id: tasks.id });

					if (!claimedTask) return null;

					const [createdNotification] = await tx
						.insert(notifications)
						.values({
							userId: task.userId,
							taskId: task.id,
							type: 'task_due',
							title: 'Görev zamanı geldi',
							message: `"${task.title}" görevinin zamanı geldi.`,
						})
						.onConflictDoNothing()
						.returning({
							id: notifications.id,
							taskId: notifications.taskId,
							title: notifications.title,
						});

					return createdNotification ?? null;
				});

				if (!notification) continue;

				this.eventsGateway.sendToUser(task.userId, 'task.due', {
					notificationId: notification.id,
					taskId: notification.taskId,
					title: notification.title,
					message: `"${task.title}" görevinin zamanı geldi.`,
				});
			} catch (error) {
				this.logger.error(`Failed to create due notification for task ${task.id}`, error instanceof Error ? error.stack : String(error));
			}
		}
	}
}
