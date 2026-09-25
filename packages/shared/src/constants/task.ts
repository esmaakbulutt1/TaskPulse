export const TASK_STATUSES = [
	'pending',
	'in_progress',
	'completed',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
