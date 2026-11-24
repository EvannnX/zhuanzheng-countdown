/** One rung of the graphics ladder. */
export interface QualityLevel {
  readonly name: string;
  /** Upper bound on the device pixel ratio the canvas renders at. */
  readonly pixelRatio: number;
  readonly shadows: boolean;
  readonly mirrors: boolean;
}

export const QUALITY_LEVELS: readonly QualityLevel[] = [
  { name: '高', pixelRatio: 1.5, shadows: true, mirrors: true },
  { name: '中', pixelRatio: 1, shadows: true, mirrors: true },
  { name: '低', pixelRatio: 1, shadows: false, mirrors: false },
  { name: '极低', pixelRatio: 0.7, shadows: false, mirrors: false },
];

/** Start-up compiles shaders and stutters; frame times only count after this. */
const WARM_UP_SECONDS = 4;
const SAMPLE_SECONDS = 2;
/** Below this the game steps down a level on its own. */
const MIN_FPS = 32;

export interface Quality {
  /** Feed every frame's duration; drops a level when the machine cannot keep up. */
  update(dt: number): void;
  /** Step to the next level by hand (wraps round) and return its name. */
  cycle(): string;
}

/**
 * Keeps slow machines playable: it only ever steps *down* automatically, so the
 * picture never flickers between levels; going back up is a deliberate key press.
 */
export function createQuality(apply: (level: QualityLevel) => void, announce: (text: string) => void): Quality {
  let index = 0;
  let age = 0;
  let frames = 0;
  let elapsed = 0;
  const set = (next: number): void => {
    index = next;
    frames = 0;
    elapsed = 0;
    apply(QUALITY_LEVELS[index]);
  };
  apply(QUALITY_LEVELS[index]);

  return {
    update(dt) {
      age += dt;
      if (age < WARM_UP_SECONDS) return;
      frames += 1;
      elapsed += dt;
      if (elapsed < SAMPLE_SECONDS) return;
      const fps = frames / elapsed;
      frames = 0;
      elapsed = 0;
      if (fps >= MIN_FPS || index >= QUALITY_LEVELS.length - 1) return;
      set(index + 1);
      announce(`画面卡顿，已自动降到「${QUALITY_LEVELS[index].name}」画质（按 P 可手动切换）`);
    },
    cycle() {
      set((index + 1) % QUALITY_LEVELS.length);
      return QUALITY_LEVELS[index].name;
    },
  };
}
