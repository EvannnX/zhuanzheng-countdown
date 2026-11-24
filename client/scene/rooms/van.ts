import type * as THREE from 'three';
import { DESK_COUNT, areaById, vanSeat } from '../../../shared/world.ts';
import { box, cyl, glass, glow, rbox, shiny, textPlane, turn } from '../kit.ts';
import type { RoomArt } from './types.ts';

const V = areaById('van');
const W = V.x1 - V.x0;
const D = V.z1 - V.z0;
const CX = (V.x0 + V.x1) / 2;
const CZ = (V.z0 + V.z1) / 2;
const SHELL = '#e5e7eb';
const TRIM = '#374151';
const SEAT = '#1e3a8a';
const BRAND = '#ff7a2f';
/** Underside of the van roof: the cutscene camera has to stay below it. */
export const VAN_ROOF = 1.82;
const SILL = 0.95;
const HEAD = 1.6;
const PILLAR_ZS = [V.z0 + 0.06, V.z0 + 1.6, V.z0 + 3.3, V.z1 - 0.06];

function seat(index: number): THREE.Object3D[] {
  const s = vanSeat(index);
  return [
    rbox(0.5, 0.14, 0.5, SEAT, s.x, 0.39, s.z + 0.03, 0.04),
    turn(rbox(0.5, 0.62, 0.1, SEAT, s.x, 0.8, s.z + 0.33, 0.04), 0, 0.1),
    rbox(0.26, 0.18, 0.08, TRIM, s.x, 1.2, s.z + 0.37, 0.03),
    box(0.42, 0.32, 0.4, TRIM, s.x, 0.16, s.z + 0.05),
  ];
}

function sides(): THREE.Object3D[] {
  return [V.x0 + 0.03, V.x1 - 0.03].flatMap((x, i) => {
    const inward = i === 0 ? 1 : -1;
    return [
      box(0.06, SILL, D, SHELL, x, SILL / 2, CZ),
      box(0.012, 0.12, D, BRAND, x + inward * 0.036, 0.7, CZ),
      box(0.06, VAN_ROOF - HEAD, D, SHELL, x, (VAN_ROOF + HEAD) / 2, CZ),
      box(0.02, HEAD - SILL, D, glass('#1e293b', 0.3), x, (SILL + HEAD) / 2, CZ),
      ...PILLAR_ZS.map((z) => box(0.08, HEAD - SILL, 0.12, TRIM, x, (SILL + HEAD) / 2, z)),
    ];
  });
}

/** Dashboard, wheel, sat-nav and the windscreen the whole van stares through. */
function cockpit(): THREE.Object3D[] {
  const driver = vanSeat(0);
  const nav = turn(textPlane('导航 → 甲方仓库\n前方 200 米 掉头', 0.42, 0.24, { bg: '#0f172a', fg: '#22d3ee' }), 0, -0.35);
  nav.position.set(CX, 1.13, V.z0 + 0.5);
  const tag = textPlane('外派专线 · 车费从 KPI 里扣', 1.3, 0.14, { bg: BRAND, fg: '#ffffff' });
  tag.position.set(CX, VAN_ROOF - 0.12, V.z0 + 0.09);
  return [
    rbox(W - 0.1, 0.4, 0.5, '#111827', CX, 0.8, V.z0 + 0.3, 0.06),
    box(W - 0.1, 0.6, 0.3, TRIM, CX, 0.3, V.z0 + 0.2),
    box(W - 0.2, VAN_ROOF - 0.28 - 1, 0.02, glass('#bfe3f5', 0.18), CX, (VAN_ROOF - 0.28 + 1) / 2, V.z0 + 0.03),
    box(W, 0.28, 0.06, SHELL, CX, VAN_ROOF - 0.14, V.z0 + 0.03),
    ...[V.x0 + 0.08, V.x1 - 0.08].map((x) => box(0.12, VAN_ROOF - 1, 0.1, TRIM, x, (VAN_ROOF + 1) / 2, V.z0 + 0.05)),
    turn(cyl(0.19, 0.19, 0.035, shiny('#1f2937'), driver.x, 1.05, V.z0 + 0.62, 18), 0, Math.PI / 2 - 0.45),
    turn(cyl(0.025, 0.025, 0.3, TRIM, driver.x, 0.98, V.z0 + 0.5, 8), 0, Math.PI / 2 - 0.45),
    box(0.46, 0.28, 0.03, '#1f2937', CX, 1.13, V.z0 + 0.49),
    nav,
    box(0.3, 0.1, 0.03, TRIM, CX, VAN_ROOF - 0.34, V.z0 + 0.3),
    tag,
  ];
}

function vanDecor(): THREE.Object3D[] {
  return [
    ...sides(),
    ...cockpit(),
    ...Array.from({ length: DESK_COUNT }, (_, i) => seat(i)).flat(),
    // rear wall with a small window, roof with a strip light
    box(W, SILL, 0.06, SHELL, CX, SILL / 2, V.z1 - 0.03),
    box(W, VAN_ROOF - HEAD, 0.06, SHELL, CX, (VAN_ROOF + HEAD) / 2, V.z1 - 0.03),
    box(W - 0.3, HEAD - SILL, 0.02, glass('#1e293b', 0.35), CX, (SILL + HEAD) / 2, V.z1 - 0.03),
    box(W + 0.1, 0.1, D + 0.1, '#f1f5f9', CX, VAN_ROOF + 0.05, CZ),
    box(0.16, 0.012, D - 1.6, glow('#fbfdf6'), CX, VAN_ROOF - 0.006, CZ + 0.4),
    // the road it drives on (the lane paint and passing blocks are animated in commuteFx)
    box(60, 0.02, 120, '#3a3d42', CX, -0.02, CZ - 20),
  ];
}

export const van: RoomArt = { builders: {}, decor: vanDecor };
