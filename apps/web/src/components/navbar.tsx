'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/constants/ui';
import { useLanguage } from '@/context/language-context';

export default function Navbar() {
	const pathname = usePathname();
	const { t } = useLanguage();

	return (
		<nav className="topbar__nav" aria-label={t.topBar.navigationLabel}>
			<Link href={ROUTES.home} className={pathname === ROUTES.home ? 'active' : ''}>
				{t.topBar.createTaskLink}
			</Link>
			<Link href={ROUTES.tasks} className={pathname === ROUTES.tasks || pathname.startsWith(`${ROUTES.tasks}/`) ? 'active' : ''}>
				{t.topBar.tasksLink}
			</Link>
			<Link href={ROUTES.profile} className={pathname === ROUTES.profile ? 'active' : ''}>
				{t.topBar.profileLink}
			</Link>
		</nav>
	);
}

