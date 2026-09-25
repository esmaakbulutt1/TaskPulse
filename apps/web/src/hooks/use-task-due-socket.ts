'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/language-context';
import { playAlarmSound } from '@/lib/alarm-sound';
import type { DueAlert } from '@/components/due-alert-modal';

export function useTaskDueSocket(enabled: boolean) {
	const { t } = useLanguage();
	const tRef = useRef(t);

	useEffect(() => {
		tRef.current = t;
	}, [t]);

	const [dueAlert, setDueAlert] = useState<DueAlert | null>(null);

	useEffect(() => {
		if (!enabled) return;

		let socket: WebSocket | null = null;
		let reconnectTimer: number | undefined;
		let isActive = true;

		const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3000/ws';

		function handleMessage(event: MessageEvent<string>) {
			try {
				const message = JSON.parse(event.data) as {
					type?: string;
					data?: {
						taskId?: string;
						title?: string;
						message?: string;
					};
				};

				if (message.type === 'task.due') {
					if (message.data?.taskId) {
						playAlarmSound();
						setDueAlert({
							taskId: message.data.taskId,
							title: message.data.title ?? tRef.current.topBar.dueAlertTitle,
							message: message.data.message ?? tRef.current.topBar.dueAlertMessage,
						});
					}

					window.dispatchEvent(new Event('notification-count-changed'));
				}
			} catch {
				// Geçersiz bir WebSocket mesajı arayüzü bozmamalıdır.
			}
		}

		function handleClose(event: CloseEvent) {
			if (!isActive || event.code === 1008) return;

			reconnectTimer = window.setTimeout(connect, 3000);
		}

		function connect() {
			if (!isActive) return;

			socket = new WebSocket(wsUrl);
			socket.addEventListener('message', handleMessage);
			socket.addEventListener('close', handleClose);
		}

		connect();

		return () => {
			isActive = false;

			if (reconnectTimer !== undefined) {
				window.clearTimeout(reconnectTimer);
			}

			socket?.removeEventListener('message', handleMessage);
			socket?.removeEventListener('close', handleClose);
			socket?.close();
		};
	}, [enabled]);

	return {
		dueAlert,
		clearDueAlert: () => setDueAlert(null),
	};
}

