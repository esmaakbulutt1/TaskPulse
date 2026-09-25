'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Task } from 'shared';
import { TrashIcon } from '@/components/trash-icon';
import { ROUTES } from '@/constants/ui';
import { useLanguage } from '@/context/language-context';
import { api } from '@/lib/api';
import { formatTaskDate } from '@/lib/task-format';

export default function TasksPage() {
	const { language, t } = useLanguage();
	const dateLocale = language === 'en' ? 'en-US' : 'tr-TR';

	const [tasks, setTasks] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		async function loadTasks() {
			try {
				const { items } = await api.tasks.list({ page: 1, perPage: 100 });

				if (active) {
					setTasks(items);
					setError(null);
				}
			} catch {
				if (active) setError(t.tasks.loadError);
			} finally {
				if (active) setIsLoading(false);
			}
		}

		void loadTasks();

		return () => {
			active = false;
		};
	}, [t.tasks.loadError]);

	async function handleDelete(taskId: string) {
		if (!window.confirm(t.tasks.deleteConfirm)) return;

		setDeletingTaskId(taskId);
		setDeleteError(null);

		try {
			await api.tasks.remove(taskId);
			setTasks((current) => current.filter((task) => task.id !== taskId));
		} catch {
			setDeleteError(t.tasks.deleteError);
		} finally {
			setDeletingTaskId(null);
		}
	}

	return (
		<main className="page-shell page-shell--wide">
			<section className="panel panel--large">
				<div className="section-header">
					<div>
						<p className="eyebrow">{t.tasks.eyebrow}</p>
						<h2>{t.tasks.title}</h2>
					</div>

					<div className="section-actions">
						<span className="pill pill--info">
							{tasks.length} {t.tasks.countSuffix}
						</span>
						<Link href={ROUTES.home} className="primary-button">
							{t.tasks.createButton}
						</Link>
					</div>
				</div>

				{deleteError ? <p className="inline-error">{deleteError}</p> : null}

				{isLoading ? (
					<div className="empty-state">
						<p>{t.tasks.loading}</p>
					</div>
				) : error ? (
					<div className="empty-state">
						<p>{error}</p>
					</div>
				) : tasks.length === 0 ? (
					<div className="empty-state">
						<p>{t.tasks.empty}</p>
					</div>
				) : (
					<div className="task-list">
						{tasks.map((task) => {
							const statusColor = task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'info';

							return (
								<article key={task.id} className="task-card">
									<div className="task-card__top">
										<h3>{task.title}</h3>
										<div className="task-card__top-actions">
											<span className={`pill pill--${statusColor}`}>{t.taskStatus[task.status]}</span>
											<button
												type="button"
												className="delete-icon-button"
												aria-label={t.tasks.deleteButton}
												title={t.tasks.deleteButton}
												disabled={deletingTaskId === task.id}
												onClick={() => void handleDelete(task.id)}
											>
												<TrashIcon />
											</button>
										</div>
									</div>

									<p>{task.description ?? t.tasks.emptyDescription}</p>

									<div className="task-card__meta">
										<span>{t.taskStatus[task.status]}</span>
										<span>{formatTaskDate(task.dueAt, dateLocale)}</span>
									</div>

									<Link href={ROUTES.taskDetail(task.id)} className="secondary-button">
										{t.tasks.detailButton}
									</Link>
								</article>
							);
						})}
					</div>
				)}
			</section>
		</main>
	);
}
