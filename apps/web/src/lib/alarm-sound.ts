export function playAlarmSound(): void {
	try {
		const audioContext = new AudioContext();
		const startAt = audioContext.currentTime;

		for (const delay of [0, 0.28, 0.56]) {
			const oscillator = audioContext.createOscillator();
			const gain = audioContext.createGain();

			oscillator.type = 'sine';
			oscillator.frequency.value = 880;
			gain.gain.setValueAtTime(0.0001, startAt + delay);
			gain.gain.exponentialRampToValueAtTime(0.22, startAt + delay + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, startAt + delay + 0.2);
			oscillator.connect(gain);
			gain.connect(audioContext.destination);
			oscillator.start(startAt + delay);
			oscillator.stop(startAt + delay + 0.21);
		}

		window.setTimeout(() => void audioContext.close(), 1000);
		navigator.vibrate?.([180, 100, 180]);
	} catch {
		// Tarayıcı sesi engellese bile alarm penceresi ve bildirim sayısı çalışır.
	}
}

