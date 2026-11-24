import { TRAIN, type Lane } from '../shared/hazards.ts';
import type { AreaId } from '../shared/world.ts';
import type { Cue } from './soundCues.ts';

/** Every sound here is a real recording; sources and licences are in public/audio/CREDITS.md. */
export const LOOP_FILES = {
  birds: 'amb_home_birds.mp3',
  officeRoom: 'amb_office_room.mp3',
  typing: 'amb_office_typing.mp3',
  fan: 'amb_office_fan.mp3',
  traffic: 'amb_street_traffic.mp3',
  crowd: 'amb_plaza_crowd.mp3',
  trainRide: 'amb_train_ride.mp3',
  carPass: 'veh_car_pass.mp3',
  forklift: 'veh_forklift.mp3',
} as const;
export type LoopId = keyof typeof LOOP_FILES;
export const LOOP_IDS = Object.keys(LOOP_FILES) as LoopId[];

export const SHOT_FILES = {
  trainPass: 'fx_train_pass.mp3',
  doorOpen: 'fx_door_open.mp3',
  doorClose: 'fx_door_close.mp3',
  liftDing: 'fx_lift_ding.mp3',
  step1: 'fx_step1.mp3',
  step2: 'fx_step2.mp3',
  step3: 'fx_step3.mp3',
  step4: 'fx_step4.mp3',
} as const;
export type ShotId = keyof typeof SHOT_FILES;
export const STEP_SHOTS: readonly ShotId[] = ['step1', 'step2', 'step3', 'step4'];

export type MusicTrack = 'office' | 'commute';

/** What a place sounds like: quiet music underneath, recorded ambience on top. */
export interface Scene {
  readonly music: MusicTrack;
  readonly musicVolume: number;
  readonly beds: Partial<Record<LoopId, number>>;
}

export const SCENES: Partial<Record<AreaId, Scene>> = {
  home: { music: 'office', musicVolume: 0.14, beds: { birds: 0.5, traffic: 0.04 } },
  street: { music: 'commute', musicVolume: 0.1, beds: { traffic: 0.55 } },
  subway: { music: 'commute', musicVolume: 0.09, beds: { crowd: 0.18 } },
  train: { music: 'commute', musicVolume: 0.09, beds: { trainRide: 0.5 } },
  plaza: { music: 'commute', musicVolume: 0.12, beds: { crowd: 0.3, traffic: 0.22 } },
  office: { music: 'office', musicVolume: 0.14, beds: { officeRoom: 0.3, fan: 0.12, typing: 0.1 } },
  warehouse: { music: 'office', musicVolume: 0.09, beds: {} },
  lift: { music: 'office', musicVolume: 0.1, beds: { fan: 0.1 } },
};
/** Places this file has not heard of yet: music only, rather than the wrong ambience. */
export const DEFAULT_SCENE: Scene = { music: 'office', musicVolume: 0.12, beds: {} };
export const NIGHT_SCENE: Scene = { music: 'office', musicVolume: 0.12, beds: { traffic: 0.08 } };

/** A loop that follows the vehicles on screen: loudest when one is next to you. */
export interface VehicleSound {
  readonly loop: LoopId;
  readonly area: AreaId;
  readonly kinds: readonly Lane['kind'][];
  readonly volume: number;
  /** Share of `volume` you hear however far away the vehicles are. */
  readonly floor: number;
  /** Metres at which a vehicle is half as loud as when it is on top of you. */
  readonly halfDistance: number;
}

export const VEHICLE_SOUNDS: readonly VehicleSound[] = [
  { loop: 'forklift', area: 'warehouse', kinds: ['forklift'], volume: 0.6, floor: 0.15, halfDistance: 6 },
  { loop: 'carPass', area: 'street', kinds: ['car', 'bus'], volume: 0.6, floor: 0, halfDistance: 8 },
];

/** The pass-by recording swells for about two seconds before it peaks. */
const TRAIN_PASS_LEAD = 1.5;
/** The warning beeps in the door recording end with the doors shutting this long after it starts. */
const DOOR_CLOSE_LEAD = 4.8;
const TRAIN_DEPART_LEAD = 0.5;

/** Platform sounds, timed against the metro's cycle in shared/hazards.ts. */
export const TRAIN_AREA: AreaId = 'subway';
export const TRAIN_CUES: readonly Cue<ShotId>[] = [
  { at: TRAIN.period - TRAIN_PASS_LEAD, sound: 'trainPass' },
  { at: TRAIN.arrive, sound: 'doorOpen' },
  { at: TRAIN.open - DOOR_CLOSE_LEAD, sound: 'doorClose' },
  { at: TRAIN.open - TRAIN_DEPART_LEAD, sound: 'trainPass' },
];

const STEP_VOLUME = 0.22;
export const SHOT_VOLUMES: Record<ShotId, number> = {
  trainPass: 0.8,
  doorOpen: 0.5,
  doorClose: 0.4,
  liftDing: 0.35,
  step1: STEP_VOLUME,
  step2: STEP_VOLUME,
  step3: STEP_VOLUME,
  step4: STEP_VOLUME,
};
/** Landing from a jump is the same shoe on the same floor, only harder. */
export const LAND_BOOST = 1.8;
export const LIFT_AREA: AreaId = 'lift';
