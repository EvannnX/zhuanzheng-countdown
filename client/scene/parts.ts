import * as THREE from 'three';
import { ball, box, cyl, disc, glass, glow, group, pick, rbox, shiny, turn } from './kit.ts';
import { screenTexture } from './textures.ts';
import type { ScreenKind } from './textures.ts';

/** Reusable furniture pieces. Local space: origin on the floor, front faces +z. */

export const STEEL = '#aab2bd';
export const DARK = '#1f2937';
export const WHITE = '#f8fafc';
export const WOOD = '#e2ae6b';
export const WALNUT = '#6b4226';
export const BRAND = '#ff7a2f';

const LEAF = ['#2f9e55', '#3fb568', '#237a43'];
const BOOK = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#6d28d9', '#0f766e', '#f8fafc', '#111827'];

/** Place a part (or several) in the world. */
export function at(x: number, z: number, ry: number, ...parts: THREE.Object3D[]): THREE.Group {
  return turn(group(x, 0, z, ...parts), ry);
}

export function screen(w: number, h: number, kind: ScreenKind): THREE.Mesh {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: screenTexture(kind) }));
}

/** Desktop monitor on a stand; `y` is the desk surface height. */
export function monitor(kind: ScreenKind, y = 0.76, size = 0.6): THREE.Group {
  const h = size * 0.6;
  const face = screen(size - 0.03, h - 0.05, kind);
  face.position.set(0, 0.15 + h / 2, 0.018);
  return group(
    0, y, 0,
    rbox(size, h, 0.03, shiny(DARK), 0, 0.14 + h / 2, 0, 0.012),
    face,
    rbox(size * 0.5, h * 0.5, 0.03, shiny('#2b3340'), 0, 0.14 + h / 2, -0.022, 0.012),
    box(0.012, 0.012, 0.004, glow('#60a5fa'), size / 2 - 0.04, 0.15, 0.016),
    turn(box(0.06, 0.2, 0.025, shiny('#374151'), 0, 0.11, -0.05), 0, 0.12),
    rbox(0.26, 0.014, 0.18, shiny('#374151'), 0, 0.007, -0.03, 0.006),
    box(0.006, 0.006, 0.12, DARK, 0.02, 0.006, -0.17),
  );
}

export const keyboardSet = (y = 0.76): THREE.Group =>
  group(
    0, y, 0,
    rbox(0.42, 0.018, 0.14, shiny('#e5e7eb'), 0, 0.01, 0, 0.006),
    box(0.38, 0.004, 0.1, '#9ca3af', 0, 0.021, 0),
    rbox(0.06, 0.025, 0.1, shiny(DARK), 0.32, 0.013, 0, 0.012),
    box(0.22, 0.003, 0.2, '#374151', 0.32, 0.002, 0),
  );

export const mug = (color: string): THREE.Group =>
  group(0, 0, 0, cyl(0.04, 0.035, 0.09, shiny(color), 0, 0.045, 0, 14), cyl(0.033, 0.033, 0.004, '#4b2e1a', 0, 0.086, 0, 14), rbox(0.014, 0.05, 0.03, shiny(color), 0.05, 0.045, 0, 0.006));

export function papers(count: number, seed: number): THREE.Group {
  const sheets = Array.from({ length: count }, (_, i) =>
    turn(box(0.21, 0.004, 0.3, i % 3 === 2 ? '#fde68a' : '#ffffff', ((seed + i) % 3) * 0.008, 0.002 + i * 0.004, 0), ((seed * 7 + i * 13) % 10) * 0.03 - 0.15),
  );
  return group(0, 0, 0, ...sheets);
}

export function laptop(kind: ScreenKind): THREE.Group {
  const lid = group(0, 0.012, -0.11, rbox(0.32, 0.21, 0.01, shiny('#9ca3af'), 0, 0.105, 0, 0.004));
  const face = screen(0.29, 0.18, kind);
  face.position.set(0, 0.105, 0.006);
  lid.add(face);
  lid.rotation.x = -0.3;
  return group(0, 0, 0, rbox(0.32, 0.014, 0.22, shiny('#9ca3af'), 0, 0.007, 0, 0.005), box(0.27, 0.002, 0.11, '#374151', 0, 0.015, -0.03), lid);
}

export function books(count: number, seed: number): THREE.Group {
  let x = 0;
  const spines = Array.from({ length: count }, (_, i) => {
    const w = 0.03 + ((seed + i * 5) % 4) * 0.008;
    const h = 0.2 + ((seed * 3 + i * 7) % 5) * 0.018;
    const book = box(w, h, 0.16, pick(BOOK, seed + i * 3), x + w / 2, h / 2, 0);
    x += w + 0.002;
    return book;
  });
  return group(-x / 2, 0, 0, ...spines);
}

export const cardboardBox = (w: number, h: number, d: number): THREE.Group =>
  group(0, 0, 0, rbox(w, h, d, '#c99657', 0, h / 2, 0, 0.01), box(w + 0.004, 0.004, 0.05, '#e9d7a8', 0, h, 0), box(0.05, h * 0.5, d + 0.004, '#e9d7a8', 0, h * 0.75, 0));

export type PlantStyle = 'bush' | 'tree' | 'leafy';

export function plant(style: PlantStyle, scale = 1, pot = '#e7e5e4'): THREE.Group {
  const base = [cyl(0.2, 0.15, 0.36, pot, 0, 0.18, 0, 16), cyl(0.18, 0.18, 0.02, '#3f2a1d', 0, 0.35, 0, 16)];
  const foliage: THREE.Object3D[] =
    style === 'tree'
      ? [cyl(0.03, 0.04, 0.9, '#7c5a3c', 0, 0.8, 0, 8), ball(0.34, LEAF[0], 0, 1.45, 0), ball(0.26, LEAF[1], 0.2, 1.25, 0.1), ball(0.24, LEAF[2], -0.18, 1.3, -0.08), ball(0.2, LEAF[1], 0.02, 1.72, 0.04)]
      : style === 'leafy'
        ? Array.from({ length: 9 }, (_, i) => {
            const blade = ball(0.2, LEAF[i % 3], 0, 0.36, 0);
            blade.scale.set(0.42, 1.9 - (i % 3) * 0.35, 0.1);
            const lean = group(0, 0.34, 0, blade);
            lean.rotation.z = 0.22 + (i % 4) * 0.13;
            return turn(group(0, 0, 0, lean), (i / 9) * Math.PI * 2 + (i % 2) * 0.3);
          })
        : [ball(0.28, LEAF[0], 0, 0.62, 0), ball(0.2, LEAF[1], 0.17, 0.52, 0.08), ball(0.2, LEAF[2], -0.15, 0.55, -0.1), ball(0.17, LEAF[1], 0.02, 0.84, 0.03)];
  const g = group(0, 0, 0, ...base, ...foliage);
  g.scale.setScalar(scale);
  return g;
}

/** Small desk plant in a mug-sized pot; `y` is the surface it stands on. */
export const deskPlant = (y: number): THREE.Group =>
  group(0, y, 0, cyl(0.05, 0.04, 0.08, '#fef3c7', 0, 0.04, 0, 12), ball(0.07, LEAF[1], 0, 0.13, 0), ball(0.05, LEAF[0], 0.04, 0.17, 0.02));

export const bin = (color = '#6b7280'): THREE.Group =>
  group(0, 0, 0, cyl(0.15, 0.12, 0.32, color, 0, 0.16, 0, 14), cyl(0.13, 0.13, 0.01, DARK, 0, 0.3, 0, 14));

const CHAIR_SEAT_Y = 0.47;

/** Five-star base with twin-wheel casters and a gas lift under its telescoping shroud. */
function chairBase(): THREE.Object3D[] {
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const arm = group(
      0, 0, 0,
      turn(rbox(0.045, 0.03, 0.31, shiny(DARK), 0, 0.085, 0.16, 0.012), 0, 0.12),
      cyl(0.012, 0.012, 0.05, shiny(STEEL), 0, 0.055, 0.3, 6),
      ...[-0.018, 0.018].map((x) => turn(cyl(0.028, 0.028, 0.016, DARK, x, 0.028, 0.3, 10), 0, 0, Math.PI / 2)),
    );
    return turn(arm, (i / 5) * Math.PI * 2);
  });
  return [...spokes, cyl(0.05, 0.06, 0.06, shiny(DARK), 0, 0.11, 0, 12), cyl(0.032, 0.032, 0.14, DARK, 0, 0.2, 0, 10), cyl(0.022, 0.022, 0.16, shiny(STEEL), 0, 0.33, 0, 10)];
}

/** Task chair: mesh back in a frame with a lumbar pad, height-adjustable T-arms and a tilt lever. */
export function officeChair(color: string): THREE.Group {
  const back = turn(
    group(
      0, CHAIR_SEAT_Y + 0.1, -0.23,
      ...[-0.21, 0.21].map((x) => rbox(0.035, 0.56, 0.035, shiny(DARK), x, 0.3, 0, 0.012)),
      rbox(0.455, 0.035, 0.035, shiny(DARK), 0, 0.58, 0, 0.012),
      rbox(0.455, 0.035, 0.035, shiny(DARK), 0, 0.03, 0, 0.012),
      box(0.39, 0.52, 0.012, color, 0, 0.305, 0),
      rbox(0.3, 0.1, 0.04, DARK, 0, 0.17, 0.014, 0.018),
      rbox(0.06, 0.34, 0.03, shiny(DARK), 0, 0.08, -0.03, 0.012),
    ),
    0, -0.12,
  );
  const arm = (x: number): THREE.Object3D[] => [box(0.03, 0.2, 0.04, shiny(DARK), x, CHAIR_SEAT_Y + 0.09, 0.02), rbox(0.07, 0.03, 0.26, DARK, x, CHAIR_SEAT_Y + 0.2, 0.02, 0.012), box(0.06, 0.03, 0.06, shiny(DARK), x * 0.86, CHAIR_SEAT_Y - 0.035, 0.02)];
  return group(
    0, 0, 0,
    ...chairBase(),
    rbox(0.3, 0.05, 0.3, shiny(DARK), 0, CHAIR_SEAT_Y - 0.055, 0, 0.02),
    rbox(0.46, 0.07, 0.45, color, 0, CHAIR_SEAT_Y, 0, 0.032),
    rbox(0.44, 0.03, 0.06, color, 0, CHAIR_SEAT_Y - 0.012, 0.215, 0.014),
    back,
    rbox(0.06, 0.03, 0.16, shiny(DARK), 0, CHAIR_SEAT_Y - 0.04, -0.2, 0.012),
    ...arm(-0.265),
    ...arm(0.265),
    turn(cyl(0.008, 0.008, 0.14, shiny(DARK), 0.2, CHAIR_SEAT_Y - 0.07, 0.06, 6), 0, 0, Math.PI / 2 - 0.2),
  );
}

export function sideChair(color: string, legs = STEEL): THREE.Group {
  const leg = (x: number, z: number): THREE.Mesh => cyl(0.015, 0.015, 0.44, shiny(legs), x, 0.22, z, 8);
  return group(0, 0, 0, leg(-0.18, -0.18), leg(0.18, -0.18), leg(-0.18, 0.18), leg(0.18, 0.18), rbox(0.42, 0.05, 0.42, color, 0, 0.46, 0, 0.02), turn(rbox(0.4, 0.38, 0.04, color, 0, 0.74, -0.2, 0.02), 0, -0.1));
}

export const stool = (color: string, height = 0.7): THREE.Group =>
  group(0, 0, 0, cyl(0.17, 0.17, 0.05, color, 0, height, 0, 16), cyl(0.02, 0.02, height, shiny(STEEL), 0, height / 2, 0, 8), cyl(0.18, 0.2, 0.02, shiny(STEEL), 0, 0.01, 0, 16), cyl(0.13, 0.13, 0.015, shiny(STEEL), 0, height * 0.4, 0, 16));

export const deskLamp = (color: string, y: number): THREE.Group =>
  group(0, y, 0, cyl(0.07, 0.08, 0.02, shiny(color), 0, 0.01, 0, 14), turn(cyl(0.01, 0.01, 0.34, shiny(STEEL), 0.05, 0.17, 0, 8), 0, 0, -0.3), turn(cyl(0.04, 0.08, 0.1, shiny(color), 0.02, 0.35, 0, 14), 0, 0, 0.5), disc(0.03, glow('#fff7d6'), 0.045, 0.31, 0));

export function floorLamp(): THREE.Group {
  return group(0, 0, 0, cyl(0.16, 0.18, 0.03, shiny(DARK), 0, 0.015, 0, 16), cyl(0.012, 0.012, 1.5, shiny(STEEL), 0, 0.76, 0, 8), cyl(0.14, 0.2, 0.28, '#fef3c7', 0, 1.62, 0, 16), cyl(0.1, 0.1, 0.02, glow('#fff3c4'), 0, 1.5, 0, 16));
}

export function waterDispenser(): THREE.Group {
  return group(
    0, 0, 0,
    rbox(0.34, 0.95, 0.34, WHITE, 0, 0.475, 0, 0.03),
    cyl(0.13, 0.13, 0.34, glass('#7cc7f2', 0.55), 0, 1.14, 0, 16),
    cyl(0.05, 0.13, 0.06, glass('#7cc7f2', 0.55), 0, 1.33, 0, 16),
    box(0.26, 0.2, 0.02, '#dbeafe', 0, 0.74, 0.17),
    box(0.03, 0.04, 0.04, '#ef4444', -0.06, 0.78, 0.19),
    box(0.03, 0.04, 0.04, '#3b82f6', 0.06, 0.78, 0.19),
  );
}

/** Wall-mounted pieces: origin on the wall surface, facing +z. */
export const wallClock = (): THREE.Group =>
  group(0, 0, 0, turn(cyl(0.17, 0.17, 0.03, shiny(DARK), 0, 0, 0.015, 24), 0, Math.PI / 2), turn(cyl(0.15, 0.15, 0.032, WHITE, 0, 0, 0.016, 24), 0, Math.PI / 2), turn(box(0.012, 0.1, 0.004, DARK, 0.02, 0.035, 0.034), 0, 0, -0.5), box(0.008, 0.13, 0.004, DARK, 0, 0.06, 0.034), ball(0.012, '#ef4444', 0, 0, 0.034));

export const exitSign = (): THREE.Group =>
  group(0, 0, 0, rbox(0.42, 0.16, 0.04, glow('#16a34a'), 0, 0, 0.02, 0.01), box(0.14, 0.04, 0.005, glow('#ffffff'), -0.06, 0, 0.042), box(0.06, 0.1, 0.005, glow('#ffffff'), 0.12, 0, 0.042));

export const extinguisher = (): THREE.Group =>
  group(0, 0, 0, rbox(0.32, 0.62, 0.16, shiny('#b91c1c'), 0, 0.5, 0.08, 0.02), box(0.26, 0.5, 0.01, glass('#ffffff', 0.35), 0, 0.5, 0.165), cyl(0.06, 0.06, 0.34, shiny('#ef4444'), 0, 0.44, 0.08, 12), cyl(0.02, 0.03, 0.06, DARK, 0, 0.64, 0.08, 8));

export function pictureFrame(w: number, h: number, art: string, frame = DARK): THREE.Group {
  return group(0, 0, 0, rbox(w, h, 0.03, frame, 0, 0, 0.015, 0.008), box(w - 0.08, h - 0.08, 0.004, WHITE, 0, 0, 0.032), box(w - 0.2, h - 0.2, 0.004, art, 0, 0, 0.035));
}

/** Cork board with a scatter of coloured notes. */
export function noticeBoard(w: number, h: number, seed: number): THREE.Group {
  const notes = Array.from({ length: Math.floor(w * 5) }, (_, i) => {
    const nx = -w / 2 + 0.15 + ((i * 0.37 + seed * 0.11) % (w - 0.3));
    const ny = -h / 2 + 0.14 + ((i * 0.23 + seed * 0.07) % (h - 0.28));
    return turn(box(0.14, 0.14, 0.004, pick(['#fde047', '#fca5a5', '#86efac', '#93c5fd', '#ffffff', '#f9a8d4'], seed + i), nx, ny, 0.034), 0, 0, ((i * 7) % 5) * 0.05 - 0.1);
  });
  return group(0, 0, 0, rbox(w, h, 0.03, '#8a5a36', 0, 0, 0.015, 0.008), box(w - 0.06, h - 0.06, 0.004, '#d6a56c', 0, 0, 0.031), ...notes);
}

/** A flat rug with a contrasting border. */
export const rug = (w: number, d: number, color: string, border: string): THREE.Group =>
  group(0, 0, 0, rbox(w, 0.016, d, border, 0, 0.008, 0, 0.006), box(w - 0.24, 0.004, d - 0.24, color, 0, 0.018, 0));

export const ceilingProjector = (): THREE.Group =>
  group(0, 0, 0, cyl(0.02, 0.02, 0.4, shiny(STEEL), 0, 2.8, 0, 8), rbox(0.36, 0.12, 0.3, WHITE, 0, 2.56, 0, 0.03), cyl(0.05, 0.05, 0.04, shiny(DARK), 0.08, 2.56, 0.16, 12));
