import type * as THREE from 'three';
import { WALL_HEIGHT } from '../../../shared/world.ts';
import { ball, box, cyl, glass, glow, group, pick, rbox, shiny, turn } from '../kit.ts';
import { DARK, STEEL, WALNUT, WHITE, WOOD, books, cardboardBox, deskLamp, deskPlant, floorLamp, laptop, mug, papers, plant, screen, sideChair } from '../parts.ts';
import { WALL } from '../shell.ts';
import { homeDecor } from './homeDecor.ts';
import { kitchenette } from './homeKitchen.ts';
import type { Builder, RoomArt } from './types.ts';

const BLANKETS = ['#60a5fa', '#f472b6', '#facc15', '#34d399', '#a78bfa', '#fb923c', '#f87171', '#22d3ee'];
const LUGGAGE = ['#0f766e', '#7c3aed', '#b91c1c', '#1d4ed8'];
const PINE = '#d9b98a';
const PINE_DARK = '#c9a276';
const FABRIC = '#5b7c99';
const FABRIC_LIGHT = '#7396b3';
const BASEBOARD = '#8a6a4a';
const POST = 0.07;
const BUNK_LEVELS = [0.32, 1.3];

/** One level of a bunk: frame, slats, mattress, pillow and a half-made duvet. */
function bunkLevel(w: number, d: number, y: number, blanket: string): THREE.Object3D[] {
  const inner = { w: w - POST * 2, d: d - POST * 2 };
  return [
    ...[-1, 1].map((s) => box(inner.w, 0.12, 0.04, WOOD, 0, y, s * (d / 2 - POST / 2))),
    ...[-1, 1].map((s) => box(0.04, 0.12, inner.d, WOOD, s * (w / 2 - POST / 2), y, 0)),
    ...[-1, 1].map((s) => box(0.03, 0.26, inner.d, WOOD, s * (w / 2 - POST / 2), y + 0.25, 0)),
    box(inner.w, 0.03, inner.d, '#d9c9a8', 0, y - 0.02, 0),
    rbox(w - 0.18, 0.14, d - 0.18, WHITE, 0, y + 0.065, 0, 0.04),
    rbox(0.36, 0.09, 0.5, '#ffffff', -w / 2 + 0.32, y + 0.175, 0.02, 0.04),
    rbox(w * 0.58, 0.07, d - 0.16, blanket, w * 0.17, y + 0.16, 0, 0.03),
    turn(rbox(0.3, 0.1, d - 0.3, blanket, -w * 0.1, y + 0.2, 0, 0.045), 0.12),
  ];
}

const bunk: Builder = (w, d, index) => {
  const front = d / 2 - POST / 2;
  const ladderX = w / 2 - 0.32;
  const guardFrom = -w / 2 + POST;
  const guardTo = ladderX - 0.24;
  return [
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(POST, 1.86, POST, WOOD, sx * (w / 2 - POST / 2), 0.93, sz * front))),
    ...BUNK_LEVELS.flatMap((y, k) => bunkLevel(w, d, y, pick(BLANKETS, index * 2 + k))),
    box(w - POST * 2, 0.05, 0.04, WOOD, 0, 1.66, -front),
    box(guardTo - guardFrom, 0.05, 0.04, WOOD, (guardFrom + guardTo) / 2, 1.66, front),
    ...[-0.18, 0.18].map((o) => box(0.04, 1.62, 0.04, WOOD, ladderX + o, 0.81, front + 0.045)),
    ...[0.3, 0.62, 0.94, 1.26].map((y) => box(0.32, 0.035, 0.035, WOOD, ladderX, y, front + 0.045)),
    rbox(0.52, 0.2, 0.36, shiny(pick(LUGGAGE, index)), -0.45, 0.11, 0.05, 0.04),
    rbox(0.34, 0.12, 0.24, '#e7e5e4', 0.4, 0.06, -0.1, 0.01),
    rbox(0.03, 0.34, 0.36, pick(BLANKETS, index + 3), -w / 2 - 0.02, 1.52, 0.1, 0.01),
  ];
};

const nightstand: Builder = (w, d, index) => [
  rbox(w, 0.5, d, PINE, 0, 0.27, 0, 0.02),
  ...[0.39, 0.17].flatMap((y) => [box(w - 0.08, 0.18, 0.012, PINE_DARK, 0, y, d / 2 + 0.004), ball(0.018, shiny(STEEL), 0, y, d / 2 + 0.02)]),
  group(-0.1, 0.52, -0.02, turn(cyl(0.07, 0.07, 0.04, shiny('#ef4444'), 0, 0.085, 0, 16), 0, Math.PI / 2), turn(cyl(0.055, 0.055, 0.044, WHITE, 0, 0.085, 0, 16), 0, Math.PI / 2), ball(0.022, shiny('#facc15'), -0.045, 0.16, 0), ball(0.022, shiny('#facc15'), 0.045, 0.16, 0)),
  rbox(0.07, 0.01, 0.14, DARK, 0.13, 0.525, 0.06, 0.004),
  box(0.06, 0.002, 0.12, glow(pick(['#93c5fd', '#86efac', '#fda4af'], index)), 0.13, 0.531, 0.06),
];

const wardrobe: Builder = (w, d) => {
  const front = d / 2 - 0.04;
  const door = (w - 0.06) / 3;
  return [
    box(w - 0.04, 0.06, d - 0.1, WALNUT, 0, 0.03, -0.02),
    rbox(w, 2.06, d - 0.04, PINE_DARK, 0, 1.09, -0.02, 0.015),
    ...[-1, 0, 1].map((i) => box(door - 0.02, 1.94, 0.02, PINE, i * door, 1.1, front + 0.01)),
    box(door - 0.16, 1.5, 0.006, shiny('#d6ecf5'), 0, 1.15, front + 0.023),
    ...[-door / 2 - 0.06, door / 2 + 0.06].map((x) => box(0.02, 0.22, 0.03, shiny(STEEL), x, 1.1, front + 0.035)),
    group(-0.8, 2.12, -0.02, cardboardBox(0.55, 0.32, 0.4)),
    rbox(0.6, 0.24, 0.4, shiny('#1d4ed8'), 0.78, 2.24, -0.02, 0.04),
  ];
};

const dresser: Builder = (w, d, index) => [
  rbox(w, 0.78, d, PINE, 0, 0.43, 0, 0.02),
  ...[-1, 1].flatMap((sx) => [0.2, 0.44, 0.68].flatMap((y) => [box(w / 2 - 0.06, 0.2, 0.012, PINE_DARK, sx * (w / 4 - 0.01), y, d / 2 + 0.004), ball(0.018, shiny(STEEL), sx * (w / 4 - 0.01), y, d / 2 + 0.02)])),
  group(-0.45, 0.82, 0, books(6, index + 2)),
  group(0.1, 0, 0, deskPlant(0.82)),
  group(0.5, 0.82, 0, cyl(0.08, 0.1, 0.02, shiny(DARK), 0, 0.01, 0, 14), cyl(0.012, 0.012, 0.18, shiny(STEEL), 0, 0.1, 0, 8), turn(cyl(0.13, 0.13, 0.05, shiny('#e5e7eb'), 0, 0.26, 0.02, 16), 0, Math.PI / 2)),
  rbox(0.22, 0.09, 0.12, '#bfdbfe', 0.05, 0.865, -0.12, 0.02),
];

const homeWall: Builder = (w, d) => {
  const alongX = w >= d;
  const strip = (side: number): THREE.Mesh => (alongX ? box(w, 0.1, 0.02, BASEBOARD, 0, 0.05, side * (d / 2 + 0.01)) : box(0.02, 0.1, d, BASEBOARD, side * (w / 2 + 0.01), 0.05, 0));
  return [box(w, WALL_HEIGHT, d, WALL, 0, WALL_HEIGHT / 2, 0), strip(-1), strip(1)];
};

/** `w` runs along the wall, the mirror cabinet hangs at the back (-z). */
const washstand: Builder = (w, d, index) => [
  box(w - 0.16, 0.06, d - 0.36, '#64748b', 0, 0.03, -0.1),
  rbox(w - 0.1, 0.78, d - 0.3, '#f1f5f9', 0, 0.45, -0.1, 0.015),
  ...[-1, 1].flatMap((s) => [box(w / 2 - 0.09, 0.62, 0.012, '#e2e8f0', s * (w / 4 - 0.02), 0.45, 0.206), ball(0.016, shiny(STEEL), s * 0.06, 0.6, 0.22)]),
  rbox(w, 0.05, d - 0.2, shiny('#e7e5e4'), 0, 0.865, -0.1, 0.015),
  cyl(0.2, 0.14, 0.11, shiny(WHITE), 0, 0.945, -0.05, 20),
  cyl(0.175, 0.175, 0.004, '#bcd3de', 0, 1.001, -0.05, 20),
  cyl(0.014, 0.014, 0.24, shiny(STEEL), 0, 1.01, -0.3, 8),
  box(0.02, 0.02, 0.16, shiny(STEEL), 0, 1.12, -0.23),
  rbox(w - 0.3, 0.7, 0.1, WHITE, 0, 1.6, -d / 2 + 0.06, 0.012),
  box(w - 0.4, 0.6, 0.004, shiny('#cfe8f3'), 0, 1.6, -d / 2 + 0.113),
  box(w - 0.5, 0.04, 0.06, glow('#fff8e1'), 0, 2, -d / 2 + 0.08),
  group(0.45, 0.89, -0.12, cyl(0.035, 0.03, 0.09, pick(['#fde68a', '#bfdbfe', '#fbcfe8'], index), 0, 0.045, 0, 10), turn(cyl(0.005, 0.005, 0.15, '#ef4444', 0.012, 0.1, 0, 5), 0, 0, -0.2), turn(cyl(0.005, 0.005, 0.15, '#3b82f6', -0.012, 0.1, 0.006, 5), 0, 0, 0.2)),
  group(-0.45, 0.89, -0.15, cyl(0.035, 0.035, 0.12, shiny('#a7f3d0'), 0, 0.06, 0, 10), cyl(0.012, 0.012, 0.05, WHITE, 0, 0.145, 0, 6)),
  rbox(0.1, 0.03, 0.07, '#fef3c7', -0.42, 0.905, 0.08, 0.012),
];

const washer: Builder = (w, d) => [
  rbox(w - 0.06, 0.85, d - 0.06, WHITE, 0, 0.445, 0, 0.02),
  turn(cyl(0.21, 0.21, 0.03, shiny('#cbd5e1'), 0, 0.42, d / 2 - 0.025, 20), 0, Math.PI / 2),
  turn(cyl(0.15, 0.15, 0.034, shiny('#1e293b'), 0, 0.42, d / 2 - 0.024, 20), 0, Math.PI / 2),
  box(w - 0.12, 0.1, 0.01, '#e2e8f0', 0, 0.78, d / 2 - 0.027),
  cyl(0.03, 0.03, 0.02, shiny(STEEL), 0.18, 0.78, d / 2 - 0.02, 10).rotateX(Math.PI / 2),
  box(0.12, 0.04, 0.004, glow('#67e8f9'), -0.12, 0.78, d / 2 - 0.021),
  group(-0.14, 0.87, -0.05, cyl(0.06, 0.07, 0.2, shiny('#2563eb'), 0, 0.1, 0, 10), cyl(0.025, 0.025, 0.04, '#f97316', 0, 0.22, 0, 8)),
  rbox(0.26, 0.08, 0.2, '#fca5a5', 0.14, 0.91, 0.02, 0.03),
];

const homeSofa: Builder = (w, d) => {
  const seat = (w - 0.34) / 2;
  return [
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.025, 0.02, 0.1, WALNUT, sx * (w / 2 - 0.1), 0.05, sz * (d / 2 - 0.1), 8))),
    rbox(w, 0.22, d - 0.06, FABRIC, 0, 0.21, 0, 0.05),
    ...[-1, 1].map((s) => rbox(seat - 0.01, 0.14, d - 0.3, FABRIC_LIGHT, (s * seat) / 2, 0.38, 0.1, 0.05)),
    rbox(w - 0.3, 0.5, 0.2, FABRIC, 0, 0.6, -d / 2 + 0.13, 0.06),
    ...[-1, 1].map((s) => turn(rbox(seat - 0.03, 0.34, 0.13, FABRIC_LIGHT, (s * seat) / 2, 0.64, -d / 2 + 0.3, 0.05), 0, -0.16)),
    ...[-1, 1].map((s) => rbox(0.17, 0.42, d - 0.06, FABRIC, s * (w / 2 - 0.085), 0.42, 0, 0.06)),
    turn(rbox(0.32, 0.32, 0.1, '#fbbf24', -seat + 0.12, 0.6, 0.06, 0.045), 0.35, -0.3),
    turn(rbox(0.3, 0.3, 0.1, '#f87171', seat - 0.2, 0.59, 0.04, 0.045), -0.4, -0.3),
    rbox(0.2, 0.05, d - 0.2, '#fde68a', w / 2 - 0.085, 0.655, 0, 0.02),
  ];
};

/** Long side runs along z here, so it sits lengthwise in front of the sofa. */
const coffeeTable: Builder = (w, d) => [
  rbox(w, 0.04, d, WALNUT, 0, 0.4, 0, 0.012),
  rbox(w - 0.12, 0.02, d - 0.16, WALNUT, 0, 0.15, 0, 0.008),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.04, 0.38, 0.04, WALNUT, sx * (w / 2 - 0.05), 0.19, sz * (d / 2 - 0.06)))),
  group(0.05, 0.42, -0.3, mug('#f97316')),
  group(-0.08, 0.42, 0.34, cyl(0.07, 0.055, 0.1, '#dc2626', 0, 0.05, 0, 12), cyl(0.072, 0.072, 0.006, '#fef3c7', 0, 0.103, 0, 12)),
  rbox(0.05, 0.02, 0.17, DARK, 0.14, 0.43, 0.1, 0.008),
  group(-0.08, 0.42, -0.02, papers(3, 5)),
  group(0, 0.16, 0.1, papers(5, 9)),
];

const tvStand: Builder = (w, d) => [
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.02, 0.015, 0.08, DARK, sx * (w / 2 - 0.1), 0.04, sz * (d / 2 - 0.07), 8))),
  rbox(w, 0.4, d, '#e7dcc8', 0, 0.28, 0, 0.02),
  ...[-1, 1].map((s) => box(w / 3 - 0.04, 0.3, 0.012, PINE, (s * w) / 3, 0.28, d / 2 + 0.004)),
  box(w / 3 - 0.06, 0.3, 0.02, DARK, 0, 0.28, d / 2 - 0.02),
  rbox(0.3, 0.05, 0.2, shiny('#f8fafc'), 0, 0.2, 0.05, 0.015),
  box(0.5, 0.02, 0.2, shiny(DARK), 0, 0.49, -0.04),
  box(0.26, 0.12, 0.04, shiny(DARK), 0, 0.55, -0.06),
  rbox(1.3, 0.76, 0.04, shiny(DARK), 0, 0.98, -0.06, 0.012),
  group(0, 0.98, -0.038, screen(1.24, 0.7, 'slides')),
  group(-0.8, 0.48, 0, rbox(0.2, 0.03, 0.14, WHITE, 0, 0.015, 0, 0.01), cyl(0.006, 0.006, 0.16, DARK, -0.07, 0.1, -0.05, 5), cyl(0.006, 0.006, 0.16, DARK, 0.07, 0.1, -0.05, 5), box(0.02, 0.006, 0.004, glow('#22c55e'), 0, 0.02, 0.071)),
  group(0.8, 0, 0, deskPlant(0.48)),
];

const shoeCabinet: Builder = (w, d) => [
  rbox(w, 0.9, d, '#d6c2a0', 0, 0.46, 0, 0.02),
  ...[0.24, 0.66].flatMap((y) => [box(w - 0.08, 0.36, 0.012, '#c8b28c', 0, y, d / 2 + 0.004), box(w - 0.4, 0.02, 0.02, shiny(STEEL), 0, y + 0.14, d / 2 + 0.018)]),
  ...[-0.42, -0.26].map((x) => rbox(0.1, 0.08, 0.24, WHITE, x, 0.95, 0, 0.03)),
  rbox(0.22, 0.02, 0.16, WALNUT, 0.1, 0.92, 0, 0.008),
  ball(0.025, shiny('#facc15'), 0.08, 0.955, 0.02),
  group(0.45, 0.91, 0, plant('bush', 0.3, '#fef3c7')),
];

const studyDesk: Builder = (w, d, index) => [
  rbox(w, 0.04, d, WOOD, 0, 0.74, 0, 0.012),
  ...[-1, 1].map((s) => box(0.04, 0.72, d - 0.08, WOOD, s * (w / 2 - 0.04), 0.36, 0)),
  box(w - 0.08, 0.3, 0.02, WOOD, 0, 0.55, -d / 2 + 0.05),
  group(-0.2, 0.76, 0, laptop('code')),
  group(0.55, 0, -0.12, deskLamp('#f59e0b', 0.76)),
  group(0.3, 0.76, 0.12, mug('#2563eb')),
  group(-0.58, 0.76, -0.15, books(5, index)),
  group(-0.2, 0, d / 2 + 0.35, turn(sideChair('#7c3aed'), Math.PI + 0.35)),
];

const diningTable: Builder = (w, d) => [
  rbox(w, 0.04, d, WOOD, 0, 0.74, 0, 0.012),
  box(w - 0.3, 0.08, d - 0.3, PINE_DARK, 0, 0.68, 0),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.06, 0.72, 0.06, WOOD, sx * (w / 2 - 0.1), 0.36, sz * (d / 2 - 0.1)))),
  ...[-0.75, 0, 0.75].flatMap((x, i) => [
    group(x, 0, d / 2 + 0.26, turn(sideChair(pick(['#f59e0b', '#0ea5e9', '#ef4444'], i), WOOD), Math.PI + (i - 1) * 0.2)),
    group(x, 0, -d / 2 - 0.26, turn(sideChair(pick(['#22c55e', '#f59e0b', '#0ea5e9'], i), WOOD), (i - 1) * 0.15)),
    box(0.4, 0.004, 0.28, '#fde68a', x, 0.762, d / 2 - 0.2),
    cyl(0.08, 0.05, 0.05, WHITE, x, 0.789, d / 2 - 0.2, 14),
  ]),
  group(0, 0.76, -0.1, cyl(0.17, 0.17, 0.08, '#d6a56c', 0, 0.04, 0, 16), cyl(0.18, 0.18, 0.02, '#c08a4a', 0, 0.09, 0, 16), ball(0.05, WHITE, 0.05, 0.11, 0), ball(0.05, WHITE, -0.05, 0.11, 0.03)),
  group(0.5, 0.76, -0.25, cyl(0.04, 0.04, 0.16, glass('#ffffff', 0.75), 0, 0.08, 0, 10)),
  group(-0.5, 0.76, -0.22, mug('#ef4444')),
];

const dryingRack: Builder = (w, d) => {
  const half = w / 2 - 0.04;
  return [
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => turn(box(0.025, 1.34, 0.025, shiny(STEEL), sx * half, 0.64, sz * 0.1), 0, sz * 0.3))),
    ...[-0.24, 0, 0.24].map((z) => box(w, 0.02, 0.02, shiny(STEEL), 0, 1.27, z)),
    box(0.36, 0.5, 0.02, '#60a5fa', -0.3, 1.01, -0.24),
    box(0.34, 0.42, 0.02, WHITE, 0.2, 1.05, 0),
    box(0.3, 0.3, 0.02, '#f472b6', 0.3, 1.11, 0.24),
    box(0.1, 0.36, 0.02, '#facc15', -0.42, 1.08, 0.24),
    box(0.1, 0.36, 0.02, '#facc15', -0.28, 1.08, 0.24),
    rbox(0.4, 0.2, d * 0.5, '#e2e8f0', 0.3, 0.1, 0, 0.03),
  ];
};

const beanbag: Builder = (w) => {
  const seat = ball(w / 2, '#f97316', 0, 0.2, 0);
  seat.scale.set(1, 0.55, 1);
  const back = ball(w * 0.36, '#fb923c', 0, 0.42, -w * 0.2);
  back.scale.set(1, 0.8, 0.7);
  return [seat, back];
};

export const home: RoomArt = {
  builders: {
    bunk, nightstand, wardrobe, dresser, homeWall, washstand, washer, homeSofa, coffeeTable, tvStand, shoeCabinet, studyDesk, kitchenette, diningTable, dryingRack, beanbag,
    homeLamp: () => [floorLamp()],
    homePlant: () => [plant('leafy', 0.9)],
  },
  decor: homeDecor,
};
