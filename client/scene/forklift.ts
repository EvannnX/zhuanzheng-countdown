import type * as THREE from 'three';
import { ball, box, cyl, glow, rbox, shiny, turn } from './kit.ts';
import { stamped, wheel } from './vehicles.ts';

/** Warehouse forklift, facing +x, inside its 2.4 x 1.3 lane footprint. */
const BODY = '#f59e0b';
const IRON = '#1f2937';
const IRON_LIGHT = '#374151';
const FORK_STEEL = '#9ca3af';
const PALLET = '#b08a5a';
const CARTON = '#c99657';
const TAPE = '#e9d7a8';
const SIDES = [-1, 1] as const;
const MAST_X = 0.34;
const GUARD_TOP = 2.06;
const FORK_Y = 0.2;

function chassis(): THREE.Object3D[] {
  return [
    rbox(1.2, 0.5, 1, shiny(BODY), -0.3, 0.56, 0, 0.08),
    box(1.1, 0.05, 0.9, IRON, -0.3, 0.83, 0),
    // cast counterweight with the gas bottle strapped on top
    rbox(0.46, 0.74, 1.04, IRON_LIGHT, -0.95, 0.68, 0, 0.14),
    turn(cyl(0.15, 0.15, 0.7, shiny('#e5e7eb'), -0.95, 1.2, 0, 14), 0, Math.PI / 2),
    ...SIDES.map((s) => box(0.34, 0.32, 0.03, IRON, -0.95, 1.2, s * 0.2)),
    ...SIDES.map((s) => box(0.03, 0.1, 0.16, glow('#ef4444'), -1.18, 0.8, s * 0.36)),
    ...SIDES.flatMap((s) => [...wheel(0.1, s * 0.52, 0.27, s, 0.2), ...wheel(-0.85, s * 0.48, 0.2, s, 0.16)]),
  ];
}

/** Seat, steering column and the operator in a hard hat. */
function cabin(): THREE.Object3D[] {
  return [
    rbox(0.44, 0.1, 0.46, '#111827', -0.5, 0.9, 0, 0.04),
    rbox(0.1, 0.44, 0.46, '#111827', -0.72, 1.14, 0, 0.04),
    turn(cyl(0.025, 0.025, 0.5, IRON, 0.0, 1.05, 0, 8), 0, 0, 0.5),
    turn(cyl(0.15, 0.15, 0.025, IRON, -0.12, 1.28, 0, 16), 0, 0, 0.5),
    ...SIDES.map((s) => cyl(0.014, 0.014, 0.28, IRON, 0.12, 1.0, s * 0.2, 6)),
    ...SIDES.map((s) => ball(0.03, '#dc2626', 0.12, 1.15, s * 0.2)),
    cyl(0.17, 0.2, 0.5, '#1d4ed8', -0.5, 1.2, 0, 10),
    rbox(0.3, 0.28, 0.3, '#f1c9a5', -0.48, 1.6, 0, 0.07),
    rbox(0.34, 0.1, 0.34, '#fde047', -0.48, 1.77, 0, 0.05),
    box(0.1, 0.02, 0.3, '#fde047', -0.3, 1.74, 0),
    ...SIDES.map((s) => box(0.14, 0.12, 0.34, '#334155', -0.32, 0.98, s * 0.1)),
  ];
}

/** Overhead guard: four posts and a slatted roof with the beacon and work lamps. */
function guard(): THREE.Object3D[] {
  const post = (x: number, s: number): THREE.Mesh => box(0.06, GUARD_TOP - 0.8, 0.06, shiny(IRON_LIGHT), x, (GUARD_TOP + 0.8) / 2, s * 0.47);
  return [
    ...SIDES.flatMap((s) => [post(0.16, s), post(-0.76, s), box(1.04, 0.06, 0.06, shiny(IRON_LIGHT), -0.3, GUARD_TOP, s * 0.47)]),
    ...[-0.76, -0.53, -0.3, -0.07, 0.16].map((x) => box(0.05, 0.04, 0.94, shiny(IRON_LIGHT), x, GUARD_TOP, 0)),
    cyl(0.07, 0.08, 0.04, IRON, -0.65, GUARD_TOP + 0.05, 0, 10),
    cyl(0.06, 0.06, 0.1, glow('#f97316'), -0.65, GUARD_TOP + 0.12, 0, 10),
    ...SIDES.map((s) => box(0.06, 0.08, 0.1, glow('#fff7d6'), 0.2, GUARD_TOP - 0.12, s * 0.47)),
  ];
}

/** Two-stage mast with lift chains, the ram, the carriage and its load guard. */
function mast(): THREE.Object3D[] {
  const links = Array.from({ length: 24 }, (_, i) => 0.42 + i * 0.075);
  return [
    ...SIDES.map((s) => box(0.1, 2.25, 0.1, shiny(IRON), MAST_X, 1.2, s * 0.34)),
    ...SIDES.map((s) => box(0.07, 1.9, 0.06, shiny(IRON_LIGHT), MAST_X + 0.02, 1.2, s * 0.25)),
    ...[0.45, 1.3, 2.3].map((y) => box(0.08, 0.08, 0.74, shiny(IRON), MAST_X, y, 0)),
    cyl(0.04, 0.04, 1.7, shiny('#cbd5e1'), MAST_X - 0.02, 1.1, 0, 10),
    ...SIDES.flatMap((s) => links.map((y, i) => box(i % 2 === 0 ? 0.03 : 0.018, 0.06, i % 2 === 0 ? 0.018 : 0.03, FORK_STEEL, MAST_X + 0.03, y, s * 0.12))),
    // carriage and load backrest
    ...[0.3, 0.62].map((y) => box(0.05, 0.08, 0.9, IRON, MAST_X + 0.1, y, 0)),
    ...[-0.42, -0.14, 0.14, 0.42].map((z) => box(0.03, 0.9, 0.03, IRON, MAST_X + 0.1, 0.9, z)),
    box(0.03, 0.04, 0.88, IRON, MAST_X + 0.1, 1.35, 0),
  ];
}

/** Forks carrying a pallet of taped cartons; odd loads get a third carton on top. */
function forksAndLoad(tall: boolean): THREE.Object3D[] {
  const cx = 0.83;
  const carton = (x: number, y: number, z: number, w: number, h: number, d: number): THREE.Object3D[] => [rbox(w, h, d, CARTON, x, y, z, 0.012), box(w + 0.004, 0.012, 0.06, TAPE, x, y + h / 2, z), box(0.14, 0.1, 0.004, '#f8fafc', x + 0.1, y, z + d / 2 + 0.001)];
  return [
    ...SIDES.flatMap((s) => [box(0.05, 0.5, 0.1, shiny(FORK_STEEL), MAST_X + 0.15, FORK_Y + 0.23, s * 0.2), box(0.7, 0.04, 0.1, shiny(FORK_STEEL), cx, FORK_Y, s * 0.2)]),
    ...[-0.4, 0, 0.4].map((z) => box(0.68, 0.09, 0.07, PALLET, cx, FORK_Y + 0.005, z)),
    ...[-0.28, 0, 0.28].map((o) => box(0.1, 0.02, 0.9, PALLET, cx + o, FORK_Y - 0.05, 0)),
    ...[-0.29, -0.145, 0, 0.145, 0.29].map((o) => box(0.11, 0.02, 0.9, PALLET, cx + o, FORK_Y + 0.06, 0)),
    ...carton(cx, FORK_Y + 0.27, -0.22, 0.6, 0.4, 0.4),
    ...carton(cx - 0.02, FORK_Y + 0.25, 0.22, 0.56, 0.36, 0.38),
    ...(tall ? carton(cx, FORK_Y + 0.62, -0.05, 0.5, 0.3, 0.46) : []),
  ];
}

export const makeForklift = (seed: number): THREE.Group => {
  const tall = Math.abs(Math.floor(seed)) % 2 === 0;
  return stamped(`forklift:${tall}`, () => [...chassis(), ...cabin(), ...guard(), ...mast(), ...forksAndLoad(tall)]);
};
