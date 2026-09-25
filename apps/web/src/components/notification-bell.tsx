'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ROUTES } from '@/constants/ui';
import { useLanguage } from '@/context/language-context';
import { api } from '@/lib/api';

export default function NotificationBell() {
	const { t } = useLanguage();
	const [count, setCount] = useState(0);

	useEffect(() => {
		let active = true;

		async function syncCount() {
			try {
				const result = await api.notifications.unreadCount();

				if (active) {
					setCount(result.count);
				}
			} catch {
				if (active) {
					setCount(0);
				}
			}
		}

		const handleCountChanged = () => {
			void syncCount();
		};

		void syncCount();
		const pollingTimer = window.setInterval(syncCount, 30_000);
		window.addEventListener('notification-count-changed', handleCountChanged);

		return () => {
			active = false;
			window.clearInterval(pollingTimer);
			window.removeEventListener('notification-count-changed', handleCountChanged);
		};
	}, []);

	return (
		<Link href={ROUTES.notifications} className="topbar__bell" aria-label={t.topBar.bellLabel}>
			<span aria-hidden="true">{t.topBar.bellIcon}</span>
			{count > 0 && <span className="topbar__badge">{count}</span>}
		</Link>
	);
}

