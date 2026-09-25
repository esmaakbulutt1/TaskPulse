import type { TaskStatus } from 'shared';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	pending: 'Bekliyor',
	in_progress: 'İşlemde',
	completed: 'Tamamlandı',
};

export function formatTaskDate(date: string, locale: string = 'tr-TR'): string {
	return new Intl.DateTimeFormat(locale, {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(date));
}
