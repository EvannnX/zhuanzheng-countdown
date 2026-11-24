import type * as THREE from 'three';
import { ball, box, cyl, glow, group, pick, rbox, shiny, textPlane, turn } from '../kit.ts';
import { BRAND, DARK, STEEL, WHITE, at, bin, exitSign, extinguisher, noticeBoard, pictureFrame, plant, sideChair } from '../parts.ts';
import { hang, poster } from '../shell.ts';
import type { Builder, RoomArt } from './types.ts';

const TEAK = '#b07a45';

const bench: Builder = (w, d) => {
  const slats = Array.from({ length: 4 }, (_, i) => rbox(w, 0.035, 0.1, TEAK, 0, 0.45, -d / 2 + 0.12 + i * 0.13, 0.012));
  const back = Array.from({ length: 3 }, (_, i) => turn(rbox(w, 0.1, 0.03, TEAK, 0, 0.62 + i * 0.13, -d / 2 + 0.06 - i * 0.02, 0.012), 0, -0.15));
  const side = (x: number): THREE.Group =>
    group(x, 0, 0, box(0.05, 0.45, 0.05, shiny(DARK), 0, 0.225, d / 2 - 0.12), box(0.05, 0.95, 0.05, shiny(DARK), 0, 0.475, -d / 2 + 0.06), box(0.05, 0.04, d - 0.1, shiny(DARK), 0, 0.43, 0), rbox(0.06, 0.04, d - 0.1, shiny(DARK), 0, 0.64, 0, 0.012));
  return [...slats, ...back, side(-w / 2 + 0.1), side(w / 2 - 0.1)];
};

const planter: Builder = (w, _d, index) => {
  const styles = ['bush', 'tree', 'leafy'] as const;
  return [
    rbox(w, 0.5, w, pick(['#4b5563', '#e7e5e4', '#6b7280'], index), 0, 0.25, 0, 0.03),
    box(w - 0.08, 0.02, w - 0.08, '#3f2a1d', 0, 0.5, 0),
    group(0, 0.16, 0, plant(styles[index % 3], 1.05, '#3f2a1d')),
  ];
};

const parasol: Builder = (w) => {
  const canopy = cyl(0.04, 1.5, 0.45, BRAND, 0, 2.25, 0, 8);
  return [
    cyl(w / 2 - 0.1, w / 2 - 0.1, 0.04, WHITE, 0, 0.74, 0, 24),
    cyl(0.03, 0.03, 2.4, shiny(STEEL), 0, 1.2, 0, 8),
    cyl(0.28, 0.3, 0.06, shiny(DARK), 0, 0.03, 0, 16),
    canopy,
    ...[0, 1, 2, 3].map((i) => turn(group(0, 0, 0, group(0, 0, w / 2 + 0.3, turn(sideChair('#0ea5e9', '#f8fafc'), Math.PI))), (i * Math.PI) / 2 + 0.4)),
    group(0.2, 0.76, 0.15, cyl(0.035, 0.03, 0.12, shiny('#ef4444'), 0, 0.06, 0, 10)),
    group(-0.2, 0.76, -0.1, cyl(0.06, 0.05, 0.03, shiny(DARK), 0, 0.015, 0, 12)),
  ];
};

const acUnits: Builder = (w, d) => {
  const count = Math.max(1, Math.round(w / 1.1));
  return Array.from({ length: count }, (_, i) => {
    const x = -w / 2 + (w / count) * (i + 0.5);
    return group(
      x, 0, 0,
      rbox(0.95, 0.72, d - 0.1, '#e5e7eb', 0, 0.48, 0, 0.03),
      box(0.8, 0.08, 0.06, '#6b7280', 0, 0.06, -0.15),
      box(0.8, 0.08, 0.06, '#6b7280', 0, 0.06, 0.15),
      turn(cyl(0.27, 0.27, 0.02, shiny('#374151'), -0.12, 0.48, d / 2 - 0.04, 20), 0, Math.PI / 2),
      ...[0, 1, 2, 3].map((k) => turn(box(0.5, 0.012, 0.012, '#9ca3af', -0.12, 0.48, d / 2 - 0.02), 0, 0, (k * Math.PI) / 4)),
      ...[0.3, 0.4, 0.5, 0.6].map((y) => box(0.16, 0.012, 0.01, '#9ca3af', 0.34, y, d / 2 - 0.045)),
      turn(cyl(0.02, 0.02, 0.5, '#f8fafc', 0.4, 0.8, -d / 2 + 0.05, 6), 0, 0, 0.2),
    );
  });
};

const lounger: Builder = (w, d) => [
  rbox(w, 0.06, d * 0.62, '#f8fafc', 0, 0.3, d * 0.19, 0.02),
  turn(rbox(w, 0.06, d * 0.42, '#f8fafc', 0, 0.48, -d * 0.3, 0.02), 0, -0.7),
  rbox(w - 0.1, 0.05, d * 0.5, '#0ea5e9', 0, 0.35, d * 0.18, 0.02),
  ...[-1, 1].flatMap((sx) => [-0.3, 0.42].map((z) => box(0.04, 0.3, 0.04, TEAK, sx * (w / 2 - 0.06), 0.15, z * d))),
];

function corridorDecor(): THREE.Object3D[] {
  const photos = [31.6, 32.6, 33.6, 34.6, 35.6].map((x, i) => hang(pictureFrame(0.7, 0.5, pick(['#bfdbfe', '#fde68a', '#bbf7d0', '#fecaca', '#ddd6fe'], i)), 's', 17, x, 1.75, 0.1));
  const guide = [box(39.4, 0.006, 0.1, BRAND, 20, 0.004, 15.5), ...[6, 14, 22, 30, 37].map((x) => {
    const arrow = textPlane('▶', 0.3, 0.3, { bg: BRAND, fg: '#ffffff', lit: false });
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(x, 0.009, 15.5);
    return arrow;
  })];
  const hangingExit = group(20, 0, 15.5, cyl(0.006, 0.006, 0.3, STEEL, -0.15, 2.84, 0, 4), cyl(0.006, 0.006, 0.3, STEEL, 0.15, 2.84, 0, 4), turn(group(0, 2.6, 0, exitSign()), Math.PI / 2), turn(group(0, 2.6, 0, exitSign()), -Math.PI / 2));
  return [
    ...poster('把公司当成家', 2.4, 0.65, { bg: '#fff7e6', fg: '#c2410c', border: BRAND }, 'n', 14, 10.6, 1.8),
    ...poster('拥抱变化 · 享受福报', 3, 0.65, { bg: '#fff7e6', fg: '#c2410c', border: BRAND }, 'n', 14, 28.6, 1.8),
    ...poster('KPI 是检验真理的唯一标准', 3.4, 0.65, { bg: '#fff7e6', fg: '#c2410c', border: BRAND }, 's', 17, 9.3, 1.8),
    hang(noticeBoard(2.4, 1, 14), 'n', 14, 21.9, 1.75, 0.1),
    hang(textPlane('员工风采', 1, 0.22, { bg: '#1f2937', fg: '#ffffff' }), 's', 17, 33.6, 2.25),
    hang(textPlane('男', 0.5, 0.5, { bg: '#1d4ed8', fg: '#ffffff' }), 's', 17, 21.4, 1.7),
    hang(textPlane('女', 0.5, 0.5, { bg: '#db2777', fg: '#ffffff' }), 's', 17, 22.6, 1.7),
    ...photos,
    hang(extinguisher(), 'n', 14, 19.3, 0.5, 0.1),
    hang(extinguisher(), 's', 17, 37.2, 0.5, 0.1),
    hang(exitSign(), 'e', 40, 15.5, 2.42, 0.1),
    hangingExit,
    ...guide,
    at(39.4, 16.75, 0, plant('leafy', 0.8)),
    at(39.4, 14.4, 0, bin('#6b7280')),
    at(2, 14.35, 0, bin('#6b7280')),
    at(12, 16.65, 0, plant('bush', 0.8)),
  ];
}

const IRON = '#1c1c1e';

/** Rooftop hardware on the tower wall: the caged ladder to the upper roof, vent stacks and a bulkhead lamp. */
function roofKit(): THREE.Object3D[] {
  const ladder = hang(
    group(
      0, 0, 0,
      ...[-0.22, 0.22].map((x) => box(0.04, 3.9, 0.04, IRON, x, 1.95, 0.14)),
      ...Array.from({ length: 12 }, (_, i) => box(0.44, 0.03, 0.03, IRON, 0, 0.3 + i * 0.3, 0.14)),
      ...[0.4, 2, 3.4].flatMap((y) => [-0.22, 0.22].map((x) => box(0.03, 0.03, 0.14, IRON, x, y, 0.07))),
      ...[2.3, 2.9, 3.5].flatMap((y) => [box(0.7, 0.03, 0.03, IRON, 0, y, 0.72), ...[-0.35, 0.35].map((x) => box(0.03, 0.03, 0.58, IRON, x, y, 0.43))]),
      ...[-0.35, 0, 0.35].map((x) => box(0.025, 1.3, 0.025, IRON, x, 2.9, 0.72)),
    ),
    'w', 40, 21.6, 0, 0.1,
  );
  const gooseneck = (x: number, z: number): THREE.Group => at(x, z, 0, cyl(0.07, 0.07, 0.9, '#8f959b', 0, 0.45, 0, 10), turn(cyl(0.07, 0.07, 0.3, '#8f959b', 0.11, 0.9, 0, 10), 0, 0, Math.PI / 2), cyl(0.07, 0.09, 0.14, '#8f959b', 0.24, 0.84, 0, 10));
  const lamp = hang(group(0, 0, 0, rbox(0.16, 0.22, 0.1, IRON, 0, 0, 0.05, 0.02), rbox(0.11, 0.15, 0.06, glow('#ffe7b0'), 0, 0, 0.1, 0.02)), 'w', 40, 17.2, 2.35, 0.1);
  return [ladder, lamp, gooseneck(50.6, 12.2), gooseneck(50.9, 13)];
}

function terraceDecor(): THREE.Object3D[] {
  const poles = [[40.6, 8.6], [51.4, 8.6], [51.4, 23.4], [40.6, 23.4]].map(([x, z]) => cyl(0.035, 0.035, 3, shiny(DARK), x, 1.5, z, 8));
  const bulbs = Array.from({ length: 28 }, (_, i) => {
    const t = i / 27;
    const segment = Math.min(2, Math.floor(t * 3));
    const local = t * 3 - segment;
    const corners = [[40.6, 8.6], [51.4, 8.6], [51.4, 23.4], [40.6, 23.4]];
    const [ax, az] = corners[segment];
    const [bx, bz] = corners[segment + 1];
    const sag = Math.sin(local * Math.PI) * 0.4;
    return ball(0.06, glow(pick(['#fff3c4', '#fde68a', '#fdba74'], i)), ax + (bx - ax) * local, 2.95 - sag, az + (bz - az) * local);
  });
  const turf = box(4, 0.012, 3.2, '#4ca35a', 43.6, 0.006, 22);
  const vent = at(50, 10, 0, cyl(0.25, 0.25, 0.7, shiny('#d1d5db'), 0, 0.35, 0, 14), cyl(0.4, 0.4, 0.06, shiny('#9ca3af'), 0, 0.76, 0, 14), cyl(0.34, 0.25, 0.14, shiny('#d1d5db'), 0, 0.7, 0, 14));
  const ashtray = at(44.6, 9, 0, cyl(0.14, 0.14, 0.8, shiny('#6b7280'), 0, 0.4, 0, 12), cyl(0.15, 0.15, 0.03, shiny(DARK), 0, 0.815, 0, 12));
  const sign = poster('天台风大\n吹不走 KPI', 1.5, 0.75, { bg: '#fff7e6', fg: '#c2410c', border: BRAND }, 'w', 40, 19.5, 1.8);
  const pipes = [box(0.1, 0.1, 5, shiny('#9ca3af'), 40.2, 2.6, 11), ...[9, 11, 13].map((z) => box(0.14, 0.04, 0.14, '#6b7280', 40.2, 2.66, z))];
  return [...poles, ...bulbs, turf, vent, ashtray, ...sign, ...pipes, ...roofKit(), ball(0.11, shiny('#f97316'), 45.6, 0.11, 21.4)];
}

export const outdoor: RoomArt = {
  builders: { bench, planter, parasol, acUnits, lounger },
  decor: () => [...corridorDecor(), ...terraceDecor()],
};
