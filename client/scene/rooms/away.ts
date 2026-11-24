import * as THREE from 'three';
import { ROADS } from '../../../shared/hazards.ts';
import { areaById } from '../../../shared/world.ts';
import { towerGeometry } from '../exterior.ts';
import { ball, box, cyl, glass, glow, group, pick, rbox, shiny, textPlane, turn } from '../kit.ts';
import { DARK, STEEL, WHITE, WOOD, at, bin, plant, stool } from '../parts.ts';
import { hang } from '../shell.ts';
import { facade } from '../textures.ts';
import { nycStreet } from './streetNyc.ts';
import { warehouse } from './warehouse.ts';
import type { Builder, RoomArt } from './types.ts';

const ZEBRA_BARS = 6;
const ZEBRA_WIDTH = 5;

// ---------------------------------------------------------------- street
const pancakeStall: Builder = (w, d) => {
  const sign = textPlane('煎饼果子 ¥6', w - 0.2, 0.32, { bg: '#dc2626', fg: '#fff7d6' });
  sign.position.set(0, 1.15, d / 2 + 0.012);
  return [
    rbox(w, 0.9, d, '#e5e7eb', 0, 0.55, 0, 0.03),
    box(w - 0.1, 0.3, 0.02, '#dc2626', 0, 1.15, d / 2),
    sign,
    ...[-1, 1].map((s) => turn(cyl(0.2, 0.2, 0.06, DARK, s * (w / 2 - 0.3), 0.2, d / 2, 14), 0, Math.PI / 2)),
    cyl(0.34, 0.34, 0.04, shiny(DARK), -0.4, 1.03, 0, 20),
    cyl(0.28, 0.28, 0.01, '#fde68a', -0.4, 1.055, 0, 20),
    ...[0.3, 0.55, 0.8].map((x, i) => cyl(0.06, 0.05, 0.14, pick(['#b45309', '#16a34a', '#dc2626'], i), x, 1.07, -0.2, 10)),
    cyl(0.025, 0.025, 2.3, shiny(STEEL), w / 2 - 0.1, 1.15, -d / 2 + 0.1, 8),
    cyl(0.05, 1.5, 0.4, '#f59e0b', w / 2 - 0.1, 2.4, -d / 2 + 0.1, 8),
  ];
};

const busStop: Builder = (w, d) => {
  const ad = textPlane('加班打车\n公司不报销', w - 0.5, 1.3, { bg: '#fde047', fg: '#111111' });
  ad.position.set(0, 1.3, -d / 2 + 0.08);
  return [
    box(w, 0.08, d, shiny('#374151'), 0, 2.4, 0),
    ...[-1, 1].map((s) => box(0.08, 2.4, 0.08, shiny('#374151'), s * (w / 2 - 0.06), 1.2, -d / 2 + 0.06)),
    box(w - 0.3, 1.6, 0.03, glass('#bfe3f5', 0.35), 0, 1.3, -d / 2 + 0.06),
    ad,
    rbox(w - 0.8, 0.06, 0.4, WOOD, 0, 0.45, 0, 0.02),
    ...[-1, 1].map((s) => box(0.06, 0.45, 0.3, shiny('#374151'), s * (w / 2 - 0.6), 0.225, 0)),
  ];
};

// ---------------------------------------------------------------- dressing
function streetDecor(): THREE.Object3D[] {
  const material = new THREE.MeshLambertMaterial({ map: facade('#8f5b45', '#27333f', 71) });
  const block = (x0: number, z0: number, x1: number, z1: number, h: number): THREE.Mesh => {
    const m = new THREE.Mesh(towerGeometry(x1 - x0, h, z1 - z0), material);
    m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    return m;
  };
  const gaps = [600, ...ROADS.flatMap((r) => [r.z0, r.z1]), 640];
  const sides = [0, 2, 4].flatMap((i) => [block(84, gaps[i], 100, gaps[i + 1], 22 + i * 4), block(132, gaps[i], 148, gaps[i + 1], 30 - i * 3)]);
  const shop = (text: string, z: number, side: 'w' | 'e', bg: string): THREE.Object3D[] => [
    hang(textPlane(text, 4, 0.7, { bg, fg: '#ffffff' }), side, side === 'w' ? 100 : 132, z, 3.1, 0.02),
    hang(box(4.2, 2.4, 0.02, glass('#bfe3f5', 0.5)), side, side === 'w' ? 100 : 132, z, 1.3, 0.03),
    hang(box(4.4, 0.3, 0.6, bg), side, side === 'w' ? 100 : 132, z, 2.65, 0.3),
  ];
  const roads = ROADS.flatMap((r) => {
    const mid = (r.z0 + r.z1) / 2;
    return [
      box(80, 0.02, r.z1 - r.z0, '#3f444b', 116, 0.011, mid),
      ...Array.from({ length: 16 }, (_, i) => box(2.4, 0.004, 0.14, '#f5f0d8', 78 + i * 5, 0.024, mid)),
      box(80, 0.14, 0.24, '#9aa1a8', 116, 0.07, r.z0 - 0.12),
      box(80, 0.14, 0.24, '#9aa1a8', 116, 0.07, r.z1 + 0.12),
      // zebra crossing in the middle of the block
      // zebra crossing: bars lie along the traffic direction and are stepped over one by one
      ...Array.from({ length: ZEBRA_BARS }, (_, i) => box(ZEBRA_WIDTH, 0.004, 0.5, WHITE, 116, 0.025, r.z0 + 0.55 + (i * (r.z1 - r.z0 - 1.1)) / (ZEBRA_BARS - 1))),
      ...[-1, 1].map((s) => box(0.3, 0.004, r.z1 - r.z0, WHITE, 116 + s * (ZEBRA_WIDTH / 2 + 2), 0.025, mid)),
    ];
  });
  const lamp = (x: number, z: number): THREE.Group => group(x, 0, z, cyl(0.06, 0.09, 4.4, shiny('#374151'), 0, 2.2, 0, 8), box(0.9, 0.06, 0.12, shiny('#374151'), 0.4, 4.4, 0), box(0.4, 0.05, 0.16, glow('#fff3c4'), 0.7, 4.36, 0));
  const tree = (x: number, z: number): THREE.Group => group(x, 0, z, box(1, 0.16, 1, '#6b7280', 0, 0.08, 0), cyl(0.1, 0.14, 2.2, '#7c5a3c', 0, 1.1, 0, 8), ball(1, '#3f9a55', 0, 2.9, 0), ball(0.75, '#2f8a48', 0.5, 2.5, 0.3), ball(0.7, '#4fae66', -0.5, 2.6, -0.2));
  const homeDoor = textPlane('幸福里小区 3 栋', 5, 0.6, { bg: '#7c2d12', fg: '#fde68a' });
  homeDoor.position.set(116, 3, 600.03);
  return [
    block(96, 584, 136, 600, 26),
    block(96, 640, 136, 656, 24),
    ...sides,
    homeDoor,
    box(3, 2.4, 0.06, '#5a3519', 116, 1.2, 600.02),
    ...shop('DELI 便利店 24h', 604.5, 'w', '#16a34a'),
    ...shop('PIZZA 99¢ 披萨', 620, 'w', '#dc2626'),
    ...shop('BAGELS 贝果 · 咖啡', 634.5, 'w', '#1d4ed8'),
    ...shop('COFFEE 打工人咖啡', 604.5, 'e', '#92400e'),
    ...shop('LAUNDROMAT 洗衣房', 634.5, 'e', '#7c3aed'),
    ...roads,
    ...[603, 619, 635].flatMap((z) => [lamp(101, z), turn(lamp(131, z), Math.PI)]),
    ...[[104, 607.5], [128, 607.5], [103, 622], [120, 621], [104, 633], [128, 633]].map(([x, z]) => tree(x, z)),
    at(112, 607, 0, rbox(1.8, 0.08, 0.5, WOOD, 0, 0.45, 0, 0.02), box(0.08, 0.45, 0.4, DARK, -0.7, 0.22, 0), box(0.08, 0.45, 0.4, DARK, 0.7, 0.22, 0)),
    at(120, 633, 0, cyl(0.3, 0.26, 0.9, shiny('#16a34a'), 0, 0.45, 0, 12), cyl(0.32, 0.32, 0.06, DARK, 0, 0.93, 0, 12)),
    // crossing lights, hydrants, parked scooters, manholes, a newspaper kiosk and banners
    ...ROADS.flatMap((r) => [-1, 1].map((side) => {
      const z = side < 0 ? r.z0 - 0.5 : r.z1 + 0.5;
      return group(side < 0 ? 111.6 : 120.4, 0, z, cyl(0.05, 0.06, 2.6, shiny('#374151'), 0, 1.3, 0, 8), rbox(0.24, 0.5, 0.2, shiny(DARK), 0, 2.5, 0, 0.03), ball(0.07, glow('#ef4444'), 0, 2.62, side * -0.1), ball(0.07, glow('#14532d'), 0, 2.4, side * -0.1));
    })),
    ...[[101.2, 608.6], [130.8, 622.5], [101.2, 631.5]].map(([x, z]) => at(x, z, 0, cyl(0.12, 0.14, 0.5, shiny('#dc2626'), 0, 0.25, 0, 10), ball(0.13, shiny('#dc2626'), 0, 0.52, 0), cyl(0.05, 0.05, 0.3, shiny('#dc2626'), 0, 0.34, 0, 6))),
    ...[0, 1, 2, 3].map((i) => at(129.6, 610 - 3.4 + i * 0.75 - 4, Math.PI / 2 + 0.1, rbox(1.1, 0.3, 0.34, pick(['#ef4444', '#3b82f6', '#f8fafc', '#111827'], i), 0, 0.5, 0, 0.1), rbox(0.5, 0.08, 0.3, DARK, -0.2, 0.72, 0, 0.03), turn(cyl(0.2, 0.2, 0.1, DARK, -0.42, 0.2, 0, 12), 0, Math.PI / 2), turn(cyl(0.2, 0.2, 0.1, DARK, 0.42, 0.2, 0, 12), 0, Math.PI / 2), box(0.05, 0.5, 0.4, shiny(STEEL), 0.45, 0.9, 0))),
    ...[[109, 604], [122, 620.5], [112, 634]].map(([x, z]) => cyl(0.4, 0.4, 0.012, '#57534e', x, 0.008, z, 16)),
    at(102.2, 613.2 - 9, Math.PI / 2, rbox(1.8, 2.2, 1.2, '#1e3a8a', 0, 1.1, 0, 0.04), box(1.6, 0.9, 0.04, glass('#bfe3f5', 0.5), 0, 1.4, 0.61), box(2, 0.1, 1.6, '#1e3a8a', 0, 2.25, 0.1), ...[-0.5, 0, 0.5].map((x, i) => rbox(0.36, 0.5, 0.04, pick(['#fde047', '#f87171', '#86efac'], i), x, 0.5, 0.63, 0.01))),
    ...[606, 632].map((z) => {
      const banner = textPlane(z < 620 ? '创建文明城市 · 上班不要跑' : '距离转正还有很远', 14, 0.7, { bg: '#dc2626', fg: '#fde68a' });
      banner.position.set(116, 5.2, z);
      banner.rotation.y = Math.PI;
      return group(0, 0, 0, banner, cyl(0.02, 0.02, 32, STEEL, 116, 5.6, z, 4).rotateZ(Math.PI / 2));
    }),
    at(126, 620.6, 0, bin('#16a34a')),
    at(110.2, 620.6, 0, stool('#ef4444', 0.4)),
    at(110.9, 621.4, 0, stool('#3b82f6', 0.4)),
    ...[[105, 617.5], [125, 617.5], [108, 631.5], [124, 631.5]].map(([x, z]) => at(x, z, 0, rbox(1.2, 0.5, 0.5, '#9ca3af', 0, 0.25, 0, 0.04), plant('bush', 0.8, '#9ca3af'))),
  ];
}

/** Indoor places need a slab overhead, otherwise the sun shines straight through the ceiling. */
function roofs(): THREE.Object3D[] {
  return (['home', 'subway', 'warehouse', 'train'] as const).map((id) => {
    const a = areaById(id);
    return box(a.x1 - a.x0 + 0.6, 0.3, a.z1 - a.z0 + 0.6, '#c9c4b7', (a.x0 + a.x1) / 2, 3.2, (a.z0 + a.z1) / 2);
  });
}

export const away: RoomArt = {
  builders: { pancakeStall, busStop, ...warehouse.builders },
  decor: () => [...streetDecor(), ...nycStreet(), ...warehouse.decor(), ...roofs()],
};
