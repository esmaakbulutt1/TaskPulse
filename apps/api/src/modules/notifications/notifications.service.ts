import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import type { PaginationMeta } from 'shared';
import { DRIZZLE, type Database } from '../../core/db/drizzle.module';
import { notifications } from '../../core/db/schema';
import type { ListNotificationsDto, NotificationResponseDto, UnreadNotificationCountResponseDto } from './dto';

const notificationResponseSelection = {
	id: notifications.id,
	taskId: notifications.taskId,
	type: notifications.type,
	title: notifications.title,
	message: notifications.message,
	readAt: notifications.readAt,
	createdAt: notifications.createdAt,
};

@Injectable()
export class NotificationsService {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async list(userId: string, query: ListNotificationsDto): Promise<{ items: NotificationResponseDto[]; meta: PaginationMeta }> {
		const where = eq(notifications.userId, userId);

		const [items, [totals]] = await Promise.all([
			this.db.select(notificationResponseSelection).from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(query.perPage).offset(query.offset),
			this.db.select({ value: count() }).from(notifications).where(where),
		]);

		const total = totals?.value ?? 0;
		return {
			items,
			meta: {
				total,
				page: query.page,
				perPage: query.perPage,
				totalPages: Math.ceil(total / query.perPage),
			},
		};
	}

	async unreadCount(userId: string): Promise<UnreadNotificationCountResponseDto> {
		const [result] = await this.db
			.select({ count: count() })
			.from(notifications)
			.where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

		return { count: result?.count ?? 0 };
	}

	async markRead(userId: string, id: string): Promise<NotificationResponseDto> {
		const [notification] = await this.db
			.update(notifications)
			.set({ readAt: new Date() })
			.where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
			.returning(notificationResponseSelection);

		if (!notification) {
			throw new NotFoundException('notification_not_found');
		}

		return notification;
	}

	async markAllRead(userId: string): Promise<void> {
		await this.db
			.update(notifications)
			.set({ readAt: new Date() })
			.where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
	}
}
