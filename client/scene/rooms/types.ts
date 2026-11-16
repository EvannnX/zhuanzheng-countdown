import type * as THREE from 'three';

/**
 * Builds one gameplay prop in local space: origin on the floor at the footprint
 * centre, front facing +z, `w` along x and `d` along z. `index` varies clutter.
 */
export type Builder = (w: number, d: number, index: number) => THREE.Object3D[];

export interface RoomArt {
  /** Renderers for the solid props declared in shared/world.ts. */
  readonly builders: Readonly<Record<string, Builder>>;
  /** Extra non-colliding dressing, placed directly in world space. */
  decor(): THREE.Object3D[];
}
