'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/language-context';

export default function ProfilePage() {
    const router = useRouter();
    const { t } = useLanguage();
  
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [surname, setSurname] = useState('');
    const [bday, setBday] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadProfile() {
            try {
                const { user } = await api.auth.me();
                if (active) {
                    setName(user.name);
                    setEmail(user.email);
                    setSurname(user.surname ?? '');
                    setBday(user.bday ?? '');
                    setError(null);
                }
            } catch {
                if (active) setError(t.profile.loadError);
            } finally {
                if (active) setIsChecking(false);
            }
        }

        void loadProfile();
        return () => {
            active = false;
        };
    }, [t.profile.loadError]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!name.trim()) {
            setError(t.profile.name);
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await api.auth.profile({
                name: name.trim(),
                surname: surname.trim() || undefined,
                bday: bday || undefined,
            });

            router.refresh();
        } catch {
            setError(t.profile.IsNotFindValue);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isChecking) {
        return (
            <main className="auth-shell">
                <section className="auth-card">
                    <p>{t.profile.loading}</p>
                </section>
            </main>
        );
    }

    return (
        <main className="auth-shell">
            <section className="auth-card">
                <div className="auth-logo" aria-hidden="true">
                    {t.topBar.logo}
                </div>

                <header className="auth-header">
                    <p className="eyebrow">{t.profile.eyebrow}</p>
                    <h1>{t.profile.title}</h1>
                </header>

                {error ? (
                    <div className="auth-error" role="alert">
                        {error}
                    </div>
                ) : null}

                <form className="task-form" onSubmit={handleSubmit}>
                    <label>
                        <span>{t.profile.nameLabel}</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={t.profile.namePlaceholder}
                            autoComplete="name"
                            minLength={2}
                            maxLength={120}
                            required
                            disabled={isSubmitting}
                        />
                    </label>

                    <label>
                        <span>{t.profile.surnameLabel}</span>
                        <input
                            value={surname}
                            onChange={(event) => setSurname(event.target.value)}
                            placeholder={t.profile.surnamePlaceholder}
                            autoComplete="surname"
                            maxLength={120}
                            disabled={isSubmitting}
                        />
                    </label>

                    <label>
                        <span>{t.profile.emailLabel}</span>
                        <input
                            type="email"
                            value={email}
                            placeholder={t.profile.emailPlaceholder}
                            autoComplete="email"
                            disabled
                        />
                    </label>

                    <label>
                        <span>{t.profile.bdayLabel}</span>
                        <input
                            type="date"
                            value={bday}
                            onChange={(event) => setBday(event.target.value)}
                            autoComplete="bday"
                            disabled={isSubmitting}
                        />
                    </label>

                    <button type="submit" className="primary-button" disabled={isSubmitting}>
                        {isSubmitting ? t.profile.savingButton : t.profile.saveButton}
                    </button>
                </form>
            </section>
        </main>
    );
}
