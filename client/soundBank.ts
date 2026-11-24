/** Loads recordings and plays them through Web Audio: looping beds with a volume each, and one-shot effects. */
export interface SoundBank<L extends string, S extends string> {
  /** Fades a looping recording towards this volume (0 = silent). Ignored until the file has loaded. */
  setLoop(id: L, volume: number): void;
  /** Plays an effect once. Ignored if the file has not loaded (or failed to). */
  play(id: S, volume: number): void;
  setMuted(isMuted: boolean): void;
}

const AUDIO_DIR = './audio/';
/** Time constant of volume changes, so nothing clicks on or off. */
const FADE_SECONDS = 0.35;
const MUTE_FADE_SECONDS = 0.05;
/** Volume changes smaller than this are not worth rescheduling. */
const VOLUME_EPSILON = 0.004;

async function loadBuffer(context: AudioContext, file: string): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(AUDIO_DIR + file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await context.decodeAudioData(await response.arrayBuffer());
  } catch (err) {
    console.warn(`Sound ${file} could not be loaded`, err);
    return null;
  }
}

function startLoop(context: AudioContext, out: AudioNode, buffer: AudioBuffer, volume: number): GainNode {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(volume, context.currentTime, FADE_SECONDS);
  source.connect(gain).connect(out);
  // Start somewhere random so two visits to a place do not open on the same second.
  source.start(0, Math.random() * buffer.duration);
  return gain;
}

/** Must be called from (or after) a user gesture, because it starts fetching and decoding straight away. */
export function createSoundBank<L extends string, S extends string>(
  context: AudioContext,
  loops: Readonly<Record<L, string>>,
  shots: Readonly<Record<S, string>>,
): SoundBank<L, S> {
  const master = context.createGain();
  master.connect(context.destination);
  const wanted = new Map<L, number>();
  const gains = new Map<L, GainNode>();
  const effects = new Map<S, AudioBuffer>();

  for (const id of Object.keys(loops) as L[]) {
    void loadBuffer(context, loops[id]).then((buffer) => {
      if (buffer) gains.set(id, startLoop(context, master, buffer, wanted.get(id) ?? 0));
    });
  }
  for (const id of Object.keys(shots) as S[]) {
    void loadBuffer(context, shots[id]).then((buffer) => {
      if (buffer) effects.set(id, buffer);
    });
  }

  return {
    setLoop(id, volume) {
      if (Math.abs((wanted.get(id) ?? 0) - volume) < VOLUME_EPSILON) return;
      wanted.set(id, volume);
      gains.get(id)?.gain.setTargetAtTime(volume, context.currentTime, FADE_SECONDS);
    },
    play(id, volume) {
      const buffer = effects.get(id);
      if (!buffer) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = volume;
      source.connect(gain).connect(master);
      source.start();
    },
    setMuted(isMuted) {
      master.gain.setTargetAtTime(isMuted ? 0 : 1, context.currentTime, MUTE_FADE_SECONDS);
    },
  };
}
