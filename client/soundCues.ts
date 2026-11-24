import { LANES, vehiclesAt, type Lane } from '../shared/hazards.ts';

/** Where the player's ears are, and what the shared room clock says. */
export interface Listener {
  readonly x: number;
  readonly z: number;
  /** Room time in seconds: vehicles and the metro are pure functions of it. */
  readonly time: number;
  readonly airborne: boolean;
}

/**
 * 0..1 loudness of the nearest vehicle of these kinds in this place:
 * 1 on top of it, 0.5 at `halfDistance` metres, fading with the square of distance.
 */
export function vehicleProximity(
  area: string,
  kinds: readonly Lane['kind'][],
  at: { readonly x: number; readonly z: number },
  time: number,
  halfDistance: number,
): number {
  let nearest = Infinity;
  for (const lane of LANES) {
    if (lane.area !== area || !kinds.includes(lane.kind)) continue;
    for (const vx of vehiclesAt(lane, time)) nearest = Math.min(nearest, Math.hypot(at.x - vx, at.z - lane.z));
  }
  if (!Number.isFinite(nearest)) return 0;
  const ratio = nearest / halfDistance;
  return 1 / (1 + ratio * ratio);
}

export interface Cue<S extends string> {
  /** Seconds into each cycle at which the sound starts. */
  readonly at: number;
  readonly sound: S;
}

/** A longer gap than this is a clock correction or a paused tab, not time passing. */
const MAX_CUE_GAP_SECONDS = 1;

/** Sounds whose moment in a repeating cycle fell inside (previous, now]. */
export function cuesCrossed<S extends string>(cues: readonly Cue<S>[], period: number, previous: number, now: number): S[] {
  const elapsed = now - previous;
  if (elapsed <= 0 || elapsed > MAX_CUE_GAP_SECONDS) return [];
  return cues
    .filter((cue) => {
      const sinceCue = (((previous - cue.at) % period) + period) % period;
      return sinceCue + elapsed >= period;
    })
    .map((cue) => cue.sound);
}

/** Ground covered between two footstep sounds. */
export const STEP_METRES = 1.5;
/** Moving further than this in one frame is a teleport (doors, lifts, the metro), not walking. */
const MAX_FRAME_METRES = 2;

/** Adds this frame's movement to the distance carried since the last footstep. */
export function strideAfter(carried: number, moved: number): { carried: number; hasStepped: boolean } {
  if (moved > MAX_FRAME_METRES) return { carried: 0, hasStepped: false };
  const total = carried + moved;
  return total >= STEP_METRES ? { carried: total - STEP_METRES, hasStepped: true } : { carried: total, hasStepped: false };
}
