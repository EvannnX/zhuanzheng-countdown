import type * as THREE from 'three';
import { ball, box, cyl, glow, group, rbox, shiny, textPlane, turn } from '../kit.ts';
import { DARK, STEEL, WHITE, at, bin, plant } from '../parts.ts';
import { hang, poster } from '../shell.ts';
import type { Builder, RoomArt } from './types.ts';

const PANEL = '#9fb7c9';
const PORCELAIN = shiny('#fdfdfd');

const partition: Builder = (w, d) => [
  box(w * 0.5, 1.9, d - 0.1, PANEL, 0, 1.1, 0),
  box(w * 0.9, 0.04, d - 0.06, shiny(STEEL), 0, 2.07, 0),
  ...[-d / 2 + 0.2, d / 2 - 0.2].map((z) => cyl(0.02, 0.02, 0.16, shiny(STEEL), 0, 0.08, z, 8)),
  // paper holder on the side wall of the stall
  group(w / 2 + 0.03, 0.75, 0.6, rbox(0.06, 0.14, 0.16, shiny(STEEL), 0, 0, 0, 0.012), turn(cyl(0.055, 0.055, 0.11, WHITE, 0.05, -0.02, 0, 12), 0, 0, Math.PI / 2)),
];

const stallFront = (accent: string): Builder => (w, d) => {
  const door = group(w / 2, 0, 0, box(0.82, 1.75, 0.03, accent, 0.41, 1.06, 0), rbox(0.04, 0.1, 0.06, shiny(STEEL), 0.7, 1.05, 0.03, 0.01), box(0.1, 0.05, 0.035, glow('#22c55e'), 0.7, 1.2, 0));
  door.rotation.y = -1.25;
  return [
    box(w, 1.9, d * 0.5, PANEL, 0, 1.1, 0),
    box(w + 0.06, 0.04, d, shiny(STEEL), 0, 2.07, 0),
    cyl(0.02, 0.02, 0.16, shiny(STEEL), -w / 2 + 0.1, 0.08, 0, 8),
    cyl(0.02, 0.02, 0.16, shiny(STEEL), w / 2 - 0.1, 0.08, 0, 8),
    door,
  ];
};

const toilet: Builder = () => {
  const bowl = cyl(0.2, 0.14, 0.38, PORCELAIN, 0, 0.21, 0.08, 18);
  bowl.scale.z = 1.25;
  const seat = cyl(0.21, 0.21, 0.03, PORCELAIN, 0, 0.415, 0.08, 18);
  seat.scale.z = 1.25;
  const water = cyl(0.13, 0.13, 0.006, shiny('#7cc7f2'), 0, 0.4, 0.08, 16);
  water.scale.z = 1.25;
  return [
    bowl,
    seat,
    water,
    turn(rbox(0.4, 0.44, 0.03, PORCELAIN, 0, 0.64, -0.17, 0.012), 0, -0.12),
    rbox(0.42, 0.42, 0.18, PORCELAIN, 0, 0.6, -0.3, 0.03),
    rbox(0.44, 0.04, 0.2, PORCELAIN, 0, 0.83, -0.3, 0.015),
    cyl(0.03, 0.03, 0.012, shiny(STEEL), 0, 0.856, -0.3, 10),
    group(0.36, 0, -0.26, cyl(0.05, 0.06, 0.1, WHITE, 0, 0.05, 0, 10), cyl(0.008, 0.008, 0.36, WHITE, 0, 0.2, 0, 6)),
    group(-0.36, 0, 0.1, bin('#cbd5e1')),
  ];
};

const sink: Builder = (w, d) => {
  const count = Math.max(1, Math.round(w / 1.2));
  const basins = Array.from({ length: count }, (_, k) => k).flatMap((k) => {
    const x = -w / 2 + (w / count) * (k + 0.5);
    return [
      rbox(0.5, 0.012, 0.36, PORCELAIN, x, 0.868, 0.04, 0.006),
      box(0.42, 0.012, 0.28, '#cbd5e1', x, 0.872, 0.04),
      cyl(0.016, 0.016, 0.16, shiny(STEEL), x, 0.95, -0.18, 8),
      turn(cyl(0.013, 0.013, 0.14, shiny(STEEL), x, 1.03, -0.12, 8), 0, Math.PI / 2),
      group(x + 0.3, 0.86, -0.14, cyl(0.03, 0.035, 0.12, shiny('#f59e0b'), 0, 0.06, 0, 10), cyl(0.008, 0.008, 0.05, DARK, 0, 0.14, 0, 6)),
    ];
  });
  return [
    rbox(w, 0.08, d * 0.72, '#e2e8f0', 0, 0.82, 0, 0.02),
    box(w - 0.1, 0.5, d * 0.5, '#94a3b8', 0, 0.53, -0.06),
    ...[-w / 2 + 0.08, w / 2 - 0.08].map((x) => box(0.05, 0.8, d * 0.5, '#94a3b8', x, 0.4, -0.06)),
    ...basins,
    rbox(w - 0.1, 1.1, 0.03, shiny(STEEL), 0, 1.7, -d / 2 + 0.03, 0.01),
    box(w - 0.18, 1.02, 0.012, shiny('#d6ecf5'), 0, 1.7, -d / 2 + 0.048),
    box(w - 0.3, 0.05, 0.05, glow('#fffdf0'), 0, 2.32, -d / 2 + 0.06),
    group(-w / 2 + 0.3, 0.86, 0.14, plant('bush', 0.3, '#fef3c7')),
  ];
};

const TILE = shiny('#bfe3e6');
const DIVIDER_X = 22;

function decor(): THREE.Object3D[] {
  const dryer = (x: number): THREE.Object3D =>
    hang(group(0, 0, 0, rbox(0.3, 0.26, 0.2, shiny('#e5e7eb'), 0, 0, 0.1, 0.04), box(0.16, 0.02, 0.1, DARK, 0, -0.14, 0.12), ball(0.02, glow('#ef4444'), 0.09, 0.06, 0.2)), 'n', 17, x, 1.25, 0.1);
  const wetSign = at(20.3, 22.8, 0.4, turn(box(0.34, 0.6, 0.02, '#facc15', 0, 0.29, 0.1), 0, 0.33), turn(box(0.34, 0.6, 0.02, '#facc15', 0, 0.29, -0.1), 0, -0.33));
  const mopBucket = at(25.5, 23.6, 0.3, cyl(0.2, 0.16, 0.3, '#facc15', 0, 0.15, 0, 14), cyl(0.18, 0.18, 0.01, shiny('#60a5fa'), 0, 0.26, 0, 14), turn(cyl(0.015, 0.015, 1.3, '#a16207', 0.06, 0.75, 0.02, 6), 0, 0, -0.12));
  // The divider is not a room edge, so it needs its own tiles on both faces.
  const dividerTiles = [-1, 1].flatMap((side) => [box(0.012, 1.7, 10.7, TILE, DIVIDER_X + side * 0.107, 0.95, 22.5), box(0.03, 0.04, 10.7, '#8a6a4a', DIVIDER_X + side * 0.115, 1.82, 22.5), box(0.025, 0.1, 10.7, '#6fa3aa', DIVIDER_X + side * 0.113, 0.05, 22.5)]);
  const badge = (text: string, bg: string, side: 'e' | 'w', wallAt: number): THREE.Object3D => hang(textPlane(text, 0.5, 0.5, { bg, fg: '#ffffff' }), side, wallAt, 18.2, 2.2);
  const vanity = at(22.5, 22, Math.PI / 2, rbox(1.4, 0.05, 0.36, '#f5d0dc', 0, 0.8, 0, 0.015), box(0.04, 0.8, 0.04, shiny(STEEL), -0.6, 0.4, 0.1), box(0.04, 0.8, 0.04, shiny(STEEL), 0.6, 0.4, 0.1), rbox(1.2, 0.9, 0.03, shiny('#d6ecf5'), 0, 1.5, -0.16, 0.01));
  return [
    ...poster('带薪如厕\n请勿超过 5 分钟', 1.5, 0.75, { bg: '#fff7e6', fg: '#c2410c', border: '#ff7a2f' }, 'w', 18, 23.2, 2.3),
    ...poster('带薪如厕\n请勿超过 5 分钟', 1.5, 0.75, { bg: '#fff7e6', fg: '#c2410c', border: '#ff7a2f' }, 'e', 26, 23.2, 2.3),
    badge('男', '#1d4ed8', 'e', 22),
    badge('女', '#db2777', 'w', 22),
    dryer(18.7),
    dryer(25.5),
    wetSign,
    mopBucket,
    vanity,
    ...dividerTiles,
    box(3.8, 0.02, 0.06, shiny(STEEL), 20, 2.07, 25),
    box(3.8, 0.02, 0.06, shiny(STEEL), 24, 2.07, 25),
    ...[20.2, 24].map((x) => cyl(0.06, 0.06, 0.004, shiny(STEEL), x, 0.012, 22.5, 12)),
    at(21.5, 18, 0, bin('#cbd5e1')),
    at(22.6, 18.2, 0, plant('leafy', 0.7)),
  ];
}

const urinals: Builder = (w) =>
  [-0.85, 0, 0.85].flatMap((x) => {
    const bowl = cyl(0.17, 0.12, 0.5, PORCELAIN, x, 0.78, -0.02, 14);
    bowl.scale.z = 0.7;
    return [bowl, rbox(0.36, 0.3, 0.1, PORCELAIN, x, 1.12, -0.12, 0.03), cyl(0.012, 0.012, 0.2, shiny(STEEL), x, 1.36, -0.14, 6), ...(x < 0.8 ? [box(0.03, 0.9, 0.34, '#9fb7c9', x + 0.42, 0.95, -0.02)] : [])];
  });

export const restroom: RoomArt = { builders: { partition, stallFrontM: stallFront('#9cc3e6'), stallFrontF: stallFront('#f2b5cc'), toilet, sink, urinals }, decor };
