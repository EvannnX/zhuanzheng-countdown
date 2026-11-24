import * as THREE from 'three';
import type { Cue } from './scene/cast.ts';
import { byId } from './ui/dom.ts';

export type Point = readonly [number, number, number];

/** One camera move: the eye travels `from → to` while looking `lookFrom → lookTo`. */
export interface Shot {
  readonly from: Point;
  readonly to: Point;
  readonly lookFrom: Point;
  readonly lookTo: Point;
  readonly seconds: number;
  /** Subtitle shown for the length of the shot. */
  readonly text: string;
  /** Actors staged for this shot. A shot with a cast is filmed without the live players. */
  readonly cast?: readonly Cue[];
}

export interface Cutscene {
  isPlaying(): boolean;
  /** A staged shot is on: the live characters should be hidden. */
  isStaged(): boolean;
  /** Start a sequence; `onDone` fires when it ends or is skipped. */
  play(shots: readonly Shot[], onDone: () => void): void;
  skip(): void;
  /** Drive the camera for this frame. */
  update(dt: number, camera: THREE.PerspectiveCamera): void;
}

const FADE_SECONDS = 0.18;
const ease = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: Point, b: Point, t: number): THREE.Vector3 => new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

/** `direct` poses the actors of the current shot each frame, and clears them with `null`. */
export function createCutscene(direct: (cues: readonly Cue[] | null, t: number, dt: number) => void): Cutscene {
  const root = byId('cine');
  const caption = byId('cine-text');
  const fade = byId('cine-fade');
  let run: { shots: readonly Shot[]; index: number; clock: number; onDone: () => void } | null = null;

  const showShot = (shot: Shot): void => {
    caption.textContent = shot.text;
    // Restart the caption's entrance animation.
    caption.classList.remove('in');
    void caption.offsetWidth;
    caption.classList.add('in');
  };

  const finish = (): void => {
    const done = run?.onDone;
    run = null;
    root.hidden = true;
    direct(null, 0, 0);
    document.body.dataset.cine = '';
    done?.();
  };

  return {
    isPlaying: () => run !== null,
    isStaged: () => run?.shots[run.index].cast !== undefined,
    play(shots, onDone) {
      if (shots.length === 0) return onDone();
      run = { shots, index: 0, clock: 0, onDone };
      root.hidden = false;
      document.body.dataset.cine = '1';
      showShot(shots[0]);
    },
    skip: finish,
    update(dt, camera) {
      if (!run) return;
      const shot = run.shots[run.index];
      const t = Math.min(1, run.clock / shot.seconds);
      camera.position.copy(lerp(shot.from, shot.to, ease(t)));
      camera.lookAt(lerp(shot.lookFrom, shot.lookTo, ease(t)));
      direct(shot.cast ?? null, t, dt);
      // Dip to black at each cut.
      const edge = Math.min(run.clock, shot.seconds - run.clock);
      fade.style.opacity = String(Math.max(0, 1 - edge / FADE_SECONDS));
      run = { ...run, clock: run.clock + dt };
      if (run.clock < shot.seconds) return;
      if (run.index + 1 >= run.shots.length) return finish();
      run = { ...run, index: run.index + 1, clock: 0 };
      showShot(run.shots[run.index]);
    },
  };
}
