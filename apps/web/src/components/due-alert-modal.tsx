'use client';

import Link from 'next/link';
import { ROUTES } from '@/constants/ui';
import { useLanguage } from '@/context/language-context';

export type DueAlert = {
	taskId: string;
	title: string;
	message: string;
};

type DueAlertModalProps = {
	alert: DueAlert | null;
	onClose: () => void;
};

export default function DueAlertModal({ alert, onClose }: DueAlertModalProps) {
	const { t } = useLanguage();
	if (!alert) return null;

	return (
		<div className="due-alert-backdrop" role="presentation">
			<section className="due-alert" role="alertdialog" aria-modal="true" aria-labelledby="due-alert-title">
				<div className="due-alert__icon" aria-hidden="true">
					🔔
				</div>
				<p className="eyebrow">{t.notifications.eyebrow}</p>
				<h2 id="due-alert-title">{alert.title}</h2>
				<p>{alert.message}</p>
				<div className="due-alert__actions">
					<button type="button" className="secondary-button" onClick={onClose}>
						{t.topBar.dueAlertCloseButton}
					</button>
					<Link href={ROUTES.taskDetail(alert.taskId)} className="primary-button" onClick={onClose}>
						{t.topBar.dueAlertDetailButton}
					</Link>
				</div>
			</section>
		</div>
	);
}

