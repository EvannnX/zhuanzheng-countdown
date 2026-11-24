import * as THREE from 'three';
import { ball, box, cyl, glow, group, mat, rbox, shiny, textPlane, turn } from './kit.ts';
import { DARK, STEEL, WHITE } from './parts.ts';
import { ghostSign, neonText } from './texturesNyc.ts';

/** Small New York set dressing. Local space: origin on the floor (or on the wall for wall pieces), front faces +z. */

const CAST_IRON = '#c9c4b6';
const IRON = '#1c1c1e';
const PIPE = '#b9b3a4';
const KRAFT = '#b98a55';
const RADIATOR_PITCH = 0.065;

/** Cast-iron column radiator, silver-painted. `sections` columns wide along x, 0.16 deep, back to the wall at -z. */
export function radiator(sections = 12): THREE.Group {
  const width = sections * RADIATOR_PITCH;
  const columns = Array.from({ length: sections }, (_, i) => {
    const x = -width / 2 + RADIATOR_PITCH * (i + 0.5);
    return group(x, 0, 0, rbox(0.052, 0.6, 0.15, CAST_IRON, 0, 0.42, 0, 0.024), box(0.03, 0.5, 0.17, '#aaa596', 0, 0.42, 0));
  });
  return group(
    0, 0, 0,
    ...columns,
    ...[-1, 1].flatMap((s) => [box(0.04, 0.12, 0.04, CAST_IRON, s * (width / 2 - 0.03), 0.06, -0.05), box(0.04, 0.12, 0.04, CAST_IRON, s * (width / 2 - 0.03), 0.06, 0.05)]),
    // shut-off valve, supply pipe into the floor and the hissing air vent
    cyl(0.022, 0.022, 0.2, PIPE, width / 2 + 0.07, 0.1, 0, 8),
    turn(cyl(0.022, 0.022, 0.1, PIPE, width / 2 + 0.03, 0.2, 0, 8), 0, 0, Math.PI / 2),
    cyl(0.04, 0.03, 0.05, shiny(DARK), width / 2 + 0.07, 0.25, 0, 8),
    cyl(0.018, 0.012, 0.06, shiny(STEEL), -width / 2 - 0.03, 0.55, 0, 8),
    rbox(width - 0.1, 0.02, 0.2, '#5b3d26', 0, 0.745, 0, 0.008),
  );
}

/** Steam riser: a painted pipe from floor to ceiling with a collar at both ends. */
export const steamRiser = (height: number, radius = 0.04): THREE.Group =>
  group(0, 0, 0, cyl(radius, radius, height, PIPE, 0, height / 2, 0, 10), cyl(radius + 0.025, radius + 0.025, 0.03, PIPE, 0, 0.015, 0, 10), cyl(radius + 0.025, radius + 0.025, 0.03, PIPE, 0, height - 0.015, 0, 10), cyl(radius + 0.012, radius + 0.012, 0.06, '#9d9889', 0, height * 0.62, 0, 10));

/** Horizontal pipe along x, centred on the origin, with couplings and strap hangers up to the ceiling. */
export function pipeRun(length: number, radius: number, paint: string, drop = 0.2): THREE.Group {
  const hangers = Math.max(2, Math.round(length / 2.4));
  return group(
    0, 0, 0,
    turn(cyl(radius, radius, length, paint, 0, 0, 0, 10), 0, 0, Math.PI / 2),
    ...Array.from({ length: hangers }, (_, i) => {
      const x = -length / 2 + (length / hangers) * (i + 0.5);
      return group(x, 0, 0, turn(cyl(radius + 0.012, radius + 0.012, 0.05, paint, 0, 0, 0, 10), 0, 0, Math.PI / 2), box(0.012, drop, 0.012, IRON, 0, drop / 2 + radius, 0));
    }),
  );
}

/** A greasy corner-slice pizza box; `open` shows what is left of the pie. */
export function pizzaBox(open = false): THREE.Group {
  const base = [rbox(0.42, 0.045, 0.42, '#e9e1cf', 0, 0.023, 0, 0.006), box(0.3, 0.002, 0.3, '#c0392b', 0, 0.047, 0), box(0.2, 0.003, 0.06, WHITE, 0, 0.048, 0)];
  if (!open) return group(0, 0, 0, ...base);
  const lid = turn(group(0, 0.045, -0.21, box(0.42, 0.42, 0.008, '#e9e1cf', 0, 0.21, 0)), 0, -0.35);
  const slice = turn(cyl(0.001, 0.15, 0.012, '#e8b44a', 0.05, 0.05, 0.02, 3), 0.6);
  return group(0, 0, 0, rbox(0.42, 0.04, 0.42, '#e9e1cf', 0, 0.02, 0, 0.006), box(0.38, 0.004, 0.38, '#d9c9a8', 0, 0.042, 0), lid, slice, ball(0.018, '#b03a2e', 0.04, 0.06, 0.04), ball(0.018, '#b03a2e', 0.09, 0.06, -0.01));
}

/** Corner-store carrier bag: slumped white plastic with the red print, knotted handles. */
export function bodegaBag(): THREE.Group {
  const body = ball(0.16, WHITE, 0, 0.13, 0);
  body.scale.set(1, 0.85, 0.75);
  return group(0, 0, 0, body, box(0.16, 0.05, 0.004, '#dc2626', 0, 0.15, 0.118), box(0.1, 0.02, 0.004, '#dc2626', 0, 0.1, 0.12), ...[-0.06, 0.06].map((x) => turn(cyl(0.012, 0.03, 0.12, WHITE, x, 0.3, 0, 6), 0, 0, x * 3)));
}

/** Brown paper deli bag, top rolled down. */
export const paperBag = (): THREE.Group =>
  group(0, 0, 0, rbox(0.2, 0.26, 0.13, KRAFT, 0, 0.13, 0, 0.012), rbox(0.21, 0.04, 0.14, '#a47843', 0, 0.27, 0, 0.012));

/** Blue-and-white paper coffee cup with a lid. */
export const deliCup = (): THREE.Group =>
  group(0, 0, 0, cyl(0.042, 0.032, 0.11, '#2f6fc4', 0, 0.055, 0, 12), cyl(0.044, 0.04, 0.03, WHITE, 0, 0.06, 0, 12), cyl(0.046, 0.046, 0.012, WHITE, 0, 0.116, 0, 12));

/** A bagel: squashed ring, `spread` adds the cream-cheese line. */
export function bagel(spread = true): THREE.Group {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.022, 6, 12), mat('#c98b45'));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.022;
  return group(0, 0, 0, ring, ...(spread ? [cyl(0.05, 0.05, 0.006, '#fdf6e3', 0, 0.024, 0, 12)] : []));
}

const wheel = (x: number): THREE.Object3D[] => {
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 6, 22), mat(IRON));
  tyre.position.set(x, 0, 0.03);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 4, 22), shiny(STEEL));
  rim.position.set(x, 0, 0.03);
  return [tyre, rim, ...[0, 1, 2, 3].map((i) => turn(box(0.6, 0.004, 0.004, STEEL, x, 0, 0.03), 0, 0, (i * Math.PI) / 4)), turn(cyl(0.025, 0.025, 0.06, shiny(STEEL), x, 0, 0.03, 8), 0, Math.PI / 2)];
};

/** A fixed-gear bike hung flat on the wall from two hooks. Origin on the wall at the bottom-bracket height. */
export function wallBike(color: string): THREE.Group {
  const tube = (x0: number, y0: number, x1: number, y1: number, t = 0.03): THREE.Mesh =>
    turn(box(Math.hypot(x1 - x0, y1 - y0), t, t, shiny(color), (x0 + x1) / 2, (y0 + y1) / 2, 0.03), 0, 0, Math.atan2(y1 - y0, x1 - x0));
  return group(
    0, 0, 0,
    ...wheel(-0.52),
    ...wheel(0.52),
    tube(-0.52, 0, -0.06, 0.02), tube(-0.06, 0.02, -0.22, 0.48), tube(-0.22, 0.48, 0.36, 0.5), tube(-0.06, 0.02, 0.36, 0.5, 0.036), tube(-0.52, 0, -0.22, 0.48, 0.022), tube(0.36, 0.5, 0.52, 0, 0.026),
    tube(0.36, 0.5, 0.33, 0.62),
    box(0.04, 0.03, 0.42, DARK, 0.31, 0.63, 0.03),
    rbox(0.24, 0.04, 0.12, DARK, -0.25, 0.6, 0.03, 0.015),
    box(0.03, 0.12, 0.03, shiny(STEEL), -0.23, 0.53, 0.03),
    turn(cyl(0.09, 0.09, 0.012, shiny(STEEL), -0.06, 0.02, 0.05, 12), 0, Math.PI / 2),
    box(0.16, 0.02, 0.02, DARK, -0.06, -0.06, 0.07),
    ...[-0.22, 0.36].map((x) => group(x, 0.52, 0, box(0.03, 0.03, 0.1, IRON, 0, 0.03, 0.05), box(0.03, 0.08, 0.02, IRON, 0, 0.02, 0.1))),
  );
}

/** Door-entry buzzer: steel panel, speaker grille, three buttons and a handset on a coiled cord. */
export function intercom(): THREE.Group {
  const label = textPlane('3F 门铃\nBUZZER', 0.16, 0.07, { bg: '#f5f1e6', fg: '#3b2f2a' });
  label.position.set(-0.04, 0.12, 0.034);
  return group(
    0, 0, 0,
    rbox(0.3, 0.38, 0.03, shiny('#b9bdc2'), 0, 0, 0.015, 0.008),
    label,
    ...[-0.05, -0.02, 0.01, 0.04].map((y) => box(0.14, 0.008, 0.004, DARK, -0.04, y, 0.032)),
    ...[0, 1, 2].map((i) => group(-0.09 + i * 0.05, -0.12, 0.03, cyl(0.016, 0.016, 0.012, i === 0 ? shiny('#dc2626') : shiny(DARK), 0, 0, 0.004, 10).rotateX(Math.PI / 2))),
    rbox(0.06, 0.26, 0.05, '#efe9dc', 0.09, 0, 0.055, 0.02),
    cyl(0.006, 0.006, 0.22, DARK, 0.09, -0.24, 0.04, 5),
    ball(0.008, glow('#22c55e'), 0.06, -0.12, 0.034),
  );
}

/** A print in a frame, origin on the wall. */
export function framedPrint(map: THREE.Texture, w: number, h: number, frame = IRON): THREE.Group {
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map }));
  art.position.z = 0.034;
  return group(0, 0, 0, rbox(w + 0.1, h + 0.1, 0.03, frame, 0, 0, 0.015, 0.008), art);
}

/** Neon tube lettering on a dark acrylic back, with the transformer box below. Origin on the wall. */
export function neonSign(text: string, color: string, w: number, h: number): THREE.Group {
  const tubes = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: neonText(text, color, w, h), transparent: true, depthWrite: false }));
  tubes.position.z = 0.05;
  return group(0, 0, 0, rbox(w + 0.06, h + 0.06, 0.02, '#17181c', 0, 0, 0.02, 0.01), tubes, box(0.12, 0.05, 0.04, DARK, w / 2 - 0.1, -h / 2 - 0.05, 0.02), ...[-1, 1].map((s) => cyl(0.008, 0.008, 0.04, shiny(STEEL), s * (w / 2 - 0.06), h / 2 - 0.06, 0.02, 6).rotateX(Math.PI / 2)));
}

/** Faded lettering painted straight onto a wall. Origin on the wall surface. */
export function ghostLettering(lines: readonly string[], w: number, h: number, color?: string): THREE.Mesh {
  const material = new THREE.MeshLambertMaterial({ map: ghostSign(lines, w, h, color), transparent: true, depthWrite: false, opacity: 0.86 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  sign.receiveShadow = true;
  return sign;
}
