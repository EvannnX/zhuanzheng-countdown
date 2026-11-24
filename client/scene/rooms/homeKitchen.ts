import type * as THREE from 'three';
import { ball, box, cyl, glow, group, rbox, shiny, turn } from '../kit.ts';
import { DARK, STEEL, WHITE, mug } from '../parts.ts';
import type { Builder } from './types.ts';

const CABINET = '#f5f0e6';
const CABINET_DOOR = '#e9dfcc';
const STONE = '#44403c';
const ENAMEL = '#f1f1ec';
const FRIDGE_W = 0.8;
const COUNTER_TOP = 0.92;
const NOTES = ['#fde047', '#f472b6', '#60a5fa', '#4ade80'];

/** Fridge at the -x end, front at +z. */
function fridge(x: number, d: number): THREE.Object3D[] {
  const face = d / 2 - 0.12;
  return [
    rbox(FRIDGE_W, 1.85, d - 0.16, shiny('#e8ecef'), x, 0.945, -0.04, 0.03),
    box(FRIDGE_W - 0.02, 0.012, 0.01, '#94a3b8', x, 1.25, face + 0.004),
    box(0.03, 0.4, 0.04, shiny(STEEL), x + 0.3, 1.52, face + 0.02),
    box(0.03, 0.5, 0.04, shiny(STEEL), x + 0.3, 0.9, face + 0.02),
    ...NOTES.map((c, i) => box(0.09, 0.09, 0.006, c, x - 0.25 + (i % 2) * 0.16, 1.5 + Math.floor(i / 2) * 0.14, face + 0.003)),
    group(x - 0.1, 1.87, -0.05, rbox(0.3, 0.16, 0.22, '#fde68a', 0, 0.08, 0, 0.02), rbox(0.2, 0.22, 0.14, '#f87171', 0.28, 0.11, 0.02, 0.02)),
  ];
}

/** Base cabinets with a stone top spanning x0..x1. */
function baseUnits(x0: number, x1: number, d: number): THREE.Object3D[] {
  const length = x1 - x0;
  const mid = (x0 + x1) / 2;
  const doors = 6;
  const step = length / doors;
  return [
    box(length - 0.1, 0.06, d - 0.4, '#57534e', mid, 0.03, -0.12),
    rbox(length, 0.82, d - 0.3, CABINET, mid, 0.47, -0.12, 0.012),
    ...Array.from({ length: doors }, (_, i) => [box(step - 0.03, 0.66, 0.012, CABINET_DOOR, x0 + step * (i + 0.5), 0.47, 0.236), box(0.12, 0.016, 0.02, shiny(STEEL), x0 + step * (i + 0.5), 0.74, 0.25)]).flat(),
    rbox(length + 0.04, 0.04, d - 0.16, STONE, mid, COUNTER_TOP - 0.02, -0.13, 0.012),
    box(length, 0.7, 0.01, shiny('#f0ead8'), mid, 1.28, -d / 2 - 0.04),
  ];
}

function appliances(): THREE.Object3D[] {
  const y = COUNTER_TOP;
  return [
    // microwave
    rbox(0.46, 0.28, 0.34, shiny('#e5e7eb'), -0.9, y + 0.14, -0.15, 0.02),
    box(0.3, 0.2, 0.006, '#111827', -0.95, y + 0.14, 0.022),
    box(0.06, 0.006, 0.004, glow('#4ade80'), -0.73, y + 0.2, 0.022),
    // old enamel gas range: oven door, four knobs, cast-iron grates and a backguard
    rbox(0.62, 0.84, 0.03, shiny(ENAMEL), 0.3, 0.47, 0.255, 0.012),
    box(0.4, 0.26, 0.006, '#1f2937', 0.3, 0.4, 0.272),
    box(0.46, 0.022, 0.03, shiny(STEEL), 0.3, 0.6, 0.285),
    ...[0.09, 0.23, 0.37, 0.51].map((x) => cyl(0.024, 0.024, 0.03, DARK, x, 0.8, 0.28, 10).rotateX(Math.PI / 2)),
    box(0.62, 0.014, 0.42, shiny(ENAMEL), 0.3, y + 0.007, -0.08),
    box(0.62, 0.16, 0.03, shiny(ENAMEL), 0.3, y + 0.08, -0.31),
    ...[0.16, 0.44].flatMap((x) => [box(0.2, 0.012, 0.02, DARK, x, y + 0.02, -0.08), box(0.02, 0.012, 0.2, DARK, x, y + 0.02, -0.08), cyl(0.04, 0.04, 0.008, '#57534e', x, y + 0.018, -0.08, 12)]),
    cyl(0.12, 0.11, 0.12, shiny('#dc2626'), 0.16, y + 0.086, -0.08, 16),
    cyl(0.125, 0.125, 0.015, shiny('#b91c1c'), 0.16, y + 0.153, -0.08, 16),
    ball(0.02, DARK, 0.16, y + 0.175, -0.08),
    cyl(0.11, 0.09, 0.04, shiny(DARK), 0.44, y + 0.046, -0.08, 16),
    box(0.03, 0.02, 0.2, DARK, 0.44, y + 0.055, 0.1),
    // kettle, sink, rice cooker
    group(0.95, y, -0.1, cyl(0.07, 0.085, 0.18, shiny('#f8fafc'), 0, 0.09, 0, 14), cyl(0.05, 0.07, 0.03, shiny(DARK), 0, 0.195, 0, 14), box(0.02, 0.12, 0.03, DARK, 0.1, 0.1, 0)),
    box(0.5, 0.008, 0.36, shiny('#9ca3af'), 1.5, y + 0.004, -0.08),
    box(0.42, 0.004, 0.28, '#6b7280', 1.5, y + 0.009, -0.08),
    cyl(0.014, 0.014, 0.22, shiny(STEEL), 1.5, y + 0.11, -0.32, 8),
    box(0.02, 0.02, 0.16, shiny(STEEL), 1.5, y + 0.21, -0.25),
    group(2, y, -0.1, cyl(0.13, 0.14, 0.18, WHITE, 0, 0.09, 0, 16), cyl(0.12, 0.13, 0.04, shiny('#e5e7eb'), 0, 0.2, 0, 16), box(0.06, 0.03, 0.01, glow('#f97316'), 0, 0.08, 0.137)),
    group(1.15, y, 0.12, mug('#ef4444')),
    group(-0.45, y, -0.05, rbox(0.26, 0.11, 0.13, '#d6a56c', 0, 0.055, 0, 0.04), rbox(0.2, 0.012, 0.26, WHITE, 0.3, 0.006, 0, 0.004), ball(0.04, '#fde68a', 0.3, 0.045, 0)),
  ];
}

function wallUnits(d: number): THREE.Object3D[] {
  const z = -d / 2 + 0.13;
  const unit = (x0: number, x1: number): THREE.Object3D[] => {
    const doors = Math.round((x1 - x0) / 0.6);
    const step = (x1 - x0) / doors;
    return [
      rbox(x1 - x0, 0.6, 0.34, CABINET, (x0 + x1) / 2, 1.96, z, 0.012),
      ...Array.from({ length: doors }, (_, i) => box(step - 0.03, 0.54, 0.012, CABINET_DOOR, x0 + step * (i + 0.5), 1.96, z + 0.176)),
      box(x1 - x0 - 0.1, 0.015, 0.03, glow('#fff3c4'), (x0 + x1) / 2, 1.652, z + 0.06),
    ];
  };
  return [
    ...unit(-1.3, -0.04),
    ...unit(0.64, 2.2),
    box(0.62, 0.1, 0.46, shiny('#cbd5e1'), 0.3, 1.71, z + 0.07),
    box(0.24, 0.46, 0.24, shiny('#cbd5e1'), 0.3, 1.99, z - 0.03),
    ...[-0.1, 0.02, 0.14].map((x, i) => turn(cyl(0.008, 0.008, 0.24, shiny(STEEL), x + 0.5, 1.5 - i * 0.01, -d / 2 - 0.01, 6), 0)),
  ];
}

/** The flat's kitchen run: fridge, base and wall cabinets, hob, sink. Wall at -z. */
export const kitchenette: Builder = (w, d) => {
  const fridgeX = -w / 2 + FRIDGE_W / 2 + 0.05;
  return [...fridge(fridgeX, d), ...baseUnits(-w / 2 + FRIDGE_W + 0.1, w / 2, d), ...appliances(), ...wallUnits(d)];
};
