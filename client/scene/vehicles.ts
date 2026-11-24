import type * as THREE from 'three';
import { fuse } from './fuse.ts';
import { box, cyl, glass, glow, rbox, shiny, textPlane, turn } from './kit.ts';

/**
 * Street and warehouse vehicles. Every model faces +x and stays inside its
 * lane footprint from shared/hazards.ts (car 4.2 x 1.9, bus 9 x 2.4, forklift 2.4 x 1.3).
 */
export const CAB_YELLOW = '#f7c600';
const TYRE = '#111827';
const CHROME = '#d1d5db';
const TRIM = '#1f2937';
const DARK_GLASS = '#0f172a';
const HEADLIGHT = '#fff7d6';
const TAIL = '#ef4444';
const AMBER = '#fb923c';
const SIDES = [-1, 1] as const;
const MEDALLIONS = ['6Y42', '9K17', '3B88'];

/** Tyre with a bright hub cap on its outer face; `out` is the side (z sign) the cap faces. */
export function wheel(x: number, z: number, r: number, out: number, width = 0.22): THREE.Object3D[] {
  return [turn(cyl(r, r, width, TYRE, x, r, z, 16), 0, Math.PI / 2), turn(cyl(r * 0.5, r * 0.5, 0.02, shiny(CHROME), x, r, z + out * (width / 2 + 0.004), 12), 0, Math.PI / 2)];
}

/** A flat sign turned to face one of the `FACE` directions. */
export function decal(text: string, w: number, h: number, style: { bg: string; fg: string; lit?: boolean }, x: number, y: number, z: number, facing: number): THREE.Mesh {
  const plane = turn(textPlane(text, w, h, style), facing);
  plane.position.set(x, y, z);
  return plane;
}

export const FACE = { front: Math.PI / 2, back: -Math.PI / 2, right: 0, left: Math.PI };

function carBody(color: string): THREE.Object3D[] {
  const paint = shiny(color);
  return [
    rbox(4, 0.55, 1.74, paint, 0, 0.6, 0, 0.12),
    rbox(2.2, 0.5, 1.54, paint, -0.2, 1.13, 0, 0.14),
    box(1.96, 0.3, 1.58, glass(DARK_GLASS, 0.78), -0.2, 1.14, 0),
    box(2.24, 0.3, 1.3, glass(DARK_GLASS, 0.78), -0.2, 1.14, 0),
    box(0.08, 0.34, 1.6, paint, -0.25, 1.14, 0),
    box(2.6, 0.08, 1.78, TRIM, 0, 0.36, 0),
    ...SIDES.map((m) => rbox(0.12, 0.14, 1.8, shiny(CHROME), m * 2.04, 0.45, 0, 0.04)),
    box(0.03, 0.16, 0.9, TRIM, 2.0, 0.64, 0),
    ...SIDES.map((s) => box(0.04, 0.14, 0.34, glow(HEADLIGHT), 2.0, 0.66, s * 0.64)),
    ...SIDES.map((s) => box(0.04, 0.12, 0.34, glow(TAIL), -2.0, 0.7, s * 0.64)),
    box(0.02, 0.12, 0.36, '#f8fafc', -2.012, 0.56, 0),
    ...SIDES.map((s) => rbox(0.09, 0.08, 0.12, paint, 0.78, 0.96, s * 0.88, 0.03)),
    ...SIDES.flatMap((s) => [-0.45, 0.5].map((x) => box(0.14, 0.03, 0.02, shiny(CHROME), x, 0.79, s * 0.872))),
    ...SIDES.flatMap((m) => SIDES.flatMap((s) => wheel(m * 1.3, s * 0.8, 0.32, s))),
  ];
}

/** Checker band, roof light with the medallion number and door lettering. */
function taxiTrim(medallion: string): THREE.Object3D[] {
  const squares = 30;
  const checker = SIDES.flatMap((s) => Array.from({ length: squares * 2 }, (_, n) => ({ i: n % squares, row: Math.floor(n / squares) })).filter((c) => (c.i + c.row) % 2 === 0).map((c) => box(0.1, 0.05, 0.012, '#111111', -1.45 + c.i * 0.1, 0.685 + c.row * 0.05, s * 0.872)));
  const lamp = { bg: HEADLIGHT, fg: '#111111' };
  const door = { bg: CAB_YELLOW, fg: '#111111', lit: false };
  return [
    ...checker,
    rbox(0.24, 0.16, 0.74, glow(HEADLIGHT), -0.2, 1.47, 0, 0.04),
    box(0.3, 0.03, 0.8, TRIM, -0.2, 1.385, 0),
    decal(medallion, 0.6, 0.12, lamp, -0.076, 1.47, 0, FACE.front),
    decal(medallion, 0.6, 0.12, lamp, -0.324, 1.47, 0, FACE.back),
    decal('TAXI', 0.5, 0.16, door, 0.3, 0.52, 0.874, FACE.right),
    decal('TAXI', 0.5, 0.16, door, 0.3, 0.52, -0.874, FACE.left),
    decal('出租', 0.4, 0.14, door, -0.8, 0.52, 0.874, FACE.right),
    decal('出租', 0.4, 0.14, door, -0.8, 0.52, -0.874, FACE.left),
  ];
}

const AXLES = [2.6, -2.8];

const busSide = (s: number): THREE.Object3D[] => [
  box(7.4, 0.8, 0.02, glass(DARK_GLASS, 0.8), -0.4, 2.02, s * 1.16),
  ...Array.from({ length: 6 }, (_, i) => box(0.08, 0.8, 0.03, shiny('#e8edf2'), -3.5 + i * 1.24, 2.02, s * 1.16)),
  ...AXLES.map((x) => turn(cyl(0.62, 0.62, 0.04, TRIM, x, 0.46, s * 1.15, 20), 0, Math.PI / 2)),
  ...AXLES.flatMap((x) => wheel(x, s * 1.065, 0.46, s, 0.24)),
  box(0.1, 0.3, 0.07, TRIM, 4.3, 2.05, s * 1.16),
];

/** Kerb side (+z): front and rear doors with glazed leaves. */
function busDoors(): THREE.Object3D[] {
  const door = (x: number, w: number): THREE.Object3D[] => [
    box(w, 2, 0.03, TRIM, x, 1.5, 1.165),
    ...SIDES.map((m) => box(w / 2 - 0.08, 1.7, 0.02, glass('#7fa8bd', 0.55), x + m * (w / 4), 1.55, 1.18)),
    box(w - 0.1, 0.08, 0.02, '#f2c230', x, 0.58, 1.185),
  ];
  return [...door(3.85, 0.9), ...door(-0.7, 1.2)];
}

function busParts(): THREE.Object3D[] {
  const white = shiny('#e8edf2');
  return [
    rbox(8.9, 2.45, 2.3, white, 0, 1.62, 0, 0.14),
    box(8.92, 0.3, 2.32, '#1d4ed8', 0, 1.36, 0),
    box(8.92, 0.06, 2.32, '#f7c600', 0, 1.17, 0),
    box(8.94, 0.2, 2.32, '#374151', 0, 0.5, 0),
    ...SIDES.flatMap(busSide),
    ...busDoors(),
    box(0.02, 1, 2, glass(DARK_GLASS, 0.8), 4.455, 1.95, 0),
    box(0.03, 0.3, 1.9, '#050505', 4.45, 2.62, 0),
    decal('M7 鲸跃大厦', 1.8, 0.24, { bg: '#050505', fg: AMBER }, 4.472, 2.62, 0, FACE.front),
    decal('M7', 0.5, 0.26, { bg: '#050505', fg: AMBER }, 2.95, 2.58, 1.156, FACE.right),
    decal('挤公交 省打车钱\n准点率 请随缘', 2.6, 0.5, { bg: '#fde047', fg: '#111111' }, -1.2, 1.36, -1.168, FACE.left),
    box(0.02, 0.7, 1.6, glass(DARK_GLASS, 0.8), -4.455, 2.1, 0),
    box(0.03, 0.5, 1.4, TRIM, -4.45, 1.1, 0),
    ...SIDES.map((s) => box(0.04, 0.2, 0.4, glow(HEADLIGHT), 4.45, 0.82, s * 0.8)),
    ...SIDES.map((s) => box(0.04, 0.3, 0.2, glow(TAIL), -4.45, 1.1, s * 0.95)),
    ...SIDES.map((m) => rbox(0.1, 0.22, 2.3, TRIM, m * 4.45, 0.5, 0, 0.04)),
    rbox(2.4, 0.16, 1.5, '#cbd5e1', -1.6, 2.9, 0, 0.05),
    box(0.8, 0.05, 0.8, '#cbd5e1', 2, 2.86, 0),
  ];
}

const builds = new Map<string, THREE.Group>();

/** Each distinct model is built and baked once; further vehicles are clones sharing its geometry. */
export function stamped(key: string, make: () => THREE.Object3D[]): THREE.Group {
  const hit = builds.get(key);
  if (hit) return hit.clone();
  const made = fuse(make());
  builds.set(key, made);
  return made;
}

export const makeCar = (color: string, seed: number): THREE.Group => {
  if (color !== CAB_YELLOW) return stamped(`car:${color}`, () => carBody(color));
  const medallion = MEDALLIONS[Math.abs(Math.floor(seed)) % MEDALLIONS.length];
  return stamped(`cab:${medallion}`, () => [...carBody(color), ...taxiTrim(medallion)]);
};

export const makeBus = (): THREE.Group => stamped('bus', busParts);
