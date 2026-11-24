import type * as THREE from 'three';
import { ball, box, cyl, glass, glow, group, pick, rbox, shiny, textPlane, turn } from '../kit.ts';
import { DARK, STEEL, WHITE, WOOD, at, bin, mug, plant, stool, waterDispenser } from '../parts.ts';
import { bagel, deliCup, paperBag } from '../nycParts.ts';
import { hang, poster } from '../shell.ts';
import type { Builder, RoomArt } from './types.ts';

const TOP_Y = 0.92;
const SNACKS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6'];

const STAINLESS = '#c5cad0';

/** Glass diner carafe, half full; the orange-collared one is decaf. */
const carafe = (decaf: boolean): THREE.Group =>
  group(
    0, 0, 0,
    cyl(0.07, 0.085, 0.12, glass('#e7f2f7', 0.45), 0, 0.06, 0, 14),
    cyl(0.062, 0.078, 0.07, '#3b2415', 0, 0.04, 0, 14),
    cyl(0.05, 0.07, 0.03, glass('#e7f2f7', 0.45), 0, 0.135, 0, 14),
    cyl(0.052, 0.052, 0.022, decaf ? shiny('#f97316') : shiny(DARK), 0, 0.158, 0, 14),
    rbox(0.02, 0.1, 0.03, decaf ? shiny('#f97316') : shiny(DARK), 0.095, 0.1, 0, 0.008),
  );

/** Twin-warmer drip brewer, the kind every deli runs all day. Origin on the counter. */
function dripBrewer(): THREE.Group {
  return group(
    0, TOP_Y, 0,
    rbox(0.38, 0.05, 0.4, shiny(STAINLESS), 0, 0.025, 0, 0.012),
    rbox(0.38, 0.5, 0.12, shiny(STAINLESS), 0, 0.3, -0.14, 0.012),
    rbox(0.38, 0.12, 0.4, shiny(STAINLESS), 0, 0.5, 0, 0.012),
    cyl(0.09, 0.09, 0.012, DARK, -0.09, 0.056, 0.06, 16),
    cyl(0.09, 0.09, 0.012, DARK, 0.09, 0.568, 0.02, 16),
    // brew basket under the spray head, with the pot beneath it
    cyl(0.085, 0.06, 0.1, DARK, -0.09, 0.39, 0.06, 14),
    box(0.03, 0.02, 0.1, DARK, -0.09, 0.4, 0.17),
    group(-0.09, 0.062, 0.06, carafe(false)),
    group(0.09, 0.574, 0.02, turn(carafe(true), 0.6)),
    box(0.1, 0.03, 0.004, '#111827', 0.09, 0.5, 0.202),
    ...[0.06, 0.12].map((x, i) => box(0.022, 0.03, 0.01, glow(i === 0 ? '#ef4444' : '#f59e0b'), x, 0.5, 0.204)),
    cyl(0.07, 0.07, 0.16, glass('#bfdbfe', 0.5), 0.1, 0.2, 0.04, 12),
  );
}

/** Wicker basket of bagels with the tub of cream cheese and a knife. */
function bagelBasket(): THREE.Group {
  const pile = [[-0.08, 0.05, -0.03], [0.07, 0.05, -0.04], [0, 0.05, 0.07], [-0.02, 0.095, 0], [0.06, 0.1, 0.05]];
  return group(
    0, TOP_Y, 0,
    cyl(0.18, 0.15, 0.06, '#b98a55', 0, 0.03, 0, 16),
    cyl(0.165, 0.165, 0.01, '#f5e9d3', 0, 0.056, 0, 16),
    ...pile.map(([x, y, z], i) => turn(group(x, y, z, bagel(i % 2 === 0)), i * 1.3, (i % 3) * 0.2 - 0.2)),
    group(0.27, 0, 0.05, cyl(0.06, 0.05, 0.06, WHITE, 0, 0.03, 0, 12), cyl(0.052, 0.052, 0.006, '#fdf6e3', 0, 0.058, 0, 12), turn(box(0.16, 0.006, 0.018, shiny(STEEL), 0.02, 0.066, 0), 0.5)),
  );
}

/** Four-slot toaster with two bagel halves up. */
const toaster = (): THREE.Group =>
  group(
    0, TOP_Y, 0,
    rbox(0.3, 0.19, 0.26, shiny(STAINLESS), 0, 0.105, 0, 0.03),
    ...[-0.07, 0.07].flatMap((x) => [-0.05, 0.05].map((z) => box(0.1, 0.006, 0.03, DARK, x, 0.2, z))),
    ...[-0.05, 0.05].map((z) => cyl(0.045, 0.045, 0.02, '#c98b45', -0.07, 0.225, z, 12).rotateX(Math.PI / 2)),
    ...[-0.07, 0.07].map((x) => box(0.03, 0.04, 0.02, DARK, x, 0.12, 0.135)),
    cyl(0.02, 0.02, 0.012, DARK, 0, 0.06, 0.135, 8).rotateX(Math.PI / 2),
  );

/** Sleeve of paper cups, lids, sugar and stirrers. */
const cupStation = (): THREE.Group =>
  group(
    0, TOP_Y, 0,
    ...[0, 1, 2, 3, 4].map((i) => cyl(0.042, 0.034, 0.05, i % 2 === 0 ? '#2f6fc4' : WHITE, -0.06, 0.025 + i * 0.045, 0, 12)),
    group(0.06, 0, 0.06, deliCup()),
    rbox(0.12, 0.07, 0.1, DARK, 0.06, 0.035, -0.08, 0.01),
    ...[-0.03, 0, 0.03].map((x, i) => box(0.022, 0.05, 0.05, ['#f8fafc', '#f9a8d4', '#fde68a'][i], 0.06 + x, 0.075, -0.08)),
    cyl(0.03, 0.03, 0.1, glass('#ffffff', 0.4), 0.17, 0.05, 0, 10),
    ...[-0.008, 0.008].map((x) => cyl(0.003, 0.003, 0.15, '#b98a55', 0.17 + x, 0.09, 0, 4)),
  );

const counter: Builder = (w, d) => {
  const doors = Math.round(w / 0.6);
  const unit = w / doors;
  const sinkX = -0.4;
  return [
    rbox(w, TOP_Y - 0.14, d - 0.06, WHITE, 0, 0.1 + (TOP_Y - 0.14) / 2, -0.03, 0.012),
    box(w, 0.1, d - 0.14, '#4b5563', 0, 0.05, -0.05),
    rbox(w + 0.03, 0.04, d + 0.02, '#3f3f46', 0, TOP_Y - 0.02, 0, 0.012),
    ...Array.from({ length: doors }, (_, i) => box(unit - 0.03, TOP_Y - 0.22, 0.012, '#f1f5f9', -w / 2 + unit * (i + 0.5), 0.1 + (TOP_Y - 0.14) / 2, d / 2 - 0.058)),
    ...Array.from({ length: doors }, (_, i) => box(0.02, 0.16, 0.025, shiny(STEEL), -w / 2 + unit * (i + 0.5) + (i % 2 === 0 ? 0.2 : -0.2), 0.62, d / 2 - 0.04)),
    // upper cabinets and tiled splashback
    rbox(w, 0.62, 0.36, WHITE, 0, 1.95, -d / 2 + 0.18, 0.012),
    ...Array.from({ length: doors }, (_, i) => box(unit - 0.03, 0.56, 0.012, '#f1f5f9', -w / 2 + unit * (i + 0.5), 1.95, -d / 2 + 0.364)),
    box(w, 0.72, 0.012, shiny('#f7f5ee'), 0, 1.29, -d / 2 + 0.008),
    ...[1.11, 1.29, 1.47].map((y) => box(w, 0.006, 0.004, '#c9c5ba', 0, y, -d / 2 + 0.016)),
    box(w - 0.2, 0.02, 0.04, glow('#fff7d6'), 0, 1.63, -d / 2 + 0.3),
    // sink
    box(0.5, 0.012, 0.36, shiny('#9ca3af'), sinkX, TOP_Y + 0.004, 0.02),
    box(0.42, 0.012, 0.28, '#4b5563', sinkX, TOP_Y + 0.007, 0.02),
    cyl(0.014, 0.014, 0.22, shiny(STEEL), sinkX, TOP_Y + 0.11, -0.2, 8),
    turn(cyl(0.012, 0.012, 0.16, shiny(STEEL), sinkX, TOP_Y + 0.22, -0.13, 8), 0, Math.PI / 2),
    // appliances: the drip brewer sits where the coffee station is, bagels and cups beside it
    group(1, 0, -0.02, dripBrewer()),
    group(0.3, 0, 0.05, bagelBasket()),
    group(-0.93, 0, -0.04, toaster()),
    group(1.46, 0, 0.02, cupStation()),
    group(-1.35, TOP_Y, -0.06, rbox(0.5, 0.3, 0.36, shiny('#e5e7eb'), 0, 0.15, 0, 0.02), box(0.32, 0.2, 0.01, '#111827', -0.06, 0.15, 0.182), box(0.08, 0.2, 0.01, '#374151', 0.19, 0.15, 0.182), box(0.02, 0.2, 0.03, shiny(STEEL), 0.12, 0.15, 0.195)),
    group(-2.05, TOP_Y, 0, cyl(0.07, 0.085, 0.2, shiny('#e5e7eb'), 0, 0.1, 0, 14), cyl(0.03, 0.05, 0.03, DARK, 0, 0.215, 0, 10), rbox(0.02, 0.14, 0.05, DARK, 0.1, 0.12, 0, 0.008)),
    group(1.88, TOP_Y, -0.08, cyl(0.01, 0.01, 0.3, WOOD, 0, 0.15, 0, 6), cyl(0.09, 0.09, 0.015, WOOD, 0, 0.008, 0, 12), ...[0, 1, 2, 3].map((i) => turn(group(0, 0.12 + (i % 2) * 0.1, 0, group(0.1, 0, 0, mug(pick(['#ef4444', '#3b82f6', '#f59e0b', '#22c55e'], i)))), (i * Math.PI) / 2))),
    group(2.25, TOP_Y, 0, plant('bush', 0.4, '#fef3c7')),
  ];
};

const fridge: Builder = (w, d) => {
  const magnets = [0, 1, 2, 3, 4].map((i) => box(0.06, 0.06, 0.01, pick(SNACKS, i), -0.25 + ((i * 0.17) % 0.5), 1.3 + ((i * 0.13) % 0.4), d / 2 - 0.035));
  return [
    rbox(w - 0.1, 1.9, d - 0.1, shiny('#e5e7eb'), 0, 0.95, 0, 0.03),
    box(w - 0.14, 0.01, 0.01, '#9ca3af', 0, 1.1, d / 2 - 0.045),
    box(0.03, 0.5, 0.04, shiny(STEEL), w / 2 - 0.16, 1.45, d / 2 - 0.03),
    box(0.03, 0.4, 0.04, shiny(STEEL), w / 2 - 0.16, 0.8, d / 2 - 0.03),
    ...magnets,
    box(0.18, 0.22, 0.008, WHITE, -0.1, 0.7, d / 2 - 0.04),
    group(0, 1.9, 0, rbox(0.4, 0.22, 0.3, '#c99657', -0.15, 0.11, 0, 0.01), rbox(0.3, 0.16, 0.24, '#fde68a', 0.22, 0.08, 0, 0.01)),
  ];
};

const snackCabinet: Builder = (w, d) => {
  const sign = textPlane('零食柜', 0.9, 0.2, { bg: '#f59e0b', fg: '#ffffff' });
  sign.position.set(0, 1.96, d / 2 - 0.05);
  const shelves = [0.2, 0.62, 1.04, 1.46];
  return [
    box(w, 2.1, 0.04, WOOD, 0, 1.05, -d / 2 + 0.07),
    box(w - 0.08, 1.74, 0.02, '#fff7e6', 0, 0.98, -d / 2 + 0.1),
    box(0.05, 2.1, d - 0.1, WOOD, -w / 2 + 0.025, 1.05, -0.05),
    box(0.05, 2.1, d - 0.1, WOOD, w / 2 - 0.025, 1.05, -0.05),
    box(w, 0.26, d - 0.1, WOOD, 0, 1.97, -0.05),
    box(w, 0.12, d - 0.1, WOOD, 0, 0.06, -0.05),
    ...shelves.map((y) => box(w - 0.1, 0.03, d - 0.16, WOOD, 0, y, 0.02)),
    ...shelves.flatMap((y, row) =>
      Array.from({ length: 7 }, (_, i) => {
        const x = -w / 2 + 0.2 + i * ((w - 0.4) / 6);
        const color = pick(SNACKS, row * 3 + i);
        if ((row + i) % 3 === 0) return cyl(0.05, 0.05, 0.2, shiny(color), x, y + 0.115, 0.1, 12);
        if ((row + i) % 3 === 1) return turn(rbox(0.18, 0.26, 0.07, color, x, y + 0.145, 0.1, 0.025), 0, -0.12);
        return rbox(0.2, 0.14, 0.14, color, x, y + 0.085, 0.1, 0.015);
      }),
    ),
    box(w - 0.1, 1.72, 0.012, glass('#ffffff', 0.12), 0, 0.98, d / 2 - 0.07),
    box(0.03, 1.72, 0.03, shiny(STEEL), 0, 0.98, d / 2 - 0.06),
    sign,
  ];
};

const roundTable: Builder = (w) => [
  cyl(w / 2, w / 2, 0.04, WHITE, 0, 0.76, 0, 28),
  cyl(0.04, 0.04, 0.72, shiny(STEEL), 0, 0.38, 0, 10),
  cyl(0.3, 0.32, 0.03, shiny(STEEL), 0, 0.015, 0, 20),
  group(0, 0.78, 0, cyl(0.16, 0.1, 0.07, '#fef3c7', 0, 0.035, 0, 16), ball(0.05, '#ef4444', -0.05, 0.09, 0.02), ball(0.05, '#f59e0b', 0.05, 0.09, -0.02), ball(0.045, '#facc15', 0, 0.1, 0.06), ball(0.045, '#22c55e', 0, 0.13, -0.01)),
  group(0.3, 0.78, 0.25, mug('#3b82f6')),
  ...[0, 1, 2].map((i) => turn(group(0, 0, 0, group(0, 0, w / 2 + 0.32, stool(pick(['#f97316', '#0ea5e9', '#84cc16'], i), 0.46))), (i / 3) * Math.PI * 2 + 0.5)),
];

const bins: Builder = (w) => {
  const labels = ['可回收', '厨余', '其他'];
  const colors = ['#2563eb', '#16a34a', '#6b7280'];
  return colors.map((c, i) => {
    const tag = textPlane(labels[i], 0.3, 0.1, { bg: '#ffffff', fg: c });
    tag.position.set(0, 0.5, 0.176);
    return group(-w / 2 + (w / 3) * (i + 0.5), 0, 0, rbox(0.38, 0.72, 0.34, c, 0, 0.36, 0, 0.03), rbox(0.4, 0.05, 0.36, shiny(DARK), 0, 0.745, 0, 0.02), box(0.2, 0.05, 0.01, DARK, 0, 0.62, 0.172), tag);
  });
};

const barTable: Builder = (w) => [
  rbox(w, 0.05, 0.42, WOOD, 0, 1.05, -0.02, 0.015),
  ...[-w / 2 + 0.15, 0, w / 2 - 0.15].map((x) => box(0.04, 1.02, 0.04, shiny(DARK), x, 0.51, -0.18)),
  box(w - 0.2, 0.03, 0.03, shiny(DARK), 0, 0.3, -0.18),
  ...[-1, 0, 1].map((i) => group(i * 1.05, 0, 0.36, stool('#374151', 0.74))),
  group(-0.5, 1.08, 0, mug('#f97316')),
  group(0.7, 1.08, 0, plant('bush', 0.3, '#fef3c7')),
];

const dispenser: Builder = () => [waterDispenser()];

function decor(): THREE.Object3D[] {
  const pendant = (x: number, z: number): THREE.Group => group(x, 0, z, cyl(0.004, 0.004, 0.8, DARK, 0, 2.6, 0, 4), cyl(0.06, 0.22, 0.2, shiny('#f59e0b'), 0, 2.12, 0, 16), ball(0.05, glow('#fff3c4'), 0, 2.04, 0));
  return [
    ...poster('本周零食：\n薯片（已被吃完）\n辣条（已被吃完）', 1.8, 1, { bg: '#1f2937', fg: '#fef3c7' }, 'n', 17, 2.2, 1.75),
    ...poster('零食仅供\n加班同事取用', 1.6, 0.8, { bg: '#fff7e6', fg: '#c2410c', border: '#ff7a2f' }, 'e', 9, 20.5, 1.85),
    pendant(6.5, 22),
    pendant(8.3, 24),
    pendant(8.3, 25.6),
    at(7.8, 27.3, 0, plant('tree', 0.95)),
    at(3.2, 18.2, 0, bin('#9ca3af')),
    hang(textPlane('TODAY 今日供应\nBAGEL 贝果 · LOX 熏鲑鱼\nDRIP COFFEE 滴滤咖啡\n—— 以上均已被吃完 ——', 1.5, 0.95, { bg: '#18181b', fg: '#f8f4e3', border: '#b98a55' }), 'w', 0, 26.75, 1.75),
    at(6.25, 21.75, 0.4, group(0, 0.78, 0, paperBag())),
  ];
}

export const pantry: RoomArt = { builders: { counter, fridge, snackCabinet, roundTable, bins, barTable, dispenser }, decor };
