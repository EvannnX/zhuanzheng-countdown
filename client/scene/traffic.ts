import * as THREE from 'three';
import { LANES, vehiclesAt } from '../../shared/hazards.ts';
import type { Lane } from '../../shared/hazards.ts';
import { makeForklift } from './forklift.ts';
import { box, glow, group, pick } from './kit.ts';
import { makeMetro } from './metro.ts';
import { CAB_YELLOW, makeBus, makeCar } from './vehicles.ts';

const CAR_COLORS = [CAB_YELLOW, CAB_YELLOW, '#111827', CAB_YELLOW, '#f8fafc', CAB_YELLOW, '#94a3b8'];
const TUNNEL_LIGHTS = 8;
const TUNNEL_SPAN = 26;
const RIDE_SPEED = 24;
/** Where the lights streaming past the car you ride in start (just west of the car interior). */
const RIDE_X0 = 396;

/** All vehicle models face +x. */
function model(lane: Lane, k: number): THREE.Group {
  const seed = k * 3 + lane.z;
  const body = lane.kind === 'bus' ? makeBus() : lane.kind === 'forklift' ? makeForklift(k + Math.floor(lane.z)) : makeCar(pick(CAR_COLORS, seed), seed);
  body.rotation.y = lane.dir === 1 ? 0 : Math.PI;
  return body;
}

export interface Traffic {
  readonly root: THREE.Group;
  /** Move everything to where it is at room time `t`. */
  update(t: number): void;
}

export function makeTraffic(): Traffic {
  const fleets = LANES.map((lane) => ({ lane, bodies: Array.from({ length: lane.count }, (_, k) => model(lane, k)) }));
  for (const fleet of fleets) for (const body of fleet.bodies) body.position.z = fleet.lane.z;
  const metro = makeMetro();
  // Lights streaming past the windows of the car you ride in.
  const tunnelLights = Array.from({ length: TUNNEL_LIGHTS }, (_, i) => box(0.5, 0.08, 0.04, glow(i % 3 === 0 ? '#60a5fa' : '#fde68a'), 0, 1.5, i % 2 === 0 ? 599.6 : 603.2));

  return {
    root: group(0, 0, 0, ...fleets.flatMap((f) => f.bodies), metro.root, ...tunnelLights),
    update(t) {
      for (const { lane, bodies } of fleets) {
        vehiclesAt(lane, t).forEach((x, k) => {
          bodies[k].position.x = x;
        });
      }
      tunnelLights.forEach((light, i) => {
        const along = (((i * TUNNEL_SPAN) / TUNNEL_LIGHTS - t * RIDE_SPEED) % TUNNEL_SPAN + TUNNEL_SPAN) % TUNNEL_SPAN;
        light.position.x = RIDE_X0 + along;
      });
      metro.update(t);
    },
  };
}
