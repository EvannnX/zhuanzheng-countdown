import type * as THREE from 'three';
import type { Rect } from '../../../shared/geometry.ts';
import { LIFT_CARS } from '../../../shared/world.ts';
import { box, cyl, glass, glow, rbox, shiny, textPlane, turn } from '../kit.ts';
import type { RoomArt } from './types.ts';

const STEEL = '#c5cad0';
const BRUSHED = '#9aa1a8';
const DARK = '#1f2937';
/** Underside of the car's dropped ceiling. */
export const CAR_CEILING = 2.6;
export const CAR_DOOR = { width: 1.2, height: 2.1 } as const;
const HALL_DEPTH = 1.9;
const FLOORS = 12;

/** Every button is lit: somebody pressed them all. */
function buttonPanel(x: number, z: number): THREE.Object3D[] {
  const buttons = Array.from({ length: FLOORS }, (_, i) => cyl(0.022, 0.022, 0.012, glow('#fb923c'), x - 0.05 + (i % 2) * 0.1, 0.95 + Math.floor(i / 2) * 0.085, z + 0.018, 10).rotateX(Math.PI / 2));
  return [rbox(0.26, 0.9, 0.03, shiny(BRUSHED), x, 1.2, z, 0.01), ...buttons, box(0.14, 0.06, 0.012, glow('#ef4444'), x, 0.84, z + 0.018)];
}

/** One car: brushed-steel box with a mirror, handrail and adverts; outside the doors a dim landing. */
function car(c: Rect): THREE.Object3D[] {
  const w = c.x1 - c.x0;
  const d = c.z1 - c.z0;
  const cx = (c.x0 + c.x1) / 2;
  const cz = (c.z0 + c.z1) / 2;
  const jamb = (w - CAR_DOOR.width) / 2;
  const ad = turn(textPlane('电梯广告位招租\n（你已经看了 4000 遍）', 1.3, 0.7, { bg: '#fde047', fg: '#111111' }), Math.PI / 2);
  ad.position.set(c.x0 + 0.072, 1.6, cz);
  const load = turn(textPlane('限载 13 人\n实载：看心情', 0.5, 0.3, { bg: '#111827', fg: '#e5e7eb' }), -Math.PI / 2);
  load.position.set(c.x1 - 0.072, 1.75, cz - 0.5);
  return [
    ...[c.x0 + 0.03, c.x1 - 0.03].map((x) => box(0.06, CAR_CEILING, d, shiny(STEEL), x, CAR_CEILING / 2, cz)),
    box(w, CAR_CEILING, 0.06, shiny(STEEL), cx, CAR_CEILING / 2, c.z1 - 0.03),
    box(w - 0.5, 1.2, 0.02, glass('#dbeafe', 0.5), cx, 1.75, c.z1 - 0.07),
    ...[c.x0 + jamb / 2, c.x1 - jamb / 2].map((x) => box(jamb, CAR_CEILING, 0.08, shiny(BRUSHED), x, CAR_CEILING / 2, c.z0 + 0.04)),
    box(CAR_DOOR.width, CAR_CEILING - CAR_DOOR.height, 0.08, shiny(BRUSHED), cx, (CAR_CEILING + CAR_DOOR.height) / 2, c.z0 + 0.04),
    box(0.62, 0.26, 0.02, '#050505', cx, CAR_DOOR.height + 0.25, c.z0 + 0.09),
    // dropped ceiling with one light panel, handrails on three sides
    box(w, 0.1, d, '#d4d4d8', cx, CAR_CEILING + 0.05, cz),
    box(w - 1, 0.02, d - 1, glow('#fbfdf6'), cx, CAR_CEILING - 0.01, cz),
    ...[c.x0 + 0.12, c.x1 - 0.12].map((x) => turn(cyl(0.02, 0.02, d - 0.5, shiny(STEEL), x, 0.95, cz, 8), 0, Math.PI / 2)),
    turn(cyl(0.02, 0.02, w - 0.5, shiny(STEEL), cx, 0.95, c.z1 - 0.12, 8), 0, 0, Math.PI / 2),
    ...buttonPanel(c.x1 - jamb / 2, c.z0 + 0.09),
    ad,
    load,
    // the landing outside: seen only when the doors open on the way
    box(w + 0.6, 0.02, HALL_DEPTH, '#8b8f94', cx, 0.01, c.z0 - HALL_DEPTH / 2),
    box(w + 0.6, 3, 0.1, '#2a2d33', cx, 1.5, c.z0 - HALL_DEPTH),
    ...[cx - w / 2 - 0.3, cx + w / 2 + 0.3].map((x) => box(0.1, 3, HALL_DEPTH, '#2a2d33', x, 1.5, c.z0 - HALL_DEPTH / 2)),
    box(w + 0.6, 0.1, HALL_DEPTH, DARK, cx, 2.75, c.z0 - HALL_DEPTH / 2),
  ];
}

export const elevator: RoomArt = { builders: {}, decor: () => LIFT_CARS.flatMap(car) };
