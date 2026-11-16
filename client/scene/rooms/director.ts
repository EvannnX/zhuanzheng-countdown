import type * as THREE from 'three';
import { ball, box, cyl, glass, glow, group, pick, rbox, shiny, textPlane, turn } from '../kit.ts';
import { DARK, STEEL, WALNUT, WHITE, at, books, deskLamp, floorLamp, keyboardSet, monitor, mug, papers, pictureFrame, plant, rug } from '../parts.ts';
import { hang } from '../shell.ts';
import type { Builder, RoomArt } from './types.ts';

const TOP_Y = 0.8;
const LEATHER = '#3b2a20';
const GOLD = '#d4a82c';

function executiveChair(): THREE.Group {
  return group(
    0, 0, 0,
    cyl(0.3, 0.32, 0.04, shiny(DARK), 0, 0.03, 0, 5),
    cyl(0.03, 0.03, 0.4, shiny(STEEL), 0, 0.25, 0, 10),
    rbox(0.6, 0.14, 0.58, LEATHER, 0, 0.52, 0, 0.06),
    turn(rbox(0.6, 0.86, 0.14, LEATHER, 0, 1.02, -0.28, 0.06), 0, -0.1),
    rbox(0.08, 0.06, 0.4, LEATHER, -0.34, 0.74, 0, 0.025),
    rbox(0.08, 0.06, 0.4, LEATHER, 0.34, 0.74, 0, 0.025),
  );
}

const bossDesk: Builder = (w, d) => {
  const plate = textPlane('王总监', 0.4, 0.1, { bg: '#d4a82c', fg: '#3b2a20' });
  plate.position.set(-0.75, TOP_Y + 0.06, d / 2 - 0.12);
  return [
    rbox(w + 0.12, 0.07, d + 0.1, '#7a4a2b', 0, TOP_Y - 0.035, 0, 0.025),
    rbox(0.6, TOP_Y - 0.07, d - 0.06, WALNUT, -w / 2 + 0.32, (TOP_Y - 0.07) / 2, 0, 0.015),
    rbox(0.6, TOP_Y - 0.07, d - 0.06, WALNUT, w / 2 - 0.32, (TOP_Y - 0.07) / 2, 0, 0.015),
    box(w - 1.2, 0.5, 0.03, WALNUT, 0, 0.45, d / 2 - 0.08),
    ...[-1, 1].flatMap((s) => [0.2, 0.42, 0.62].map((y) => box(0.14, 0.02, 0.02, shiny(GOLD), s * (w / 2 - 0.32), y, -d / 2 + 0.02))),
    box(0.9, 0.006, 0.5, '#14532d', 0, TOP_Y + 0.003, 0.02),
    turn(group(0.35, 0, -0.18, monitor('chart', TOP_Y, 0.66)), Math.PI + 0.25),
    turn(group(0, 0, -0.1, keyboardSet(TOP_Y)), Math.PI),
    plate,
    box(0.42, 0.02, 0.05, WALNUT, -0.75, TOP_Y + 0.01, d / 2 - 0.12),
    group(-0.9, 0, -0.2, deskLamp('#15803d', TOP_Y)),
    group(0.85, TOP_Y, 0.2, cyl(0.045, 0.04, 0.1, shiny(DARK), 0, 0.05, 0, 12), ...[-0.015, 0.01, 0.02].map((x, i) => cyl(0.006, 0.006, 0.16, pick(['#dc2626', '#1d4ed8', '#111827'], i), x, 0.12, (i - 1) * 0.012, 6))),
    group(0.5, TOP_Y, 0.25, papers(7, 5)),
    group(-0.35, TOP_Y, 0.22, mug('#f8fafc')),
    group(0.9, TOP_Y, -0.25, rbox(0.3, 0.02, 0.1, WALNUT, 0, 0.01, 0, 0.006), ...[-0.1, -0.05, 0, 0.05, 0.1].map((x) => group(x, 0, 0, cyl(0.002, 0.002, 0.14, STEEL, 0, 0.11, 0, 4), ball(0.022, shiny('#d1d5db'), 0, 0.045, 0))), box(0.3, 0.012, 0.012, shiny(STEEL), 0, 0.18, 0)),
    group(0, 0, -d / 2 - 0.6, executiveChair()),
  ];
};

const perfDesk: Builder = (w, d) => {
  const tag = textPlane('绩效考核 · 机密', 0.6, 0.12, { bg: '#dc2626', fg: '#ffffff' });
  tag.position.set(0, 0.5, d / 2 + 0.012);
  return [
    rbox(w, 0.04, d, '#d6d3d1', 0, 0.74, 0, 0.012),
    rbox(w - 0.06, 0.7, d - 0.1, '#e7e5e4', 0, 0.36, -0.03, 0.012),
    tag,
    group(0, 0, -d / 2 + 0.24, monitor('sheet', 0.76, 0.58)),
    group(0, 0, 0.12, keyboardSet(0.76)),
    ...[0, 1, 2].map((i) => rbox(0.07, 0.3, 0.24, pick(['#1d4ed8', '#b91c1c', '#15803d'], i), -w / 2 + 0.12 + i * 0.075, 0.91, -0.1, 0.008)),
    box(0.1, 0.14, 0.1, shiny('#facc15'), w / 2 - 0.14, 0.83, -0.2),
  ];
};

const bookshelf: Builder = (w, d) => {
  const shelves = [0.06, 0.5, 0.94, 1.38, 1.82, 2.2];
  return [
    box(w, 2.24, 0.03, '#5a3519', 0, 1.12, -d / 2 + 0.015),
    box(0.04, 2.24, d, WALNUT, -w / 2 + 0.02, 1.12, 0),
    box(0.04, 2.24, d, WALNUT, w / 2 - 0.02, 1.12, 0),
    box(0.04, 2.24, d, WALNUT, 0, 1.12, 0),
    ...shelves.map((y) => box(w, 0.04, d, WALNUT, 0, y, 0)),
    ...shelves.slice(0, 5).flatMap((y, row) =>
      [-1, 1].map((side) => {
        const x = (side * w) / 4;
        if ((row + (side > 0 ? 1 : 0)) % 3 === 2) {
          return group(x, y + 0.02, 0, cyl(0.07, 0.05, 0.04, shiny(GOLD), 0, 0.02, 0, 12), cyl(0.012, 0.012, 0.1, shiny(GOLD), 0, 0.09, 0, 8), cyl(0.08, 0.04, 0.12, shiny(GOLD), 0, 0.2, 0, 12));
        }
        return group(x, y + 0.02, 0, books(14, row * 5 + side + 3));
      }),
    ),
  ];
};

const coffeeTable: Builder = (w, d, index) => [
  rbox(w, 0.04, d, glass('#bfe3f5', 0.5), 0, 0.42, 0, 0.012),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.02, 0.02, 0.4, shiny(STEEL), sx * (w / 2 - 0.08), 0.2, sz * (d / 2 - 0.08), 8))),
  box(w - 0.12, 0.02, d - 0.12, WALNUT, 0, 0.14, 0),
  ...(index % 2 === 0
    ? [group(0, 0.44, -0.2, cyl(0.11, 0.07, 0.05, '#f8fafc', 0, 0.025, 0, 14), ball(0.04, '#ef4444', -0.03, 0.07, 0), ball(0.04, '#f59e0b', 0.04, 0.07, 0.02), ball(0.04, '#22c55e', 0, 0.08, -0.04)), group(0.05, 0.44, 0.25, papers(4, 9))]
    : [group(0, 0.44, 0.1, papers(6, 4)), group(0.1, 0.44, -0.3, mug('#1d4ed8'))]),
];

const fishTank: Builder = (w, d) => {
  const fish = [0, 1, 2, 3, 4].map((i) => {
    const body = ball(0.035, glow(pick(['#f97316', '#facc15', '#ef4444'], i)), 0, 0, 0);
    body.scale.set(1.6, 1, 0.6);
    return group(-w / 2 + 0.25 + i * 0.22, 0.95 + (i % 3) * 0.12, (i % 2) * 0.12 - 0.06, body, turn(box(0.03, 0.04, 0.004, glow('#fdba74'), -0.06, 0, 0), 0));
  });
  return [
    rbox(w, 0.7, d, WALNUT, 0, 0.35, 0, 0.02),
    box(w - 0.04, 0.6, d - 0.04, glass('#38bdf8', 0.35), 0, 1.0, 0),
    box(w, 0.04, d, shiny(DARK), 0, 0.72, 0),
    box(w, 0.05, d, shiny(DARK), 0, 1.32, 0),
    box(w - 0.08, 0.05, d - 0.08, '#d6c7a1', 0, 0.76, 0),
    ...[-0.4, 0.1, 0.45].map((x, i) => group(x, 0.78, (i % 2) * 0.08, turn(box(0.03, 0.26, 0.01, '#16a34a', 0, 0.13, 0), 0, 0, 0.15), turn(box(0.03, 0.18, 0.01, '#22c55e', 0.04, 0.09, 0), 0, 0, -0.2))),
    ...fish,
  ];
};

function decor(): THREE.Object3D[] {
  const calligraphy = hang(
    group(0, 0, 0, rbox(1.5, 1.5, 0.04, '#7c2d12', 0, 0, 0.02, 0.01), (() => {
      const face = textPlane('狼性', 1.3, 1.3, { bg: '#fdf6e3', fg: '#111111', lit: false });
      face.position.z = 0.042;
      return face;
    })()),
    'n', 0, 35, 1.85, 0.1,
  );
  const certificates = [36.6, 37.5, 38.4].map((x, i) => hang(pictureFrame(0.6, 0.45, pick(['#fde68a', '#fecaca', '#bbf7d0'], i), '#8a5a36'), 's', 14, x, 1.7, 0.1));
  const putting = at(37.4, 11.8, 0, box(0.9, 0.012, 2.6, '#16a34a', 0, 0.006, 0), cyl(0.06, 0.06, 0.004, DARK, 0, 0.014, -1, 12), cyl(0.006, 0.006, 0.5, WHITE, 0, 0.25, -1, 6), box(0.16, 0.1, 0.004, '#ef4444', 0.08, 0.44, -1), ball(0.025, WHITE, 0.1, 0.03, 0.7), turn(cyl(0.012, 0.012, 0.9, shiny(STEEL), 0.38, 0.45, 1, 6), 0, 0, 0.12));
  return [
    calligraphy,
    ...certificates,
    putting,
    at(35, 3.4, 0, rug(4.4, 3.6, '#7f1d1d', '#d4a82c')),
    at(31.7, 10, 0, rug(2.6, 3.2, '#e7dcc6', '#8a5a36')),
    at(30.6, 12.1, 0, floorLamp()),
    at(39.2, 13.2, 0, plant('tree', 1.1, '#1f2937')),
    at(30.7, 7.9, 0, plant('leafy', 0.9, '#1f2937')),
  ];
}

const sofa: Builder = (w, d, index) => {
  const tone = index % 2 === 0 ? ['#3b2a20', '#2a1d15'] : ['#f97316', '#ea580c'];
  const seats = Math.max(2, Math.round(d / 1));
  // Local space: seat faces +z, so the long side (world d) runs along local x = w here.
  return [
    rbox(w, 0.24, d - 0.1, tone[1], 0, 0.2, 0, 0.05),
    rbox(w, 0.5, 0.24, tone[1], 0, 0.52, -d / 2 + 0.14, 0.07),
    rbox(0.2, 0.36, d - 0.06, tone[1], -w / 2 + 0.1, 0.42, 0, 0.07),
    rbox(0.2, 0.36, d - 0.06, tone[1], w / 2 - 0.1, 0.42, 0, 0.07),
    ...Array.from({ length: seats }, (_, i) => rbox((w - 0.44) / seats - 0.02, 0.14, d - 0.36, tone[0], -w / 2 + 0.22 + ((w - 0.44) / seats) * (i + 0.5), 0.38, 0.08, 0.05)),
    ...[-1, 1].map((s) => turn(rbox(0.34, 0.34, 0.1, s > 0 ? '#fde68a' : '#93c5fd', s * (w / 2 - 0.4), 0.62, -d / 2 + 0.3, 0.05), 0, -0.25)),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.025, 0.02, 0.08, shiny(STEEL), sx * (w / 2 - 0.1), 0.04, sz * (d / 2 - 0.12), 8))),
  ];
};

export const director: RoomArt = { builders: { bossDesk, perfDesk, bookshelf, coffeeTable, fishTank, sofa }, decor };
