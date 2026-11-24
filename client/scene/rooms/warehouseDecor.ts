import type * as THREE from 'three';
import { LANES } from '../../../shared/hazards.ts';
import { BAY_XS, areaById } from '../../../shared/world.ts';
import { STAFF_LOOKS, makeCharacter } from '../characters.ts';
import { box, cyl, glass, glow, group, rbox, shiny, textPlane, turn } from '../kit.ts';
import { PALLET_HEIGHT, domePendant, pallet, roofTruss } from '../loftParts.ts';
import { masonry, tiledBox } from '../masonry.ts';
import { ghostLettering } from '../nycParts.ts';
import { DARK, STEEL, WHITE, at, cardboardBox, exitSign, extinguisher, floorLamp, mug, noticeBoard, plant, rug, waterDispenser } from '../parts.ts';
import { hang, poster } from '../shell.ts';
import { palletLoad } from './warehouseStock.ts';
import { warehouseOutside } from './warehouseOutside.ts';

const AREA = areaById('warehouse');
const MID_X = (AREA.x0 + AREA.x1) / 2;
const MID_Z = (AREA.z0 + AREA.z1) / 2;
const LANE_ZS = LANES.filter((l) => l.area === 'warehouse').map((l) => l.z);
const HAZARD = '#facc15';
const TIMBER = '#6b5340';
const STONE = '#cfc6b4';
/** Trusses sit in the gaps between the rack runs, so the racking can stand full height. */
const TRUSS_XS = [304, 308, 316, 324, 332, 336];
const TRUSS_TOP = 2.95;
const TRUSS_DEPTH = 0.42;
const JOIST_PITCH = 2.4;
const PIER_DEPTH = 0.12;
const LIFT = { x: 336.3, width: 2.6, height: 2.45 };
const PAINT_GAP = 0.106;

/** Steel trusses on brick piers, timber joists over them and a few rooflights. */
function structure(): THREE.Object3D[] {
  const span = AREA.z1 - AREA.z0 - 0.3;
  const pier = (x: number, z: number): THREE.Object3D[] => [
    tiledBox(0.5, TRUSS_TOP - TRUSS_DEPTH - 0.1, PIER_DEPTH, masonry('brownBrick'), x, (TRUSS_TOP - TRUSS_DEPTH - 0.1) / 2, z),
    box(0.58, 0.1, PIER_DEPTH + 0.06, STONE, x, TRUSS_TOP - TRUSS_DEPTH - 0.05, z),
  ];
  const north = AREA.z0 + 0.1 + PIER_DEPTH / 2;
  const south = AREA.z1 - 0.1 - PIER_DEPTH / 2;
  return [
    ...TRUSS_XS.map((x) => turn(group(x, TRUSS_TOP, MID_Z, roofTruss(span, TRUSS_DEPTH)), Math.PI / 2)),
    ...Array.from({ length: Math.floor((AREA.z1 - AREA.z0 - 1.6) / JOIST_PITCH) + 1 }, (_, i) => box(AREA.x1 - AREA.x0 - 0.3, 0.07, 0.09, TIMBER, MID_X, TRUSS_TOP - 0.005, AREA.z0 + 0.8 + i * JOIST_PITCH)),
    ...TRUSS_XS.flatMap((x) => pier(x, south)),
    // the north wall keeps its painted sign clear: piers only outside the lettering and the lift
    ...[304, 308, 332].flatMap((x) => pier(x, north)),
    ...[316, 324].map((x) => box(0.5, 0.16, 0.2, STONE, x, TRUSS_TOP - TRUSS_DEPTH - 0.08, AREA.z0 + 0.2)),
    ...[312, 320, 328].flatMap((x) => [610.4, 621.6].map((z) => box(1.5, 0.012, 1.9, glow('#eef6ff'), x, 2.966, z))),
  ];
}

function lights(): THREE.Object3D[] {
  return LANE_ZS.flatMap((z) => Array.from({ length: 6 }, (_, i) => group(305 + i * 6, 2.5, z, domePendant(0.22))));
}

/** Old cage lift on the north wall: hazard jambs, a half-drawn scissor gate and the call station. */
function freightLift(): THREE.Group {
  const { width, height } = LIFT;
  const gateTo = 0.35;
  const bars = Array.from({ length: 10 }, (_, i) => -width / 2 + 0.14 + i * ((gateTo + width / 2 - 0.14) / 9));
  const pitch = bars[1] - bars[0];
  const cross = Math.hypot(pitch, 0.5);
  const sign = textPlane('FREIGHT 货梯 · 限载 2000 KG', 2.3, 0.2, { bg: '#18181b', fg: HAZARD });
  sign.position.set(0, height + 0.13, 0.098);
  return group(
    0, 0, 0,
    box(width, height, 0.02, '#141518', 0, height / 2, 0.012),
    box(width - gateTo - width / 2 - 0.1, height - 0.2, 0.01, TIMBER, (gateTo + width / 2) / 2 + 0.03, height / 2 - 0.05, 0.03),
    ...[-1, 1].flatMap((s) => Array.from({ length: 8 }, (_, i) => box(0.16, height / 8, 0.07, i % 2 === 0 ? HAZARD : '#18181b', s * (width / 2 + 0.08), (height / 8) * (i + 0.5), 0.035))),
    box(width + 0.36, 0.26, 0.09, '#3b3f45', 0, height + 0.13, 0.045),
    sign,
    ...bars.map((x) => box(0.025, height - 0.08, 0.025, shiny(DARK), x, height / 2, 0.07)),
    ...bars.slice(0, -1).flatMap((x) => [0.5, 1.2, 1.9].flatMap((y) => [-1, 1].map((s) => turn(box(cross, 0.018, 0.012, shiny(DARK), x + pitch / 2, y, 0.07), 0, 0, s * Math.atan2(0.5, pitch))))),
    box(width, 0.012, 0.5, shiny('#6b7078'), 0, 0.006, 0.25),
    // call station
    rbox(0.16, 0.32, 0.06, shiny(STEEL), width / 2 + 0.36, 1.25, 0.03, 0.01),
    ...[0.07, -0.05].map((dy, i) => cyl(0.03, 0.03, 0.02, glow(i === 0 ? '#f59e0b' : '#e5e7eb'), width / 2 + 0.36, 1.25 + dy, 0.07, 10).rotateX(Math.PI / 2)),
  );
}

/** Inside of each dock: door number, guard posts either side of the lane and floor hatching. */
function docks(): THREE.Object3D[] {
  return LANE_ZS.flatMap((z, i) =>
    [AREA.x0, AREA.x1].flatMap((x, end) => {
      const side = end === 0 ? 'w' : 'e';
      const inward = end === 0 ? 1 : -1;
      return [
        hang(textPlane(`DOCK ${i * 2 + end + 1} · 叉车出入`, 1.7, 0.16, { bg: '#18181b', fg: HAZARD }), side, x, z, 2.62, 0.296),
        ...[-1.55, 1.55].map((o) => group(x + inward * 0.5, 0, z + o, cyl(0.07, 0.07, 1, shiny(HAZARD), 0, 0.5, 0, 10), cyl(0.075, 0.075, 0.12, DARK, 0, 0.72, 0, 10), cyl(0.1, 0.1, 0.02, DARK, 0, 0.01, 0, 10))),
        ...[-1.1, 1.1].map((o) => box(1.6, 0.006, 0.1, HAZARD, x + inward * 1, 0.004, z + o)),
      ];
    }),
  );
}

function lettering(): THREE.Object3D[] {
  return [
    hang(ghostLettering(['WHALE JUMP FREIGHT & STORAGE CO.'], 14.6, 0.95), 'n', AREA.z0, 320, 2.2, PAINT_GAP),
    hang(ghostLettering(['鲸跃物流 · 布鲁克林滨水仓   EST. 1924   BROOKLYN, N.Y.'], 11, 0.36), 'n', AREA.z0, 320, 1.56, PAINT_GAP),
    hang(ghostLettering(['NO SMOKING', '严 禁 烟 火'], 3.6, 1.1), 'w', AREA.x0, 615.65, 1.9, PAINT_GAP),
    hang(ghostLettering(['PIER 12'], 3.4, 1), 'e', AREA.x1, 602.3, 2, PAINT_GAP),
  ];
}

/** Pallet stacks parked along the walls. */
function staging(): THREE.Object3D[] {
  const spots: readonly (readonly [number, number])[] = [[301.2, 614.2], [301.2, 621.2], [306.5, 623], [339, 602.4], [339, 613.6], [333.4, 602.6]];
  return spots.map(([x, z], i) => at(x, z, (i % 3) * 0.2, pallet(1.2, 1), group(0, PALLET_HEIGHT, 0, ...palletLoad(i + 1, 0.9 + (i % 2) * 0.3))));
}

function clientCorner(): THREE.Object3D[] {
  const client = makeCharacter({ ...STAFF_LOOKS[3], shirt: '#111827', tie: '#f59e0b', scale: 1.08 }, '', 338.5, 621.3, -Math.PI / 2);
  client.sit();
  return [
    client.root,
    at(337.4, 622.6, 0, rbox(0.7, 0.04, 0.5, glass('#bfe3f5', 0.5), 0, 0.4, 0, 0.01), cyl(0.02, 0.02, 0.4, shiny(STEEL), 0, 0.2, 0, 6), group(0, 0.42, 0, mug(WHITE))),
    at(336.2, 621.9, 0, rug(3.4, 3.2, '#7f1d1d', '#d4a82c')),
    at(339.2, 623.2, 0, plant('tree', 0.9, '#1f2937')),
    at(339.3, 617.4, 0, floorLamp()),
  ];
}

/** Hand trucks, the wrap station, the floor scale and loose cartons. */
function kit(): THREE.Object3D[] {
  const handTruck = (x: number, z: number, r: number): THREE.Group =>
    at(x, z, r, turn(group(0, 0.12, -0.05, ...[-0.2, 0.2].map((o) => box(0.03, 1.25, 0.03, shiny('#dc2626'), o, 0.62, 0)), ...[0.3, 0.7, 1.1].map((y) => box(0.4, 0.03, 0.03, shiny('#dc2626'), 0, y, 0)), box(0.46, 0.03, 0.03, DARK, 0, 1.25, 0)), 0, -0.25), box(0.46, 0.02, 0.34, shiny(STEEL), 0, 0.03, 0.14), ...[-0.27, 0.27].map((o) => turn(cyl(0.12, 0.12, 0.06, DARK, o, 0.12, -0.06, 12), 0, Math.PI / 2)));
  return [
    handTruck(304.6, 603.6, 0.4),
    handTruck(333.4, 622.6, -0.5),
    at(334.6, 610.1, 0, rbox(1, 0.08, 1, shiny(STEEL), 0, 0.04, 0, 0.01), box(0.9, 0.006, 0.9, '#4b5563', 0, 0.083, 0), cyl(0.03, 0.03, 1.2, shiny(STEEL), 0.56, 0.6, 0.4, 8), rbox(0.3, 0.2, 0.06, shiny(DARK), 0.56, 1.25, 0.4, 0.02), box(0.22, 0.1, 0.004, glow('#86efac'), 0.56, 1.25, 0.432), group(0, 0.086, 0, cardboardBox(0.6, 0.5, 0.5))),
    at(336.7, 610.6, 0, cyl(0.03, 0.03, 1.5, shiny(STEEL), 0, 0.75, 0, 8), cyl(0.3, 0.32, 0.04, shiny(STEEL), 0, 0.02, 0, 14), cyl(0.16, 0.16, 0.5, glass('#e0f2fe', 0.6), 0, 1.1, 0.2, 14), box(0.03, 0.03, 0.24, shiny(STEEL), 0, 1.1, 0.1)),
    at(304, 622.5, 0.2, cardboardBox(1, 0.7, 0.8), group(0.1, 0.7, 0, cardboardBox(0.7, 0.5, 0.6))),
    at(306.2, 603, -0.3, cardboardBox(0.8, 0.6, 0.7)),
    at(301.6, 603.2, 0, waterDispenser()),
  ];
}

function signage(): THREE.Object3D[] {
  return [
    ...BAY_XS.map((x, i) => hang(textPlane(`${'ABC'[i]} 区`, 1.6, 0.8, { bg: '#111827', fg: HAZARD }), 's', AREA.z1, x, 2.05)),
    ...poster('安全生产 人人有责\n叉车不长眼', 3, 1, { bg: '#fde047', fg: '#111111', border: '#111111' }, 'w', AREA.x0, 608.5, 1.5),
    ...poster('甲方是上帝\n上帝爱改需求', 2.4, 0.9, { bg: '#dc2626', fg: '#fff7d6' }, 'e', AREA.x1, 608.5, 1.9),
    ...[AREA.z0, AREA.z1].map((z) => hang(extinguisher(), z === AREA.z0 ? 'n' : 's', z, 315, 0.5, 0.1)),
    ...[610, 618].map((z) => hang(exitSign(), 'w', AREA.x0, z - 1.6, 2.6, 0.1)),
    hang(noticeBoard(1.6, 0.9, 33), 'e', AREA.x1, 615.65, 1.8, 0.1),
    hang(textPlane('今日发货目标\n999+ 件', 2, 0.9, { bg: '#111827', fg: '#22c55e' }), 'n', AREA.z0, 303.2, 2.1),
    ...LANE_ZS.flatMap((z) => [box(39.6, 0.006, 0.12, HAZARD, MID_X, 0.004, z - 0.9), box(39.6, 0.006, 0.12, HAZARD, MID_X, 0.004, z + 0.9)]),
    ...BAY_XS.map((x) => at(x + 2.4, 622.8, 0, cyl(0.05, 0.05, 1, shiny(HAZARD), 0, 0.5, 0, 8), cyl(0.07, 0.07, 0.1, DARK, 0, 0.05, 0, 8))),
  ];
}

export function warehouseDecor(): THREE.Object3D[] {
  return [...structure(), ...lights(), hang(freightLift(), 'n', AREA.z0, LIFT.x, 0, 0.1), ...docks(), ...lettering(), ...staging(), ...clientCorner(), ...kit(), ...signage(), ...warehouseOutside()];
}
