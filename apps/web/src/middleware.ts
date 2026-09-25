import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from 'shared';
import { ROUTES } from '@/constants/ui';

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
	const isAuthPage = pathname === ROUTES.register;

	// 1. Oturum açmamış ve korumalı bir sayfaya (/, /profile, /tasks vb.) girmeye çalışıyorsa:
	if (!token && !isAuthPage) {
		const redirectUrl = new URL(ROUTES.register, request.url);
		return NextResponse.redirect(redirectUrl);
	}

	// 2. Zaten oturum açmış ve /register (giriş/kayıt) sayfasına girmeye çalışıyorsa:
	if (token && isAuthPage) {
		const redirectUrl = new URL(ROUTES.home, request.url);
		return NextResponse.redirect(redirectUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Statik dosyalar, resimler ve favicon dışındaki tüm sayfalarda çalış:
		 */
		'/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
	],
};

