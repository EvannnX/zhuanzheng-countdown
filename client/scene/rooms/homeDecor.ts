import * as THREE from 'three';
import { HOME_DOORWAYS, WALL_HEIGHT } from '../../../shared/world.ts';
import { towerGeometry } from '../exterior.ts';
import { ball, box, cyl, glow, group, rbox, shiny, textPlane, turn } from '../kit.ts';
import { BRAND, DARK, STEEL, WHITE, WOOD, at, bin, noticeBoard, pictureFrame, rug, wallClock } from '../parts.ts';
import { WALL, hang, poster } from '../shell.ts';
import { ceramic, facade } from '../textures.ts';

const TRIM = '#8a6a4a';
const DOOR_TOP = 2.1;
const INNER_WALL_T = 0.16;
const TILE = '#e3f1f2';
const CURTAIN_X = 0.21;
const BATH = { x0: 13.08, x1: 15.9, z0: 600.1, z1: 606.52 };

export interface HomeLamp {
  readonly x: number;
  readonly z: number;
  readonly color: string;
  readonly power: number;
}

/** Ceiling pendants; the lighting rig puts a warm point light under each. */
export const HOME_LAMPS: readonly HomeLamp[] = [
  { x: 6.5, z: 602.5, color: '#ffd9a0', power: 5 },
  { x: 4.2, z: 608.2, color: '#ffd9a0', power: 6 },
  { x: 11.2, z: 608.5, color: '#ffcf8a', power: 6 },
  { x: 14.4, z: 603.4, color: '#eaf6ff', power: 4 },
];
export const HOME_LAMP_Y = 2.3;

/** Wall above a doorway plus a timber frame, for an opening in an inner wall. */
function doorway(o: { axis: 'x' | 'z'; at: number; from: number; to: number }): THREE.Object3D[] {
  const span = o.to - o.from;
  const mid = (o.from + o.to) / 2;
  const place = (len: number, h: number, t: number, along: number, y: number, p: string): THREE.Mesh => (o.axis === 'z' ? box(len, h, t, p, along, y, o.at) : box(t, h, len, p, o.at, y, along));
  return [
    place(span, WALL_HEIGHT - DOOR_TOP, INNER_WALL_T, mid, (WALL_HEIGHT + DOOR_TOP) / 2, WALL),
    place(0.05, DOOR_TOP, INNER_WALL_T + 0.04, o.from + 0.025, DOOR_TOP / 2, TRIM),
    place(0.05, DOOR_TOP, INNER_WALL_T + 0.04, o.to - 0.025, DOOR_TOP / 2, TRIM),
    place(span - 0.1, 0.05, INNER_WALL_T + 0.04, mid, DOOR_TOP - 0.025, TRIM),
  ];
}

/** Curtains drawn to both sides of a west-wall window, hanging clear of the sill. */
function curtains(from: number, to: number, color: string): THREE.Object3D[] {
  const fold = (z: number): THREE.Mesh => cyl(0.06, 0.07, 1.66, color, CURTAIN_X, 1.78, z, 8);
  return [
    turn(cyl(0.015, 0.015, to - from + 0.5, shiny(STEEL), CURTAIN_X, 2.63, (from + to) / 2, 8), 0, Math.PI / 2),
    ...[0, 1, 2, 3].flatMap((i) => [fold(from - 0.12 + i * 0.11), fold(to + 0.12 - i * 0.11)]),
  ];
}

function pendant(lamp: HomeLamp): THREE.Group {
  return group(lamp.x, 0, lamp.z, cyl(0.05, 0.05, 0.02, WHITE, 0, WALL_HEIGHT - 0.03, 0, 12), cyl(0.008, 0.008, 0.5, DARK, 0, WALL_HEIGHT - 0.27, 0, 6), cyl(0.1, 0.24, 0.2, '#f5e6c8', 0, HOME_LAMP_Y + 0.12, 0, 18), ball(0.06, glow('#fff3c4'), 0, HOME_LAMP_Y + 0.06, 0));
}

/** What you see through the windows: a lawn, a hedge, trees and the next blocks. */
function outside(): THREE.Object3D[] {
  const material = new THREE.MeshLambertMaterial({ map: facade('#d9cfc0', '#6b8fa8', 57) });
  const block = (x: number, z: number, w: number, h: number, d: number): THREE.Mesh => {
    const m = new THREE.Mesh(towerGeometry(w, h, d), material);
    m.position.set(x, h / 2, z);
    return m;
  };
  const tree = (x: number, z: number, s: number): THREE.Group => group(x, 0, z, cyl(0.1 * s, 0.14 * s, 2 * s, '#7c5a3c', 0, s, 0, 8), ball(1.1 * s, '#3f9a55', 0, 2.7 * s, 0), ball(0.8 * s, '#4fae66', 0.5 * s, 2.3 * s, 0.3 * s));
  return [
    box(70, 0.1, 70, '#8fae7a', -35.2, -0.06, 606),
    box(1.6, 0.02, 70, '#c9c4b7', -6, 0, 606),
    rbox(0.8, 0.7, 13, '#3f8a4f', -2.6, 0.35, 606, 0.2),
    tree(-9, 611.5, 1.2),
    tree(-11, 599, 1),
    tree(-4.2, 613.2, 0.8),
    block(-30, 596, 14, 8, 20),
    block(-28, 624, 16, 18, 18),
    block(-52, 606, 14, 10, 30),
  ];
}

function bedroom(): THREE.Object3D[] {
  return [
    ...curtains(601.7, 603.7, '#fda4af'),
    at(6.4, 602.9, 0, rug(3.4, 1.3, '#fde68a', '#f59e0b')),
    ...[1.9, 5.1, 8.3, 11.5].map((x, i) => at(x, 601.62, 0.2 * (i % 2 ? 1 : -1), rbox(0.09, 0.035, 0.22, '#fda4af', 0, 0.018, 0, 0.015), rbox(0.09, 0.035, 0.22, '#fda4af', 0.13, 0.018, 0.04, 0.015))),
    ...poster('今天也要\n努力搬砖', 1.2, 0.74, { bg: '#1e3a8a', fg: '#ffffff' }, 's', 604.6, 10.9, 1.9),
    ...poster('转正倒计时\n还有 5 天', 0.9, 0.6, { bg: '#fff7e6', fg: '#c2410c', border: BRAND }, 's', 604.6, 0.7, 1.7),
    // laundry basket and a guitar parked in the corner by the window
    at(0.5, 604.1, 0, cyl(0.22, 0.17, 0.42, '#d6c2a0', 0, 0.21, 0, 14), ball(0.17, '#60a5fa', 0, 0.42, 0), ball(0.12, '#f8fafc', 0.08, 0.46, 0.05)),
    at(12.5, 603.9, 0, rbox(0.34, 0.5, 0.2, '#111827', 0, 0.25, 0, 0.06), rbox(0.24, 0.12, 0.06, '#374151', 0, 0.2, 0.12, 0.02)),
    hang(group(0, 0, 0, box(0.7, 0.03, 0.04, WOOD), ...[-0.25, 0, 0.25].map((x) => cyl(0.012, 0.012, 0.06, shiny(STEEL), x, 0, 0.04, 6).rotateX(Math.PI / 2)), rbox(0.26, 0.34, 0.1, '#0f766e', -0.25, -0.2, 0.08, 0.04), rbox(0.3, 0.5, 0.05, '#f59e0b', 0.25, -0.28, 0.07, 0.02)), 'n', 604.6, 5.2, 1.7, -0.11),
  ];
}

function washNook(): THREE.Object3D[] {
  const w = BATH.x1 - BATH.x0;
  const d = BATH.z1 - BATH.z0;
  const map = ceramic('#dcebed', '#9fbcc1', 4);
  map.repeat.set(w / 1.2, d / 1.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((BATH.x0 + BATH.x1) / 2, 0.005, (BATH.z0 + BATH.z1) / 2);
  floor.receiveShadow = true;
  return [
    floor,
    box(w, 2, 0.012, shiny(TILE), (BATH.x0 + BATH.x1) / 2, 1.1, BATH.z0 + 0.007),
    box(0.012, 2, d, shiny(TILE), BATH.x1 - 0.007, 1.1, (BATH.z0 + BATH.z1) / 2),
    box(w, 0.04, 0.02, shiny('#7fb3ba'), (BATH.x0 + BATH.x1) / 2, 2.12, BATH.z0 + 0.012),
    box(0.02, 0.04, d, shiny('#7fb3ba'), BATH.x1 - 0.012, 2.12, (BATH.z0 + BATH.z1) / 2),
    // water heater with its pipes
    hang(group(0, 0, 0, turn(cyl(0.2, 0.2, 0.7, shiny(WHITE), 0, 0, 0.22, 18), 0, 0, Math.PI / 2), box(0.16, 0.08, 0.004, glow('#fb923c'), 0.1, -0.02, 0.422), cyl(0.012, 0.012, 0.5, shiny(STEEL), -0.2, -0.44, 0.1, 6), cyl(0.012, 0.012, 0.5, shiny(STEEL), 0.2, -0.44, 0.1, 6)), 'n', 600, 14.1, 2.35, 0.12),
    // towel rail on the inner wall
    hang(group(0, 0, 0, box(1.3, 0.025, 0.025, shiny(STEEL), 0, 0, 0.06), ...[-0.62, 0.62].map((x) => box(0.025, 0.025, 0.07, shiny(STEEL), x, 0, 0.03)), ...['#fca5a5', '#93c5fd', '#fde68a'].map((c, i) => rbox(0.3, 0.5, 0.05, c, -0.4 + i * 0.4, -0.22, 0.06, 0.02))), 'w', 13, 605, 1.35, 0.09),
    ...poster('室友公约\n洗漱限时 3 分钟', 1.3, 0.7, { bg: '#fff7e6', fg: '#c2410c', border: BRAND }, 'e', 16, 603.5, 1.75),
    at(14.3, 603.5, 0, rbox(0.9, 0.02, 0.6, '#5eead4', 0, 0.016, 0, 0.008)),
    at(13.5, 600.55, 0, cyl(0.22, 0.18, 0.5, '#f8fafc', 0, 0.25, 0, 14), ball(0.18, '#a78bfa', 0, 0.5, 0)),
    at(13.45, 606.15, 0, cyl(0.16, 0.13, 0.28, '#3b82f6', 0, 0.14, 0, 14), turn(cyl(0.014, 0.014, 1.3, WOOD, 0.02, 0.72, 0, 6), 0, 0, -0.12)),
  ];
}

function living(): THREE.Object3D[] {
  const frontDoor = hang(group(0, 0, 0, rbox(1.1, 2.1, 0.06, '#7c5a3c', 0, 1.05, 0.03, 0.012), ...[0.55, 1.45].map((y) => box(0.8, 0.6, 0.012, '#6b4a30', 0, y, 0.062)), ball(0.04, shiny('#facc15'), 0.42, 1, 0.09), box(0.08, 2.14, 0.1, '#5a3519', -0.59, 1.07, 0.03), box(0.08, 2.14, 0.1, '#5a3519', 0.59, 1.07, 0.03), box(1.26, 0.08, 0.1, '#5a3519', 0, 2.18, 0.03)), 's', 612, 6, 0, 0.1);
  const hooks = hang(group(0, 0, 0, box(1.1, 0.06, 0.03, WOOD), rbox(0.36, 0.6, 0.1, '#1f2937', -0.32, -0.34, 0.07, 0.04), rbox(0.34, 0.5, 0.08, '#b45309', 0.08, -0.3, 0.06, 0.04), rbox(0.2, 0.3, 0.1, '#f472b6', 0.42, -0.2, 0.07, 0.04)), 's', 612, 4.3, 1.75, 0.11);
  return [
    ...curtains(606.6, 609.4, '#bfdbfe'),
    frontDoor,
    hooks,
    hang(textPlane('出口 ▼', 0.8, 0.26, { bg: '#16a34a', fg: '#ffffff' }), 's', 612, 6, 2.72),
    hang(wallClock(), 's', 612, 7.2, 2.3, 0.1),
    at(2.5, 608, 0, rug(3, 3.2, '#93c5fd', '#3b82f6')),
    at(6, 611.25, 0, rbox(0.9, 0.02, 0.55, '#7c2d12', 0, 0.012, 0, 0.008)),
    at(5.35, 611.5, 0, cyl(0.12, 0.1, 0.45, shiny('#374151'), 0, 0.225, 0, 12), turn(cyl(0.012, 0.012, 0.8, '#dc2626', 0.02, 0.5, 0, 6), 0, 0, 0.1)),
    ...poster('本周值日表\n倒垃圾：还没人认领', 1.5, 0.8, { bg: '#ffffff', fg: '#1f2937', border: '#9ca3af' }, 'n', 604.6, 5.2, 1.7),
    // split air conditioner
    hang(group(0, 0, 0, rbox(0.95, 0.3, 0.2, WHITE, 0, 0, 0.1, 0.04), box(0.8, 0.02, 0.03, '#cbd5e1', 0, -0.13, 0.19), box(0.04, 0.012, 0.004, glow('#22c55e'), 0.38, 0.06, 0.201)), 'n', 604.6, 10.6, 2.5, 0.08),
    hang(noticeBoard(1.1, 0.75, 21), 'n', 604.6, 10.6, 1.6, 0.09),
    hang(pictureFrame(0.7, 0.5, '#fde68a'), 'w', 0, 610.5, 1.75, 0.1),
    // yoga mat and dumbbells that have not moved in weeks
    at(6.2, 609.3, 0.15, box(0.62, 0.012, 1.7, '#a78bfa', 0, 0.007, 0)),
    ...[0, 1].map((i) => at(6.9, 608.8 + i * 0.3, 0.2, turn(cyl(0.025, 0.025, 0.22, shiny(STEEL), 0, 0.06, 0, 8), 0, 0, Math.PI / 2), turn(cyl(0.06, 0.06, 0.06, DARK, -0.11, 0.06, 0, 10), 0, 0, Math.PI / 2), turn(cyl(0.06, 0.06, 0.06, DARK, 0.11, 0.06, 0, 10), 0, 0, Math.PI / 2))),
  ];
}

function kitchenCorner(): THREE.Object3D[] {
  return [
    at(15.35, 611.4, 0, bin('#9ca3af')),
    at(11, 610.45, 0, rbox(1, 0.016, 0.5, '#fca5a5', 0, 0.01, 0, 0.006)),
    hang(group(0, 0, 0, box(1.4, 0.03, 0.2, WOOD, 0, 0, 0.1), ...['#fde68a', '#fca5a5', '#bbf7d0', '#fed7aa'].map((c, i) => cyl(0.05, 0.05, 0.14, shiny(c), -0.48 + i * 0.3, 0.085, 0.1, 10))), 'e', 16, 609, 1.5, 0.1),
    hang(textPlane('水电燃气 AA\n本月已欠费', 1.1, 0.56, { bg: '#fef3c7', fg: '#92400e' }), 'e', 16, 607.8, 1.75),
    at(15.5, 607.3, 0, cyl(0.15, 0.15, 0.4, shiny('#bfdbfe'), 0, 0.2, 0, 14), cyl(0.05, 0.05, 0.06, '#2563eb', 0, 0.43, 0, 10)),
  ];
}

export function homeDecor(): THREE.Object3D[] {
  return [...Object.values(HOME_DOORWAYS).flatMap(doorway), ...HOME_LAMPS.map(pendant), ...outside(), ...bedroom(), ...washNook(), ...living(), ...kitchenCorner()];
}
