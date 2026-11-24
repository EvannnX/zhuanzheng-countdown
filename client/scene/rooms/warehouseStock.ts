import type * as THREE from 'three';
import { box, cyl, glass, group, rbox, shiny, turn } from '../kit.ts';
import { WHITE, cardboardBox } from '../parts.ts';

/** Something strapped to a pallet, at most `maxH` tall. Origin on the pallet deck. */
export function palletLoad(seed: number, maxH: number): THREE.Object3D[] {
  const h = maxH * (0.72 + (seed % 3) * 0.14);
  switch (seed % 4) {
    case 0:
      return [rbox(1.08, h, 0.9, '#c99657', 0, h / 2, 0, 0.012), box(1.085, 0.03, 0.905, '#e9d7a8', 0, h * 0.5, 0), box(1.1, h * 0.94, 0.92, glass('#dbeafe', 0.2), 0, h * 0.48, 0), box(0.22, 0.14, 0.004, WHITE, 0.2, h * 0.6, 0.463)];
    case 1:
      return [-1, 1].flatMap((sx) => [-1, 1].map((sz) => group(sx * 0.28, 0, sz * 0.23, cardboardBox(0.52, h * (0.6 + ((seed + sx + sz * 2 + 6) % 3) * 0.2), 0.42))));
    case 2:
      return [-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => [cyl(0.24, 0.24, Math.min(h, 0.62), shiny('#2563eb'), sx * 0.27, Math.min(h, 0.62) / 2, sz * 0.24, 14), cyl(0.245, 0.245, 0.03, '#1e3a8a', sx * 0.27, Math.min(h, 0.62) * 0.66, sz * 0.24, 14)]));
    default:
      return Array.from({ length: Math.max(2, Math.floor(h / 0.14)) }, (_, i) => turn(group(0, i * 0.14, 0, rbox(0.54, 0.13, 0.84, '#d9c9a3', -0.28, 0.07, 0, 0.05), rbox(0.54, 0.13, 0.84, '#cdbb91', 0.28, 0.07, 0, 0.05)), i % 2 === 0 ? 0 : Math.PI / 2 - 1.5));
  }
}
