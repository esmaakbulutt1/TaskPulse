'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Notification as NotificationItem } from 'shared';

import { ROUTES } from '@/constants/ui';
import { useLanguage } from '@/context/language-context';
import { api } from '@/lib/api';
import { formatTaskDate } from '@/lib/task-format';

export default function NotificationsPage() {
	const router = useRouter();
	const { language, t } = useLanguage();
	const dateLocale = language === 'en' ? 'en-US' : 'tr-TR';

	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const unreadCount = notifications.filter((notification) => notification.readAt === null).length;

	useEffect(() => {
		let active = true;

		async function loadNotifications() {
			try {
				const { items } = await api.notifications.list({
					page: 1,
					perPage: 100,
				});

				if (active) {
					setNotifications(items);
					setError(null);
				}
			} catch {
				if (active) {
					setError(t.notifications.loadError);
				}
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		}

		const handleNotificationsChanged = () => {
			void loadNotifications();
		};

		void loadNotifications();
		window.addEventListener('notification-count-changed', handleNotificationsChanged);

		return () => {
			active = false;
			window.removeEventListener('notification-count-changed', handleNotificationsChanged);
		};
	}, [t.notifications.loadError]);

	async function handleNotificationClick(notification: NotificationItem) {
		try {
			if (notification.readAt === null) {
				const updatedNotification = await api.notifications.markRead(notification.id);

				setNotifications((current) => current.map((item) => (item.id === updatedNotification.id ? updatedNotification : item)));

				window.dispatchEvent(new Event('notification-count-changed'));
			}

			router.push(ROUTES.taskDetail(notification.taskId));
		} catch {
			setError(t.notifications.markReadError);
		}
	}

	async function handleMarkAllRead() {
		try {
			setIsUpdating(true);
			await api.notifications.markAllRead();

			const readAt = new Date().toISOString();

			setNotifications((current) =>
				current.map((notification) => ({
					...notification,
					readAt: notification.readAt ?? readAt,
				})),
			);

			window.dispatchEvent(new Event('notification-count-changed'));
		} catch {
			setError(t.notifications.markAllReadError);
		} finally {
			setIsUpdating(false);
		}
	}

	return (
		<main className="page-shell page-shell--wide">
			<section className="panel panel--large">
				<div className="section-header">
					<div>
						<p className="eyebrow">{t.notifications.eyebrow}</p>

						<h2>{t.notifications.title}</h2>
					</div>

					<button type="button" className="link-button" onClick={handleMarkAllRead} disabled={isUpdating || unreadCount === 0}>
						{t.notifications.markAllReadButton}
					</button>

					<span className="pill pill--warning">
						{unreadCount} {t.notifications.countSuffix}
					</span>
				</div>

				{isLoading ? (
					<div className="empty-state">
						<p>{t.notifications.loading}</p>
					</div>
				) : error ? (
					<div className="empty-state">
						<p>{error}</p>
					</div>
				) : notifications.length === 0 ? (
					<div className="empty-state">
						<p>{t.notifications.empty}</p>

						<Link href={ROUTES.home} className="primary-button">
							{t.notifications.createTaskButton}
						</Link>
					</div>
				) : (
					<div className="notification-list">
						{notifications.map((notification) => (
							<article key={notification.id} className="notification-item">
								<div className="notification-item__icon">!</div>

								<div>
									<h3>{notification.title}</h3>
									<p>{notification.message}</p>

									<small>
										{t.notifications.createdAtLabel} {formatTaskDate(notification.createdAt, dateLocale)}
									</small>
								</div>

								<button type="button" className="link-button" onClick={() => handleNotificationClick(notification)}>
									{t.notifications.detailButton}
								</button>
							</article>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
