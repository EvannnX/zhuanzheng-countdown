import type * as THREE from 'three';
import { WALL_HEIGHT } from '../../shared/world.ts';
import { box, glass, shiny } from './kit.ts';
import type { Paint } from './kit.ts';
import { isTiled, masonry, tiledBox } from './masonry.ts';

export const WALL_T = 0.2;
const STEEL_FRAME = '#2a2e35';
const SASH = '#3a2f29';
const STONE = '#d9d2c2';
const IRON = '#1c1c1e';
const BLIND = '#e5e0d2';
const SILL_Y = 0.9;
const HEAD_Y = 2.5;
const SASH_BAY = 0.95;
const PANE_WIDTH = 1.2;
const TRANSOM_DROP = 0.55;
const PARAPET_HEIGHT = 0.55;
const RAIL_TOP = 1.1;
const PICKET_GAP = 0.16;
/** Clear height under the half-raised roll-up doors: the forklift mast passes below. */
export const DOCK_CLEAR = 2.4;
export const DOCK_WIDTH = 2.6;

export type Axis = 'x' | 'z';

export interface Win {
  readonly axis: Axis;
  readonly at: number;
  readonly from: number;
  readonly to: number;
  readonly sill?: number;
  readonly head?: number;
  readonly blind?: boolean;
  /** Pre-war double-hung timber sashes instead of a steel curtain-wall grid. */
  readonly sash?: boolean;
}

/** A box running along a wall line: `a..b` along the line, centred on `at`. Masonry paints get metre-scaled UVs. */
export function along(axis: Axis, at: number, a: number, b: number, y0: number, y1: number, thickness: number, p: Paint, offset = 0): THREE.Mesh {
  const length = b - a;
  const mid = (a + b) / 2;
  const height = y1 - y0;
  const [w, d, x, z] = axis === 'z' ? [length, thickness, mid, at + offset] : [thickness, length, at + offset, mid];
  return isTiled(p) ? tiledBox(w, height, d, p, x, y0 + height / 2, z) : box(w, height, d, p, x, y0 + height / 2, z);
}

/** Outer walls on the low-coordinate edge of their building (office/flat west and north, warehouse west). */
const LOW_EDGE_WALLS = [0, 300];
/** +1 when the room interior is on the positive side of an outer wall. */
const inward = (at: number): number => (LOW_EDGE_WALLS.includes(at) ? 1 : -1);

/** The wall above and below an opening. */
const infill = (w: Win, sill: number, head: number, finish: Paint): THREE.Object3D[] => [
  ...(sill > 0 ? [along(w.axis, w.at, w.from, w.to, 0, sill, WALL_T, finish)] : []),
  along(w.axis, w.at, w.from, w.to, head, WALL_HEIGHT, WALL_T, finish),
];

/** Steel-framed office glazing: slim dark mullions and a transom, like a converted loft. */
function steelWindow(w: Win, finish: Paint): THREE.Object3D[] {
  const sill = w.sill ?? SILL_Y;
  const head = w.head ?? HEAD_Y;
  const inside = inward(w.at);
  const frosted = w.sill !== undefined;
  const frame = shiny(STEEL_FRAME);
  const panes = Math.max(1, Math.round((w.to - w.from) / PANE_WIDTH));
  const step = (w.to - w.from) / panes;
  const bar = (a: number, b: number, y0: number, y1: number, t = 0.1): THREE.Mesh => along(w.axis, w.at, a, b, y0, y1, t, frame);
  return [
    ...infill(w, sill, head, finish),
    bar(w.from, w.to, sill, sill + 0.06, 0.24),
    bar(w.from, w.to, head - 0.06, head, 0.24),
    bar(w.from, w.from + 0.06, sill, head, 0.24),
    bar(w.to - 0.06, w.to, sill, head, 0.24),
    ...Array.from({ length: panes - 1 }, (_, i) => bar(w.from + step * (i + 1) - 0.022, w.from + step * (i + 1) + 0.022, sill, head)),
    ...(frosted ? [] : [bar(w.from + 0.06, w.to - 0.06, head - TRANSOM_DROP - 0.02, head - TRANSOM_DROP + 0.02)]),
    along(w.axis, w.at, w.from + 0.06, w.to - 0.06, sill + 0.06, head - 0.06, 0.02, frosted ? glass('#ffffff', 0.7) : glass()),
    along(w.axis, w.at, w.from - 0.06, w.to + 0.06, sill - 0.05, sill, 0.24, STONE, inside * 0.2),
    ...(w.blind ? [along(w.axis, w.at, w.from + 0.08, w.to - 0.08, head - 0.5, head - 0.04, 0.025, BLIND, inside * 0.09), along(w.axis, w.at, w.from + 0.08, w.to - 0.08, head - 0.54, head - 0.5, 0.04, frame, inside * 0.09)] : []),
  ];
}

/** One double-hung sash bay: box frame, meeting rail, 2-over-2 muntins and a pair of brass lifts. */
function sashBay(w: Win, a: number, b: number, inside: number): THREE.Object3D[] {
  const mid = (SILL_Y + HEAD_Y) / 2;
  const centre = (a + b) / 2;
  const frame = (from: number, to: number, y0: number, y1: number, t: number, offset = 0): THREE.Mesh => along(w.axis, w.at, from, to, y0, y1, t, SASH, offset);
  return [
    frame(a, a + 0.07, SILL_Y, HEAD_Y, 0.22),
    frame(b - 0.07, b, SILL_Y, HEAD_Y, 0.22),
    frame(a, b, HEAD_Y - 0.07, HEAD_Y, 0.22),
    frame(a, b, SILL_Y, SILL_Y + 0.05, 0.22),
    // upper sash sits in the outer track, lower sash in the inner one
    frame(a + 0.07, b - 0.07, mid - 0.03, mid + 0.03, 0.05, -inside * 0.035),
    frame(a + 0.07, b - 0.07, mid - 0.03, mid + 0.03, 0.05, inside * 0.035),
    frame(a + 0.07, b - 0.07, SILL_Y + 0.05, SILL_Y + 0.13, 0.05, inside * 0.035),
    frame(centre - 0.014, centre + 0.014, mid, HEAD_Y - 0.07, 0.035, -inside * 0.035),
    frame(centre - 0.014, centre + 0.014, SILL_Y + 0.13, mid, 0.035, inside * 0.035),
    ...[-0.16, 0.16].map((o) => along(w.axis, w.at, centre + o - 0.03, centre + o + 0.03, SILL_Y + 0.075, SILL_Y + 0.1, 0.03, shiny('#c9a227'), inside * 0.07)),
    along(w.axis, w.at, a + 0.07, b - 0.07, SILL_Y + 0.05, HEAD_Y - 0.07, 0.016, glass('#dcebf2', 0.16)),
  ];
}

/** Pre-war sash windows in a row, under a stone lintel and over a deep painted stool. */
function sashWindow(w: Win, finish: Paint): THREE.Object3D[] {
  const inside = inward(w.at);
  const bays = Math.max(1, Math.round((w.to - w.from) / SASH_BAY));
  const step = (w.to - w.from) / bays;
  return [
    ...infill(w, SILL_Y, HEAD_Y, finish),
    ...Array.from({ length: bays }, (_, i) => sashBay(w, w.from + step * i, w.from + step * (i + 1), inside)).flat(),
    along(w.axis, w.at, w.from - 0.1, w.to + 0.1, HEAD_Y, HEAD_Y + 0.16, 0.03, STONE, inside * (WALL_T / 2 + 0.015)),
    along(w.axis, w.at, w.from - 0.08, w.to + 0.08, SILL_Y - 0.05, SILL_Y, 0.26, '#efe9dc', inside * 0.2),
    along(w.axis, w.at, w.from - 0.08, w.to + 0.08, SILL_Y - 0.13, SILL_Y - 0.05, 0.03, '#efe9dc', inside * (WALL_T / 2 + 0.015)),
  ];
}

export const windowUnit = (w: Win, finish: Paint): THREE.Object3D[] => (w.sash ? sashWindow(w, finish) : steelWindow(w, finish));

/**
 * A loading-dock opening with its steel roll-up door parked half open: the
 * forklift lanes run straight through, so nothing may sit below DOCK_CLEAR.
 */
export function dockUnit(w: Win, finish: Paint, door: THREE.Material): THREE.Object3D[] {
  const inside = inward(w.at);
  const steel = shiny('#3b3f45');
  const hazard = (a: number): THREE.Object3D[] =>
    Array.from({ length: 8 }, (_, i) => along(w.axis, w.at, a - 0.07, a + 0.07, i * 0.3, i * 0.3 + 0.3, WALL_T + 0.06, i % 2 === 0 ? '#facc15' : '#18181b'));
  return [
    along(w.axis, w.at, w.from, w.to, HEAD_Y + 0.2, WALL_HEIGHT, WALL_T, finish),
    // drum housing and the lowered part of the slatted curtain
    along(w.axis, w.at, w.from - 0.1, w.to + 0.1, HEAD_Y - 0.1, HEAD_Y + 0.3, 0.34, steel, inside * 0.12),
    along(w.axis, w.at, w.from, w.to, DOCK_CLEAR, HEAD_Y + 0.2, 0.05, door, -inside * 0.02),
    along(w.axis, w.at, w.from, w.to, DOCK_CLEAR - 0.06, DOCK_CLEAR, 0.09, '#facc15', -inside * 0.02),
    ...hazard(w.from),
    ...hazard(w.to),
    along(w.axis, w.at, w.from, w.to, 0, 0.012, WALL_T + 0.3, shiny('#6b7078')),
  ];
}

/** Roof-terrace edge: a low brick parapet with stone coping and an iron picket rail on top. */
export function parapet(axis: Axis, at: number, a: number, b: number): THREE.Object3D[] {
  const pickets = Math.max(2, Math.round((b - a) / PICKET_GAP));
  const step = (b - a) / pickets;
  return [
    along(axis, at, a, b, 0, PARAPET_HEIGHT, 0.26, masonry('redBrick')),
    along(axis, at, a - 0.02, b + 0.02, PARAPET_HEIGHT, PARAPET_HEIGHT + 0.07, 0.34, STONE),
    along(axis, at, a, b, RAIL_TOP - 0.05, RAIL_TOP, 0.06, IRON),
    along(axis, at, a, b, PARAPET_HEIGHT + 0.16, PARAPET_HEIGHT + 0.19, 0.03, IRON),
    ...Array.from({ length: pickets + 1 }, (_, i) => along(axis, at, a + i * step - 0.011, a + i * step + 0.011, PARAPET_HEIGHT + 0.07, RAIL_TOP - 0.05, 0.022, IRON)),
  ];
}
