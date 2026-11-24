import type * as THREE from 'three';
import { ROADS } from '../../../shared/hazards.ts';
import { ball, box, cyl, glass, group, rbox, shiny, textPlane, turn } from '../kit.ts';
import { at } from '../parts.ts';

const IRON = '#1c1c1e';
const SIGN_GREEN = '#00703c';
const WEST = 100;
const EAST = 132;
const ESCAPE_LEVELS = [4.6, 7.8, 11, 14.2];

/** Zig-zag iron fire escape bolted to a facade; `out` points away from the wall. */
function fireEscape(wallX: number, out: number, z: number): THREE.Object3D[] {
  return ESCAPE_LEVELS.flatMap((y, i) => {
    const x = wallX + out * 0.5;
    const slope = i % 2 === 0 ? 0.75 : -0.75;
    return [
      box(0.9, 0.05, 3.2, IRON, x, y, z),
      box(0.04, 0.9, 3.2, IRON, wallX + out * 0.94, y + 0.45, z),
      ...[-1.6, 1.6].map((o) => box(0.9, 0.9, 0.04, IRON, x, y + 0.45, z + o)),
      ...Array.from({ length: 7 }, (_, k) => box(0.03, 0.86, 0.03, IRON, wallX + out * 0.94, y + 0.45, z - 1.5 + k * 0.5)),
      ...(i < ESCAPE_LEVELS.length - 1 ? [turn(box(0.5, 0.05, 4.4, IRON, x, y + 1.6, z), 0, slope)] : []),
    ];
  });
}

/** Green street-name blades on a pole, the way every corner in Manhattan has them. */
function cornerSign(x: number, z: number, street: string, avenue: string): THREE.Group {
  const blade = (text: string, y: number, ry: number): THREE.Object3D[] => [0, Math.PI].map((flip) => {
    const face = turn(textPlane(text, 1.3, 0.26, { bg: SIGN_GREEN, fg: '#ffffff' }), ry + flip);
    face.position.set(Math.sin(ry + flip) * 0.012, y, Math.cos(ry + flip) * 0.012);
    return face;
  });
  const oneWay = textPlane('ONE WAY →', 0.9, 0.24, { bg: '#111111', fg: '#ffffff' });
  oneWay.position.set(0, 2.5, 0.05);
  return group(x, 0, z, cyl(0.04, 0.05, 3.6, shiny('#6b7280'), 0, 1.8, 0, 8), ...blade(street, 3.4, 0), ...blade(avenue, 3.1, Math.PI / 2), oneWay);
}

/** Orange-and-white steam stack over a manhole, with a lazy plume. */
const steamStack = (x: number, z: number): THREE.Group =>
  group(x, 0, z, ...[0, 1, 2, 3, 4].map((i) => cyl(0.2, 0.2, 0.5, i % 2 === 0 ? '#f97316' : '#f8fafc', 0, 0.25 + i * 0.5, 0, 12)), ...[0, 1, 2].map((i) => ball(0.3 + i * 0.14, glass('#ffffff', 0.35 - i * 0.08), i * 0.12, 2.9 + i * 0.55, i * 0.08)));

const mailbox = (x: number, z: number): THREE.Group => group(x, 0, z, rbox(0.55, 1, 0.5, shiny('#1d4ed8'), 0, 0.65, 0, 0.12), box(0.4, 0.05, 0.02, '#0f172a', 0, 0.95, 0.26), ...[-0.2, 0.2].flatMap((sx) => [-0.18, 0.18].map((sz) => box(0.05, 0.16, 0.05, '#1e3a8a', sx, 0.08, sz))));

const newsBoxes = (x: number, z: number): THREE.Group => group(x, 0, z, ...['#dc2626', '#facc15', '#2563eb'].map((c, i) => group(i * 0.5, 0, 0, rbox(0.42, 0.9, 0.4, shiny(c), 0, 0.6, 0, 0.03), box(0.3, 0.3, 0.02, glass('#e0f2fe', 0.5), 0, 0.75, 0.21), box(0.08, 0.3, 0.08, '#374151', 0, 0.08, 0))));

/** Hanging yellow signal over the road, facing the traffic that comes along x. */
const signal = (x: number, z: number): THREE.Group =>
  group(x, 0, z, cyl(0.08, 0.1, 5.4, shiny('#3f3f46'), 0, 2.7, 0, 8), box(0.1, 0.1, 3, shiny('#3f3f46'), 0, 5.3, 1.5), ...[1.2, 2.6].map((o) => group(0, 4.75, o, rbox(0.3, 0.9, 0.3, shiny('#f7c600'), 0, 0, 0, 0.04), ...['#ef4444', '#f59e0b', '#22c55e'].map((c, i) => ball(0.09, c, 0.16, 0.28 - i * 0.28, 0)))));

/** The New York layer over the commute street: escapes, corner signs, steam, mail and news boxes. */
export function nycStreet(): THREE.Object3D[] {
  const corners = ROADS.flatMap((r, i) => [cornerSign(110.6, r.z0 - 0.9, `W ${34 + i} St`, '8 Av'), cornerSign(121.4, r.z1 + 0.9, `W ${34 + i} St`, '8 Av')]);
  return [
    ...[606.5, 620, 633.5].flatMap((z) => fireEscape(WEST, 1, z)),
    ...[606.5, 620, 633.5].flatMap((z) => fireEscape(EAST, -1, z)),
    ...corners,
    ...ROADS.map((r) => signal(109.4, r.z0 - 0.5)),
    steamStack(118.6, 617.4),
    steamStack(106.4, 631.4),
    at(104.6, 608.9, 0.2, mailbox(0, 0)),
    at(126.4, 608.9, 0, newsBoxes(0, 0)),
    at(113, 632, Math.PI, newsBoxes(0, 0)),
  ];
}
