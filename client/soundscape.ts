import { TRAIN } from '../shared/hazards.ts';
import type { AreaId } from '../shared/world.ts';
import { createSoundBank, type SoundBank } from './soundBank.ts';
import { cuesCrossed, strideAfter, vehicleProximity, type Listener } from './soundCues.ts';
import {
  DEFAULT_SCENE,
  LAND_BOOST,
  LIFT_AREA,
  LOOP_FILES,
  LOOP_IDS,
  NIGHT_SCENE,
  SCENES,
  SHOT_FILES,
  SHOT_VOLUMES,
  STEP_SHOTS,
  TRAIN_AREA,
  TRAIN_CUES,
  VEHICLE_SOUNDS,
  type LoopId,
  type MusicTrack,
  type Scene,
  type ShotId,
} from './soundscapeScenes.ts';

export type { Listener } from './soundCues.ts';

const MUSIC_FADE_PER_SECOND = 0.8;

export interface Soundscape {
  /**
   * Call every frame: fades towards what the current place should sound like.
   * With a listener, vehicles get louder as they pass and the player's own steps are heard.
   */
  update(dt: number, area: AreaId, night: boolean, listener?: Listener): void;
  /** Returns true when sound is now muted. */
  toggleMute(): boolean;
}

type Bank = SoundBank<LoopId, ShotId>;

function musicLoop(track: MusicTrack): HTMLAudioElement {
  const audio = new Audio(`./audio/${track}.mp3`);
  audio.loop = true;
  audio.volume = 0;
  return audio;
}

function fadeMusic(audio: HTMLAudioElement, target: number, dt: number): void {
  const step = MUSIC_FADE_PER_SECOND * dt;
  audio.volume = Math.max(0, Math.min(1, audio.volume + Math.max(-step, Math.min(step, target - audio.volume))));
}

/** Volume of one ambience loop: the place's own bed plus any vehicle on screen that makes this sound. */
function loopVolume(id: LoopId, scene: Scene, area: AreaId, listener: Listener | undefined): number {
  const bed = scene.beds[id] ?? 0;
  if (!listener) return bed;
  return VEHICLE_SOUNDS.filter((v) => v.loop === id && v.area === area).reduce((sum, v) => {
    const near = vehicleProximity(area, v.kinds, listener, listener.time, v.halfDistance);
    return sum + v.volume * (v.floor + (1 - v.floor) * near);
  }, bed);
}

/** What the last frame looked like, to notice steps, landings, doors and the passing of time. */
interface Memory {
  readonly area: AreaId;
  readonly listener: Listener | undefined;
  readonly carried: number;
}

/** Plays the one-shot effects for whatever happened since the last frame; returns the distance carried towards the next footstep. */
function playEvents(bank: Bank, before: Memory, area: AreaId, listener: Listener | undefined): number {
  if (before.area !== area && (area === LIFT_AREA || before.area === LIFT_AREA)) bank.play('liftDing', SHOT_VOLUMES.liftDing);
  const previous = before.listener;
  if (!listener || !previous) return 0;
  if (area === TRAIN_AREA) {
    for (const sound of cuesCrossed(TRAIN_CUES, TRAIN.period, previous.time, listener.time)) bank.play(sound, SHOT_VOLUMES[sound]);
  }
  const step = STEP_SHOTS[Math.floor(Math.random() * STEP_SHOTS.length)] as ShotId;
  if (previous.airborne && !listener.airborne) bank.play(step, SHOT_VOLUMES[step] * LAND_BOOST);
  if (listener.airborne) return 0;
  const stride = strideAfter(before.carried, Math.hypot(listener.x - previous.x, listener.z - previous.z));
  if (stride.hasStepped) bank.play(step, SHOT_VOLUMES[step]);
  return stride.carried;
}

/** Browsers refuse to play until the user has clicked or pressed a key, so everything starts lazily. */
export function createSoundscape(): Soundscape {
  const music: Record<MusicTrack, HTMLAudioElement> = { office: musicLoop('office'), commute: musicLoop('commute') };
  let bank: Bank | null = null;
  let isMuted = false;
  let hasStarted = false;
  let memory: Memory | null = null;

  const start = (): void => {
    if (hasStarted) return;
    hasStarted = true;
    for (const audio of Object.values(music)) audio.play().catch((err: unknown) => console.warn('Music could not start', err));
    try {
      const context = new AudioContext();
      bank = createSoundBank(context, LOOP_FILES, SHOT_FILES);
      bank.setMuted(isMuted);
      // Some browsers only unlock audio on the release of a click, after this has already run.
      const resume = (): void => {
        if (context.state === 'suspended') context.resume().catch((err: unknown) => console.warn('Audio could not resume', err));
      };
      window.addEventListener('pointerup', resume);
      window.addEventListener('keydown', resume);
    } catch (err) {
      console.warn('Ambient sound is unavailable', err);
    }
  };
  window.addEventListener('pointerdown', start, { once: true });
  window.addEventListener('keydown', start, { once: true });

  return {
    update(dt, area, night, listener) {
      if (!hasStarted) return;
      const scene = night ? NIGHT_SCENE : (SCENES[area] ?? DEFAULT_SCENE);
      const here = night ? undefined : listener;
      for (const track of Object.keys(music) as MusicTrack[]) {
        fadeMusic(music[track], scene.music === track && !isMuted ? scene.musicVolume : 0, dt);
      }
      if (!bank) return;
      for (const id of LOOP_IDS) bank.setLoop(id, loopVolume(id, scene, area, here));
      const carried = memory ? playEvents(bank, memory, area, here) : 0;
      memory = { area, listener: here, carried };
    },
    toggleMute() {
      isMuted = !isMuted;
      bank?.setMuted(isMuted);
      return isMuted;
    },
  };
}
