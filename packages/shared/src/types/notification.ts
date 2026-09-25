import type { NotificationType } from '../constants/notification';

export interface Notification {
	id: string;
	taskId: string;
	type: NotificationType;
	title: string;
	message: string;
	readAt: string | null;
	createdAt: string;
}

export interface UnreadNotificationCount {
	count: number;
}
