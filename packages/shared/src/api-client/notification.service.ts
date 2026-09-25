import type { PaginationMeta, PaginationQuery } from '../types/api';
import type { Notification, UnreadNotificationCount } from '../types/notification';
import type { Requester } from './http';

function toQuery(params: Record<string, number | undefined>): string {
	const search = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) search.set(key, String(value));
	}

	const query = search.toString();
	return query ? `?${query}` : '';
}

export function createNotificationService({ request, envelope }: Requester) {
	return {
		list: async (query: PaginationQuery = {}) => {
			const response = await envelope<Notification[]>(`/api/v1/notifications${toQuery({ ...query })}`);

			return {
				items: response.data ?? [],
				meta: response.meta as unknown as PaginationMeta,
			};
		},

		unreadCount: () => request<UnreadNotificationCount>('/api/v1/notifications/unread-count'),

		markRead: (id: string) =>
			request<Notification>(`/api/v1/notifications/${id}/read`, {
				method: 'PATCH',
			}),

		markAllRead: () =>
			request<void>('/api/v1/notifications/read-all', {
				method: 'PATCH',
			}),
	};
}
