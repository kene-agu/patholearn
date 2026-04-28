/**
 * Web Audio API beep sounds — no external files, works in all modern browsers.
 * Each call creates and immediately destroys its own AudioContext so it's safe
 * to call from any component without resource leaks.
 */

function beep(frequency: number, durationMs: number, volume: number, delay = 0) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx  = new AudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    const start = ctx.currentTime + delay;
    const end   = start + durationMs / 1000;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.start(start);
    osc.stop(end);
    // Auto-close context once sound is done
    osc.onended = () => ctx.close();
  } catch {
    // Ignore — browser may have blocked AudioContext before user gesture
  }
}

/** Single gentle tick at 30-second warning */
export function playWarningBeep() {
  beep(660, 220, 0.35);
}

/** Two urgent beeps at 10-second warning */
export function playUrgentBeep() {
  beep(880, 120, 0.45);
  beep(880, 120, 0.45, 0.18);
}

/** Triple descending beep — time is up */
export function playTimeUpSound() {
  beep(880, 200, 0.5);
  beep(660, 200, 0.5, 0.25);
  beep(440, 400, 0.6, 0.5);
}
