import type * as THREE from 'three';
import { ball, box, cyl, glass, glow, group, pick, rbox, shiny, turn } from '../kit.ts';
import { DARK, STEEL } from '../parts.ts';
import type { Builder } from './types.ts';

const BELT_Y = 0.82;
const ALU = '#b4bac1';
const HAZARD = '#facc15';
const PARCEL = ['#c99657', '#b98448', '#d8ab6c'];
const ROLLER_ZONE = 3.2;
const TUNNEL_LENGTH = 1.7;
const ROLLER_PITCH = 0.17;
const LEG_PITCH = 2.6;
const PARCEL_PITCH = 1.55;

/** Induction tunnel at the feed end: sheet-metal hood, PVC strip curtain and a signal tower. */
function tunnel(d: number): THREE.Object3D[] {
  const half = d / 2 - 0.06;
  return [
    ...[-1, 1].map((s) => box(TUNNEL_LENGTH, 1.5, 0.04, '#3b3f45', 0, 0.78, s * half)),
    box(TUNNEL_LENGTH, 0.05, d - 0.08, '#3b3f45', 0, 1.55, 0),
    box(TUNNEL_LENGTH - 0.1, 0.5, 0.012, HAZARD, 0, 1.2, half + 0.026),
    ...Array.from({ length: 6 }, (_, i) => box(0.012, 0.62, (d - 0.4) / 6 - 0.012, glass('#f59e0b', 0.55), TUNNEL_LENGTH / 2 - 0.02, BELT_Y + 0.36, -d / 2 + 0.2 + ((d - 0.4) / 6) * (i + 0.5))),
    cyl(0.02, 0.02, 0.16, shiny(STEEL), -0.5, 1.66, 0, 6),
    ...['#22c55e', '#f59e0b', '#ef4444'].map((c, i) => cyl(0.05, 0.05, 0.09, glow(c), -0.5, 1.78 + i * 0.095, 0, 10)),
  ];
}

/** Operator station: pedestal, yellow enclosure, mushroom e-stop and start button. */
const controls = (): THREE.Group =>
  group(0, 0, 0, box(0.06, 1, 0.06, shiny(STEEL), 0, 0.5, 0), rbox(0.24, 0.3, 0.12, HAZARD, 0, 1.12, 0, 0.015), cyl(0.045, 0.045, 0.04, shiny('#dc2626'), 0, 1.18, 0.07, 12).rotateX(Math.PI / 2), cyl(0.022, 0.022, 0.03, glow('#22c55e'), -0.06, 1.05, 0.065, 8).rotateX(Math.PI / 2), cyl(0.022, 0.022, 0.03, DARK, 0.06, 1.05, 0.065, 8).rotateX(Math.PI / 2));

/** Barcode gate over the belt with its red scan line. */
function scanArch(d: number): THREE.Object3D[] {
  const half = d / 2 - 0.12;
  return [
    ...[-1, 1].map((s) => box(0.06, 0.8, 0.06, shiny(DARK), 0, BELT_Y + 0.4, s * half)),
    box(0.1, 0.08, half * 2 + 0.06, shiny(DARK), 0, BELT_Y + 0.8, 0),
    box(0.02, 0.012, half * 2 - 0.2, glow('#ef4444'), 0, BELT_Y + 0.754, 0),
    box(0.006, 0.006, half * 2 - 0.3, glow('#ef4444'), 0, BELT_Y + 0.03, 0),
  ];
}

/** What rides the belt: cartons, poly mailers and plastic totes. */
function parcel(i: number): THREE.Object3D {
  const kind = i % 4;
  if (kind === 1) return rbox(0.34, 0.05, 0.26, pick(['#e5e7eb', '#9ca3af', '#fde68a'], i), 0, 0.025, 0, 0.02);
  if (kind === 3) return group(0, 0, 0, rbox(0.56, 0.26, 0.38, shiny(pick(['#2563eb', HAZARD], i >> 2)), 0, 0.13, 0, 0.025), box(0.5, 0.01, 0.32, '#1f2937', 0, 0.262, 0), rbox(0.2, 0.1, 0.16, '#c99657', -0.08, 0.3, 0.02, 0.01));
  const s = 0.28 + (i % 3) * 0.09;
  return group(0, 0, 0, rbox(s + 0.1, s, s, pick(PARCEL, i), 0, s / 2, 0, 0.012), box(s + 0.104, 0.004, 0.05, '#e9d7a8', 0, s, 0), box(0.1, 0.07, 0.003, '#f8fafc', 0.02, s * 0.6, s / 2 + 0.002));
}

function supports(w: number, d: number): THREE.Object3D[] {
  const half = d / 2 - 0.22;
  return Array.from({ length: Math.floor((w - 0.6) / LEG_PITCH) + 1 }, (_, i) =>
    group(
      -w / 2 + 0.3 + i * LEG_PITCH, 0, 0,
      ...[-half, half].flatMap((z) => [box(0.06, BELT_Y - 0.1, 0.06, shiny(STEEL), 0, (BELT_Y - 0.1) / 2, z), cyl(0.06, 0.07, 0.03, DARK, 0, 0.015, z, 10)]),
      box(0.04, 0.04, half * 2, shiny(STEEL), 0, 0.22, 0),
    ),
  );
}

/**
 * Powered belt line: induction tunnel at the west end, a long belt under a
 * barcode gate, and a gravity roller run-out at the east end.
 */
export const conveyor: Builder = (w, d) => {
  const side = d / 2 - 0.2;
  const beltFrom = -w / 2 + 0.15;
  const beltTo = w / 2 - ROLLER_ZONE;
  const beltLength = beltTo - beltFrom;
  const beltMid = (beltFrom + beltTo) / 2;
  const rollers = Math.floor((ROLLER_ZONE - 0.2) / ROLLER_PITCH);
  return [
    ...[-side, side].flatMap((z) => [box(w - 0.1, 0.16, 0.05, shiny(ALU), 0, BELT_Y - 0.05, z), box(w - 2, 0.03, 0.03, shiny(HAZARD), 0.9, BELT_Y + 0.17, z)]),
    ...Array.from({ length: Math.floor((w - 2) / 1.3) + 1 }, (_, i) => [-side, side].map((z) => box(0.03, 0.16, 0.03, shiny(STEEL), -w / 2 + 1.9 + i * 1.3, BELT_Y + 0.1, z))).flat(),
    box(beltLength, 0.04, side * 2 - 0.06, '#26282c', beltMid, BELT_Y, 0),
    box(beltLength, 0.02, side * 2 - 0.1, '#1b1d20', beltMid, BELT_Y - 0.2, 0),
    ...[beltFrom, beltTo].map((x) => turn(cyl(0.1, 0.1, side * 2 - 0.06, shiny(STEEL), x, BELT_Y - 0.09, 0, 12), 0, Math.PI / 2)),
    ...Array.from({ length: rollers }, (_, i) => turn(cyl(0.04, 0.04, side * 2 - 0.06, shiny(ALU), beltTo + 0.22 + i * ROLLER_PITCH, BELT_Y - 0.02, 0, 10), 0, Math.PI / 2)),
    box(0.06, 0.2, side * 2, shiny(HAZARD), w / 2 - 0.08, BELT_Y + 0.06, 0),
    ...supports(w, d),
    // drive unit slung under the belt
    group(beltFrom + 3, 0, side - 0.24, rbox(0.5, 0.3, 0.34, '#2f6f4f', 0, 0.5, 0, 0.03), turn(cyl(0.13, 0.13, 0.3, '#2f6f4f', 0.36, 0.5, 0, 12), 0, 0, Math.PI / 2), box(0.3, 0.36, 0.04, shiny('#f97316'), -0.1, 0.56, 0.2)),
    group(beltFrom + TUNNEL_LENGTH / 2 + 0.05, 0, 0, ...tunnel(d)),
    group(1.2, 0, 0, ...scanArch(d)),
    group(5.2, 0, d / 2 - 0.1, controls()),
    group(-6.4, 0, d / 2 - 0.1, controls()),
    ...Array.from({ length: Math.floor((w - TUNNEL_LENGTH - 1) / PARCEL_PITCH) }, (_, i) =>
      turn(group(beltFrom + TUNNEL_LENGTH + 0.7 + i * PARCEL_PITCH, BELT_Y + 0.022, ((i * 7) % 3) * 0.12 - 0.12, parcel(i)), (i % 4) * 0.2),
    ),
    ball(0.03, glow('#ef4444'), w / 2 - 0.2, BELT_Y + 0.2, side),
  ];
};
