import type * as THREE from 'three';
import { box, cyl, group, rbox, shiny, textPlane, turn } from '../kit.ts';
import { DARK, STEEL, WALNUT, WHITE, at, ceilingProjector, laptop, mug, officeChair, papers, plant, rug, screen, wallClock } from '../parts.ts';
import { hang } from '../shell.ts';
import type { Builder, RoomArt } from './types.ts';

const TOP_Y = 0.76;

const meetingTable: Builder = (w, d) => {
  const seats = [-1.7, 0, 1.7].flatMap((z, row) =>
    [-1, 1].map((side) => turn(group(side * (w / 2 + 0.42), 0, z, officeChair(row === 1 ? '#f97316' : '#374151')), side === 1 ? -Math.PI / 2 : Math.PI / 2)),
  );
  return [
    rbox(w, 0.06, d, WALNUT, 0, TOP_Y - 0.03, 0, 0.03),
    box(w - 0.3, 0.02, d - 0.3, '#5a3519', 0, TOP_Y - 0.07, 0),
    ...[-1.5, 1.5].map((z) => group(0, 0, z, rbox(0.7, 0.66, 0.16, '#4b2e1a', 0, 0.36, 0, 0.02), rbox(0.9, 0.05, 0.5, '#4b2e1a', 0, 0.025, 0, 0.015))),
    ...seats,
    turn(group(-0.5, TOP_Y, -1.6, laptop('slides')), Math.PI / 2),
    turn(group(0.5, TOP_Y, 0.2, laptop('sheet')), -Math.PI / 2),
    turn(group(-0.5, TOP_Y, 1.7, laptop('code')), Math.PI / 2),
    group(0.55, TOP_Y, -1.5, mug('#f8fafc')),
    group(-0.55, TOP_Y, 0.3, mug('#f97316')),
    group(0.5, TOP_Y, 1.6, papers(5, 2)),
    group(0, TOP_Y, 0, rbox(0.26, 0.05, 0.26, shiny(DARK), 0, 0.025, 0, 0.02), cyl(0.06, 0.06, 0.012, shiny('#4b5563'), 0, 0.056, 0, 14)),
    group(0, TOP_Y, -0.7, rbox(0.4, 0.03, 0.16, shiny(DARK), 0, 0.015, 0, 0.01)),
    group(0, TOP_Y, 0.9, cyl(0.035, 0.03, 0.2, '#93c5fd', -0.08, 0.1, 0, 10), cyl(0.035, 0.03, 0.2, '#93c5fd', 0.08, 0.1, 0, 10)),
  ];
};

const credenza: Builder = (w, d) => [
  rbox(w, 0.8, d, WALNUT, 0, 0.42, 0, 0.02),
  rbox(w + 0.04, 0.03, d + 0.04, '#8a5a36', 0, 0.84, 0, 0.01),
  ...[-1, 0, 1].map((i) => box(w / 3 - 0.06, 0.66, 0.012, '#7a4a2b', (i * w) / 3, 0.42, d / 2 + 0.002)),
  ...[-1, 0, 1].map((i) => box(0.02, 0.14, 0.02, shiny(STEEL), (i * w) / 3 + 0.2, 0.5, d / 2 + 0.018)),
  group(-w / 2 + 0.4, 0.86, 0, plant('bush', 0.55, '#fef3c7')),
  ...[0, 1, 2, 3].map((i) => cyl(0.032, 0.032, 0.2, '#bfdbfe', 0.3 + i * 0.09, 0.96, 0.05 - (i % 2) * 0.1, 10)),
  group(w / 2 - 0.45, 0.86, 0, rbox(0.32, 0.03, 0.22, shiny(WHITE), 0, 0.015, 0, 0.01), ...[-0.08, 0.08].map((x) => cyl(0.04, 0.035, 0.07, WHITE, x, 0.065, 0, 12))),
];

function decor(): THREE.Object3D[] {
  const board = hang(
    group(
      0, 0, 0,
      rbox(3.6, 1.6, 0.04, shiny(STEEL), 0, 0, 0.02, 0.01),
      (() => {
        const face = textPlane('Q4 目标：\n赋能 · 抓手 · 闭环', 3.46, 1.46, { bg: '#ffffff', fg: '#1d4ed8', lit: false });
        face.position.z = 0.042;
        return face;
      })(),
      box(3.4, 0.03, 0.1, shiny(STEEL), 0, -0.83, 0.07),
      ...['#dc2626', '#1d4ed8', '#16a34a', '#111827'].map((c, i) => turn(cyl(0.012, 0.012, 0.12, shiny(c), -1.2 + i * 0.16, -0.8, 0.07, 8), 0, 0, Math.PI / 2)),
      rbox(0.14, 0.04, 0.06, '#4b5563', 0.6, -0.8, 0.07, 0.01),
    ),
    'n', 0, 25, 1.6, 0.1,
  );
  const tv = hang(group(0, 0, 0, rbox(2.4, 1.36, 0.06, shiny(DARK), 0, 0, 0.03, 0.015), (() => {
    const face = screen(2.3, 1.26, 'chart');
    face.position.z = 0.062;
    return face;
  })()), 'e', 30, 7, 1.7, 0.1);
  return [
    board,
    tv,
    at(25, 7, 0, rug(4.4, 7, '#7088a8', '#3d4b5f')),
    at(25, 6.2, 0, ceilingProjector()),
    hang(wallClock(), 'w', 20, 4, 2.3, 0.1),
    at(29.2, 13.2, 0, plant('tree', 1)),
    at(20.9, 0.9, 0, plant('leafy', 1)),
  ];
}

export const meeting: RoomArt = { builders: { meetingTable, credenza }, decor };
