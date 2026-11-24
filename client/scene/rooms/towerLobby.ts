import type * as THREE from 'three';
import { LIFT_DOOR_XS, LOBBY_GATE_Z, TOWER_DOOR, TOWER_FACADE_Z, TOWER_LOBBY } from '../../../shared/world.ts';
import { STAFF_LOOKS, makeCharacter } from '../characters.ts';
import { ball, box, cyl, glass, glow, group, rbox, shiny, textPlane, turn } from '../kit.ts';
import { at, monitor, plant } from '../parts.ts';
import type { Builder, RoomArt } from './types.ts';

const L = TOWER_LOBBY;
const STEEL = '#c5cad0';
const STONE = '#3b3f46';
const MARBLE = '#ece7dc';
const WALNUT = '#6b4226';
const BRAND = '#ff7a2f';
const NAVY = '#0f2a5f';
/** Inner face of the shell's walls. */
const FACE = 0.11;
export const LIFT_DOOR = { width: 1.3, height: 2.2 } as const;

/** Security desk: stone front, walnut top, the visitor log nobody reads. Front faces +z. */
const frontDesk: Builder = (w, d) => {
  const logo = textPlane('访客登记 · 请出示工牌', 2.4, 0.3, { bg: STONE, fg: '#fbbf24' });
  logo.position.set(0, 0.62, d / 2 + 0.012);
  return [
    rbox(w, 1.05, d - 0.3, STONE, 0, 0.525, 0.15, 0.03),
    rbox(w + 0.1, 0.06, d - 0.14, WALNUT, 0, 1.08, 0.15, 0.02),
    rbox(w - 0.3, 0.74, 0.3, MARBLE, 0, 0.37, -d / 2 + 0.15, 0.02),
    logo,
    group(-w / 4, 0, -d / 2 + 0.18, monitor('lock', 0.74, 0.5)),
    box(0.3, 0.02, 0.22, '#f8fafc', w / 4, 1.12, 0.2),
    cyl(0.05, 0.06, 0.12, shiny(BRAND), w / 2 - 0.25, 1.17, 0.25, 10),
  ];
};

/** One pedestal of the turnstile line: card reader on top, glass flap towards the lane on its right. */
const badgeGate: Builder = (w, d) => [
  rbox(w, 1, d, shiny(STEEL), 0, 0.5, 0, 0.05),
  box(w - 0.06, 0.02, d - 0.5, '#111827', 0, 1.011, 0),
  box(w - 0.1, 0.012, 0.22, glow('#22d3ee'), 0, 1.024, -d / 2 + 0.36),
  box(0.03, 0.5, d - 0.2, glow('#16a34a'), w / 2 + 0.002, 0.6, 0),
  box(0.5, 0.7, 0.03, glass('#bfe3f5', 0.4), w / 2 + 0.25, 0.6, 0.2),
];

/** Glass balustrade closing the gap between the turnstiles and the walls. */
const lobbyRail: Builder = (w, d) => {
  const posts = Math.round(w / 2.1) + 1;
  return [
  box(w, 0.1, d, shiny(STEEL), 0, 0.05, 0),
  box(w, 0.95, 0.03, glass('#bfe3f5', 0.35), 0, 0.575, 0),
  box(w, 0.05, d, shiny(STEEL), 0, 1.075, 0),
  ...Array.from({ length: posts }, (_, i) => box(0.06, 1.05, d, shiny(STEEL), -w / 2 + 0.03 + (i * (w - 0.06)) / (posts - 1), 0.525, 0)),
  ];
};

const lobbyBench: Builder = (w, d) => [rbox(w, 0.1, d, '#1f2937', 0, 0.45, 0, 0.04), ...[-1, 1].map((s) => rbox(w - 0.2, 0.4, 0.08, shiny(STEEL), 0, 0.2, s * (d / 2 - 0.3), 0.02))];

const lobbyPlant: Builder = () => [plant('tree', 1.25, STONE)];

/** One lift on the back wall: steel portal and call panel. The doors and the indicator are animated in commuteFx. */
function liftPortal(x: number, index: number): THREE.Object3D[] {
  const z = L.z1 - FACE;
  const name = turn(textPlane(`${index + 1} 号梯`, 0.5, 0.18, { bg: STONE, fg: '#ffffff' }), Math.PI);
  name.position.set(x - LIFT_DOOR.width / 2 - 0.5, 1.7, z - 0.05);
  return [
    box(LIFT_DOOR.width + 0.36, LIFT_DOOR.height + 0.2, 0.08, shiny(STEEL), x, (LIFT_DOOR.height + 0.2) / 2, z - 0.02),
    box(LIFT_DOOR.width, LIFT_DOOR.height, 0.02, '#0b0c0e', x, LIFT_DOOR.height / 2, z - 0.065),
    box(0.7, 0.3, 0.05, '#050505', x, 2.46, z - 0.05),
    name,
    rbox(0.14, 0.3, 0.03, shiny(STEEL), x + LIFT_DOOR.width / 2 + 0.42, 1.15, z - 0.02, 0.01),
    ...[0.07, -0.07].map((dy, i) => cyl(0.03, 0.03, 0.012, glow(i === 0 ? '#fb923c' : '#52525b'), x + LIFT_DOOR.width / 2 + 0.42, 1.15 + dy, z - 0.04, 12).rotateX(Math.PI / 2)),
  ];
}

/** Rope-and-post queue lanes in front of the lifts: decoration, like the queue itself. */
function stanchions(): THREE.Object3D[] {
  const z = L.z1 - 2.6;
  return [508, 512.5, 517.5, 522].flatMap((x, i, all) => [
    group(x, 0, z, cyl(0.03, 0.03, 0.95, shiny('#d4af37'), 0, 0.5, 0, 8), cyl(0.14, 0.16, 0.04, shiny('#d4af37'), 0, 0.02, 0, 12), ball(0.05, shiny('#d4af37'), 0, 1, 0)),
    ...(i < all.length - 1 && i !== 1 ? [box(all[i + 1] - x - 0.1, 0.05, 0.03, '#7f1d1d', (x + all[i + 1]) / 2, 0.86, z)] : []),
  ]);
}

function signage(): THREE.Object3D[] {
  const west = (text: string, w: number, h: number, zAt: number, y: number, style: { bg: string; fg: string }): THREE.Mesh => {
    const m = turn(textPlane(text, w, h, style), Math.PI / 2);
    m.position.set(L.x0 + FACE + 0.012, y, zAt);
    return m;
  };
  const east = (text: string, w: number, h: number, zAt: number, y: number, style: { bg: string; fg: string }): THREE.Mesh => {
    const m = turn(textPlane(text, w, h, style), -Math.PI / 2);
    m.position.set(L.x1 - FACE - 0.012, y, zAt);
    return m;
  };
  const directory = '楼层指引\n40F 董事长办公室（勿扰）\n12F 鲸跃科技 · 研发中心\n11F 鲸跃科技 · 加班区\n2F 健身房（装修中，第 3 年）\nB1 食堂（已外包）';
  const back = turn(textPlane('电梯厅 ELEVATORS · 高峰期请耐心等候约 40 分钟', 7, 0.3, { bg: NAVY, fg: '#ffffff' }), Math.PI);
  back.position.set((L.x0 + L.x1) / 2, 2.8, L.z1 - FACE - 0.05);
  // Hanging over the turnstiles: one side for people arriving, one for people leaving.
  const overhead = (text: string, ry: number, dz: number): THREE.Mesh => {
    const m = turn(textPlane(text, 4.6, 0.26, { bg: '#facc15', fg: '#111111' }), ry);
    m.position.set((L.x0 + L.x1) / 2, 2.7, LOBBY_GATE_Z + dz);
    return m;
  };
  return [
    box(0.04, 1.5, 5.4, WALNUT, L.x0 + FACE + 0.02, 1.9, 630.6),
    west('WHALE JUMP 鲸跃科技', 4.6, 0.7, 630.6, 2.1, { bg: WALNUT, fg: '#fbbf24' }),
    west('今天也是为梦想续费的一天', 3.4, 0.24, 630.6, 1.5, { bg: WALNUT, fg: '#f8fafc' }),
    east(directory, 2.6, 2, 631, 1.6, { bg: '#111827', fg: '#e5e7eb' }),
    east('本月全勤榜\n（空）', 1.6, 1, 637.6, 1.7, { bg: '#f8fafc', fg: NAVY }),
    west('温馨提示：电梯故障属正常现象\n请走楼梯（楼梯间已锁）', 3, 0.8, 637.6, 1.7, { bg: '#f8fafc', fg: '#b91c1c' }),
    back,
    overhead('请刷工牌 · 一人一卡 · 严禁尾随', Math.PI, -0.022),
    overhead('下班请走此门（理论上）', 0, 0.022),
    box(4.7, 0.34, 0.04, '#27272a', (L.x0 + L.x1) / 2, 2.7, LOBBY_GATE_Z),
    ...[-2.2, 2.2].map((o) => box(0.02, 0.14, 0.02, '#27272a', (L.x0 + L.x1) / 2 + o, 2.93, LOBBY_GATE_Z)),
  ];
}

function lobbyDecor(): THREE.Object3D[] {
  const guard = makeCharacter(STAFF_LOOKS[3], '', 505.6, 630.6, Math.PI / 2).root;
  const doorX = (TOWER_DOOR.from + TOWER_DOOR.to) / 2;
  return [
    guard,
    ...LIFT_DOOR_XS.flatMap(liftPortal),
    ...stanchions(),
    ...signage(),
    // entrance mat, stone inlay towards the gates, and marble cladding low on the back wall
    box(3.6, 0.014, 1.8, '#27272a', doorX, 0.009, TOWER_FACADE_Z + 1.9),
    box(7.4, 0.006, LOBBY_GATE_Z - TOWER_FACADE_Z - 3.4, '#cfc6b4', doorX, 0.006, (LOBBY_GATE_Z + TOWER_FACADE_Z) / 2 + 1.3),
    box(L.x1 - L.x0 - 0.3, 2.6, 0.03, MARBLE, (L.x0 + L.x1) / 2, 1.3, L.z1 - FACE - 0.016),
    // rope barrier in front of the "VIP lift" the director uses
    at(524.6, 638.4, 0, cyl(0.03, 0.03, 0.95, shiny('#d4af37'), 0, 0.5, 0, 8), cyl(0.14, 0.16, 0.04, shiny('#d4af37'), 0, 0.02, 0, 12)),
    // a visitor who has been waiting for his meeting since Tuesday
    (() => {
      const visitor = makeCharacter(STAFF_LOOKS[4], '', 525.9, 630.9, -Math.PI / 2);
      visitor.sit();
      return visitor.root;
    })(),
  ];
}

export const towerLobby: RoomArt = { builders: { frontDesk, badgeGate, lobbyRail, lobbyBench, lobbyPlant }, decor: lobbyDecor };
