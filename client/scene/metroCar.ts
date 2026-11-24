import * as THREE from 'three';
import { STAFF_LOOKS } from './characters.ts';
import { box, cyl, glass, glow, group, rbox, shiny, textPlane, turn } from './kit.ts';

/**
 * Parts of one hollow subway car in local space: length along x, centred on its
 * doorway, platform on the -z side, rails at y = 0. Original stainless design in
 * the spirit of a New York train: corrugated flanks, amber bucket benches.
 */
export const CAR = { body: 5.88, halfWidth: 1.35, floor: 0.36, ceiling: 2.44, roof: 2.56 } as const;
export const DOOR = { halfWidth: 0.65, top: 2.24, leaf: 0.65, slide: 0.62, inset: 0.05 } as const;

const HALF = CAR.body / 2;
const SKIN = 0.06;
const SKIRT_Y = 0.3;
const WINDOW = { x0: 1.3, x1: 2.6, y0: 1.2, y1: 1.95 };
const LEAF_H = DOOR.top - CAR.floor;
const LEAF_T = 0.03;
const LEAF_PANEL_H = 0.95;
const LEAF_TOP_H = 0.18;
const STEEL = '#c5cad0';
const STEEL_DARK = '#8e959c';
const DOOR_STEEL = '#aeb4ba';
const UNDER = '#1b1c1e';
const GEAR = '#2a2d31';
const BLACK = '#101113';
const SEAT = '#f59e0b';
const ROUTE = '#b933ad';
const BELT = '#1e3a8a';
const WARM = '#fff7d6';
const SIDES = [-1, 1] as const;

/** One sliding leaf with a real window; origin at the bottom centre, `edge` is the side that meets its twin. */
export function leafParts(edge: number): THREE.Object3D[] {
  const steel = shiny(DOOR_STEEL);
  const glassH = LEAF_H - LEAF_PANEL_H - LEAF_TOP_H;
  const glassY = LEAF_PANEL_H + glassH / 2;
  return [
    box(DOOR.leaf, LEAF_PANEL_H, LEAF_T, steel, 0, LEAF_PANEL_H / 2, 0),
    box(DOOR.leaf, LEAF_TOP_H, LEAF_T, steel, 0, LEAF_H - LEAF_TOP_H / 2, 0),
    ...SIDES.map((o) => box(0.13, glassH, LEAF_T, steel, o * (DOOR.leaf / 2 - 0.065), glassY, 0)),
    box(DOOR.leaf - 0.26, glassH, 0.012, glass('#9fc4d8', 0.3), 0, glassY, 0),
    box(0.02, LEAF_H, LEAF_T + 0.012, BLACK, edge * (DOOR.leaf / 2 - 0.01), LEAF_H / 2, 0),
    ...[0.16, 0.26, 0.36].map((y) => box(DOOR.leaf - 0.12, 0.02, LEAF_T + 0.01, STEEL_DARK, 0, y, 0)),
  ];
}

/** A closed pair of leaves on side `s` (they sit just inside the skin, like a pocket door). */
export const closedDoor = (s: number): THREE.Object3D[] => SIDES.map((m) => group(m * (DOOR.leaf / 2), CAR.floor, s * (CAR.halfWidth - DOOR.inset), ...leafParts(-m)));

/** One long side: dado with corrugation, window band, door pillars and header. `s` is -1 for the platform side. */
function flank(s: number): THREE.Object3D[] {
  const z = s * CAR.halfWidth;
  const steel = shiny(STEEL);
  const span = HALF - DOOR.halfWidth;
  const midY = (WINDOW.y0 + WINDOW.y1) / 2;
  const winH = WINDOW.y1 - WINDOW.y0;
  const half = (m: number): THREE.Object3D[] => {
    const cx = m * (DOOR.halfWidth + span / 2);
    const winX = m * ((WINDOW.x0 + WINDOW.x1) / 2);
    return [
      box(span, WINDOW.y0 - SKIRT_Y, SKIN, steel, cx, (WINDOW.y0 + SKIRT_Y) / 2, z),
      box(span, CAR.roof - WINDOW.y1, SKIN, steel, cx, (CAR.roof + WINDOW.y1) / 2, z),
      box(WINDOW.x0 - DOOR.halfWidth, winH, SKIN, steel, m * ((WINDOW.x0 + DOOR.halfWidth) / 2), midY, z),
      box(HALF - WINDOW.x1, winH, SKIN, steel, m * ((HALF + WINDOW.x1) / 2), midY, z),
      box(WINDOW.x1 - WINDOW.x0, winH, 0.015, glass('#9fc4d8', 0.26), winX, midY, z),
      box(0.04, winH, SKIN + 0.01, BLACK, winX, midY, z),
      ...[0.44, 0.56, 0.68, 0.8, 0.92].map((y) => box(span - 0.12, 0.035, 0.02, STEEL_DARK, cx, y, z + s * (SKIN / 2 + 0.006))),
      box(span, 0.07, 0.012, BELT, cx, 1.08, z + s * (SKIN / 2 + 0.004)),
    ];
  };
  return [...half(-1), ...half(1), box(DOOR.halfWidth * 2, CAR.roof - DOOR.top, SKIN, steel, 0, (CAR.roof + DOOR.top) / 2, z), box(DOOR.halfWidth * 2, 0.012, 0.1, '#f2c230', 0, CAR.floor + 0.006, s * (CAR.halfWidth - 0.1))];
}

/** Benches either side of the doorway on side `s`, with a modesty panel next to the door. */
function benches(s: number): THREE.Object3D[] {
  const length = 2;
  return SIDES.flatMap((m) => {
    const x = m * (DOOR.halfWidth + 0.2 + length / 2);
    return [
      box(length, 0.4, 0.34, STEEL_DARK, x, CAR.floor + 0.2, s * 1.1),
      rbox(length, 0.08, 0.44, shiny(SEAT), x, CAR.floor + 0.44, s * 1.05, 0.03),
      rbox(length, 0.36, 0.06, shiny(SEAT), x, CAR.floor + 0.66, s * 1.25, 0.025),
      box(0.03, 0.75, 0.42, shiny(STEEL), m * (DOOR.halfWidth + 0.18), CAR.floor + 0.5, s * 1.07),
    ];
  });
}

function interior(): THREE.Object3D[] {
  const pole = (x: number, z: number): THREE.Mesh => cyl(0.02, 0.02, CAR.ceiling - CAR.floor, shiny(STEEL), x, (CAR.ceiling + CAR.floor) / 2, z, 8);
  return [
    box(CAR.body, 0.06, CAR.halfWidth * 2 - SKIN, '#3a3f45', 0, CAR.floor - 0.03, 0),
    box(CAR.body - 0.1, 0.03, CAR.halfWidth * 2 - SKIN, '#e8eaec', 0, CAR.ceiling + 0.015, 0),
    ...SIDES.flatMap((m) => SIDES.map((s) => box(2, 0.02, 0.14, glow('#fbfdf6'), m * 1.6, CAR.ceiling - 0.01, s * 0.5))),
    ...SIDES.flatMap((s) => benches(s)),
    pole(0, 0),
    ...SIDES.flatMap((m) => SIDES.map((s) => pole(m * 0.8, s * 0.84))),
    ...SIDES.flatMap((m) => SIDES.map((s) => turn(cyl(0.018, 0.018, 2, shiny(STEEL), m * 1.85, 2.16, s * 0.84, 8), 0, 0, Math.PI / 2))),
  ];
}

/** End bulkheads with their storm doors, the roof and the bellows towards the next car (+x). */
function endsAndRoof(): THREE.Object3D[] {
  const wallH = CAR.roof - SKIRT_Y;
  const bulkhead = (m: number): THREE.Object3D[] => [
    box(SKIN, wallH, CAR.halfWidth * 2 - SKIN, shiny(STEEL), m * (HALF - SKIN / 2), SKIRT_Y + wallH / 2, 0),
    box(SKIN + 0.02, 1.85, 0.7, shiny(DOOR_STEEL), m * (HALF - SKIN / 2), CAR.floor + 0.925, 0),
    box(SKIN + 0.04, 0.6, 0.42, glass('#0b1220', 0.85), m * (HALF - SKIN / 2), 1.7, 0),
  ];
  return [
    ...bulkhead(-1),
    ...bulkhead(1),
    rbox(CAR.body, 0.2, CAR.halfWidth * 2 + SKIN, shiny(STEEL), 0, CAR.roof + 0.02, 0, 0.09),
    ...SIDES.map((m) => rbox(1.5, 0.05, 1.3, '#9aa1a8', m * 1.5, CAR.roof + 0.13, 0, 0.02)),
    box(0.12, 1.95, 0.95, BLACK, HALF + 0.06, CAR.floor + 0.975, 0),
    box(0.2, 0.1, 0.2, GEAR, HALF + 0.06, 0.24, 0),
  ];
}

/** Underframe, equipment boxes and a bogie at each end. */
function running(): THREE.Object3D[] {
  const wheel = (x: number, z: number): THREE.Mesh => turn(cyl(0.11, 0.11, 0.1, UNDER, x, 0.25, z, 12), 0, Math.PI / 2);
  const bogie = (cx: number): THREE.Object3D[] => [
    ...SIDES.map((s) => box(1.4, 0.1, 0.08, GEAR, cx, 0.2, s * 0.86)),
    ...SIDES.flatMap((o) => SIDES.map((s) => wheel(cx + o * 0.45, s * 0.75))),
    ...SIDES.flatMap((o) => SIDES.map((s) => box(0.14, 0.12, 0.05, '#4b5563', cx + o * 0.45, 0.22, s * 0.92))),
  ];
  return [
    box(CAR.body - 0.2, 0.1, 2.3, UNDER, 0, 0.25, 0),
    ...SIDES.map((s) => box(1.3, 0.2, 0.5, GEAR, 0, 0.18, s * 0.82)),
    ...bogie(-1.9),
    ...bogie(1.9),
  ];
}

/** Amber LED strip on the platform side and a car number, both readable from the platform. */
function sideSigns(): THREE.Object3D[] {
  const out = -(CAR.halfWidth + SKIN / 2);
  const route = turn(textPlane('⑦ 鲸跃大厦 Downtown', 1.1, 0.16, { bg: '#050505', fg: '#fb923c' }), Math.PI);
  route.position.set(1.95, 2.24, out - 0.026);
  const number = turn(textPlane('7421', 0.34, 0.12, { bg: '#1e3a8a', fg: '#ffffff' }), Math.PI);
  number.position.set(-2.72, 1.6, out - 0.008);
  return [box(1.2, 0.22, 0.02, BLACK, 1.95, 2.24, out - 0.01), route, number, box(1.2, 0.22, 0.02, BLACK, -1.95, 2.24, -out + 0.01)];
}

/** Everything of a car that never moves relative to it. The platform-side leaves are separate (they slide). */
export function carShellParts(): THREE.Object3D[] {
  return [...flank(-1), ...flank(1), ...closedDoor(1), ...interior(), ...endsAndRoof(), ...running(), ...sideSigns()];
}

/** A blocky commuter sitting on the bench of side `s`, facing the aisle. */
function rider(x: number, s: number, seed: number): THREE.Group {
  const look = STAFF_LOOKS[seed % STAFF_LOOKS.length];
  const seat = CAR.floor + 0.48;
  const body = group(
    x, 0, s * 0.95,
    cyl(0.2, 0.28, 0.62, look.shirt, 0, seat + 0.31, 0, 10),
    rbox(0.5, 0.46, 0.46, look.skin, 0, seat + 0.88, 0, 0.1),
    rbox(0.52, 0.16, 0.48, look.hair, 0, seat + 1.06, -0.01, 0.07),
    ...SIDES.map((o) => box(0.07, 0.07, 0.02, '#111111', o * 0.1, seat + 0.9, 0.23)),
    ...SIDES.map((o) => rbox(0.15, 0.15, 0.42, look.pants, o * 0.11, seat + 0.07, 0.24, 0.05)),
    ...SIDES.map((o) => box(0.14, 0.46, 0.15, look.pants, o * 0.11, CAR.floor + 0.25, 0.4)),
  );
  body.rotation.y = s < 0 ? 0 : Math.PI;
  return body;
}

const RIDER_SETS: readonly (readonly [number, number][])[] = [
  [[1.35, 1], [2.35, 1], [-1.6, -1], [-2.1, 1]],
  [[-1.3, 1], [-2.4, 1], [2.0, -1], [1.3, 1], [-1.9, -1]],
];

export const riderSetCount = RIDER_SETS.length;
export const riderParts = (set: number): THREE.Object3D[] => RIDER_SETS[set % RIDER_SETS.length].map(([x, s], i) => rider(x, s, set * 3 + i));

/** Cab end facing +x with its outer face starting at x = 0: mask, windshields, storm door with the route bullet, lights. */
export function cabParts(lead: boolean): THREE.Object3D[] {
  const depth = 0.16;
  const face = depth + 0.001;
  const height = CAR.roof - SKIRT_Y;
  const seven = turn(textPlane('7', 0.26, 0.26, { bg: ROUTE, fg: '#ffffff' }), Math.PI / 2);
  seven.position.set(face + 0.062, 1.05, 0);
  const sign = turn(textPlane(lead ? '鲸跃大厦' : '不载客', 0.9, 0.15, { bg: '#050505', fg: '#fb923c' }), Math.PI / 2);
  sign.position.set(face + 0.022, 2.39, 0);
  const lamp = lead ? WARM : '#ef4444';
  return [
    rbox(depth, height, CAR.halfWidth * 2 + SKIN, shiny(STEEL), depth / 2, SKIRT_Y + height / 2, 0, 0.05),
    box(0.02, 0.9, 2.5, BLACK, face, 1.78, 0),
    box(0.02, 0.2, 1.1, BLACK, face, 2.39, 0),
    sign,
    ...SIDES.map((s) => box(0.02, 0.62, 0.7, glass('#33485e', 0.85), face + 0.015, 1.8, s * 0.78)),
    box(0.03, 1.84, 0.66, shiny(DOOR_STEEL), face + 0.02, CAR.floor + 0.92, 0),
    box(0.02, 0.5, 0.4, glass('#33485e', 0.85), face + 0.04, 1.82, 0),
    turn(cyl(0.2, 0.2, 0.02, glow(ROUTE), face + 0.045, 1.05, 0, 20), 0, 0, Math.PI / 2),
    seven,
    ...SIDES.map((s) => box(0.02, 1.2, 0.03, shiny(STEEL_DARK), face + 0.03, 1.2, s * 0.42)),
    box(0.02, 0.08, 2.5, ROUTE, face, 1.22, 0),
    ...SIDES.flatMap((s) => [box(0.03, 0.2, 0.34, BLACK, face, 0.78, s * 0.9), box(0.03, 0.11, 0.24, glow(lamp), face + 0.012, 0.78, s * 0.9)]),
    ...SIDES.map((s) => box(0.03, 0.07, 0.07, glow(lead ? '#22c55e' : '#ef4444'), face, 2.39, s * 1.05)),
    ...[0.34, 0.42, 0.5].map((y) => box(0.24, 0.04, 2.4, GEAR, 0.12, y, 0)),
    box(0.3, 0.12, 0.24, UNDER, 0.3, 0.22, 0),
  ];
}
