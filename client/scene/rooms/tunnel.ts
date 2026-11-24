import type * as THREE from 'three';
import { PLATFORM_EDGE_Z, WALL_HEIGHT, areaById } from '../../../shared/world.ts';
import { fuse } from '../fuse.ts';
import { ball, box, glow, group, shiny } from '../kit.ts';

const STATION = areaById('subway');
/** How far the running tunnel is modelled beyond each end of the station. */
const TUNNEL_REACH = 50;
/** The modelled tunnel, end cap to end cap. The train is only drawn inside it. */
export const TUNNEL = { x0: STATION.x0 - TUNNEL_REACH, x1: STATION.x1 + TUNNEL_REACH } as const;
/** Centre line of the track the platform train runs on. */
export const TRACK_Z = 607.9;

const FULL = TUNNEL.x1 - TUNNEL.x0;
const MID_X = (TUNNEL.x0 + TUNNEL.x1) / 2;
const SOUTH_FACE_Z = STATION.z1 - 0.2;
const NORTH_FACE_Z = PLATFORM_EDGE_Z;
const HALF_GAUGE = 0.75;
const THIRD_RAIL_Z = 609.3;
const SLEEPER_PITCH = 0.7;
const RIB_PITCH = 2;
const LAMP_PITCH = 5;
const BLUE_LIGHT_PITCH = 20;
const CONCRETE = '#2a2d31';
const CONCRETE_RIB = '#3a3e44';
const SOOT = '#0d0e10';
/** Nested patches of fading light under each lamp, widest and dimmest first. */
const POOL_STEPS: readonly { w: number; h: number; color: string }[] = [
  { w: 3, h: 2.2, color: '#121110' },
  { w: 2.2, h: 1.6, color: '#1b1912' },
  { w: 1.5, h: 1.1, color: '#272317' },
  { w: 0.9, h: 0.6, color: '#3a3421' },
];
const SIGNAL_Z = 609.5;
const LENSES: readonly { on: string; off: string }[] = [
  { on: '#22c55e', off: '#0f2f1a' },
  { on: '#eab308', off: '#3a3008' },
  { on: '#ef4444', off: '#3a1010' },
];

const every = (from: number, to: number, pitch: number): number[] => Array.from({ length: Math.max(0, Math.floor((to - from) / pitch) + 1) }, (_, i) => from + i * pitch);

/** Ballast, sleepers, running rails and the covered third rail, end to end. */
function track(): THREE.Object3D[] {
  return [
    box(FULL, 0.02, STATION.z1 - PLATFORM_EDGE_Z, '#141517', MID_X, 0.012, (PLATFORM_EDGE_Z + STATION.z1) / 2),
    ...every(TUNNEL.x0 + 0.4, TUNNEL.x1 - 0.2, SLEEPER_PITCH).map((x) => box(0.22, 0.05, 2.3, '#3b2f25', x, 0.035, TRACK_Z)),
    ...[-HALF_GAUGE, HALF_GAUGE].map((o) => box(FULL, 0.1, 0.07, shiny('#8d949b'), MID_X, 0.09, TRACK_Z + o)),
    box(FULL, 0.1, 0.16, '#d9d9d4', MID_X, 0.2, THIRD_RAIL_Z),
    ...every(TUNNEL.x0 + 1, TUNNEL.x1 - 1, 2.9).map((x) => box(0.1, 0.2, 0.2, '#2a2a2c', x, 0.1, THIRD_RAIL_Z)),
  ];
}

/** The wall behind the track: one sooty face through station and tunnel, with riveted columns and cable runs. */
function southWall(): THREE.Object3D[] {
  return [
    box(FULL, WALL_HEIGHT, 0.1, SOOT, MID_X, WALL_HEIGHT / 2, SOUTH_FACE_Z + 0.05),
    ...every(TUNNEL.x0 + 1, TUNNEL.x1 - 1, RIB_PITCH).flatMap((x) => [box(0.16, WALL_HEIGHT, 0.04, '#22262a', x, WALL_HEIGHT / 2, SOUTH_FACE_Z - 0.18), box(0.04, WALL_HEIGHT, 0.16, '#22262a', x, WALL_HEIGHT / 2, SOUTH_FACE_Z - 0.1)]),
    ...[1.95, 2.06, 2.17].map((y, i) => box(FULL, 0.035, 0.035, i === 1 ? '#5b2a12' : '#34383d', MID_X, y, SOUTH_FACE_Z - 0.23)),
  ];
}

/** One running tunnel beyond a station end: `dir` is -1 for the west bore, +1 for the east. */
function bore(dir: 1 | -1): THREE.Object3D[] {
  const mouth = dir === 1 ? STATION.x1 : STATION.x0;
  const end = mouth + dir * TUNNEL_REACH;
  const cx = (mouth + end) / 2;
  const [a, b] = [Math.min(mouth, end), Math.max(mouth, end)];
  const depth = STATION.z1 - NORTH_FACE_Z + 0.3;
  // Each lamp throws a pool on its wall; the pools are unlit so they read at any distance.
  const lamp = (x: number, z: number, out: number): THREE.Object3D[] => [
    ...POOL_STEPS.map((step, i) => box(step.w, step.h, 0.02, glow(step.color), x, 2.42 - step.h * 0.42, z + out * i * 0.006)),
    box(0.4, 0.09, 0.07, glow('#ffe9a8'), x, 2.42, z + out * 0.04),
  ];
  return [
    box(TUNNEL_REACH - 0.3, WALL_HEIGHT, 0.2, CONCRETE, cx + dir * 0.15, WALL_HEIGHT / 2, NORTH_FACE_Z - 0.1),
    ...every(a + 1, b - 0.5, RIB_PITCH).map((x) => box(0.2, WALL_HEIGHT, 0.07, CONCRETE_RIB, x, WALL_HEIGHT / 2, NORTH_FACE_Z + 0.03)),
    box(TUNNEL_REACH, 0.1, depth, SOOT, cx, WALL_HEIGHT + 0.03, NORTH_FACE_Z + depth / 2 - 0.2),
    ...every(a + 2, b - 1, 4).map((x) => box(0.3, 0.16, depth - 0.3, CONCRETE_RIB, x, WALL_HEIGHT - 0.1, NORTH_FACE_Z + depth / 2 - 0.2)),
    ...every(a + 2.5, b - 1, LAMP_PITCH).flatMap((x) => [...lamp(x, NORTH_FACE_Z + 0.08, 1), ...lamp(x + 1, SOUTH_FACE_Z - 0.26, -1)]),
    ...every(a + 9.5, b - 1, BLUE_LIGHT_PITCH).map((x) => ball(0.07, glow('#3b82f6'), x, 1.7, NORTH_FACE_Z + 0.08)),
    // the far end is simply lost in the dark
    box(0.2, WALL_HEIGHT, depth, glow('#020203'), end - dir * 0.1, WALL_HEIGHT / 2, NORTH_FACE_Z + depth / 2 - 0.2),
  ];
}

/** Three-aspect signal on a post beside the third rail; its lenses face `facing` along x. */
function signal(x: number, facing: 1 | -1, lit: number): THREE.Object3D[] {
  return [
    box(0.05, 1.6, 0.05, '#1b1c1e', x, 0.8, SIGNAL_Z),
    box(0.14, 0.66, 0.24, '#0b0b0c', x, 1.9, SIGNAL_Z),
    box(0.2, 0.03, 0.28, '#0b0b0c', x + facing * 0.05, 2.24, SIGNAL_Z),
    ...LENSES.map((lens, i) => box(0.02, 0.13, 0.13, glow(i === lit ? lens.on : lens.off), x + facing * 0.075, 2.1 - i * 0.2, SIGNAL_Z)),
  ];
}

/** Iron frame where the platform wall stops and the bore begins, plus the sill the rails cross. */
function portal(x: number, inward: 1 | -1): THREE.Object3D[] {
  return [
    box(0.5, WALL_HEIGHT, 0.3, '#17453a', x, WALL_HEIGHT / 2, NORTH_FACE_Z),
    ...[0.5, 1.3, 2.1].flatMap((y) => [-0.08, 0.08].map((o) => ball(0.016, '#0f2f28', x + inward * 0.25, y, NORTH_FACE_Z + o))),
    box(0.16, 0.11, SOUTH_FACE_Z - NORTH_FACE_Z, '#0a0b0c', x + inward * 0.11, 0.055, (NORTH_FACE_Z + SOUTH_FACE_Z) / 2),
  ];
}

/**
 * Track and tunnel from end cap to end cap. Everything is baked into meshes
 * anchored in the middle of the station, so the whole run is drawn (and hidden)
 * together with the station even where it reaches towards other places.
 */
export function tunnelRun(): THREE.Object3D {
  const parts = [
    ...track(),
    ...southWall(),
    ...bore(-1),
    ...bore(1),
    ...portal(STATION.x0, 1),
    ...portal(STATION.x1, -1),
    ...signal(STATION.x0 - 9, 1, 2),
    ...signal(STATION.x1 + 11, -1, 0),
    ...signal(STATION.x1 + 36, -1, 1),
  ];
  const anchor = { x: (STATION.x0 + STATION.x1) / 2, z: TRACK_Z };
  return fuse([group(-anchor.x, 0, -anchor.z, ...parts)], anchor.x, 0, anchor.z);
}
