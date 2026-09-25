'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, type Task, type TaskStatus } from 'shared';

import { TrashIcon } from '@/components/trash-icon';
import { ROUTES } from '@/constants/ui';
import { useLanguage } from '@/context/language-context';
import { api } from '@/lib/api';
import { formatTaskDate } from '@/lib/task-format';

export default function TaskDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const { language, t } = useLanguage();
	const dateLocale = language === 'en' ? 'en-US' : 'tr-TR';

	const [task, setTask] = useState<Task | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [statusError, setStatusError] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		async function loadTask() {
			try {
				const result = await api.tasks.get(params.id);

				if (active) {
					setTask(result);
				}
			} catch (error) {
				if (!active) return;

				if (error instanceof ApiError && error.status === 404) {
					setError(t.taskDetail.notFound);
				} else {
					setError(t.taskDetail.loadError);
				}
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		}

		loadTask();

		return () => {
			active = false;
		};
	}, [params.id, t.taskDetail.notFound, t.taskDetail.loadError]);

	async function handleStatusChange(status: TaskStatus) {
		if (!task || status === task.status) return;

		setIsUpdatingStatus(true);
		setStatusError(null);

		try {
			const updatedTask = await api.tasks.update(task.id, { status });
			setTask(updatedTask);
		} catch {
			setStatusError(t.taskDetail.statusUpdateError);
		} finally {
			setIsUpdatingStatus(false);
		}
	}

	async function handleDelete() {
		if (!task || !window.confirm(t.taskDetail.deleteConfirm)) return;

		setIsDeleting(true);
		setDeleteError(null);

		try {
			await api.tasks.remove(task.id);
			router.push(ROUTES.tasks);
		} catch {
			setDeleteError(t.taskDetail.deleteError);
			setIsDeleting(false);
		}
	}

	if (isLoading) {
		return (
			<main className="page-shell">
				<section className="panel">
					<p>{t.taskDetail.loading}</p>
				</section>
			</main>
		);
	}

	if (error || !task) {
		return (
			<main className="page-shell">
				<section className="panel">
					<p className="eyebrow">{t.taskDetail.notFound}</p>
					<h2>{error ?? t.taskDetail.notFound}</h2>

					<Link href={ROUTES.home} className="primary-button">
						{t.taskDetail.backHomeButton}
					</Link>
				</section>
			</main>
		);
	}

	const statusColor = task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'info';

	return (
		<main className="page-shell page-shell--wide">
			<section className="panel panel--large">
				<div className="section-header">
					<div>
						<p className="eyebrow">{t.taskDetail.eyebrow}</p>

						<h2>{task.title}</h2>
					</div>

					<div className="section-header__actions">
						<span className={`pill pill--${statusColor}`}>{t.taskStatus[task.status]}</span>
						<button
							type="button"
							className="delete-icon-button"
							aria-label={t.taskDetail.deleteButton}
							title={t.taskDetail.deleteButton}
							disabled={isDeleting}
							onClick={() => void handleDelete()}
						>
							<TrashIcon />
						</button>
					</div>
				</div>

				<div className="task-detail-grid">
					<div>
						<h3>{t.taskDetail.descriptionTitle}</h3>

						<p className="task-description">{task.description ?? t.taskDetail.emptyDescription}</p>
					</div>

					<div className="meta-stack">
						<div className="meta-card">
							<span>{t.taskDetail.statusLabel}</span>
							<select
								className="status-select"
								value={task.status}
								disabled={isUpdatingStatus}
								onChange={(event) => void handleStatusChange(event.target.value as TaskStatus)}
							>
								<option value="pending">{t.taskStatus.pending}</option>
								<option value="in_progress">{t.taskStatus.in_progress}</option>
								<option value="completed">{t.taskStatus.completed}</option>
							</select>
							{isUpdatingStatus ? <small>{t.taskDetail.statusUpdating}</small> : null}
							{statusError ? <small className="field-error">{statusError}</small> : null}
						</div>

						<div className="meta-card">
							<span>{t.taskDetail.dueAtLabel}</span>
							<strong>{formatTaskDate(task.dueAt, dateLocale)}</strong>
						</div>

						<div className="meta-card">
							<span>{t.taskDetail.createdAtLabel}</span>
							<strong>{formatTaskDate(task.createdAt, dateLocale)}</strong>
						</div>
					</div>
				</div>

				<div className="detail-actions">
					<Link href={ROUTES.home} className="secondary-button">
						{t.taskDetail.newTaskButton}
					</Link>

					<Link href={ROUTES.notifications} className="primary-button">
						{t.taskDetail.notificationsButton}
					</Link>
				</div>
				{deleteError ? <p className="inline-error">{deleteError}</p> : null}
			</section>
		</main>
	);
}
