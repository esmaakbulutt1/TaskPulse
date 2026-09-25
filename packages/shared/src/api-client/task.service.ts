import type { PaginationMeta } from '../types/api'; // Sayfalama bilgisinin tipi.
import type { Task, TaskCreateInput, TaskListQuery, TaskUpdateInput } from '../types/task';
import type { Requester } from './http';

function toQuery(params: Record<string, string | number | undefined>): string {
	const search = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) search.set(key, String(value));
	}

	const query = search.toString();
	return query ? `?${query}` : '';
}

export function createTaskService({ request, envelope }: Requester) {
	// request yalnızca data'yı, envelope ise data ile meta'yı döndürür.
	return {
		list: async (query: TaskListQuery = {}) => {
			const response = await envelope<Task[]>(`/api/v1/tasks${toQuery({ ...query })}`);

			return {
				items: response.data ?? [],
				meta: response.meta as unknown as PaginationMeta,
			};
		},

		get: (id: string) => request<Task>(`/api/v1/tasks/${id}`),

		create: (input: TaskCreateInput) =>
			request<Task>('/api/v1/tasks', {
				method: 'POST',
				body: JSON.stringify(input),
			}),

		update: (id: string, input: TaskUpdateInput) =>
			request<Task>(`/api/v1/tasks/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(input),
			}),

		remove: (id: string) =>
			request<null>(`/api/v1/tasks/${id}`, {
				method: 'DELETE',
			}),
	};
}
