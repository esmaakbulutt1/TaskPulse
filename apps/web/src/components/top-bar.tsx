'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Navbar from '@/components/navbar';
import NotificationBell from '@/components/notification-bell';
import DueAlertModal from '@/components/due-alert-modal';
import { useTaskDueSocket } from '@/hooks/use-task-due-socket';
import { ROUTES } from '@/constants/ui';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/language-context';

export default function TopBar() {
	const pathname = usePathname();
	const isAuthPage = pathname === ROUTES.register;
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const { dueAlert, clearDueAlert } = useTaskDueSocket(!isAuthPage);
	const { language, setLanguage, t } = useLanguage();
	async function handleLogout() {
		setIsLoggingOut(true);

		try {
			await api.auth.logout();
			window.location.assign(ROUTES.register);
		} catch {
			window.alert(t.topBar.logoutError);
			setIsLoggingOut(false);
		}
	}

	if (isAuthPage) return null;

	return (
		<>
			<header className="topbar">
				<div className="topbar__brand-wrap">
					<div className="topbar__logo">{t.topBar.logo}</div>
					<div>
						<p className="topbar__eyebrow">{t.topBar.eyebrow}</p>
						<h1>{t.topBar.title}</h1>
					</div>
				</div>

				<Navbar />

				<div className="topbar__actions">
					<button 
						type="button" 
						className="topbar__logout" 
						onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
						title={language === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
					>
						{language === 'tr' ? 'EN' : 'TR'}
					</button>
					<NotificationBell />
					<button type="button" className="topbar__logout" disabled={isLoggingOut} onClick={() => void handleLogout()}>
						{isLoggingOut ? t.topBar.loggingOutButton : t.topBar.logoutButton}
					</button>
				</div>
			</header>

			<DueAlertModal alert={dueAlert} onClose={clearDueAlert} />
		</>
	);
}
