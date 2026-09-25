import type { Metadata } from 'next';
import './globals.css';
import TopBar from '@/components/top-bar';
import { LanguageProvider } from '@/context/language-context';

export const metadata: Metadata = {
	title: 'TaskPulse ',
	description: 'Görev oluşturma ve bildirim takibi arayüzü',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="tr">
			<body>
				<LanguageProvider>
					<TopBar />
					{children}
				</LanguageProvider>
			</body>
		</html>
	);
}
