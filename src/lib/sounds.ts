/**
 * Tiny WebAudio beeps – no audio files, no autoplay. Only used when the user
 * has enabled sounds in the settings and after an interaction.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export type SoundKind = 'tick' | 'alert' | 'success' | 'party';

export function playSound(kind: SoundKind): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const tones: Record<SoundKind, { f: number[]; dur: number; type: OscillatorType }> = {
    tick: { f: [880], dur: 0.05, type: 'square' },
    alert: { f: [440, 330], dur: 0.12, type: 'sawtooth' },
    success: { f: [523, 659, 784], dur: 0.09, type: 'sine' },
    party: { f: [523, 659, 784, 1047], dur: 0.08, type: 'triangle' },
  };
  const t = tones[kind];
  t.f.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = t.type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * t.dur);
    gain.gain.exponentialRampToValueAtTime(0.08, now + i * t.dur + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (i + 1) * t.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + i * t.dur);
    osc.stop(now + (i + 1) * t.dur + 0.02);
  });
}
