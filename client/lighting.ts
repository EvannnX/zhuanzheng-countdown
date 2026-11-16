import * as THREE from 'three';
import { areaById } from '../shared/world.ts';
import type { AreaId } from '../shared/world.ts';
import { HOME_LAMPS, HOME_LAMP_Y } from './scene/rooms/homeDecor.ts';
import { SUBWAY_LIGHTS } from './scene/rooms/subway.ts';

const SHADOW_MAP_SIZE = 4096;
const LAMP_REACH = 8;
const TUBE = { color: '#eef7dc', power: 9, y: 2.6, reach: 10 };

/** How a place is lit: where the sun stands relative to it and how much fill there is. */
interface Mood {
  readonly sunFrom: readonly [number, number, number];
  readonly sunColor: string;
  readonly sun: number;
  readonly hemi: number;
  readonly ambient: number;
  readonly fill: number;
}

const DAYLIGHT: Mood = { sunFrom: [-38, 62, -46], sunColor: '#fff1d6', sun: 3.2, hemi: 1.35, ambient: 0.55, fill: 0.55 };
/** Early morning in the flat: a low warm sun rakes in through the west windows, the rest stays dim. */
const MOODS: Partial<Record<AreaId, Mood>> = {
  // Underground: no daylight, only the greenish fluorescent tubes.
  subway: { sunFrom: [-38, 62, -46], sunColor: '#fff1d6', sun: 0, hemi: 0.6, ambient: 0.42, fill: 0.12 },
  home: { sunFrom: [-52, 30, -14], sunColor: '#ffdcae', sun: 4.2, hemi: 0.82, ambient: 0.36, fill: 0.1 },
};

export interface Lighting {
  readonly objects: readonly THREE.Object3D[];
  /** Re-aim the sun at the place the player is in and switch to its mood. */
  follow(area: AreaId): void;
}

function makeSun(): THREE.DirectionalLight {
  const sun = new THREE.DirectionalLight(DAYLIGHT.sunColor, DAYLIGHT.sun);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const cam = sun.shadow.camera;
  cam.left = -42;
  cam.right = 42;
  cam.top = 34;
  cam.bottom = -34;
  cam.near = 1;
  cam.far = 220;
  return sun;
}

export function createLighting(): Lighting {
  const sun = makeSun();
  const hemi = new THREE.HemisphereLight('#ffffff', '#cdbfa6', DAYLIGHT.hemi);
  const ambient = new THREE.AmbientLight('#ffffff', DAYLIGHT.ambient);
  const fill = new THREE.DirectionalLight('#ffffff', DAYLIGHT.fill);
  fill.position.set(18, 30, 40);
  // The pendants are always on: they only reach a few metres, so other places never see them.
  const lamps = HOME_LAMPS.map((lamp) => {
    const light = new THREE.PointLight(lamp.color, lamp.power, LAMP_REACH, 2);
    light.position.set(lamp.x, HOME_LAMP_Y, lamp.z);
    return light;
  });

  const tubes = SUBWAY_LIGHTS.map((spot) => {
    const light = new THREE.PointLight(TUBE.color, TUBE.power, TUBE.reach, 2);
    light.position.set(spot.x, TUBE.y, spot.z);
    return light;
  });

  return {
    objects: [sun, sun.target, hemi, ambient, fill, ...lamps, ...tubes],
    follow(area) {
      const place = areaById(area);
      const mood = MOODS[area] ?? DAYLIGHT;
      const cx = (place.x0 + place.x1) / 2;
      const cz = (place.z0 + place.z1) / 2;
      sun.position.set(cx + mood.sunFrom[0], mood.sunFrom[1], cz + mood.sunFrom[2]);
      sun.target.position.set(cx, 0, cz);
      sun.color.set(mood.sunColor);
      sun.intensity = mood.sun;
      hemi.intensity = mood.hemi;
      ambient.intensity = mood.ambient;
      fill.intensity = mood.fill;
    },
  };
}
