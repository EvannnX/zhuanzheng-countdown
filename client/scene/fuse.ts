import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Bake a tree of parts into one mesh per shared material, in the tree's own
 * local space. Unlike `mergeStatic` it adds no world-anchored grain, so the
 * result may move (vehicles) and may be cloned: clones share the geometry.
 * Parts with one-off materials (signs with text) are carried over as they are.
 */
export function fuse(parts: readonly THREE.Object3D[], x = 0, y = 0, z = 0): THREE.Group {
  const source = new THREE.Group();
  if (parts.length > 0) source.add(...parts);
  source.updateMatrixWorld(true);
  const buckets = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
  const loose: THREE.Object3D[] = [];
  source.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (Array.isArray(node.material) || !node.material.userData.merge) {
      loose.push(node);
      return;
    }
    const flat = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
    flat.applyMatrix4(node.matrixWorld);
    const bucket = buckets.get(node.material.uuid) ?? { material: node.material as THREE.Material, geometries: [] as THREE.BufferGeometry[] };
    bucket.geometries.push(flat);
    buckets.set(node.material.uuid, bucket);
  });
  const out = new THREE.Group();
  out.position.set(x, y, z);
  for (const { material, geometries } of buckets.values()) {
    const merged = new THREE.Mesh(mergeGeometries(geometries), material);
    merged.castShadow = !material.userData.noShadow;
    merged.receiveShadow = !material.userData.noShadow;
    out.add(merged);
    for (const g of geometries) g.dispose();
  }
  // Bake each loose part's place in the tree into its own transform before re-parenting.
  for (const node of loose) {
    node.matrixWorld.decompose(node.position, node.quaternion, node.scale);
    out.add(node);
  }
  return out;
}
