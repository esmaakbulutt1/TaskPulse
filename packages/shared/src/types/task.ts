import type { TaskStatus } from '../constants/task';
import type { PaginationQuery } from './api';

export interface Task {
	id: string;
	title: string;
	description: string | null;
	dueAt: string;
	status: TaskStatus;
	createdAt: string;
	updatedAt: string;
}

export interface TaskCreateInput {
	title: string;
	description?: string;
	dueAt: string;
}

export interface TaskUpdateInput {
	title?: string;
	description?: string | null;
	dueAt?: string;
	status?: TaskStatus;
}

export interface TaskListQuery extends PaginationQuery {
	status?: TaskStatus;
}
