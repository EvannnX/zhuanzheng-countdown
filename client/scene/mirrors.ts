import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import type { Rect, Vec } from '../../shared/geometry.ts';
import { inRect } from '../../shared/geometry.ts';

const TEXTURE_WIDTH = 768;
const TINT = '#e3f0f4';
/** Stand the glass a hair in front of the painted panel it replaces. */
const PROUD = 0.004;

interface MirrorSpec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  /** +1 looks towards +x, -1 towards -x. */
  readonly facing: 1 | -1;
  /** A mirror only renders while the player stands in this area. */
  readonly zone: Rect;
}

const MENS = { x0: 18, x1: 22, z0: 17, z1: 28 };
const WOMENS = { x0: 22, x1: 26, z0: 17, z1: 28 };
const WASH_NOOK = { x0: 13, x1: 16, z0: 600, z1: 606.6 };

const SPECS: readonly MirrorSpec[] = [
  { x: 18.154, y: 1.7, z: 20.5, w: 2.22, h: 1.02, facing: 1, zone: MENS },
  { x: 25.846, y: 1.7, z: 20.5, w: 2.22, h: 1.02, facing: -1, zone: WOMENS },
  { x: 15.785, y: 1.6, z: 602, w: 1, h: 0.6, facing: -1, zone: WASH_NOOK },
  { x: 15.785, y: 1.6, z: 605, w: 1, h: 0.6, facing: -1, zone: WASH_NOOK },
];

export interface Mirrors {
  readonly root: THREE.Group;
  /** Switch on only the mirrors of the room the player is in. */
  update(player: Vec): void;
}

/**
 * Real reflections for the restroom and wash-stand mirrors. `reveal` is called
 * around each reflection pass so the caller can show the player's own body
 * (and hide the first-person hands) for the mirror's eyes only.
 */
export function makeMirrors(reveal: (inMirror: boolean) => void): Mirrors {
  const mirrors = SPECS.map((spec) => {
    const glass = new Reflector(new THREE.PlaneGeometry(spec.w, spec.h), { textureWidth: TEXTURE_WIDTH, textureHeight: Math.round((TEXTURE_WIDTH * spec.h) / spec.w), color: TINT, clipBias: 0.003 });
    glass.position.set(spec.x + spec.facing * PROUD, spec.y, spec.z);
    glass.rotation.y = (spec.facing * Math.PI) / 2;
    glass.visible = false;
    const render = glass.onBeforeRender;
    glass.onBeforeRender = (...args) => {
      reveal(true);
      render.apply(glass, args);
      reveal(false);
    };
    return { spec, glass };
  });
  return {
    root: new THREE.Group().add(...mirrors.map((m) => m.glass)),
    update(player) {
      for (const m of mirrors) m.glass.visible = inRect(m.spec.zone, player);
    },
  };
}
