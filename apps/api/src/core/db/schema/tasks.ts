import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { TASK_STATUSES } from 'shared';
import { users } from './users';

export const taskStatus = pgEnum('task_status', TASK_STATUSES);

export const tasks = pgTable(
	'tasks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		status: taskStatus('status').notNull().default('pending'),
		dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
		reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
		isDeleted: boolean('is_deleted').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('tasks_user_id_created_at_idx').on(table.userId, table.createdAt), index('tasks_due_at_idx').on(table.dueAt)],
);

export type TaskRow = typeof tasks.$inferSelect;
