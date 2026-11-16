import * as THREE from 'three';
import { TRAIN_DOOR_XS, WALL_HEIGHT } from '../../../shared/world.ts';
import { STAFF_LOOKS, makeCharacter } from '../characters.ts';
import { ball, box, cyl, glass, glow, group, rbox, shiny, textPlane, turn } from '../kit.ts';
import { DARK, STEEL, at, bin } from '../parts.ts';
import { hang, poster } from '../shell.ts';
import { ceramic } from '../textures.ts';
import type { Builder, RoomArt } from './types.ts';

const IRON = '#1f5c4a';
const IRON_DARK = '#17453a';
const STAINLESS = '#c7ccd1';
const BENCH_WOOD = '#b07a45';
const SIGN_BLACK = '#111214';
const MOSAIC = '#1f4f8f';
const GOLD = '#c8a24a';
const LINE_7 = '#b933ad';
const LINE_G = '#6cbe45';
const PLATFORM = { x0: 200, x1: 228, z0: 600, edge: 606, z1: 610 };
const MID_X = (PLATFORM.x0 + PLATFORM.x1) / 2;
const LENGTH = PLATFORM.x1 - PLATFORM.x0;
const TILE_METRES = 0.8;

/** Cool fluorescent pools along the platform; the lighting rig adds a point light at each. */
export const SUBWAY_LIGHTS: readonly { x: number; z: number }[] = [{ x: 205, z: 603 }, { x: 214, z: 603.4 }, { x: 223, z: 603 }];

/** A round route bullet with its letter, facing +z. */
function bullet(letter: string, color: string, r: number): THREE.Group {
  const face = textPlane(letter, r * 1.2, r * 1.2, { bg: color, fg: '#ffffff' });
  face.position.z = 0.014;
  return group(0, 0, 0, turn(cyl(r, r, 0.02, glow(color), 0, 0, 0, 20), 0, Math.PI / 2), face);
}

// ---------------------------------------------------------------- props
/** Riveted steel column with the station name on a black plate. */
const pillar: Builder = (w, _d, index) => {
  const plate = (side: number): THREE.Mesh => {
    const p = turn(textPlane('鲸跃\n大厦', w - 0.08, 0.34, { bg: SIGN_BLACK, fg: '#ffffff' }), side > 0 ? Math.PI / 2 : -Math.PI / 2);
    p.position.set(side * (w / 2 + 0.004), 1.85, 0);
    return p;
  };
  return [
    ...[-1, 1].map((s) => box(0.04, WALL_HEIGHT, w, IRON, s * (w / 2 - 0.02), WALL_HEIGHT / 2, 0)),
    box(w - 0.08, WALL_HEIGHT, 0.05, IRON, 0, WALL_HEIGHT / 2, 0),
    box(w + 0.08, 0.14, w + 0.08, IRON_DARK, 0, 0.07, 0),
    box(w + 0.08, 0.14, w + 0.08, IRON_DARK, 0, WALL_HEIGHT - 0.09, 0),
    ...[0.5, 1.2, 2.4].flatMap((y) => [-1, 1].flatMap((s) => [-0.1, 0.1].map((z) => ball(0.014, IRON_DARK, s * (w / 2 + 0.002), y, z)))),
    ...(index % 2 === 0 ? [plate(-1), plate(1)] : [plate(1)]),
  ];
};

/** The classic slatted wooden bench with seat dividers. */
const platformBench: Builder = (w, d) => [
  ...[-0.18, -0.06, 0.06, 0.18].map((z) => rbox(w, 0.035, 0.1, BENCH_WOOD, 0, 0.45, z + 0.05, 0.012)),
  ...[0.62, 0.76, 0.9].map((y) => rbox(w, 0.1, 0.035, BENCH_WOOD, 0, y, -d / 2 + 0.14, 0.012)),
  ...[-w / 2 + 0.03, -w / 6, w / 6, w / 2 - 0.03].flatMap((x) => [box(0.05, 0.96, 0.06, '#6b4a2b', x, 0.48, -d / 2 + 0.11), box(0.05, 0.44, 0.44, '#6b4a2b', x, 0.22, 0.05), rbox(0.05, 0.05, 0.42, '#6b4a2b', x, 0.62, 0.06, 0.02)]),
];

/** Stainless fare gate; its tripod arms hang over the walk-through lane on the +z side. */
const turnstile: Builder = (w, d) => {
  const arm = (angle: number): THREE.Object3D => turn(group(0, 0, 0, cyl(0.018, 0.018, 0.5, shiny(STEEL), 0, 0.25, 0, 8)), 0, Math.PI / 2 - 0.5, angle);
  return [
    rbox(w, 1, d, shiny(STAINLESS), 0, 0.5, 0, 0.04),
    box(w - 0.1, 0.02, d - 0.06, shiny(DARK), 0, 1.01, 0),
    box(0.22, 0.012, 0.14, glow('#22c55e'), -w / 2 + 0.25, 1.025, 0),
    box(0.16, 0.03, 0.1, glow('#fbbf24'), w / 2 - 0.25, 1.03, 0),
    box(0.3, 0.3, 0.006, glow('#22c55e'), -w / 2 + 0.003, 0.7, 0).rotateY(Math.PI / 2),
    group(0, 0.86, d / 2 + 0.03, turn(cyl(0.07, 0.07, 0.1, shiny(STEEL), 0, 0, 0, 12), 0, Math.PI / 2), ...[0, 1, 2].map((i) => arm((i * Math.PI * 2) / 3))),
  ];
};

/** Station agent's booth: steel base, glass all round, somebody bored inside. */
const tokenBooth: Builder = (w, d) => {
  const agent = makeCharacter({ ...STAFF_LOOKS[1], shirt: '#1e3a8a' }, '', 0, 0, Math.PI / 2);
  const sign = turn(textPlane('站务亭 · 不找零 · 不问路', w - 0.2, 0.26, { bg: SIGN_BLACK, fg: '#ffffff' }), 0);
  sign.position.set(0, 2.3, d / 2 + 0.012);
  const side = turn(textPlane('今日延误：全部', d - 0.2, 0.26, { bg: SIGN_BLACK, fg: '#fbbf24' }), Math.PI / 2);
  side.position.set(w / 2 + 0.012, 2.3, 0);
  return [
    rbox(w, 1.1, d, '#4b5b6b', 0, 0.55, 0, 0.03),
    box(w + 0.06, 0.05, d + 0.06, shiny(STAINLESS), 0, 1.12, 0),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.07, 1.1, 0.07, shiny('#374151'), sx * (w / 2 - 0.035), 1.7, sz * (d / 2 - 0.035)))),
    ...[-1, 1].map((s) => box(w - 0.14, 1, 0.02, glass('#bfe3f5', 0.28), 0, 1.65, s * (d / 2 - 0.035))),
    ...[-1, 1].map((s) => box(0.02, 1, d - 0.14, glass('#bfe3f5', 0.28), s * (w / 2 - 0.035), 1.65, 0)),
    box(w + 0.1, 0.3, d + 0.1, '#374151', 0, 2.3, 0),
    box(0.3, 0.02, 0.2, shiny(STEEL), w / 2 + 0.06, 1.16, 0),
    sign,
    side,
    agent.root,
  ];
};

/** Fare-card vending machine with the familiar colour-coded panels. */
const fareMachine: Builder = (w, d) => [
  rbox(w, 1.9, d, shiny(STAINLESS), 0, 0.95, 0, 0.03),
  box(w - 0.12, 0.3, 0.012, '#1d4ed8', 0, 1.68, d / 2 + 0.004),
  box(w * 0.5, 0.34, 0.012, glow('#bfdbfe'), -w * 0.16, 1.26, d / 2 + 0.004),
  box(w * 0.22, 0.34, 0.012, '#facc15', w * 0.28, 1.26, d / 2 + 0.004),
  box(w * 0.36, 0.2, 0.012, '#dc2626', -w * 0.23, 0.9, d / 2 + 0.004),
  box(w * 0.36, 0.2, 0.012, '#16a34a', w * 0.21, 0.9, d / 2 + 0.004),
  box(w - 0.3, 0.14, 0.03, shiny(DARK), 0, 0.55, d / 2 + 0.005),
];

/** Street stairwell: iron fence, green globes, a black sign and steps sinking into the dark. */
const subwayEntrance: Builder = (w, d) => {
  const half = 1.8;
  const front = d / 2 - 0.1;
  const steps = 6;
  const fence = (x: number): THREE.Object3D[] => [
    box(0.06, 0.06, d - 0.2, IRON, x, 1.05, 0),
    box(0.06, 0.06, d - 0.2, IRON, x, 0.16, 0),
    box(0.03, 0.14, d - 0.2, IRON_DARK, x, 0.07, 0),
    ...Array.from({ length: 12 }, (_, i) => box(0.025, 0.86, 0.025, IRON, x, 0.6, -front + 0.1 + (i * (d - 0.4)) / 11)),
  ];
  const post = (x: number, z: number, lamp: boolean): THREE.Object3D[] => [
    cyl(0.06, 0.08, lamp ? 2.9 : 1.2, IRON, x, lamp ? 1.45 : 0.6, z, 10),
    cyl(0.1, 0.1, 0.1, IRON_DARK, x, 0.05, z, 10),
    ...(lamp ? [cyl(0.1, 0.07, 0.08, IRON_DARK, x, 2.92, z, 10), ball(0.2, glow('#34d399'), x, 3.14, z), ball(0.05, IRON_DARK, x, 3.36, z)] : [ball(0.08, IRON, x, 1.24, z)]),
  ];
  const rail = (x: number): THREE.Object3D[] => [turn(box(0.05, 0.05, 2.4, shiny(STEEL), x, 0.2, 0.05), 0, -0.7), cyl(0.025, 0.025, 0.98, shiny(STEEL), x, 0.49, front - 0.02, 8)];
  const sign = textPlane('地铁 Subway · 幸福里站', 2.7, 0.34, { bg: SIGN_BLACK, fg: '#ffffff' });
  sign.position.set(0.45, 2.62, front + 0.045);
  const tablet = textPlane('下行 ↓ 鲸跃大厦方向', 2.6, 0.4, { bg: MOSAIC, fg: '#ffffff', border: GOLD });
  tablet.position.set(0, 1.95, -d / 2 + 0.22);
  return [
    box(half * 2, 0.02, d - 0.2, '#070708', 0, 0.012, 0),
    ...Array.from({ length: steps }, (_, i) => {
      const shade = Math.round(150 - i * 24).toString(16).padStart(2, '0');
      const z = front - 0.2 - i * 0.34;
      return [box(half * 2 - 0.1, 0.006, 0.3, `#${shade}${shade}${shade}`, 0, 0.022, z), box(half * 2 - 0.1, 0.008, 0.045, '#e3b21a', 0, 0.024, z + 0.15)];
    }).flat(),
    box(half * 2 + 0.2, 1.3, 0.16, '#0c0c0d', 0, 0.65, -d / 2 + 0.1),
    box(half * 2 + 0.2, 1.5, 0.16, shiny('#efeee8'), 0, 2.05, -d / 2 + 0.1),
    box(half * 2 + 0.2, 0.1, 0.18, MOSAIC, 0, 1.38, -d / 2 + 0.1),
    tablet,
    ...fence(-half),
    ...fence(half),
    ...post(-half, front, true),
    ...post(half, front, true),
    ...post(-half, -front + 0.2, false),
    ...post(half, -front + 0.2, false),
    ...[-half + 0.1, 0, half - 0.1].flatMap(rail),
    // black fascia with route bullets, carried by the two lamp posts
    box(half * 2, 0.5, 0.08, SIGN_BLACK, 0, 2.62, front),
    sign,
    group(-1.45, 2.62, front + 0.045, bullet('7', LINE_7, 0.17)),
    group(-1.05, 2.62, front + 0.045, bullet('G', LINE_G, 0.17)),
    // planters either side
    ...[-1, 1].flatMap((s) => [rbox(0.9, 0.6, d - 0.3, '#8b8f94', s * (w / 2 - 0.5), 0.3, 0, 0.04), rbox(0.76, 0.5, d - 0.5, '#3f8a4f', s * (w / 2 - 0.5), 0.8, 0, 0.16)]),
  ];
};

// ---------------------------------------------------------------- dressing
function tiledWalls(): THREE.Object3D[] {
  const wall = (length: number, x: number, z: number, ry: number): THREE.Mesh => {
    const map = ceramic('#f3f1e9', '#b9b6ac', 8);
    map.repeat.set(length / TILE_METRES, (WALL_HEIGHT - 0.12) / TILE_METRES);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(length, WALL_HEIGHT - 0.12), new THREE.MeshLambertMaterial({ map }));
    m.position.set(x, WALL_HEIGHT / 2 + 0.04, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    return m;
  };
  const depth = PLATFORM.edge - PLATFORM.z0;
  const band = (y: number, h: number, color: string): THREE.Object3D[] => [
    box(LENGTH - 0.2, h, 0.02, color, MID_X, y, PLATFORM.z0 + 0.12),
    box(0.02, h, depth, color, PLATFORM.x0 + 0.12, y, PLATFORM.z0 + depth / 2),
    box(0.02, h, depth, color, PLATFORM.x1 - 0.12, y, PLATFORM.z0 + depth / 2),
  ];
  const tablet = (x: number): THREE.Mesh => hang(textPlane('鲸 跃 大 厦', 2.4, 0.5, { bg: MOSAIC, fg: '#ffffff', border: GOLD }), 'n', PLATFORM.z0, x, 1.8, 0.125);
  return [
    wall(LENGTH - 0.2, MID_X, PLATFORM.z0 + 0.112, 0),
    wall(depth, PLATFORM.x0 + 0.112, PLATFORM.z0 + depth / 2, Math.PI / 2),
    wall(depth, PLATFORM.x1 - 0.112, PLATFORM.z0 + depth / 2, -Math.PI / 2),
    ...band(2.42, 0.2, MOSAIC),
    ...band(2.54, 0.03, GOLD),
    ...band(2.3, 0.03, GOLD),
    tablet(210),
    tablet(218),
    tablet(226),
  ];
}

function ceilingWorks(): THREE.Object3D[] {
  const tube = (x: number, z: number): THREE.Object3D[] => [box(1.5, 0.05, 0.18, '#d4d4d8', x, WALL_HEIGHT - 0.2, z), box(1.4, 0.03, 0.06, glow('#f4fbe8'), x, WALL_HEIGHT - 0.24, z), box(0.02, 0.16, 0.02, DARK, x - 0.6, WALL_HEIGHT - 0.1, z), box(0.02, 0.16, 0.02, DARK, x + 0.6, WALL_HEIGHT - 0.1, z)];
  return [
    ...Array.from({ length: 9 }, (_, i) => box(0.3, 0.26, PLATFORM.z1 - PLATFORM.z0, '#2b2e33', 201.5 + i * 3.1, WALL_HEIGHT - 0.14, (PLATFORM.z0 + PLATFORM.z1) / 2)),
    ...[601, 601.25, 604.2].map((z, i) => turn(cyl(0.035 + (i % 2) * 0.02, 0.035 + (i % 2) * 0.02, LENGTH - 0.3, i === 2 ? '#7c2d12' : '#52565c', MID_X, WALL_HEIGHT - 0.34, z, 8), 0, 0, Math.PI / 2)),
    ...Array.from({ length: 8 }, (_, i) => tube(202 + i * 3.4, 605)).flat(),
    ...Array.from({ length: 5 }, (_, i) => tube(203.5 + i * 5.2, 602.4)).flat(),
  ];
}

function trackBed(): THREE.Object3D[] {
  const rat = at(211.4, 606.9, 0.6, rbox(0.2, 0.09, 0.09, '#57534e', 0, 0.09, 0, 0.04), ball(0.04, '#57534e', 0.12, 0.1, 0), cyl(0.008, 0.004, 0.2, '#a8a29e', -0.2, 0.06, 0, 5).rotateZ(Math.PI / 2), turn(cyl(0.12, 0.12, 0.012, '#f59e0b', 0.24, 0.06, 0.02, 3), 0.4));
  return [
    box(LENGTH, 0.02, PLATFORM.z1 - PLATFORM.edge, '#141517', MID_X, 0.012, (PLATFORM.edge + PLATFORM.z1) / 2),
    box(LENGTH, 0.03, 0.34, '#050506', MID_X, 0.02, PLATFORM.edge + 0.17),
    ...Array.from({ length: 40 }, (_, i) => box(0.22, 0.05, 2.3, '#3b2f25', 200.4 + i * 0.7, 0.035, 607.9)),
    ...[607.15, 608.65].map((z) => box(LENGTH, 0.1, 0.07, shiny('#8d949b'), MID_X, 0.09, z)),
    box(LENGTH, 0.1, 0.16, '#d9d9d4', MID_X, 0.2, 609.3),
    ...Array.from({ length: 10 }, (_, i) => box(0.1, 0.2, 0.2, '#2a2a2c', 201 + i * 2.9, 0.1, 609.3)),
    // far tunnel wall, columns between the tracks, signal lights, the mouths of the tunnel
    box(LENGTH, WALL_HEIGHT, 0.1, '#0d0e10', MID_X, WALL_HEIGHT / 2, 609.85),
    ...Array.from({ length: 14 }, (_, i) => [box(0.16, WALL_HEIGHT, 0.04, '#22262a', 201 + i * 2, WALL_HEIGHT / 2, 609.62), box(0.04, WALL_HEIGHT, 0.16, '#22262a', 201 + i * 2, WALL_HEIGHT / 2, 609.7)]).flat(),
    ...[204, 216].map((x) => ball(0.06, glow('#3b82f6'), x, 1.6, 609.76)),
    ball(0.06, glow('#ef4444'), 226, 2.1, 609.76),
    box(0.12, WALL_HEIGHT, 3.8, '#000000', PLATFORM.x0 + 0.16, WALL_HEIGHT / 2, 608),
    box(0.12, WALL_HEIGHT, 3.8, '#000000', PLATFORM.x1 - 0.16, WALL_HEIGHT / 2, 608),
    box(1.2, 0.006, 0.8, shiny('#1f2937'), 219, 0.025, 606.8),
    rat,
  ];
}

function platformEdge(): THREE.Object3D[] {
  return [
    box(LENGTH - 0.2, 0.012, 0.6, '#f2c230', MID_X, 0.007, 605.5),
    ...[605.3, 605.42, 605.54, 605.66].map((z) => box(LENGTH - 0.2, 0.016, 0.03, '#d4a514', MID_X, 0.009, z)),
    box(LENGTH - 0.2, 0.012, 0.14, '#f8fafc', MID_X, 0.007, 605.9),
    ...TRAIN_DOOR_XS.flatMap((x) => [-0.9, 0.9].map((o) => box(0.08, 0.012, 1, '#f8fafc', x + o, 0.008, 604.7))),
  ];
}

/** Black overhead sign, readable from both sides. */
function overhead(x: number, z: number, text: string, bullets: readonly [string, string][]): THREE.Group {
  const side = (flip: boolean): THREE.Group => {
    const face = textPlane(text, 2.5, 0.32, { bg: SIGN_BLACK, fg: '#ffffff' });
    face.position.set(0.5, 0, 0.032);
    return turn(group(0, 2.5, 0, face, ...bullets.map(([letter, color], i) => group(-1.5 + i * 0.36, 0, 0.032, bullet(letter, color, 0.15)))), flip ? Math.PI : 0);
  };
  return group(x, 0, z, box(3.7, 0.46, 0.06, SIGN_BLACK, 0, 2.5, 0), box(3.7, 0.03, 0.07, '#f8fafc', 0, 2.745, 0), side(false), side(true), ...[-1.6, 1.6].map((o) => box(0.03, 0.3, 0.03, DARK, o, 2.88, 0)));
}

function signage(): THREE.Object3D[] {
  const exit = turn(textPlane('← 出口 EXIT', 1.5, 0.34, { bg: '#b91c1c', fg: '#ffffff' }), Math.PI / 2);
  exit.position.set(206.9, 2.5, 602.5);
  const board = (ry: number): THREE.Mesh => {
    const m = turn(textPlane('⑦ 鲸跃大厦   2 分钟\nⒼ 加班大道   延误', 2.2, 0.5, { bg: '#050505', fg: '#fb923c' }), ry);
    m.position.set(214.5, 2.5, 602.9 + (ry === 0 ? 0.04 : -0.04));
    return m;
  };
  const ad = (text: string, x: number, bg: string, fg: string): THREE.Object3D[] => poster(text, 1.1, 1.5, { bg, fg, border: '#111111' }, 'n', PLATFORM.z0, x, 1.4);
  return [
    overhead(210, 604.2, '鲸跃大厦方向 Downtown', [['7', LINE_7], ['G', LINE_G]]),
    overhead(220, 604.2, '先下后上 · 挤不上等下班', [['7', LINE_7]]),
    exit,
    box(2.3, 0.6, 0.06, '#050505', 214.5, 2.5, 602.9),
    board(0),
    board(Math.PI),
    ...[-1, 1].map((o) => box(0.03, 0.25, 0.03, DARK, 214.5 + o, 2.9, 602.9)),
    ...ad('年薪百万\n不是梦\n（是梦）', 206.2, '#1e3a8a', '#ffffff'),
    ...ad('租房找我\n押一付三\n离地铁\n步行 40 分钟', 214, '#dc2626', '#fff7d6'),
    ...ad('周末施工\n本线不停\n本站\n班照上', 222, '#fde047', '#111111'),
    ...poster('看到摸鱼 立刻举报\nIf you see something, say something', 2.6, 0.5, { bg: '#111214', fg: '#fbbf24' }, 'e', PLATFORM.x1, 603, 1.6),
  ];
}

function subwayDecor(): THREE.Object3D[] {
  return [
    ...tiledWalls(),
    ...ceilingWorks(),
    ...trackBed(),
    ...platformEdge(),
    ...signage(),
    ...[212.4, 224.6].map((x) => at(x, 600.5, 0, bin('#1f3d2b'))),
    at(224.8, 601.2, 0.3, box(0.5, 0.004, 0.7, '#e7e5e4', 0, 0.006, 0)),
    at(207.6, 604.6, -0.4, box(0.3, 0.004, 0.42, '#d6d3d1', 0, 0.006, 0)),
    at(216.2, 601, 0, cyl(0.035, 0.035, 0.12, shiny('#dc2626'), 0, 0.04, 0, 8).rotateZ(Math.PI / 2)),
  ];
}

export const subway: RoomArt = { builders: { pillar, platformBench, turnstile, tokenBooth, fareMachine, subwayEntrance }, decor: subwayDecor };
