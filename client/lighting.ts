import * as THREE from 'three';
import { areaById } from '../shared/world.ts';
import type { AreaId } from '../shared/world.ts';
import { HOME_LAMPS, HOME_LAMP_Y } from './scene/rooms/homeDecor.ts';
import { SUBWAY_LIGHTS } from './scene/rooms/subway.ts';

const SHADOW_MAP_SIZE = 2048;
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

const DAYLIGHT: Mood = { sunFrom: [-38, 62, -46], sunColor: '#fff1d6', sun: 3.6, hemi: 1.12, ambient: 0.44, fill: 0.4 };
/** Early morning in the flat: a low warm sun rakes in through the west windows, the rest stays dim. */
const MOODS: Partial<Record<AreaId, Mood>> = {
  // Underground: no daylight, only the greenish fluorescent tubes.
  subway: { sunFrom: [-38, 62, -46], sunColor: '#fff1d6', sun: 0, hemi: 0.6, ambient: 0.42, fill: 0.12 },
  train: { sunFrom: [-38, 62, -46], sunColor: '#fff1d6', sun: 0, hemi: 1, ambient: 0.55, fill: 0.2 },
  // A lift car is a sealed box under its own light panel; the van is lit through its windows.
  lift: { sunFrom: [-38, 62, -46], sunColor: '#fff1d6', sun: 0, hemi: 0.95, ambient: 0.6, fill: 0.15 },
  van: { sunFrom: [-38, 62, -46], sunColor: '#fff1d6', sun: 3.2, hemi: 1, ambient: 0.5, fill: 0.3 },
  home: { sunFrom: [-52, 30, -14], sunColor: '#ffdcae', sun: 4.2, hemi: 0.82, ambient: 0.36, fill: 0.1 },
  // Brooklyn waterfront: a low sun over the river pushes long warm bars of light in through the east docks.
  warehouse: { sunFrom: [56, 26, -14], sunColor: '#ffe2b8', sun: 3.8, hemi: 0.98, ambient: 0.42, fill: 0.3 },
};

/** After work: moonlight and very little else. */
const NIGHT: Mood = { sunFrom: [30, 50, 40], sunColor: '#9db4ff', sun: 0.35, hemi: 0.16, ambient: 0.12, fill: 0.02 };

export interface Lighting {
  readonly objects: readonly THREE.Object3D[];
  /** Re-aim the sun at the place the player is in and switch to its mood. */
  follow(area: AreaId, night?: boolean): void;
  /** Turn sun shadows off on machines that cannot afford the extra pass. */
  setShadows(on: boolean): void;
}

function makeSun(): THREE.DirectionalLight {
  const sun = new THREE.DirectionalLight(DAYLIGHT.sunColor, DAYLIGHT.sun);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const cam = sun.shadow.camera;
  cam.left = -36;
  cam.right = 36;
  cam.top = 30;
  cam.bottom = -30;
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
    setShadows(on) {
      sun.castShadow = on;
    },
    follow(area, night = false) {
      const place = areaById(area);
      const mood = night ? NIGHT : (MOODS[area] ?? DAYLIGHT);
      // Lamps only cost shader time in the place they hang in.
      for (const lamp of lamps) lamp.visible = area === 'home';
      for (const tube of tubes) tube.visible = area === 'subway';
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
