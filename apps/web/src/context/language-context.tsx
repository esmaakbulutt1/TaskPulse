'use client';

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { UI_TEXT } from '@/constants/ui';
import { UI_TEXT_EN } from '@/constants/ui.en';

export type Language = 'tr' | 'en';

type Translations = typeof UI_TEXT;

interface LanguageContextType {
	language: Language;
	setLanguage: (lang: Language) => void;
	t: Translations;
}

const dictionaries: Record<Language, Translations> = {
	tr: UI_TEXT,
	en: UI_TEXT_EN as unknown as Translations,
};

function subscribeLanguage(callback: () => void) {
	window.addEventListener('storage', callback);
	window.addEventListener('app-language-changed', callback);
	return () => {
		window.removeEventListener('storage', callback);
		window.removeEventListener('app-language-changed', callback);
	};
}

function getLanguageSnapshot(): Language {
	const saved = localStorage.getItem('app_lang');
	return saved === 'en' ? 'en' : 'tr';
}

function getServerLanguageSnapshot(): Language {
	return 'tr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
	const language = useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getServerLanguageSnapshot);

	const setLanguage = (lang: Language) => {
		try {
			localStorage.setItem('app_lang', lang);
			window.dispatchEvent(new Event('app-language-changed'));
		} catch {
			
		}
	};

	useEffect(() => {
		document.documentElement.lang = language;
	}, [language]);

	const t = dictionaries[language];

	return (
		<LanguageContext.Provider value={{ language, setLanguage, t }}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage(): LanguageContextType {
	const context = useContext(LanguageContext);
	if (!context) {
		throw new Error('useLanguage must be used within a LanguageProvider');
	}
	return context;
}