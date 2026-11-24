import type * as THREE from 'three';
import { ball, box, cyl, glow, group, shiny, turn } from './kit.ts';

/** Industrial-loft and warehouse structure. Pieces that run somewhere run along +x, centred on the origin. */

const GALV = '#b7bcc1';
const GALV_DARK = '#8f959b';
const IRON = '#1c1c1e';
const STRUCT = '#4a2f2a';
const SPRINKLER_RED = '#b3261e';
const DUCT_SEAM = 1.2;
const TRUSS_PANEL = 1.5;

/** Round spiral duct with seam bands, strap hangers and supply grilles underneath. `y` = 0 is the duct centre. */
export function spiralDuct(length: number, radius: number, drop: number): THREE.Group {
  const seams = Math.floor(length / DUCT_SEAM);
  const hangers = Math.max(2, Math.round(length / 3));
  return group(
    0, 0, 0,
    turn(cyl(radius, radius, length, shiny(GALV), 0, 0, 0, 16), 0, 0, Math.PI / 2),
    ...Array.from({ length: seams + 1 }, (_, i) => turn(cyl(radius + 0.012, radius + 0.012, 0.04, GALV_DARK, -length / 2 + i * (length / seams), 0, 0, 16), 0, 0, Math.PI / 2)),
    ...Array.from({ length: hangers }, (_, i) => {
      const x = -length / 2 + (length / hangers) * (i + 0.5);
      return group(x, 0, 0, box(0.03, drop, 0.004, IRON, 0, drop / 2 + radius * 0.6, radius), box(0.03, drop, 0.004, IRON, 0, drop / 2 + radius * 0.6, -radius), box(0.3, 0.02, 0.16, GALV_DARK, 0.6, -radius - 0.004, 0));
    }),
    ...[-1, 1].map((s) => turn(cyl(radius * 0.96, radius * 0.96, 0.02, GALV_DARK, s * (length / 2), 0, 0, 16), 0, 0, Math.PI / 2)),
  );
}

/** Red sprinkler main with drop heads every few metres. */
export function sprinklerLine(length: number): THREE.Group {
  const heads = Math.max(2, Math.round(length / 3));
  return group(
    0, 0, 0,
    turn(cyl(0.025, 0.025, length, SPRINKLER_RED, 0, 0, 0, 8), 0, 0, Math.PI / 2),
    ...Array.from({ length: heads }, (_, i) => {
      const x = -length / 2 + (length / heads) * (i + 0.5);
      return group(x, 0, 0, cyl(0.012, 0.012, 0.1, SPRINKLER_RED, 0, -0.05, 0, 6), cyl(0.03, 0.012, 0.025, shiny('#d6b34a'), 0, -0.11, 0, 8));
    }),
  );
}

/** Linear LED pendant on two cables: the loft replacement for ceiling light panels. `y` = 0 is the fitting. */
export const linearPendant = (length: number, drop: number): THREE.Group =>
  group(0, 0, 0, box(length, 0.06, 0.09, shiny(IRON), 0, 0.03, 0), box(length - 0.04, 0.012, 0.07, glow('#fff8e6'), 0, -0.006, 0), ...[-1, 1].map((s) => cyl(0.004, 0.004, drop, IRON, s * (length / 2 - 0.2), drop / 2 + 0.06, 0, 4)));

/** Enamel dome pendant with a bare glowing lamp, on a conduit stem. `y` = 0 is the rim of the shade. */
export const domePendant = (drop: number, color = '#2f4f46'): THREE.Group =>
  group(0, 0, 0, cyl(0.012, 0.012, drop, IRON, 0, 0.2 + drop / 2, 0, 6), cyl(0.07, 0.25, 0.2, shiny(color), 0, 0.1, 0, 16), cyl(0.05, 0.06, 0.06, IRON, 0, 0.22, 0, 10), ball(0.06, glow('#fff3c4'), 0, 0.03, 0));

/**
 * Riveted steel roof truss: parallel chords with W-pattern web bars, spanning
 * `span` along x. `y` = 0 is the top chord (bolt it just under the roof deck).
 */
export function roofTruss(span: number, depth: number): THREE.Group {
  const panels = Math.round(span / TRUSS_PANEL);
  const step = span / panels;
  const web = Math.hypot(step, depth);
  const angle = Math.atan2(depth, step);
  return group(
    0, 0, 0,
    box(span, 0.09, 0.14, STRUCT, 0, -0.045, 0),
    box(span, 0.07, 0.12, STRUCT, 0, -depth, 0),
    ...Array.from({ length: panels }, (_, i) => {
      const x = -span / 2 + step * (i + 0.5);
      return turn(box(web, 0.045, 0.06, STRUCT, x, -depth / 2, 0), 0, 0, i % 2 === 0 ? -angle : angle);
    }),
    ...Array.from({ length: panels + 1 }, (_, i) => box(0.16, 0.16, 0.016, '#3a2420', -span / 2 + step * i, i % 2 === 0 ? -0.08 : -depth + 0.04, 0.07)),
  );
}

const PALLET_WOOD = '#b98f5a';
export const PALLET_HEIGHT = 0.14;

/** Timber shipping pallet: deck boards on three stringers. */
export function pallet(w = 1.2, d = 1): THREE.Group {
  return group(
    0, 0, 0,
    ...[-2, -1, 0, 1, 2].map((i) => box(w * 0.16, 0.022, d, PALLET_WOOD, (i * w) / 4.76, PALLET_HEIGHT - 0.011, 0)),
    ...[-1, 0, 1].map((i) => box(w, 0.09, 0.09, '#a37b49', 0, 0.068, i * (d / 2 - 0.05))),
    ...[-1, 1].map((i) => box(w * 0.14, 0.022, d, PALLET_WOOD, i * (w / 2 - w * 0.07), 0.011, 0)),
  );
}
