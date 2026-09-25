'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { ROUTES } from '@/constants/ui';
import { useLanguage } from '@/context/language-context';
import { api } from '@/lib/api';

type TaskForm = {
	title: string;
	description: string;
	dueAt: string;
};

function toDateTimeLocalValue(date: Date): string {
	const offsetInMilliseconds = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offsetInMilliseconds).toISOString().slice(0, 16);
}

function createDefaultForm(): TaskForm {
	return {
		title: '',
		description: '',
		dueAt: toDateTimeLocalValue(new Date(Date.now() + 2 * 60 * 1000)),
	};
}

export default function HomePage() {
	const router = useRouter();
	const { t } = useLanguage();
	const [form, setForm] = useState<TaskForm>(createDefaultForm);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function handleChange<K extends keyof TaskForm>(field: K, value: TaskForm[K]) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!form.title.trim() || !form.dueAt) {
			setError(t.home.requiredFieldsError);
			return;
		}

		setError(null);
		setIsSubmitting(true);

		try {
			const task = await api.tasks.create({
				title: form.title.trim(),
				description: form.description.trim() || undefined,
				dueAt: new Date(form.dueAt).toISOString(),
			});

			router.push(ROUTES.taskDetail(task.id));
		} catch {
			setError(t.home.createError);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<main className="page-shell">
			<section className="panel">
				<div className="section-header">
					<div>
						<p className="eyebrow">{t.home.formEyebrow}</p>
						<h2>{t.home.formTitle}</h2>
					</div>
				</div>

				{error ? (
					<div className="empty-state">
						<p>{error}</p>
					</div>
				) : null}

				<form className="task-form" onSubmit={handleSubmit}>
					<label>
						<span>{t.home.titleLabel}</span>
						<input
							value={form.title}
							onChange={(event) => handleChange('title', event.target.value)}
							placeholder={t.home.titlePlaceholder}
							maxLength={200}
							required
						/>
					</label>

					<label>
						<span>{t.home.descriptionLabel}</span>
						<textarea
							value={form.description}
							onChange={(event) => handleChange('description', event.target.value)}
							placeholder={t.home.descriptionPlaceholder}
							rows={5}
							maxLength={5000}
						/>
					</label>

					<label>
						<span>{t.home.dueAtLabel}</span>
						<input
							type="datetime-local"
							value={form.dueAt}
							min={toDateTimeLocalValue(new Date())}
							onChange={(event) => handleChange('dueAt', event.target.value)}
							required
						/>
						<small className="field-hint">{t.home.dueAtHint}</small>
					</label>

					<button type="submit" className="primary-button" disabled={isSubmitting}>
						{isSubmitting ? t.home.savingButton : t.home.saveButton}
					</button>
				</form>
			</section>
		</main>
	);
}
