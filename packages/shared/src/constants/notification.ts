export const NOTIFICATION_TYPES = ['task_due'] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];