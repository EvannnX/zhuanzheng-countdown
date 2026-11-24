import * as THREE from 'three';
import { brick, concrete } from './texturesNyc.ts';

/** Metres covered by one repeat of the masonry textures. */
const TILE_METRES = 1;

export type Masonry = 'redBrick' | 'brownBrick' | 'paintedBrick' | 'concrete';

const RECIPES: Record<Masonry, () => THREE.CanvasTexture> = {
  redBrick: () => brick('#a4523a', '#c9bfae', 5),
  brownBrick: () => brick('#7d4a36', '#b3a797', 12),
  paintedBrick: () => brick('#e8e2d4', '#d2cbbb', 21),
  concrete: () => concrete('#b4b1a9', 9),
};

const paints = new Map<Masonry, THREE.MeshLambertMaterial>();

/** Shared textured material; flagged mergeable so static masonry bakes into one draw call. */
export function masonry(kind: Masonry): THREE.MeshLambertMaterial {
  const hit = paints.get(kind);
  if (hit) return hit;
  const made = new THREE.MeshLambertMaterial({ map: RECIPES[kind]() });
  made.userData = { merge: true, noShadow: false, tiled: true };
  paints.set(kind, made);
  return made;
}

export const isTiled = (p: unknown): p is THREE.Material => p instanceof THREE.Material && p.userData.tiled === true;

/**
 * A box whose UVs follow its size and position in metres, so courses line up
 * between neighbouring pieces no matter how a wall is cut up.
 */
export function tiledBox(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    const px = position.getX(i) + x;
    const py = position.getY(i) + y;
    const pz = position.getZ(i) + z;
    const facesX = Math.abs(normal.getX(i)) > 0.5;
    const facesY = Math.abs(normal.getY(i)) > 0.5;
    uv.setXY(i, (facesX ? pz : px) / TILE_METRES, (facesY ? pz : py) / TILE_METRES);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}
