import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANES } from '../../../shared/hazards.ts';
import { areaById } from '../../../shared/world.ts';
import { towerGeometry } from '../exterior.ts';
import { box, cyl, glass, group, pick, rbox, shiny, textPlane, turn } from '../kit.ts';
import { anchorTo, decoCrown, suspensionBridge, waterTower } from '../skyline.ts';
import { facade, seeded } from '../textures.ts';
import { rowHouse } from '../texturesNyc.ts';

/** What the dock doors open onto: a quay, the river and a bridge to the east; a truck yard and brick blocks to the west. */

const AREA = areaById('warehouse');
const MID_Z = (AREA.z0 + AREA.z1) / 2;
const LANE_ZS = LANES.filter((l) => l.area === 'warehouse').map((l) => l.z);
const WATER_Y = -1.5;
const QUAY_X = AREA.x1 + 16;
const FAR_SHORE_X = 672;
/** Slung across the river on a diagonal, so the dock doors frame its cables and far tower side-on. */
const BRIDGE = { x: 380, z: 760, length: 412, deck: 14, tower: 60, heading: 0.682 };
const CONTAINER = { length: 6.06, height: 2.6, width: 2.44 };
const CONTAINER_TONES = ['#9b3b2a', '#2f5f8a', '#3f7d4e', '#c08a2e'];
const IRON = '#1c1c1e';

/** Corrugated shipping container, long side along x. */
function container(tone: string): THREE.Group {
  const { length, height, width } = CONTAINER;
  return group(
    0, 0, 0,
    box(length, height, width, tone, 0, height / 2, 0),
    ...Array.from({ length: 14 }, (_, i) => box(0.12, height - 0.3, width + 0.04, tone, -length / 2 + 0.4 + i * 0.4, height / 2, 0)),
    ...[-1, 1].map((s) => box(length + 0.04, 0.14, width + 0.06, '#2b2b2e', 0, s > 0 ? height - 0.07 : 0.07, 0)),
    ...[-0.6, -0.2, 0.2, 0.6].map((z) => box(0.04, height - 0.3, 0.04, shiny('#9ca3af'), -length / 2 - 0.02, height / 2, z)),
  );
}

/** Low-rise far bank: a wall of towers softened by the haze, with a couple of crowned ones. */
function farShore(): THREE.Object3D[] {
  const rnd = seeded(808);
  const parts: THREE.BufferGeometry[] = [];
  const crowns: THREE.Object3D[] = [];
  for (let i = 0; i < 34; i++) {
    const w = 18 + rnd() * 16;
    const h = 30 + rnd() * rnd() * 110;
    const x = FAR_SHORE_X + 14 + rnd() * 70;
    const z = 430 + i * 11 + rnd() * 6;
    parts.push(towerGeometry(w, h, w).translate(x, WATER_Y + h / 2, z));
    if (i % 9 === 4) crowns.push(group(x, WATER_Y + h, z, decoCrown(w, pick(['spire', 'pyramid', 'lantern'] as const, i))));
  }
  const towers = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ map: facade('#cfd4d6', '#56728a', 211) }));
  return [towers, ...crowns, box(140, 2, 900, '#77736b', FAR_SHORE_X + 68, WATER_Y, MID_Z)];
}

function east(): THREE.Object3D[] {
  const bridge = turn(group(BRIDGE.x, WATER_Y, BRIDGE.z, suspensionBridge(BRIDGE.length, BRIDGE.deck, BRIDGE.tower)), BRIDGE.heading);
  return [
    box(QUAY_X - AREA.x1, 0.2, 80, '#8f8c85', (QUAY_X + AREA.x1) / 2 + 0.1, -0.105, MID_Z),
    ...LANE_ZS.flatMap((z) => [-0.9, 0.9].map((o) => box(8, 0.006, 0.12, '#facc15', AREA.x1 + 4.2, 0.001, z + o))),
    box(0.6, 0.5, 80, '#6b6862', QUAY_X + 0.2, -0.1, MID_Z),
    ...Array.from({ length: 12 }, (_, i) => group(QUAY_X - 0.4, 0, MID_Z - 33 + i * 6, cyl(0.16, 0.2, 0.4, IRON, 0, 0.2, 0, 10), cyl(0.26, 0.22, 0.1, IRON, 0, 0.44, 0, 10))),
    box(900, 0.2, 1200, shiny('#5d8196'), QUAY_X + 450, WATER_Y - 0.1, MID_Z),
    // containers stacked clear of the doors, so the lanes look straight out over the river
    group(AREA.x1 + 7, 0, AREA.z0 - 5.2, container(CONTAINER_TONES[0])),
    group(AREA.x1 + 7, 0, AREA.z1 + 2.2, container(CONTAINER_TONES[2])),
    group(AREA.x1 + 7.3, CONTAINER.height, AREA.z1 + 2.3, container(CONTAINER_TONES[3])),
    group(AREA.x1 + 7, 0, AREA.z0 - 2.4, container(CONTAINER_TONES[1])),
    // a tug pushing a gravel barge upriver
    group(QUAY_X + 34, WATER_Y, MID_Z - 4, box(22, 2, 7, '#3a3d42', 0, 1, 0), box(18, 1.2, 5.6, '#9a8b78', 0, 2.4, 0), box(6, 2.4, 5, '#b3261e', 15, 1.4, 0), box(3, 2.4, 3.4, '#f1ead8', 15, 3.8, 0), cyl(0.5, 0.5, 2, IRON, 14, 5.6, 0, 8)),
    bridge,
    ...farShore(),
  ];
}

/** Articulated lorry backed up between the dock lanes, rear doors towards the warehouse (+x). */
function lorry(length: number, tone: string, cab: string): THREE.Group {
  const logo = textPlane('WHALE JUMP 鲸跃物流', length * 0.62, 0.7, { bg: tone, fg: '#1e3a8a', lit: false });
  logo.position.set(-length / 2, 2.5, 1.262);
  const wheel = (x: number, z: number): THREE.Mesh => turn(cyl(0.5, 0.5, 0.3, IRON, x, 0.5, z, 14), 0, Math.PI / 2);
  return group(
    0, 0, 0,
    box(length, 2.7, 2.5, tone, -length / 2, 2.5, 0),
    box(length, 0.2, 2.3, '#2b2b2e', -length / 2, 1.05, 0),
    logo,
    box(0.04, 2.5, 0.04, shiny('#9ca3af'), 0.02, 2.5, 0),
    ...[-0.6, 0.6].map((z) => box(0.05, 2.4, 0.05, shiny('#9ca3af'), 0.03, 2.5, z)),
    ...[-0.9, -0.3, 0.3, 0.9].map((z, i) => box(0.03, 0.14, 0.6, i % 2 === 0 ? '#dc2626' : '#f8fafc', 0.02, 1.06, z)),
    ...[-1.2, -2.4].flatMap((x) => [wheel(x, 1.05), wheel(x, -1.05)]),
    ...[-1, 1].map((z) => box(0.12, 1, 0.12, '#2b2b2e', -length + 2.4, 0.5, z * 0.9)),
    rbox(2.4, 2.6, 2.4, shiny(cab), -length - 1.5, 1.9, 0, 0.14),
    box(0.1, 1, 2.1, glass('#0f172a', 0.7), -length - 2.72, 2.4, 0),
    ...[-length - 0.9, -length - 2.1].flatMap((x) => [wheel(x, 1.05), wheel(x, -1.05)]),
  );
}

function west(): THREE.Object3D[] {
  const blocks = [[252, 598, 18, 13], [250, 617, 22, 17], [253, 638, 16, 12]].map(([x, z, d, h]) => {
    const m = new THREE.Mesh(towerGeometry(16, h, d), new THREE.MeshLambertMaterial({ map: rowHouse('#7d4a36', '#cbbfa8', 90 + h) }));
    m.position.set(x, h / 2, z);
    return m;
  });
  const gaps = [(LANE_ZS[0] + LANE_ZS[1]) / 2, (LANE_ZS[1] + LANE_ZS[2]) / 2];
  return [
    box(60, 0.2, 80, '#4a4c50', AREA.x0 - 30.1, -0.105, MID_Z),
    ...LANE_ZS.flatMap((z) => [-0.9, 0.9].map((o) => box(8, 0.006, 0.12, '#facc15', AREA.x0 - 4.2, 0.001, z + o))),
    group(AREA.x0 - 1.2, 0, gaps[0], lorry(11, '#ece8df', '#1e3a8a')),
    group(AREA.x0 - 1.4, 0, gaps[1], lorry(6.5, '#f7c600', '#f7c600')),
    // chain-link fence along the far side of the yard
    box(0.02, 2.2, 80, glass('#9ca3af', 0.28), 272, 1.1, MID_Z),
    box(0.05, 0.05, 80, shiny('#6b7280'), 272, 2.2, MID_Z),
    ...Array.from({ length: 21 }, (_, i) => cyl(0.04, 0.04, 2.3, shiny('#6b7280'), 272, 1.15, MID_Z - 40 + i * 4, 6)),
    ...blocks,
    group(252, 13, 599, waterTower(1)),
    group(249, 17, 620, waterTower(1.15)),
    ...[604, 622].map((z) => group(275, 0, z, cyl(0.07, 0.1, 5, IRON, 0, 2.5, 0, 8), box(1.2, 0.07, 0.1, IRON, 0.6, 5, 0))),
  ];
}

/** Baked onto an anchor in the warehouse so the neighbouring places' cells never claim the backdrop. */
export function warehouseOutside(): THREE.Object3D[] {
  return anchorTo((AREA.x0 + AREA.x1) / 2, MID_Z, [...east(), ...west()]);
}
