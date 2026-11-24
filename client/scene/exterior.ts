import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WALL_HEIGHT } from '../../shared/world.ts';
import { ball, box, cyl, glow, group, rbox, shiny, turn } from './kit.ts';
import { decoCrown, suspensionBridge, waterTower } from './skyline.ts';
import type { CrownStyle } from './skyline.ts';
import { facade, skyTexture, streets } from './textures.ts';
import { rowHouse } from './texturesNyc.ts';

const GROUND_Y = -42;
const SKY_RADIUS = 520;
const FLOOR_METERS = 3.4;
const BAY_METERS = 3;
const CENTRE = { x: 26, z: 14 };
const MIDRISE_COUNT = 13;

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** A box whose side UVs repeat per floor/bay, so one facade texture fits any tower size. */
export function towerGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const uv = geometry.getAttribute('uv');
  const facesPerSide = uv.count / 6;
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / facesPerSide);
    const isCap = face === 2 || face === 3;
    const width = face < 2 ? d : w;
    uv.setXY(i, isCap ? 0.02 : (uv.getX(i) * width) / (BAY_METERS * 4), isCap ? 0.02 : (uv.getY(i) * h) / (FLOOR_METERS * 4));
  }
  return geometry;
}

const PALETTES: readonly (readonly [string, string])[] = [
  ['#c9d2da', '#5b7c99'],
  ['#e6dccb', '#6f8fa8'],
  ['#9fb0c0', '#3f5f7d'],
  ['#d8c4b0', '#7a94a6'],
];
/** The river east of the tower; nothing is built in it. */
const RIVER = { x0: 150, x1: 250 };
/** Skewed across the river south-east of the tower, so the terrace sees it side-on rather than end-on. */
const BRIDGE = { z: 130, deck: 15, tower: 52, heading: 0.35 };
const HERO_CLEARANCE = 26;
const WATER_TOWER_BELOW = 46;

interface Hero {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly style: CrownStyle;
}
/** Setback towers with crowns, placed where the windows and the terrace look. */
const HEROES: readonly Hero[] = [
  { x: 6, z: -185, w: 20, h: 88, style: 'spire' },
  { x: 52, z: -215, w: 22, h: 100, style: 'pyramid' },
  { x: -190, z: 2, w: 20, h: 92, style: 'lantern' },
  { x: -215, z: 44, w: 22, h: 104, style: 'spire' },
  { x: 14, z: 215, w: 22, h: 96, style: 'pyramid' },
  { x: 58, z: 240, w: 20, h: 108, style: 'spire' },
  { x: 292, z: -18, w: 24, h: 112, style: 'spire' },
  { x: 318, z: 70, w: 22, h: 96, style: 'lantern' },
  { x: 300, z: -80, w: 20, h: 90, style: 'pyramid' },
];

const inRiver = (x: number, margin: number): boolean => x > RIVER.x0 - margin && x < RIVER.x1 + margin;
const nearHero = (x: number, z: number): boolean => HEROES.some((t) => Math.hypot(t.x - x, t.z - z) < HERO_CLEARANCE);

function city(): THREE.Object3D[] {
  const rnd = seeded(2026);
  const buckets: THREE.BufferGeometry[][] = PALETTES.map(() => []);
  const roofs: THREE.Object3D[] = [];
  for (let ring = 0; ring < 4; ring++) {
    const count = 16 + ring * 9;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rnd() * 0.2;
      const radius = 120 + ring * 62 + rnd() * 40;
      const w = 16 + rnd() * 20;
      const d = 16 + rnd() * 20;
      const h = 22 + rnd() * rnd() * (70 + ring * 26);
      const x = CENTRE.x + Math.cos(angle) * radius;
      const z = CENTRE.z + Math.sin(angle) * radius;
      const palette = Math.floor(rnd() * PALETTES.length);
      if (inRiver(x, w / 2 + 4) || nearHero(x, z)) continue;
      const geometry = towerGeometry(w, h, d);
      geometry.translate(x, GROUND_Y + h / 2, z);
      buckets[palette].push(geometry);
      if (ring >= 2) continue;
      const top = GROUND_Y + h;
      roofs.push(box(w * 0.3, 2.2, d * 0.3, '#8b949e', x + w * 0.15, top + 1.1, z));
      roofs.push(h < WATER_TOWER_BELOW ? group(x - w * 0.25, top, z - d * 0.2, waterTower(1.5)) : cyl(0.2, 0.2, 9, shiny('#d1d5db'), x - w * 0.3, top + 4.5, z - d * 0.2, 6));
    }
  }
  const towers = buckets.map((parts, i) => {
    const map = facade(PALETTES[i][0], PALETTES[i][1], 100 + i);
    return new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ map }));
  });
  return [...towers, ...roofs];
}

/** Stone-clad towers that step back to a crown: the silhouettes that say "Midtown". */
function heroes(): THREE.Object3D[] {
  const shafts = HEROES.flatMap((t) => {
    const lower = towerGeometry(t.w * 1.5, t.h * 0.55, t.w * 1.5).translate(t.x, GROUND_Y + t.h * 0.275, t.z);
    const upper = towerGeometry(t.w, t.h, t.w).translate(t.x, GROUND_Y + t.h / 2, t.z);
    return [lower, upper];
  });
  const shaft = new THREE.Mesh(mergeGeometries(shafts), new THREE.MeshLambertMaterial({ map: facade('#d6c9b2', '#4f6b82', 301) }));
  return [shaft, ...HEROES.map((t) => group(t.x, GROUND_Y + t.h, t.z, decoCrown(t.w, t.style)))];
}

/** Older brick blocks close by, low enough that their tar roofs and water towers show from the 12th floor. */
function midrise(): THREE.Object3D[] {
  const rnd = seeded(515);
  const parts: THREE.BufferGeometry[] = [];
  const roofs: THREE.Object3D[] = [];
  for (let i = 0; i < MIDRISE_COUNT; i++) {
    const angle = (i / MIDRISE_COUNT) * Math.PI * 2 + rnd() * 0.15;
    const radius = 58 + rnd() * 30;
    const w = 15 + rnd() * 6;
    const d = 15 + rnd() * 6;
    const h = 22 + rnd() * 16;
    const x = CENTRE.x + Math.cos(angle) * radius * 1.25;
    const z = CENTRE.z + Math.sin(angle) * radius;
    const top = GROUND_Y + h;
    parts.push(towerGeometry(w, h, d).translate(x, GROUND_Y + h / 2, z));
    roofs.push(
      box(w + 0.6, 0.5, d + 0.6, '#5d4638', x, top + 0.25, z),
      box(w - 0.4, 0.1, d - 0.4, '#3b3d40', x, top + 0.56, z),
      box(3, 2.6, 4, '#7a5544', x + w * 0.25, top + 1.3, z + d * 0.2),
      ...(i % 3 === 2 ? [] : [group(x - w * 0.2, top + 0.5, z - d * 0.15, waterTower(1.25))]),
    );
  }
  const blocks = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ map: rowHouse('#8a5440', '#d9cfbd', 77) }));
  return [blocks, ...roofs];
}

function river(): THREE.Object3D[] {
  const water = box(RIVER.x1 - RIVER.x0, 0.2, 1100, shiny('#5d8196'), (RIVER.x0 + RIVER.x1) / 2, GROUND_Y + 0.1, CENTRE.z);
  const banks = [RIVER.x0, RIVER.x1].map((x) => box(1.6, 1.2, 1100, '#77736b', x, GROUND_Y + 0.5, CENTRE.z));
  const bridge = turn(group(RIVER.x0 - 26, GROUND_Y, BRIDGE.z, suspensionBridge(RIVER.x1 - RIVER.x0 + 60, BRIDGE.deck, BRIDGE.tower)), BRIDGE.heading);
  const barge = group(205, GROUND_Y + 0.2, -30, box(26, 1.6, 7, '#7c2d12', 0, 0.8, 0), box(5, 3, 5, '#e7e5e4', -9, 3.1, 0), box(14, 1.4, 5, '#9a8b78', 3, 2.3, 0));
  return [water, ...banks, bridge, barge];
}

function ground(): THREE.Object3D[] {
  const map = streets();
  map.repeat.set(14, 14);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), new THREE.MeshLambertMaterial({ map }));
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(CENTRE.x, GROUND_Y, CENTRE.z);
  const rnd = seeded(7);
  const trees = Array.from({ length: 60 }, () => {
    const x = CENTRE.x + (rnd() - 0.5) * 240;
    const z = CENTRE.z + (rnd() - 0.5) * 300;
    return group(x, GROUND_Y, z, cyl(0.4, 0.5, 3, '#6b4a2f', 0, 1.5, 0, 6), ball(2.6, '#3f9a55', 0, 5, 0));
  });
  return [plane, ...trees];
}

/** Sky dome and clouds. Kept separate so it can follow the camera between places. */
export function buildSky(): THREE.Group {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 24, 16), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }));
  const rnd = seeded(99);
  const cloud = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
  const clouds = Array.from({ length: 16 }, () => {
    const angle = rnd() * Math.PI * 2;
    const radius = 160 + rnd() * 240;
    const puffs = Array.from({ length: 5 }, (_, i) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(9 + rnd() * 9, 10, 8), cloud);
      puff.position.set(i * 11 - 22, rnd() * 5, rnd() * 8);
      puff.scale.y = 0.5;
      return puff;
    });
    return turn(group(Math.cos(angle) * radius, 70 + rnd() * 70, Math.sin(angle) * radius, ...puffs), rnd() * 3);
  });
  const root = new THREE.Group();
  root.add(dome, ...clouds);
  return root;
}

/** Our own tower below the office floor, plus the roof and its machinery. */
function ownBuilding(): THREE.Object3D[] {
  const map = facade('#d9d4c7', '#5f86a3', 55);
  const material = new THREE.MeshLambertMaterial({ map });
  const body = (w: number, d: number, x: number, z: number): THREE.Mesh => {
    const h = -GROUND_Y - 0.3;
    const m = new THREE.Mesh(towerGeometry(w, h, d), material);
    m.position.set(x, GROUND_Y + h / 2, z);
    return m;
  };
  const roofY = WALL_HEIGHT + 0.2;
  const ac = (x: number, z: number): THREE.Group =>
    group(x, roofY + 0.2, z, rbox(1.6, 1, 1, '#d1d5db', 0, 0.5, 0, 0.04), turn(cyl(0.38, 0.38, 0.06, shiny('#4b5563'), 0, 0.5, 0.5, 16), 0, Math.PI / 2), box(1.5, 0.05, 0.9, '#9ca3af', 0, 1.02, 0));
  return [
    body(40, 28, 20, 14),
    body(12, 16, 46, 16),
    box(40.6, 0.3, 28.6, '#cfc9bb', 20, -0.18, 14),
    box(12.4, 0.3, 16.4, '#cfc9bb', 46, -0.18, 16),
    // Lift core on the south face, behind the lobby's elevator doors.
    box(5.4, -GROUND_Y + 9, 2.6, '#bdb7a8', 34.5, (GROUND_Y + 9) / 2, 29.4),
    box(40.6, 0.4, 28.6, '#c9c4b7', 20, roofY, 14),
    box(40.6, 0.7, 0.3, '#b8b2a4', 20, roofY + 0.55, -0.15),
    box(40.6, 0.7, 0.3, '#b8b2a4', 20, roofY + 0.55, 28.15),
    box(0.3, 0.7, 28.6, '#b8b2a4', -0.15, roofY + 0.55, 14),
    box(0.3, 0.7, 28.6, '#b8b2a4', 40.15, roofY + 0.55, 14),
    ac(30, 8), ac(33, 8), ac(36, 8),
    group(36.4, roofY + 0.2, 11.5, waterTower(1)),
    group(12, roofY + 0.2, 20, waterTower(1.1)),
    cyl(0.06, 0.06, 7, shiny('#d1d5db'), 6, roofY + 3.7, 6, 8),
    ball(0.16, glow('#ef4444'), 6, roofY + 7.3, 6),
    box(6, 1.6, 0.2, '#1e3a8a', 37, roofY + 1.7, 20),
  ];
}

/** Distant city, streets far below and our own tower. */
export function buildExterior(): THREE.Object3D[] {
  return [...ground(), ...river(), ...city(), ...heroes(), ...midrise(), ...ownBuilding()];
}
