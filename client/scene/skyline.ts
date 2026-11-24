import * as THREE from 'three';
import { box, cyl, glow, group, shiny, turn } from './kit.ts';

/** Generic New York skyline pieces: rooftop water towers, setback spires and a stone-towered suspension bridge. */

const CEDAR = '#8a6744';
const HOOP = '#3d3833';
const TANK_LEGS = 6;
const STONE = '#9a8b78';
const STONE_DARK = '#7d705f';
const CABLE = '#4f4c47';
const BRIDGE_STEEL = '#6b665e';
const CABLE_SEGMENTS = 14;
const DECK_WIDTH = 14;

/** Wooden rooftop tank on a steel frame. Origin on the roof under its centre. */
export function waterTower(scale = 1): THREE.Group {
  const legs = Array.from({ length: TANK_LEGS }, (_, i) => {
    const a = (i / TANK_LEGS) * Math.PI * 2;
    return box(0.14, 1.5, 0.14, HOOP, Math.cos(a) * 1.15, 0.75, Math.sin(a) * 1.15);
  });
  const braces = [0, 1, 2].map((i) => turn(box(2.5, 0.08, 0.08, HOOP, 0, 0.8, 0), (i / 3) * Math.PI, 0, 0.5));
  const tower = group(
    0, 0, 0,
    ...legs,
    ...braces,
    cyl(1.75, 1.75, 0.14, HOOP, 0, 1.55, 0, 12),
    cyl(1.5, 1.6, 2.7, CEDAR, 0, 2.97, 0, 14),
    ...[1.9, 2.5, 3.2, 3.9].map((y) => cyl(1.63, 1.63, 0.06, HOOP, 0, y, 0, 14)),
    cyl(0.1, 1.72, 0.95, '#555a61', 0, 4.8, 0, 14),
    box(0.3, 3.4, 0.06, HOOP, 0, 2.6, 1.66),
    cyl(0.06, 0.06, 1.5, HOOP, 0.5, 0.75, 0.3, 6),
  );
  tower.scale.setScalar(scale);
  return tower;
}

export type CrownStyle = 'spire' | 'pyramid' | 'lantern';

/**
 * The stepped top of an art-deco tower, to sit on a plain shaft `w` wide whose
 * roof is the origin. Returns flat-colour parts only, so they merge with the scene.
 */
export function decoCrown(w: number, style: CrownStyle, stone = '#cfc6b4'): THREE.Group {
  const tiers = [0.78, 0.58, 0.4].map((k, i) => box(w * k, w * 0.36, w * k, stone, 0, w * (0.18 + i * 0.36), 0));
  const fins = [-1, 1].flatMap((s) => [box(w * 0.08, w * 0.5, w * 0.82, stone, s * w * 0.3, w * 0.25, 0), box(w * 0.82, w * 0.5, w * 0.08, stone, 0, w * 0.25, s * w * 0.3)]);
  const top = w * 1.08;
  const cap: THREE.Object3D[] =
    style === 'spire'
      ? [cyl(w * 0.1, w * 0.2, w * 0.5, shiny('#d9dde1'), 0, top + w * 0.25, 0, 8), cyl(0.12, w * 0.09, w * 1.3, shiny('#d9dde1'), 0, top + w * 1.15, 0, 6), cyl(0.3, 0.3, 0.6, glow('#ffd28a'), 0, top + w * 0.5, 0, 6)]
      : style === 'pyramid'
        ? [turn(cyl(0.2, w * 0.3, w * 0.7, '#6fa594', 0, top + w * 0.35, 0, 4), Math.PI / 4), cyl(0.1, 0.1, w * 0.5, shiny('#d6b34a'), 0, top + w * 0.95, 0, 5)]
        : [cyl(w * 0.16, w * 0.19, w * 0.42, stone, 0, top + w * 0.21, 0, 8), cyl(w * 0.05, w * 0.2, w * 0.3, '#3f6f63', 0, top + w * 0.57, 0, 8), cyl(0.1, 0.1, w * 0.4, shiny('#d9dde1'), 0, top + w * 0.9, 0, 5)];
  return group(0, 0, 0, ...tiers, ...fins, ...cap);
}

/** A straight bar between two points in the x-y plane (cables, stays). */
function bar(x0: number, y0: number, x1: number, y1: number, z: number, t: number, paint: string): THREE.Mesh {
  const length = Math.hypot(x1 - x0, y1 - y0);
  return turn(box(length, t, t, paint, (x0 + x1) / 2, (y0 + y1) / 2, z), 0, 0, Math.atan2(y1 - y0, x1 - x0));
}

/** Masonry bridge tower: three piers, two pointed arches for the roadway and a corniced head. */
function bridgeTower(x: number, height: number, deckY: number): THREE.Object3D[] {
  const pierZ = DECK_WIDTH / 2 + 1.2;
  const archTop = deckY + 13;
  return [
    ...[-pierZ, 0, pierZ].map((z) => box(5, height, z === 0 ? 2.6 : 3.4, STONE, x, height / 2, z)),
    box(5.2, height - archTop, pierZ * 2 + 3.4, STONE, x, (height + archTop) / 2, 0),
    ...[-pierZ / 2, pierZ / 2].flatMap((z) => [-1, 1].map((s) => turn(box(5.1, 4.4, 1.2, STONE, x, archTop - 1.2, z + s * 1.75), 0, s * 0.62))),
    box(6, 1.2, pierZ * 2 + 4.4, STONE_DARK, x, height + 0.6, 0),
    box(5.6, 0.8, pierZ * 2 + 4, STONE_DARK, x, archTop + (height - archTop) * 0.55, 0),
    box(7, 5, pierZ * 2 + 6, STONE_DARK, x, 2.5, 0),
  ];
}

/**
 * A generic suspension bridge running along +x from the origin shore, `length`
 * metres long. y = 0 is the water line. Parts are flat-coloured and mergeable.
 */
export function suspensionBridge(length: number, deckY: number, towerHeight: number): THREE.Group {
  const towers = [length * 0.26, length * 0.74];
  const side = DECK_WIDTH / 2;
  const sagTo = deckY + 3;
  const main = Array.from({ length: CABLE_SEGMENTS }, (_, i) => {
    const at = (k: number): [number, number] => {
      const t = k / CABLE_SEGMENTS;
      return [towers[0] + (towers[1] - towers[0]) * t, sagTo + (towerHeight - sagTo) * (2 * t - 1) ** 2];
    };
    const [x0, y0] = at(i);
    const [x1, y1] = at(i + 1);
    return [-side, side].flatMap((z) => [bar(x0, y0, x1, y1, z, 0.55, CABLE), box(0.14, y1 - deckY, 0.14, CABLE, x1, (y1 + deckY) / 2, z)]);
  }).flat();
  const backstays = [-side, side].flatMap((z) => [bar(0, deckY, towers[0], towerHeight, z, 0.55, CABLE), bar(towers[1], towerHeight, length, deckY, z, 0.55, CABLE)]);
  const hangers = [0, 1].flatMap((end) =>
    [0.25, 0.5, 0.75].flatMap((t) => {
      const x = end === 0 ? towers[0] * t : length - towers[0] * t;
      const y = deckY + (towerHeight - deckY) * t;
      return [-side, side].map((z) => box(0.14, y - deckY, 0.14, CABLE, x, (y + deckY) / 2, z));
    }),
  );
  return group(
    0, 0, 0,
    box(length, 1.4, DECK_WIDTH, BRIDGE_STEEL, length / 2, deckY - 0.7, 0),
    box(length, 0.5, DECK_WIDTH + 1, '#55524c', length / 2, deckY - 1.6, 0),
    ...[-side, side].map((z) => box(length, 1.1, 0.2, CABLE, length / 2, deckY + 0.55, z)),
    ...Array.from({ length: Math.floor(length / 12) }, (_, i) => box(0.5, 2.6, DECK_WIDTH - 1, '#55524c', 6 + i * 12, deckY - 2.6, 0)),
    ...towers.flatMap((x) => bridgeTower(x, towerHeight, deckY)),
    ...main,
    ...backstays,
    ...hangers,
    box(10, deckY, DECK_WIDTH + 4, STONE_DARK, 2, deckY / 2 - 0.4, 0),
    box(10, deckY, DECK_WIDTH + 4, STONE_DARK, length - 2, deckY / 2 - 0.4, 0),
  );
}

/**
 * Scenery is shown per place by where each mesh's origin lies. Far backdrops
 * would land in a neighbouring place's cell, so bake them into geometry hung
 * from an anchor point inside the place they belong to.
 */
export function anchorTo(x: number, z: number, parts: readonly THREE.Object3D[]): THREE.Mesh[] {
  const root = group(0, 0, 0, ...parts);
  root.updateMatrixWorld(true);
  const out: THREE.Mesh[] = [];
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const geometry = (node.geometry as THREE.BufferGeometry).clone().applyMatrix4(node.matrixWorld).translate(-x, 0, -z);
    const mesh = new THREE.Mesh(geometry, node.material);
    mesh.position.set(x, 0, z);
    out.push(mesh);
  });
  return out;
}
