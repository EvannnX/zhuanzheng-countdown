import * as THREE from 'three';
import { AVENUE, CROSSWALK } from '../../../shared/hazards.ts';
import { TOWER_DOOR, TOWER_FACADE_Z, TOWER_LOBBY, areaById } from '../../../shared/world.ts';
import { towerGeometry } from '../exterior.ts';
import { ball, box, cyl, glass, glow, group, rbox, shiny, textPlane, turn } from '../kit.ts';
import { at, bin } from '../parts.ts';
import { facade } from '../textures.ts';
import type { Builder, RoomArt } from './types.ts';

const P = areaById('plaza');
const MID_X = (P.x0 + P.x1) / 2;
const GRANITE = '#8b8f94';
const BRONZE = '#2f6f73';
const ASPHALT = '#3a3d42';
const PAVING = '#b9bdc2';
const IRON = '#1c1c1e';
/** The avenue runs on past the block until it disappears under the bridge buildings. */
const AVENUE_X0 = 440;
const AVENUE_X1 = 590;
const AVENUE_MID_Z = (AVENUE.z0 + AVENUE.z1) / 2;
const AVENUE_DEPTH = AVENUE.z1 - AVENUE.z0;
const LANE_LINES = [609, 612, 615];
const BUS_LANE_Z = 616.5;
/** Height of the lobby storey: the tower proper starts above it. */
const BASE_H = 3.4;
const DOOR_X = (TOWER_DOOR.from + TOWER_DOOR.to) / 2;

/**
 * Static pieces are drawn with the place their origin lies in. The avenue runs far
 * past the block, so its distant pieces get their origin moved back onto the plaza.
 */
function anchored(node: THREE.Object3D): THREE.Object3D {
  if (!(node instanceof THREE.Mesh)) return node;
  node.geometry = node.geometry.clone().translate(node.position.x - MID_X, 0, node.position.z - AVENUE_MID_Z);
  node.position.set(MID_X, node.position.y, AVENUE_MID_Z);
  return node;
}

/** The company mascot: a whale's tail rising out of a granite basin. */
const whaleStatue: Builder = (w) => {
  const fluke = (side: number): THREE.Mesh => {
    const m = ball(0.7, shiny(BRONZE), side * 0.75, 2.9, 0);
    m.scale.set(1.25, 0.32, 0.6);
    m.rotation.z = side * -0.45;
    return m;
  };
  const plaque = turn(textPlane('鲸跃 · 永不搁浅', 1, 0.22, { bg: '#1f2937', fg: '#fbbf24' }), Math.PI);
  plaque.position.set(0, 0.3, -w / 2 - 0.115);
  return [
    cyl(w / 2, w / 2 + 0.1, 0.5, GRANITE, 0, 0.25, 0, 24),
    cyl(w / 2 - 0.2, w / 2 - 0.2, 0.06, shiny('#7dd3fc'), 0, 0.5, 0, 24),
    cyl(0.22, 0.42, 2.4, shiny(BRONZE), 0, 1.6, 0, 12),
    fluke(-1),
    fluke(1),
    plaque,
  ];
};

const planter: Builder = (w, d) => [
  rbox(w, 0.6, d, GRANITE, 0, 0.3, 0, 0.05),
  rbox(w - 0.2, 0.3, d - 0.2, '#3f8a4f', 0, 0.7, 0, 0.12),
  cyl(0.09, 0.12, 2, '#7c5a3c', 0, 1.6, 0, 8),
  ball(1, '#3f9a55', 0, 3.1, 0),
  ball(0.7, '#4fae66', 0.5, 2.7, 0.3),
];

/** The away-day shuttle: a white van with the company stripe, waiting at the kerb. */
const shuttleVan: Builder = (w, d) => {
  const sign = turn(textPlane('外派班车 → 甲方仓库', 3, 0.4, { bg: '#ff7a2f', fg: '#ffffff' }), -Math.PI / 2);
  sign.position.set(-w / 2 - 0.012, 1.25, 0);
  return [
    rbox(w, 1.9, d, shiny('#f1f5f9'), 0, 1.25, 0, 0.16),
    box(w + 0.02, 0.3, d - 0.4, '#ff7a2f', 0, 0.85, 0),
    box(w + 0.02, 0.6, d - 1.4, glass('#0f172a', 0.75), 0, 1.75, -0.3),
    sign,
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => turn(cyl(0.36, 0.36, 0.26, '#111827', sx * (w / 2 - 0.1), 0.36, sz * (d / 2 - 0.9), 14), 0, 0, Math.PI / 2))),
    ...[-0.6, 0.6].map((x) => box(0.4, 0.16, 0.06, glow('#fff7d6'), x, 0.8, d / 2)),
  ];
};

/** Glass cheek of the revolving-door drum. Solid, so nobody cuts the corner through the pane. */
const doorJamb: Builder = (w, d) => [
  box(w, 2.5, d, glass('#bfe3f5', 0.35), 0, 1.25, 0),
  ...[-1, 1].map((side) => box(w + 0.04, 2.56, 0.06, shiny('#94a3b8'), 0, 1.28, side * (d / 2))),
  box(w + 0.04, 0.06, d, shiny('#94a3b8'), 0, 2.53, 0),
];

/** Asphalt, lane paint, the bus lane and the zebra crossing. */
function roadway(): THREE.Object3D[] {
  const length = AVENUE_X1 - AVENUE_X0;
  const mid = (AVENUE_X0 + AVENUE_X1) / 2;
  const dashes = LANE_LINES.flatMap((z) =>
    Array.from({ length: Math.floor(length / 6) }, (_, i) => AVENUE_X0 + 2 + i * 6)
      .filter((x) => x < CROSSWALK.x0 - 3 || x > CROSSWALK.x1 + 1)
      .map((x) => box(2.4, 0.004, 0.14, '#e5e7eb', x, 0.026, z)),
  );
  const zebra = Array.from({ length: 7 }, (_, i) => box(0.48, 0.004, AVENUE_DEPTH - 0.5, '#f1f5f9', CROSSWALK.x0 + 0.3 + i * 0.9, 0.03, AVENUE_MID_Z));
  const kerb = (z: number): THREE.Object3D[] => [
    box(CROSSWALK.x0 - AVENUE_X0, 0.12, 0.26, GRANITE, (CROSSWALK.x0 + AVENUE_X0) / 2, 0.06, z),
    box(AVENUE_X1 - CROSSWALK.x1, 0.12, 0.26, GRANITE, (CROSSWALK.x1 + AVENUE_X1) / 2, 0.06, z),
    box(CROSSWALK.x1 - CROSSWALK.x0, 0.006, 0.5, '#facc15', (CROSSWALK.x0 + CROSSWALK.x1) / 2, 0.016, z),
  ];
  return [
    // pavement beyond the block, then the road on top of everything
    ...[AVENUE_X0 + (P.x0 - AVENUE_X0) / 2, P.x1 + (AVENUE_X1 - P.x1) / 2].map((x) => box(P.x0 - AVENUE_X0, 0.1, TOWER_FACADE_Z - P.z0, PAVING, x, -0.05, (P.z0 + TOWER_FACADE_Z) / 2)),
    box(length, 0.012, AVENUE_DEPTH, ASPHALT, mid, 0.006, AVENUE_MID_Z),
    box(length, 0.006, 2.7, '#7a3328', mid, 0.016, BUS_LANE_Z),
    ...dashes,
    ...zebra,
    box(0.4, 0.004, AVENUE_DEPTH - 0.5, '#f1f5f9', CROSSWALK.x0 - 1.4, 0.03, AVENUE_MID_Z),
    ...kerb(AVENUE.z0 - 0.13),
    ...kerb(AVENUE.z1 + 0.13),
    // loading bay under the shuttle
    box(7, 0.006, 2.9, '#55585e', 523.6, 0.004, 619.5),
    box(7, 0.008, 0.12, '#facc15', 523.6, 0.008, 621),
  ];
}

/** Housings for the lights; the lamps themselves are animated in commuteFx. */
function signals(): THREE.Object3D[] {
  const walkPole = (x: number, z: number): THREE.Group => group(x, 0, z, cyl(0.06, 0.08, 3, shiny(IRON), 0, 1.5, 0, 10), rbox(0.44, 0.5, 0.3, '#c9a400', 0, 2.75, 0, 0.04), cyl(0.12, 0.14, 0.1, IRON, 0, 0.05, 0, 10));
  const mast = group(
    CROSSWALK.x0 - 1.6, 0, AVENUE.z1 + 0.8,
    cyl(0.1, 0.14, 6.4, shiny(IRON), 0, 3.2, 0, 10),
    box(0.14, 0.14, 8.4, shiny(IRON), 0, 6.2, -4.1),
    ...[-2.4, -5.4, -8].map((z) => rbox(0.34, 1.1, 0.4, '#c9a400', 0, 5.55, z, 0.05)),
  );
  return [walkPole(CROSSWALK.x0 - 0.5, AVENUE.z0 - 0.6), walkPole(CROSSWALK.x1 + 0.5, AVENUE.z1 + 0.6), mast];
}

/** Glass ground floor with the revolving-door drum, canopy and name; the lobby shows through. */
function towerFront(): THREE.Object3D[] {
  const tower = new THREE.Mesh(towerGeometry(P.x1 - P.x0 + 8, 90, 16), new THREE.MeshLambertMaterial({ map: facade('#c9d3dc', '#3f6f8f', 91) }));
  tower.position.set(MID_X, BASE_H + 45, TOWER_FACADE_Z + 8.2);
  const sign = turn(textPlane('WHALE JUMP  鲸跃科技', 9, 1, { bg: '#0f2a5f', fg: '#ffffff' }), Math.PI);
  sign.position.set(DOOR_X, 4.6, TOWER_FACADE_Z - 0.32);
  const motto = turn(textPlane('把公司当成家', 3.6, 0.34, { bg: '#e5e7eb', fg: '#0f2a5f' }), Math.PI);
  motto.position.set(DOOR_X, 3.5, TOWER_FACADE_Z - 3.02);
  const posts = Array.from({ length: 9 }, (_, i) => TOWER_LOBBY.x0 + i * 3).filter((x) => Math.abs(x - DOOR_X) > 1);
  const panes = Array.from({ length: 8 }, (_, i) => TOWER_LOBBY.x0 + 1.5 + i * 3).filter((x) => Math.abs(x - DOOR_X) > 2.9);
  const side = (TOWER_LOBBY.x0 - (P.x0 - 4)) / 2;
  return [
    tower,
    // solid stone base either side of the lobby, and the slab that keeps the sun out of it
    ...[P.x0 - 4 + side, P.x1 + 4 - side].map((x) => box(side * 2, BASE_H, 16, shiny('#1e293b'), x, BASE_H / 2, TOWER_FACADE_Z + 8.2)),
    box(TOWER_LOBBY.x1 - TOWER_LOBBY.x0 + 0.6, 0.3, TOWER_LOBBY.z1 - TOWER_LOBBY.z0 + 0.6, '#c9c4b7', MID_X, 3.2, (TOWER_LOBBY.z0 + TOWER_LOBBY.z1) / 2),
    box(TOWER_LOBBY.x1 - TOWER_LOBBY.x0, BASE_H - 2.6, 0.3, shiny('#1e293b'), MID_X, (BASE_H + 2.6) / 2, TOWER_FACADE_Z),
    ...posts.map((x) => box(0.22, 2.6, 0.3, shiny('#334155'), x, 1.3, TOWER_FACADE_Z)),
    ...panes.map((x) => box(2.78, 2.6, 0.04, glass('#9fd3ee', 0.28), x, 1.3, TOWER_FACADE_Z)),
    ...[-1, 1].map((s) => box(1.39, 2.6, 0.04, glass('#9fd3ee', 0.28), DOOR_X + s * 2.31, 1.3, TOWER_FACADE_Z)),
    // drum of the revolving door: cap, floor plate; the wings turn in commuteFx
    cyl(1.62, 1.62, 0.16, shiny('#94a3b8'), DOOR_X, 2.62, TOWER_FACADE_Z, 24),
    cyl(1.5, 1.5, 0.012, '#27272a', DOOR_X, 0.008, TOWER_FACADE_Z, 24),
    // canopy on two columns
    box(8, 0.22, 3, shiny('#e5e7eb'), DOOR_X, 3.5, TOWER_FACADE_Z - 1.5),
    ...[-3.6, 3.6].map((o) => cyl(0.12, 0.12, 3.4, shiny('#cbd5e1'), DOOR_X + o, 1.7, TOWER_FACADE_Z - 2.7, 12)),
    sign,
    motto,
  ];
}

/** The block around the tower: neighbours on both sidewalks and the bridge buildings the avenue dives under. */
function neighbours(): THREE.Object3D[] {
  const brick = new THREE.MeshLambertMaterial({ map: facade('#8f5b45', '#27333f', 33) });
  const stone = new THREE.MeshLambertMaterial({ map: facade('#b8ad98', '#33475a', 57) });
  const block = (material: THREE.Material, x: number, z: number, w: number, h: number, d: number, y0 = 0): THREE.Mesh => {
    const m = new THREE.Mesh(towerGeometry(w, h, d), material);
    m.position.set(x, y0 + h / 2, z);
    return m;
  };
  const bridge = (x: number, w: number): THREE.Object3D[] => [
    block(stone, x, 613, w, 44, 27.4, 5.2),
    box(w - 0.4, 5.2, AVENUE_DEPTH, '#050506', x, 2.6, AVENUE_MID_Z),
    box(w, 5.2, AVENUE.z0 - 599.3, '#6f6658', x, 2.6, (AVENUE.z0 + 599.3) / 2),
    box(w, 5.2, 626.7 - AVENUE.z1, '#6f6658', x, 2.6, (AVENUE.z1 + 626.7) / 2),
  ];
  return [
    block(brick, 474, 591.4, 44, 52, 17),
    block(stone, MID_X, 591.4, 38, 34, 17),
    block(brick, 556, 591.4, 44, 46, 17),
    block(stone, 473.5, 635.2, 45, 62, 16),
    block(brick, 558.5, 635.2, 49, 74, 16),
    ...bridge(451, 22),
    ...bridge(578.5, 23),
  ];
}

/** Everything a Manhattan sidewalk collects. */
function furniture(): THREE.Object3D[] {
  const lamp = (x: number, z: number, reach: number): THREE.Group =>
    group(x, 0, z, cyl(0.08, 0.12, 7, shiny('#4b5563'), 0, 3.5, 0, 10), box(0.1, 0.1, 2, shiny('#4b5563'), 0, 6.9, reach), rbox(0.3, 0.12, 0.7, shiny('#4b5563'), 0, 6.82, reach * 1.9, 0.04), box(0.2, 0.03, 0.5, glow('#fff3c4'), 0, 6.75, reach * 1.9));
  const hydrant = group(520.4, 0, 605.3, cyl(0.12, 0.14, 0.6, shiny('#b91c1c'), 0, 0.3, 0, 10), ball(0.13, shiny('#b91c1c'), 0, 0.62, 0), turn(cyl(0.05, 0.05, 0.36, shiny('#b91c1c'), 0, 0.4, 0, 8), 0, 0, Math.PI / 2));
  const flag = (x: number, color: string): THREE.Group => group(x, 0, TOWER_FACADE_Z - 3.4, cyl(0.05, 0.07, 7, shiny('#cbd5e1'), 0, 3.5, 0, 8), box(1.4, 0.8, 0.03, color, 0.72, 6.4, 0), ball(0.09, shiny('#facc15'), 0, 7.05, 0));
  const newsBox = (x: number, color: string): THREE.Group => group(x, 0, 605.2, rbox(0.5, 1, 0.45, shiny(color), 0, 0.62, 0, 0.04), box(0.4, 0.4, 0.02, glass('#e0f2fe', 0.5), 0, 0.8, -0.23), box(0.06, 0.12, 0.3, IRON, 0, 0.06, 0));
  const bench = at(506.5, 603.2, 0, rbox(2.4, 0.08, 0.5, '#b07a45', 0, 0.45, 0, 0.02), box(0.08, 0.45, 0.4, '#1f2937', -1, 0.22, 0), box(0.08, 0.45, 0.4, '#1f2937', 1, 0.22, 0));
  const steam = group(504.5, 0, 607.2, cyl(0.2, 0.24, 2.6, '#f97316', 0, 1.3, 0, 12), ...[0.6, 1.4, 2.2].map((y) => cyl(0.215, 0.215, 0.3, '#f8fafc', 0, y, 0, 12)), ball(0.45, glass('#ffffff', 0.35), 0.1, 3, 0), ball(0.62, glass('#ffffff', 0.22), 0.3, 3.7, 0.1));
  return [
    ...[502, 528].map((x) => lamp(x, AVENUE.z0 - 0.7, 1)),
    ...[505.5, 524.5].map((x) => lamp(x, AVENUE.z1 + 0.7, -1)),
    hydrant,
    steam,
    bench,
    newsBox(508.6, '#1d4ed8'),
    newsBox(509.3, '#ca8a04'),
    at(521.5, 605.3, 0, bin('#1f3d2b')),
    at(510.6, 619.2, 0, bin('#1f3d2b')),
    ...[-7, 7].map((o, i) => flag(DOOR_X + o, i === 0 ? '#1d4ed8' : '#ff7a2f')),
    ...[505, 508, 511].map((x) => at(x, AVENUE.z1 + 0.9, 0, cyl(0.14, 0.16, 0.8, shiny('#374151'), 0, 0.4, 0, 10), ball(0.16, shiny('#374151'), 0, 0.84, 0))),
    // carpet runner from the kerb to the door, because morale
    box(2.4, 0.012, TOWER_FACADE_Z - AVENUE.z1 - 2.6, '#7f1d1d', DOOR_X, 0.008, (TOWER_FACADE_Z + AVENUE.z1) / 2 + 0.3),
  ];
}

export const plaza: RoomArt = { builders: { whaleStatue, planter, shuttleVan, doorJamb }, decor: () => [...[...roadway(), ...neighbours()].map(anchored), ...signals(), ...towerFront(), ...furniture()] };
