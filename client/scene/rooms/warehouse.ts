import type * as THREE from 'three';
import { box, cyl, glass, glow, group, pick, rbox, shiny, textPlane, turn } from '../kit.ts';
import { PALLET_HEIGHT, pallet } from '../loftParts.ts';
import { DARK, STEEL, WHITE, bin, cardboardBox, keyboardSet, monitor, mug } from '../parts.ts';
import { conveyor } from './warehouseConveyor.ts';
import { palletLoad } from './warehouseStock.ts';
import { warehouseDecor } from './warehouseDecor.ts';
import type { Builder, RoomArt } from './types.ts';

const RACK_BLUE = '#1f4e9c';
const BEAM = '#e8632b';
const RACK_HEIGHT = 2.7;
/** Top of the load beams; the floor is the first storage level. */
const BEAM_LEVELS = [0.98, 1.84];
const POST_INSET = 0.085;
/** End frames sit this far inside the footprint so their column guards do not poke out. */
const FRAME_INSET = 0.08;
const BENCH_TOP = 0.88;
const HAZARD = '#facc15';

/** One upright frame of the racking: two posts tied by horizontals and zig-zag bracing, with column guards. */
function uprightFrame(d: number): THREE.Object3D[] {
  const z = d / 2 - POST_INSET;
  const span = z * 2 - 0.07;
  const rungs = [0.16, 0.96, 1.76, 2.56];
  const slope = Math.atan2(0.8, span);
  return [
    ...[-z, z].flatMap((pz) => [box(0.09, RACK_HEIGHT, 0.07, shiny(RACK_BLUE), 0, RACK_HEIGHT / 2, pz), box(0.16, 0.012, 0.13, DARK, 0, 0.006, pz), rbox(0.14, 0.34, 0.14, HAZARD, 0, 0.18, pz, 0.02)]),
    ...rungs.map((y) => box(0.04, 0.04, span, shiny(RACK_BLUE), 0, y, 0)),
    ...rungs.slice(0, 3).map((y, i) => turn(box(0.03, 0.03, Math.hypot(span, 0.8), shiny(RACK_BLUE), 0, y + 0.4, 0), 0, i % 2 === 0 ? slope : -slope)),
  ];
}

/** One beam level of a bay: step beams front and back, wire decking and location labels. */
function beamLevel(bayW: number, d: number, y: number): THREE.Object3D[] {
  const z = d / 2 - POST_INSET;
  return [
    ...[-z, z].flatMap((bz) => [box(bayW - 0.1, 0.11, 0.05, shiny(BEAM), 0, y - 0.055, bz), ...[-1, 1].map((s) => box(0.04, 0.18, 0.06, shiny(BEAM), s * (bayW / 2 - 0.07), y - 0.07, bz))]),
    box(bayW - 0.14, 0.016, z * 2 - 0.06, '#a3a8ae', 0, y + 0.008, 0),
    ...[-0.9, -0.3, 0.3, 0.9].map((x) => box(0.03, 0.03, z * 2 - 0.06, '#7d838a', x, y - 0.02, 0)),
    ...[-0.68, 0.68].map((x) => box(0.2, 0.07, 0.004, WHITE, x, y - 0.055, z + 0.028)),
  ];
}

/** Selective pallet racking, two bays wide: floor level plus two beam levels of palletised stock. */
export const rack: Builder = (w, d, index) => {
  const bayW = w / 2 - FRAME_INSET;
  const levels = [0, ...BEAM_LEVELS.map((y) => y + 0.016)];
  const clear = [BEAM_LEVELS[0] - 0.11, BEAM_LEVELS[1] - BEAM_LEVELS[0] - 0.13, RACK_HEIGHT - BEAM_LEVELS[1] - 0.04].map((gap) => gap - PALLET_HEIGHT - 0.06);
  const tag = textPlane(`${'ABCDEF'[index % 6]}-0${(index % 3) + 1}`, 0.4, 0.24, { bg: '#111827', fg: HAZARD });
  tag.position.set(-w / 2 + FRAME_INSET + 0.16, 2.3, d / 2 - 0.04);
  const stock = [-1, 1].flatMap((bay) =>
    levels.flatMap((y, level) =>
      [-0.68, 0.68].flatMap((x, slot) => {
        const seed = index * 7 + level * 5 + slot * 3 + (bay + 1);
        if (seed % 5 === 4) return [];
        return [group((bay * w) / 4 + x, y, 0, pallet(1.2, d - 0.42), group(0, PALLET_HEIGHT, 0, ...palletLoad(seed, clear[level])))];
      }),
    ),
  );
  return [
    ...[-w / 2 + FRAME_INSET, 0, w / 2 - FRAME_INSET].map((x) => group(x, 0, 0, ...uprightFrame(d))),
    ...[-1, 1].flatMap((bay) => BEAM_LEVELS.map((y) => group((bay * w) / 4, 0, 0, ...beamLevel(bayW, d, y)))),
    ...stock,
    tag,
  ];
};

/** Hand pallet truck: forks, pump housing and tiller. */
function palletJack(): THREE.Group {
  return group(
    0, 0, 0,
    ...[-0.2, 0.2].flatMap((z) => [box(1.1, 0.05, 0.16, shiny(HAZARD), 0.25, 0.085, z), turn(cyl(0.04, 0.04, 0.12, DARK, 0.7, 0.04, z, 10), 0, Math.PI / 2)]),
    rbox(0.22, 0.34, 0.5, shiny(HAZARD), -0.36, 0.22, 0, 0.03),
    ...[-0.12, 0.12].map((z) => turn(cyl(0.09, 0.09, 0.06, DARK, -0.4, 0.09, z, 12), 0, Math.PI / 2)),
    turn(box(0.04, 0.9, 0.04, DARK, -0.52, 0.76, 0), 0, 0, 0.32),
    box(0.04, 0.04, 0.34, DARK, -0.66, 1.18, 0),
  );
}

/** A marked staging bay: painted outline, one wrapped pallet waiting, a stack of empties and the pallet jack. */
export const bay: Builder = (w, d, index) => [
  ...[-1, 1].map((s) => box(w, 0.008, 0.1, HAZARD, 0, 0.006, s * (d / 2 - 0.05))),
  ...[-1, 1].map((s) => box(0.1, 0.008, d - 0.2, HAZARD, s * (w / 2 - 0.05), 0.006, 0)),
  ...[-3, -1, 1, 3].map((i) => turn(box(0.08, 0.008, d * 0.5, HAZARD, i * 0.24, 0.006, 0), 0.7)),
  group(-w / 4 - 0.1, 0, 0, pallet(1.2, 1), group(0, PALLET_HEIGHT, 0, ...palletLoad(index, 0.9))),
  ...[0, 1, 2, 3].map((i) => turn(group(w / 4 + 0.2, i * PALLET_HEIGHT, -0.05, pallet(1.2, 1)), (i % 2) * 0.06)),
  turn(group(0.15, 0, 0.42, palletJack()), 0.15),
];

/** Packing bench: butcher-block top, pegboard back with a shelf and light, label printer, scale, tape and wrap. */
export const packDesk: Builder = (w, d, index) => {
  const back = -d / 2 + 0.06;
  return [
    rbox(w, 0.05, d - 0.1, '#c9a676', 0, BENCH_TOP - 0.025, 0, 0.012),
    ...[-1, 1].flatMap((sx) => [box(0.05, BENCH_TOP - 0.05, 0.05, shiny(STEEL), sx * (w / 2 - 0.06), (BENCH_TOP - 0.05) / 2, d / 2 - 0.12), box(0.05, 1.78, 0.05, shiny(STEEL), sx * (w / 2 - 0.06), 0.89, back)]),
    box(w - 0.14, 0.03, d - 0.24, shiny(STEEL), 0, 0.28, 0),
    box(w - 0.14, 0.62, 0.02, '#d8d2c2', 0, 1.3, back),
    rbox(w, 0.03, 0.32, '#c9a676', 0, 1.72, back + 0.12, 0.01),
    box(w - 0.3, 0.025, 0.06, glow('#fff8e1'), 0, 1.69, back + 0.2),
    group(-w / 2 + 0.42, 1.735, back + 0.12, cardboardBox(0.4, 0.22, 0.26)),
    group(w / 2 - 0.5, 1.735, back + 0.12, cardboardBox(0.5, 0.16, 0.26)),
    // bubble wrap on a spindle, and tools hung on the pegboard
    turn(cyl(0.11, 0.11, 0.6, glass('#e0f2fe', 0.6), w / 2 - 0.5, 1.42, back + 0.16, 14), 0, 0, Math.PI / 2),
    box(0.74, 0.02, 0.02, shiny(STEEL), w / 2 - 0.5, 1.42, back + 0.16),
    ...[0, 1, 2].map((i) => box(0.05, 0.2 + i * 0.04, 0.02, pick(['#dc2626', DARK, '#1d4ed8'], i), -w / 2 + 0.3 + i * 0.14, 1.36, back + 0.03)),
    group(-0.1, 0, back + 0.26, monitor(index % 2 === 0 ? 'sheet' : 'chart', BENCH_TOP, 0.5)),
    group(-0.1, 0, 0.12, keyboardSet(BENCH_TOP)),
    // label printer feeding out a strip of labels
    group(-w / 2 + 0.38, BENCH_TOP, 0.08, rbox(0.26, 0.2, 0.3, shiny(DARK), 0, 0.1, 0, 0.02), turn(cyl(0.07, 0.07, 0.12, WHITE, 0, 0.2, -0.06, 12), 0, 0, Math.PI / 2), box(0.11, 0.003, 0.16, WHITE, 0, 0.065, 0.22), box(0.04, 0.01, 0.004, glow('#22c55e'), 0.08, 0.16, 0.152)),
    // parcel scale, tape gun and a half-packed carton
    group(w / 2 - 0.42, BENCH_TOP, 0.14, rbox(0.4, 0.05, 0.36, shiny(STEEL), 0, 0.025, 0, 0.01), box(0.36, 0.008, 0.32, '#4b5563', 0, 0.054, 0), group(0, 0.058, 0, cardboardBox(0.3, 0.2, 0.24)), box(0.14, 0.07, 0.03, DARK, 0, 0.05, 0.2), box(0.1, 0.035, 0.004, glow('#86efac'), 0, 0.055, 0.217)),
    group(0.42, BENCH_TOP, 0.26, turn(cyl(0.05, 0.05, 0.05, '#c99657', 0, 0.05, 0, 12), 0, Math.PI / 2), rbox(0.05, 0.1, 0.16, shiny('#dc2626'), 0, 0.09, -0.02, 0.012)),
    group(0.3, BENCH_TOP, -0.05, mug(WHITE)),
    group(-0.5, 0.295, 0, cardboardBox(0.5, 0.3, 0.4)),
    group(0.5, 0.295, 0, bin('#4b5563')),
  ];
};

export const warehouse: RoomArt = { builders: { conveyor, rack, bay, packDesk }, decor: warehouseDecor };
