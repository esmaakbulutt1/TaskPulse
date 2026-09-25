import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { NOTIFICATION_TYPES } from 'shared';
import { tasks } from './tasks';
import { users } from './users';

export const notificationType = pgEnum('notification_type', NOTIFICATION_TYPES);

export const notifications = pgTable(
	'notifications',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		taskId: uuid('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		type: notificationType('type').notNull(),
		title: text('title').notNull(),
		message: text('message').notNull(),
		readAt: timestamp('read_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex('notifications_task_id_type_uidx').on(table.taskId, table.type),
		index('notifications_user_id_created_at_idx').on(table.userId, table.createdAt),
		index('notifications_user_id_read_at_idx').on(table.userId, table.readAt),
	],
);

export type NotificationRow = typeof notifications.$inferSelect;
