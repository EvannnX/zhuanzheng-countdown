import type { Tone } from '../shared/protocol.ts';

const NOTES: Record<Tone, readonly number[]> = {
  good: [660, 880],
  bad: [220, 160],
  alert: [520, 390, 520],
  info: [440],
};
const NOTE_SECONDS = 0.11;
const VOLUME = 0.06;

let context: AudioContext | null = null;

/** Tiny synthesised chime. Silently does nothing until the browser allows audio. */
export function chime(tone: Tone): void {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const ctx = context;
    NOTES[tone].forEach((frequency, i) => {
      const start = ctx.currentTime + i * NOTE_SECONDS;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone === 'bad' ? 'sawtooth' : 'triangle';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(VOLUME, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + NOTE_SECONDS);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + NOTE_SECONDS);
    });
  } catch (err) {
    console.warn('Audio unavailable', err);
  }
}
