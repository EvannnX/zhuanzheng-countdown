import * as THREE from 'three';

const GRAIN_SIZE = 128;
/** World metres covered by one repeat of the grain. */
const GRAIN_METRES = 0.9;
const GRAIN_STRENGTH = 0.26;
/** Height over which walls and furniture darken towards the floor. */
const CONTACT_HEIGHT = 0.32;
const CONTACT_DARKNESS = 0.3;

let grain: THREE.DataTexture | null = null;

/** Soft blotchy noise, tiled: reads as plaster, fabric or brushed paint depending on the colour under it. */
function grainTexture(): THREE.DataTexture {
  if (grain) return grain;
  const data = new Uint8Array(GRAIN_SIZE * GRAIN_SIZE * 4);
  let seed = 1234567;
  const random = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < GRAIN_SIZE; y++) {
    for (let x = 0; x < GRAIN_SIZE; x++) {
      const value = Math.round(255 * random());
      data.set([value, value, value, 255], (y * GRAIN_SIZE + x) * 4);
    }
  }
  grain = new THREE.DataTexture(data, GRAIN_SIZE, GRAIN_SIZE);
  grain.wrapS = THREE.RepeatWrapping;
  grain.wrapT = THREE.RepeatWrapping;
  grain.magFilter = THREE.LinearFilter;
  grain.minFilter = THREE.LinearMipmapLinearFilter;
  grain.generateMipmaps = true;
  grain.needsUpdate = true;
  return grain;
}

const VERTEX_HEAD = 'varying vec3 vSurfacePos;\nvarying vec3 vSurfaceNormal;';
const VERTEX_BODY = 'vSurfacePos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvSurfaceNormal = normalize(mat3(modelMatrix) * objectNormal);';
const FRAGMENT_HEAD = 'uniform sampler2D grainMap;\nvarying vec3 vSurfacePos;\nvarying vec3 vSurfaceNormal;';
const FRAGMENT_BODY = `
  vec3 surfaceWeight = abs(vSurfaceNormal);
  surfaceWeight /= surfaceWeight.x + surfaceWeight.y + surfaceWeight.z;
  vec3 grainAt = vSurfacePos / ${GRAIN_METRES.toFixed(2)};
  float fine = texture2D(grainMap, grainAt.yz).r * surfaceWeight.x + texture2D(grainMap, grainAt.xz).r * surfaceWeight.y + texture2D(grainMap, grainAt.xy).r * surfaceWeight.z;
  float grainValue = fine;
  diffuseColor.rgb *= 1.0 - ${GRAIN_STRENGTH.toFixed(2)} * (grainValue - 0.5);
  float facingUp = surfaceWeight.y * step(0.0, vSurfaceNormal.y);
  float offFloor = smoothstep(0.0, ${CONTACT_HEIGHT.toFixed(2)}, vSurfacePos.y);
  diffuseColor.rgb *= 1.0 - ${CONTACT_DARKNESS.toFixed(2)} * (1.0 - max(offFloor, facingUp));
`;

/**
 * A copy of a flat-colour material with world-space grain and a soft dark band
 * where things meet the floor. Only for geometry that never moves: the grain
 * is anchored to the world, so it would crawl across anything that walks.
 */
export function textured<T extends THREE.Material>(material: T): T {
  if (!(material instanceof THREE.MeshLambertMaterial) && !(material instanceof THREE.MeshPhongMaterial)) return material;
  if (material.transparent) return material;
  const copy = material.clone() as T;
  copy.userData = { ...material.userData };
  copy.onBeforeCompile = (shader) => {
    shader.uniforms.grainMap = { value: grainTexture() };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`).replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_BODY}`);
  };
  copy.customProgramCacheKey = () => `surface:${material.type}`;
  return copy;
}
