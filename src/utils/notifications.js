// Notification and tranquil audio utilities

const isElectron = window.electronAPI?.isElectron || false;

// Synthesize a soothing Tibetan singing bowl chime via Web Audio API
export const playZenChime = () => {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        // Harmonic frequencies of a sacred Tibetan meditation chime
        const freqs = [528, 792, 1056];
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.25, now);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
        masterGain.connect(ctx.destination);

        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.detune.setValueAtTime(idx * 3.5, now);
            oscGain.gain.setValueAtTime(1 / (idx + 1.2), now);
            osc.connect(oscGain);
            oscGain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 3.3);
        });

        setTimeout(() => {
            ctx.close().catch(() => {});
        }, 3600);
    } catch {
        // audio context failed or blocked
    }
};

// Combined notification handler - triggers chime + optional OS notification
export const triggerNotification = (mode) => {
    // Play tranquil chime
    playZenChime();

    // Browser / system notification fallback
    if ('Notification' in window && Notification.permission === 'granted') {
        const messages = {
            focus: { title: '✨ 專注時間結束', body: '做得很好！已自動開始 5 分鐘休息。' },
            shortBreak: { title: '🌿 休息結束', body: '請回到電腦前點擊「繼續」開始下一段專注。' },
            longBreak: { title: '🌟 長休息結束', body: '身心充飽電，準備好請點擊「繼續」！' }
        };
        const msg = messages[mode] || messages.focus;
        try {
            new Notification(msg.title, {
                body: msg.body,
                icon: '/vite.svg',
                tag: 'pomodoro-timer',
                requireInteraction: false,
                silent: true
            });
        } catch {
            // notification failed
        }
    }
};

// 20-20-20 護眼提醒
export const triggerEyeReminder = () => {
    if (isElectron && window.electronAPI?.showEyeReminder) {
        window.electronAPI.showEyeReminder();
    }
};

// Request notification permission (for browser fallback)
export const requestNotificationPermission = async () => {
    if (isElectron) return true;
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
};
