import { createApiClient } from 'shared';
import { ROUTES } from '@/constants/ui';

export const api = createApiClient({
	baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
	onSessionExpired: () => {
		if (typeof window !== 'undefined' && window.location.pathname !== ROUTES.register) {
			window.location.assign(ROUTES.register);
		}
	},
});
