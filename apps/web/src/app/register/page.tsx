'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ApiError, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from 'shared';
import { ROUTES } from '@/constants/ui';
import { useLanguage } from '@/context/language-context';
import { api } from '@/lib/api';

type AuthMode = 'register' | 'login';

export default function RegisterPage() {
	const router = useRouter();
	const { language, setLanguage, t } = useLanguage();
	const [mode, setMode] = useState<AuthMode>('register');
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isRegister = mode === 'register';

	function changeMode(nextMode: AuthMode) {
		setMode(nextMode);
		setError(null);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!email.trim() || !password || (isRegister && !name.trim())) {
			setError(t.auth.requiredError);
			return;
		}

		setError(null);
		setIsSubmitting(true);

		try {
			if (isRegister) {
				await api.auth.register({
					name: name.trim(),
					email: email.trim(),
					password,
				});
			} else {
				await api.auth.login({
					email: email.trim(),
					password,
				});
			}

			router.replace(ROUTES.home);
			router.refresh();
		} catch (requestError) {
			if (requestError instanceof ApiError && requestError.status === 409) {
				setError(t.auth.emailTakenError);
			} else if (requestError instanceof ApiError && requestError.status === 401) {
				setError(t.auth.invalidCredentialsError);
			} else {
				setError(t.auth.requestError);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<main className="auth-shell">
			<section className="auth-card">
				<div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '-1rem' }}>
					<button
						type="button"
						className="topbar__logout"
						style={{ padding: '4px 10px', fontSize: '0.85rem' }}
						onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
						title={language === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
					>
						{language === 'tr' ? 'EN' : 'TR'}
					</button>
				</div>

				<div className="auth-logo" aria-hidden="true">
					{t.topBar.logo}
				</div>

				<header className="auth-header">
					<p className="eyebrow">{t.auth.eyebrow}</p>
					<h1>{isRegister ? t.auth.registerTitle : t.auth.loginTitle}</h1>
					<p>{isRegister ? t.auth.registerDescription : t.auth.loginDescription}</p>
				</header>

				{error ? (
					<div className="auth-error" role="alert">
						{error}
					</div>
				) : null}

				<form className="task-form" onSubmit={handleSubmit}>
					{isRegister ? (
						<label>
							<span>{t.auth.nameLabel}</span>
							<input
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder={t.auth.namePlaceholder}
								autoComplete="name"
								minLength={2}
								maxLength={120}
								required
								disabled={isSubmitting}
							/>
						</label>
					) : null}

					<label>
						<span>{t.auth.emailLabel}</span>
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder={t.auth.emailPlaceholder}
							autoComplete="email"
							maxLength={255}
							required
							disabled={isSubmitting}
						/>
					</label>

					<label>
						<span>{t.auth.passwordLabel}</span>
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete={isRegister ? 'new-password' : 'current-password'}
							minLength={PASSWORD_MIN_LENGTH}
							maxLength={PASSWORD_MAX_LENGTH}
							required
							disabled={isSubmitting}
						/>
						<small>{t.auth.passwordHint}</small>
					</label>

					<button type="submit" className="primary-button" disabled={isSubmitting}>
						{isRegister
							? isSubmitting
								? t.auth.registeringButton
								: t.auth.registerButton
							: isSubmitting
								? t.auth.loggingInButton
								: t.auth.loginButton}
					</button>
				</form>

				<p className="auth-switch">
					{isRegister ? t.auth.haveAccount : t.auth.noAccount}{' '}
					<button type="button" onClick={() => changeMode(isRegister ? 'login' : 'register')}>
						{isRegister ? t.auth.loginAction : t.auth.registerAction}
					</button>
				</p>
			</section>
		</main>
	);
}
