import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { towerGeometry } from '../exterior.ts';
import { ball, box, cyl, glow, group, pick, rbox, shiny, turn } from '../kit.ts';
import { decoCrown, waterTower } from '../skyline.ts';
import { facade } from '../textures.ts';
import { rowHouse } from '../texturesNyc.ts';

/** What the third-floor windows of the walk-up look out on: its own fire escape, the street below and the row houses opposite. */

const IRON = '#1c1c1e';
/** The flat is two flights up: the street lies this far below its floor. */
const STREET_Y = -7;
const WALL_X = -0.1;
const ESCAPE = { z0: 601.1, z1: 610.3, depth: 1, rail: 1 };
const FLOOR_PITCH = 3.2;
const ROW_X = -17;
const ROW_DEPTH = 12;
const HOUSE_WIDTH = 6.5;
const ROW_FROM = 572;
const HOUSES = 11;
/** Three storeys over a basement: low enough that the flat looks out over their roofs. */
const HOUSE_HEIGHT = 9.4;
const HOUSE_TONES: readonly (readonly [string, string])[] = [
  ['#6b4636', '#cbbfa8'],
  ['#7a3f2e', '#d9cfbd'],
  ['#5c4a40', '#bfb5a2'],
];
const CAB = '#f7c600';

/** One landing of the escape: slatted deck, outer guard rail and pickets. */
function landing(y: number): THREE.Object3D[] {
  const length = ESCAPE.z1 - ESCAPE.z0;
  const mid = (ESCAPE.z0 + ESCAPE.z1) / 2;
  const outer = WALL_X - ESCAPE.depth;
  return [
    ...[0.12, 0.34, 0.56, 0.78, 0.98].map((o) => box(0.1, 0.03, length, IRON, WALL_X - o, y, mid)),
    ...Array.from({ length: 8 }, (_, i) => box(ESCAPE.depth, 0.05, 0.05, IRON, WALL_X - ESCAPE.depth / 2, y - 0.04, ESCAPE.z0 + (i * length) / 7)),
    ...[ESCAPE.rail, ESCAPE.rail / 2].map((h) => box(0.04, 0.04, length, IRON, outer, y + h, mid)),
    ...[ESCAPE.z0, ESCAPE.z1].flatMap((z) => [box(ESCAPE.depth, 0.04, 0.04, IRON, WALL_X - ESCAPE.depth / 2, y + ESCAPE.rail, z), box(ESCAPE.depth, 0.04, 0.04, IRON, WALL_X - ESCAPE.depth / 2, y + ESCAPE.rail / 2, z)]),
    ...Array.from({ length: 24 }, (_, i) => box(0.02, ESCAPE.rail, 0.02, IRON, outer, y + ESCAPE.rail / 2, ESCAPE.z0 + (i * length) / 23)),
  ];
}

/** A steep iron stair climbing along the wall from `z0` to `z1`, one storey up from `y`. */
function flight(y: number, z0: number, z1: number): THREE.Object3D[] {
  const rise = FLOOR_PITCH;
  const run = z1 - z0;
  const length = Math.hypot(rise, run);
  const tilt = -Math.atan2(rise, run);
  const steps = 10;
  return [
    ...[-0.32, -0.9].flatMap((o) => [turn(box(0.04, 0.12, length, IRON, WALL_X + o, y + rise / 2, (z0 + z1) / 2), 0, tilt), turn(box(0.03, 0.03, length, IRON, WALL_X + o, y + rise / 2 + 0.85, (z0 + z1) / 2), 0, tilt)]),
    ...Array.from({ length: steps }, (_, i) => box(0.56, 0.03, 0.2, IRON, WALL_X - 0.61, y + (rise * (i + 0.5)) / steps, z0 + (run * (i + 0.5)) / steps)),
  ];
}

function fireEscape(): THREE.Object3D[] {
  const pots = [602.2, 603.3].map((z, i) => group(WALL_X - 0.82, 0.02, z, cyl(0.12, 0.09, 0.2, '#b4532a', 0, 0.1, 0, 10), ball(0.14, pick(['#3f9a55', '#4fae66'], i), 0, 0.3, 0), ball(0.05, pick(['#f472b6', '#facc15'], i), 0.05, 0.42, 0.04)));
  return [
    ...[0, -FLOOR_PITCH, FLOOR_PITCH].flatMap((y) => landing(y - 0.02)),
    ...flight(0, 606.9, 609.5),
    ...flight(-FLOOR_PITCH, 602, 604.6),
    // drop ladder stowed at the far end, a milk crate and two flower pots: everyone's balcony
    ...[-0.25, 0.25].map((o) => box(0.03, 2.6, 0.03, IRON, WALL_X - 0.5 + o, 1.3, ESCAPE.z0 + 0.25)),
    ...Array.from({ length: 8 }, (_, i) => box(0.5, 0.025, 0.025, IRON, WALL_X - 0.5, 0.2 + i * 0.32, ESCAPE.z0 + 0.25)),
    group(WALL_X - 0.6, 0.02, 605.4, rbox(0.34, 0.28, 0.34, '#2563eb', 0, 0.14, 0, 0.02)),
    ...pots,
  ];
}

/** Stoop, front door and cornice for one row house whose facade faces +x at `ROW_X`. */
function houseTrim(z: number, top: number, index: number): THREE.Object3D[] {
  const stone = HOUSE_TONES[index % HOUSE_TONES.length][1];
  return [
    box(0.7, 0.5, HOUSE_WIDTH - 0.1, '#3a2c25', ROW_X + 0.25, top + 0.05, z),
    box(0.4, 0.16, HOUSE_WIDTH, stone, ROW_X + 0.1, top - 0.5, z),
    ...[0, 1, 2, 3].map((i) => box(0.5, 0.3 * (4 - i), 1.8, stone, ROW_X + 0.25 + i * 0.5, STREET_Y + 0.15 * (4 - i), z - 1.6)),
    box(0.1, 2.4, 1.2, pick(['#1f3a2d', '#7f1d1d', '#1e293b'], index), ROW_X + 0.04, STREET_Y + 2.4, z - 1.6),
    ...(index % 2 === 0 ? [0, 1].flatMap((f) => [box(0.8, 0.05, 2.6, IRON, ROW_X + 0.4, STREET_Y + 3.6 + f * 2.6, z + 1.2), box(0.03, 0.8, 2.6, IRON, ROW_X + 0.8, STREET_Y + 4 + f * 2.6, z + 1.2)]) : []),
  ];
}

function rowHouses(): THREE.Object3D[] {
  const buckets: THREE.BufferGeometry[][] = HOUSE_TONES.map(() => []);
  const trim: THREE.Object3D[] = [];
  for (let i = 0; i < HOUSES; i++) {
    const z = ROW_FROM + HOUSE_WIDTH * (i + 0.5);
    const height = HOUSE_HEIGHT + ((i * 7) % 3) * 1.1;
    buckets[i % HOUSE_TONES.length].push(towerGeometry(ROW_DEPTH, height, HOUSE_WIDTH - 0.04).translate(ROW_X - ROW_DEPTH / 2, STREET_Y + height / 2, z));
    trim.push(...houseTrim(z, STREET_Y + height, i));
    if (i % 3 === 1) trim.push(group(ROW_X - 6, STREET_Y + height, z, waterTower(0.8)));
    if (i % 3 === 0) trim.push(box(1.2, 1.6, 1.2, '#7a5544', ROW_X - 4, STREET_Y + height + 0.8, z + 1), cyl(0.12, 0.12, 1.4, '#3a2c25', ROW_X - 7, STREET_Y + height + 0.7, z - 1.4, 6));
  }
  const houses = buckets.map((parts, i) => new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ map: rowHouse(HOUSE_TONES[i][0], HOUSE_TONES[i][1], 30 + i) })));
  return [...houses, ...trim];
}

/** Taller blocks behind the row, a far-off spire and the haze of midtown beyond. */
function backdrop(): THREE.Object3D[] {
  const brick = new THREE.MeshLambertMaterial({ map: rowHouse('#8a5a45', '#d9cfbd', 57) });
  const stone = new THREE.MeshLambertMaterial({ map: facade('#c9c4b8', '#5f7f98', 57) });
  const block = (x: number, z: number, w: number, h: number, d: number, material: THREE.Material = brick): THREE.Mesh => {
    const m = new THREE.Mesh(towerGeometry(w, h, d), material);
    m.position.set(x, STREET_Y + h / 2, z);
    return m;
  };
  return [
    block(-44, 588, 16, 24, 20), block(-46, 612, 18, 30, 18), block(-42, 634, 14, 22, 18), block(-70, 600, 20, 40, 24), block(-74, 628, 18, 34, 20),
    group(-44, STREET_Y + 24, 590, waterTower(1.1)),
    group(-48, STREET_Y + 30, 610, waterTower(1.2)),
    group(-41, STREET_Y + 22, 636, waterTower(1)),
    block(-150, 606, 22, 86, 22, stone),
    block(-150, 606, 32, 46, 32, stone),
    group(-150, STREET_Y + 86, 606, decoCrown(22, 'spire')),
    block(-128, 650, 20, 62, 20, stone),
    block(-136, 566, 22, 54, 22, stone),
    group(-136, STREET_Y + 54, 566, decoCrown(22, 'pyramid')),
  ];
}

function street(): THREE.Object3D[] {
  const tree = (z: number, s: number): THREE.Group => group(-2.6, STREET_Y, z, box(1.2, 0.12, 1.2, '#4b4640', 0, 0.06, 0), cyl(0.1 * s, 0.15 * s, 3.4 * s, '#5b4433', 0, 1.7 * s, 0, 8), ball(1.5 * s, '#3f8a4f', 0, 4.2 * s, 0), ball(1.1 * s, '#4f9e5c', 0.6 * s, 3.6 * s, 0.5 * s), ball(1 * s, '#357a45', -0.5 * s, 3.8 * s, -0.5 * s));
  const car = (x: number, z: number, color: string): THREE.Group =>
    group(x, STREET_Y, z, rbox(1.8, 0.6, 4.2, shiny(color), 0, 0.6, 0, 0.14), rbox(1.6, 0.5, 2.3, shiny(color), 0, 1.12, -0.2, 0.14), box(1.62, 0.36, 2.2, '#1f2937', 0, 1.14, -0.2), ...(color === CAB ? [box(0.9, 0.16, 0.4, glow('#fff7d6'), 0, 1.46, -0.2)] : []));
  const lamp = (z: number): THREE.Group => group(-3.6, STREET_Y, z, cyl(0.07, 0.1, 5, IRON, 0, 2.5, 0, 8), box(1.2, 0.07, 0.1, IRON, -0.6, 5, 0), box(0.5, 0.08, 0.2, glow('#fff3c4'), -1, 4.94, 0));
  return [
    box(260, 0.2, 200, '#6f6c66', -130, STREET_Y - 0.11, 606),
    box(10, 0.04, 200, '#3f4246', -9, STREET_Y + 0.01, 606),
    ...Array.from({ length: 14 }, (_, i) => box(0.14, 0.01, 2.4, '#e9d24a', -9, STREET_Y + 0.04, 580 + i * 5)),
    ...[-3.9, -14.1].map((x) => box(0.24, 0.16, 200, '#a8a59d', x, STREET_Y + 0.08, 606)),
    tree(598.5, 1), tree(606.2, 0.85), tree(615, 1.05),
    lamp(603), lamp(619),
    car(-5.3, 601, CAB), car(-5.3, 607.4, '#334155'), car(-12.7, 611, '#b91c1c'), car(-12.7, 598, CAB), car(-9.2, 617, CAB),
    group(-2.4, STREET_Y, 610.4, cyl(0.12, 0.14, 0.5, '#b91c1c', 0, 0.25, 0, 8), ball(0.13, '#b91c1c', 0, 0.52, 0)),
  ];
}

export function homeOutside(): THREE.Object3D[] {
  return [...fireEscape(), ...rowHouses(), ...backdrop(), ...street()];
}
