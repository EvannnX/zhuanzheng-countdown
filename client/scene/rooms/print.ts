import type * as THREE from 'three';
import { box, cyl, glass, glow, group, pick, rbox, shiny, textPlane, turn } from '../kit.ts';
import { DARK, STEEL, WHITE, WOOD, at, bin, cardboardBox, deskLamp, extinguisher, noticeBoard, papers } from '../parts.ts';
import { hang, poster } from '../shell.ts';
import type { Builder, RoomArt } from './types.ts';

const BODY = '#e5e7eb';
const BINDER = ['#1d4ed8', '#b91c1c', '#15803d', '#a16207', '#111827', '#f8fafc'];

const PAPER_OUT_Y = 0.74;
const SCANNER_Y = 0.98;

/** Paper drawers on castors: the bottom half of the machine. */
function drawerBase(bw: number, bd: number, x: number): THREE.Object3D[] {
  const front = bd / 2;
  return [
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.03, 0.03, 0.05, DARK, x + sx * (bw / 2 - 0.07), 0.03, sz * (bd / 2 - 0.07), 10))),
    rbox(bw, 0.54, bd, BODY, x, 0.33, 0, 0.02),
    ...[0.2, 0.46].flatMap((y, i) => [
      box(bw - 0.06, 0.22, 0.012, '#f3f4f6', x, y, front + 0.002),
      box(0.22, 0.03, 0.02, '#4b5563', x, y + 0.06, front + 0.006),
      box(0.05, 0.06, 0.004, WHITE, x + bw / 2 - 0.09, y, front + 0.01),
      box(0.012, 0.1 - i * 0.04, 0.004, glow('#60a5fa'), x + bw / 2 - 0.04, y, front + 0.01),
    ]),
  ];
}

/** Engine section with the open paper-exit bay, the scanner slab and the document feeder on top. */
function engine(bw: number, bd: number, x: number): THREE.Object3D[] {
  const front = bd / 2;
  return [
    rbox(bw, SCANNER_Y - 0.6, bd, '#d7dadd', x, (SCANNER_Y + 0.6) / 2, 0, 0.02),
    box(bw * 0.72, 0.17, 0.3, '#22262c', x - bw * 0.08, PAPER_OUT_Y + 0.08, front - 0.14),
    box(bw * 0.66, 0.012, 0.36, WHITE, x - bw * 0.08, PAPER_OUT_Y, front - 0.12),
    group(x - bw * 0.08, PAPER_OUT_Y + 0.008, front - 0.14, papers(4, 6)),
    box(bw - 0.04, 0.02, 0.012, '#1d4ed8', x, 0.62, front + 0.002),
    rbox(bw + 0.02, 0.07, bd + 0.02, '#aeb3b9', x, SCANNER_Y + 0.035, 0, 0.02),
    // document feeder: hinged lid, sloped input tray with a waiting stack, side guides
    rbox(bw * 0.92, 0.09, bd * 0.86, '#c3c7cc', x, SCANNER_Y + 0.115, -0.02, 0.025),
    turn(box(bw * 0.5, 0.012, bd * 0.5, '#e5e7eb', x - bw * 0.14, SCANNER_Y + 0.2, -0.02), 0, 0, 0.14),
    turn(box(0.21, 0.01, 0.3, WHITE, x - bw * 0.14, SCANNER_Y + 0.212, -0.02), 0, 0, 0.14),
    ...[-0.17, 0.17].map((z) => box(bw * 0.3, 0.03, 0.012, '#6b7280', x - bw * 0.14, SCANNER_Y + 0.215, -0.02 + z)),
    rbox(bw * 0.24, 0.07, bd * 0.8, '#8f959b', x + bw * 0.32, SCANNER_Y + 0.19, -0.02, 0.02),
  ];
}

/** Tilted touch panel with a keypad and the big green start key. */
function controlPanel(): THREE.Group {
  return turn(
    group(
      0, 0, 0,
      rbox(0.3, 0.03, 0.2, shiny(DARK), 0, 0.015, 0, 0.008),
      box(0.16, 0.004, 0.12, glow('#93c5fd'), -0.05, 0.032, 0),
      ...[0, 1, 2].flatMap((r) => [0, 1].map((c) => box(0.022, 0.006, 0.022, '#9ca3af', 0.07 + c * 0.032, 0.033, -0.05 + r * 0.032))),
      cyl(0.02, 0.02, 0.008, glow('#22c55e'), 0.1, 0.034, 0.065, 10),
      cyl(0.012, 0.012, 0.008, shiny('#dc2626'), 0.06, 0.034, 0.065, 8),
    ),
    0, 0.5,
  );
}

/** Floor-standing multi-function printer with a fold-out bypass tray; `tall` bolts a stapling finisher to its side instead. */
function machine(w: number, d: number, tall: boolean): THREE.Object3D[] {
  const bw = w * (tall ? 0.6 : 0.72);
  const bd = d * 0.76;
  const x = tall ? -w * 0.16 : 0.06;
  const finisherX = x + bw / 2 + 0.17;
  return [
    ...drawerBase(bw, bd, x),
    ...engine(bw, bd, x),
    group(x + bw / 2 - 0.17, SCANNER_Y + 0.02, bd / 2 + 0.02, controlPanel()),
    box(0.012, 0.3, bd * 0.56, '#c3c7cc', x - bw / 2 - 0.004, 0.62, 0),
    ...(tall
      ? [
          rbox(0.3, 1, bd * 0.86, '#d1d5db', finisherX, 0.53, 0, 0.02),
          ...[0.52, 0.8].map((y) => turn(box(0.24, 0.012, bd * 0.6, WHITE, finisherX + 0.06, y, 0), 0, 0, 0.18)),
          box(0.2, 0.3, 0.012, '#aeb3b9', finisherX, 0.26, (bd * 0.86) / 2 + 0.002),
          box(0.04, 0.016, 0.014, glow('#22c55e'), finisherX, 0.96, (bd * 0.86) / 2 + 0.004),
        ]
      : [box(0.05, 0.02, 0.014, glow('#22c55e'), x + bw / 2 - 0.08, 0.93, bd / 2 + 0.004), turn(box(0.2, 0.012, bd * 0.5, '#d1d5db', x - bw / 2 - 0.09, 0.7, 0), 0, 0, -0.35)]),
  ];
}

const printer: Builder = (w, d) => machine(w, d, false);
const copier: Builder = (w, d) => machine(w, d, true);

const invoiceTable: Builder = (w, d) => [
  rbox(w, 0.04, d, WOOD, 0, 0.74, 0, 0.012),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.05, 0.72, 0.05, shiny(STEEL), sx * (w / 2 - 0.1), 0.36, sz * (d / 2 - 0.1)))),
  box(w - 0.2, 0.03, 0.03, shiny(STEEL), 0, 0.2, -d / 2 + 0.1),
  ...[-0.85, -0.45, 0.35].map((x, i) => group(x, 0.76, -0.05 + (i % 2) * 0.12, papers(5 + i * 3, i + 1))),
  group(-0.05, 0.76, 0.12, box(0.3, 0.004, 0.2, '#fecaca', 0, 0.002, 0), box(0.22, 0.004, 0.1, WHITE, 0.02, 0.006, 0.02), box(0.2, 0.004, 0.08, '#fef3c7', -0.03, 0.01, -0.03)),
  group(0.75, 0.76, 0.15, rbox(0.16, 0.05, 0.05, shiny('#ef4444'), 0, 0.03, 0, 0.012), box(0.14, 0.012, 0.04, shiny(STEEL), 0, 0.062, 0)),
  group(0.95, 0.76, -0.1, rbox(0.12, 0.02, 0.18, shiny(DARK), 0, 0.01, 0, 0.006), box(0.1, 0.004, 0.05, glow('#bbf7d0'), 0, 0.022, -0.05)),
  group(0.55, 0.76, -0.2, cyl(0.016, 0.016, 0.11, shiny('#f59e0b'), 0, 0.055, 0, 8), cyl(0.045, 0.04, 0.1, shiny(DARK), 0.12, 0.05, 0, 12)),
  group(-1, 0, -0.25, deskLamp('#2563eb', 0.76)),
  group(w / 2 + 0.25, 0, 0.1, bin('#9ca3af')),
];

const serverRack: Builder = (w, d) => {
  const half = d / 2;
  const units = Array.from({ length: 9 }, (_, i) =>
    group(0, 0.28 + i * 0.185, 0, box(w - 0.16, 0.15, d - 0.14, shiny('#374151')), box(w - 0.3, 0.02, 0.012, '#111827', 0, 0.03, half - 0.064), box(w - 0.3, 0.02, 0.012, '#111827', 0, -0.03, half - 0.064)),
  );
  return [
    rbox(w, 2, d, shiny('#111827'), 0, 1, 0, 0.02),
    box(w - 0.1, 1.82, 0.02, glass('#93c5fd', 0.18), 0, 1.02, half + 0.002),
    box(0.03, 1.9, 0.03, shiny(STEEL), 0, 1.02, half + 0.01),
    ...[0.3, 0.7, 1.1, 1.5].map((y) => box(w - 0.14, 0.012, 0.012, '#4b5563', 0, y + 0.17, half - 0.01)),
    ...units,
    box(w * 0.6, 0.06, d * 0.3, '#374151', 0, 2.03, 0),
    ...[-0.25, 0.1, 0.3].map((x, i) => turn(cyl(0.012, 0.012, 0.9, pick(['#2563eb', '#f59e0b', '#ef4444'], i), x, 1.5, -half - 0.02, 6), 0, 0, 0.1 * (i - 1))),
  ];
};

const shelf: Builder = (w, d) => {
  const levels = [0.12, 0.62, 1.12, 1.62];
  return [
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.04, 2.05, 0.04, shiny(STEEL), sx * (w / 2 - 0.02), 1.025, sz * (d / 2 - 0.02)))),
    ...levels.map((y) => box(w, 0.03, d, '#cbd5e1', 0, y, 0)),
    box(w, 0.03, d, '#cbd5e1', 0, 2.04, 0),
    group(-w / 4, levels[0] + 0.015, 0, cardboardBox(0.5, 0.34, 0.4)),
    group(w / 4, levels[0] + 0.015, 0, cardboardBox(0.44, 0.3, 0.36)),
    ...[0, 1, 2, 3, 4, 5].map((i) => rbox(0.3, 0.055, 0.22, WHITE, -w / 2 + 0.3, levels[1] + 0.045 + i * 0.057, 0, 0.006)),
    ...[0, 1, 2].map((i) => rbox(0.12, 0.34, 0.12, pick(['#111827', '#0ea5e9', '#ec4899'], i), 0.1 + i * 0.16, levels[1] + 0.185, 0, 0.012)),
    ...Array.from({ length: 11 }, (_, i) => rbox(0.07, 0.32, 0.26, pick(BINDER, i), -w / 2 + 0.14 + i * 0.078, levels[2] + 0.175, 0, 0.008)),
    group(-w / 4, levels[3] + 0.015, 0, cardboardBox(0.4, 0.26, 0.34)),
    ...Array.from({ length: 6 }, (_, i) => rbox(0.07, 0.3, 0.26, pick(BINDER, i + 2), 0.1 + i * 0.078, levels[3] + 0.165, 0, 0.008)),
  ];
};

const boxes: Builder = () => [
  group(-0.15, 0, -0.2, cardboardBox(0.55, 0.4, 0.5)),
  turn(group(-0.12, 0.4, -0.18, cardboardBox(0.5, 0.36, 0.45)), 0.2),
  turn(group(0.1, 0, 0.3, cardboardBox(0.5, 0.34, 0.42)), -0.3),
  ...[0, 1, 2, 3].map((i) => rbox(0.3, 0.055, 0.22, WHITE, 0.14, 0.37 + i * 0.057, 0.3, 0.006)),
];

const ups: Builder = (w, d) => [
  rbox(w, 0.7, d, shiny('#1f2937'), 0, 0.35, 0, 0.02),
  box(0.22, 0.1, 0.01, glow('#22c55e'), 0, 0.52, d / 2 + 0.004),
  ...[-0.2, -0.1, 0, 0.1, 0.2].map((x) => box(0.06, 0.2, 0.01, '#374151', x, 0.25, d / 2 + 0.004)),
];

const shredder: Builder = (w, d) => [
  rbox(w, 0.5, d, '#4b5563', 0, 0.25, 0, 0.02),
  rbox(w + 0.02, 0.12, d + 0.02, shiny(DARK), 0, 0.56, 0, 0.02),
  box(w - 0.14, 0.012, 0.03, '#000000', 0, 0.622, 0),
  turn(box(0.2, 0.18, 0.004, WHITE, 0, 0.7, 0), 0, 0.1),
  box(0.05, 0.02, 0.01, glow('#22c55e'), w / 2 - 0.08, 0.56, d / 2 + 0.012),
];

function decor(): THREE.Object3D[] {
  const firstAid = hang(group(0, 0, 0, rbox(0.4, 0.3, 0.12, WHITE, 0, 0, 0.06, 0.02), box(0.16, 0.05, 0.004, '#dc2626', 0, 0, 0.122), box(0.05, 0.16, 0.004, '#dc2626', 0, 0, 0.122)), 'w', 9, 18.4, 1.6, 0.1);
  const cableTray = [box(0.3, 0.04, 6, shiny(STEEL), 17.3, 2.7, 22.6), ...[20.5, 22.5, 24.5].map((z) => cyl(0.008, 0.008, 0.28, STEEL, 17.3, 2.86, z, 4))];
  const label = hang(textPlane('机房重地\n闲人免进', 0.9, 0.5, { bg: '#fde047', fg: '#111111', border: '#111111' }), 'e', 18, 22.2, 2.3, 0.118);
  return [
    ...poster('卡纸请拍打侧面\n不要拍打同事', 2, 0.85, { bg: '#fff7e6', fg: '#c2410c', border: '#ff7a2f' }, 'n', 17, 11, 1.85),
    hang(noticeBoard(1.6, 0.9, 9), 's', 28, 13.6, 1.75, 0.1),
    hang(extinguisher(), 'n', 17, 16.4, 0.5, 0.1),
    firstAid,
    ...cableTray,
    label,
    at(14.9, 27.3, 0, rbox(0.5, 0.5, 0.4, '#d1d5db', 0, 0.25, 0, 0.02), box(0.4, 0.012, 0.3, WHITE, 0, 0.51, 0)),
    at(12, 22.5, 0.4, box(0.6, 0.006, 0.42, '#fde047', 0, 0.003, 0), box(0.5, 0.004, 0.04, '#111827', 0, 0.007, 0)),
  ];
}

export const print: RoomArt = { builders: { printer, copier, invoiceTable, serverRack, shelf, boxes, ups, shredder }, decor };
