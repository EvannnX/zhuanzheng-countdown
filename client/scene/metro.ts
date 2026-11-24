import * as THREE from 'three';
import { TRAIN, trainAt } from '../../shared/hazards.ts';
import { TRAIN_DOOR_XS } from '../../shared/world.ts';
import { fuse } from './fuse.ts';
import { box, group } from './kit.ts';
import { CAR, DOOR, cabParts, carShellParts, leafParts, riderParts, riderSetCount } from './metroCar.ts';
import { TRACK_Z, TUNNEL } from './rooms/tunnel.ts';

const CAR_INDICES = [-2, -1, 0, 1, 2];
/** The middle door is the middle of the train; cars are one door spacing long so every door sits mid-car. */
const TRAIN_X = TRAIN_DOOR_XS[1];
const CAR_PITCH = TRAIN_DOOR_XS[1] - TRAIN_DOOR_XS[0];
/** Seconds the leaves take to slide, inside the window in which the doors count as open. */
const DOOR_SECONDS = 0.7;
/** Speed at which the train enters and leaves the stretch covered by `trainAt` (it brakes from / accelerates to this). */
const ENTRY_SPEED = (2 * TRAIN.travel) / TRAIN.arrive;
const EXIT_SPEED = (2 * TRAIN.travel) / (TRAIN.leave - TRAIN.open);

/** Seconds of warning: headlights grow in the dark end of the tunnel before the train bursts out of it. */
const GLOW_SECONDS = 3;
const GLOW_FAR_SCALE = 0.25;
const HALF_TRAIN = (CAR_INDICES.length * CAR_PITCH) / 2;

interface Leaf {
  readonly mesh: THREE.Group;
  readonly home: number;
  readonly side: number;
}

interface Car {
  readonly root: THREE.Group;
  readonly x: number;
  readonly leaves: readonly Leaf[];
  /** Only cars that stop at a platform door open up. */
  readonly opens: boolean;
}

export interface Metro {
  readonly root: THREE.Group;
  update(t: number): void;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (v: number): number => v * v * (3 - 2 * v);

/**
 * Where the train is drawn. While `trainAt` says it is around, that is the
 * truth; between trains it keeps rolling at its entry / exit speed so that it
 * comes out of, and disappears into, the dark end of the tunnel instead of popping.
 */
function drawnOffset(t: number): number {
  const state = trainAt(t);
  if (state.visible) return state.offset;
  const local = t - state.cycle * TRAIN.period;
  const sinceLeft = local - TRAIN.leave;
  const untilNext = TRAIN.period - local;
  return sinceLeft < untilNext ? TRAIN.travel + EXIT_SPEED * sinceLeft : -TRAIN.travel - ENTRY_SPEED * untilNext;
}

/** 0 closed … 1 open; the leaves only move while the doors are officially open. */
function doorOpenness(t: number): number {
  const state = trainAt(t);
  if (!state.doorsOpen) return 0;
  const local = t - state.cycle * TRAIN.period;
  return smooth(clamp01(Math.min(local - TRAIN.arrive, TRAIN.open - local) / DOOR_SECONDS));
}

/**
 * A pair of lamps hanging in the darkness at a tunnel end: the train's lights while it is still (or already)
 * beyond the modelled stretch. `nearness` runs from 0 (far, faint, small) to 1 (about to appear).
 */
function distantLamps(x: number, color: string): { root: THREE.Group; show(nearness: number): void } {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
  const root = group(x, 1.3, 0, ...[-0.9, 0.9].map((z) => box(0.02, 0.14, 0.26, material, 0, -0.5, z)));
  root.visible = false;
  return {
    root,
    show(nearness) {
      root.visible = nearness > 0 && nearness < 1;
      material.opacity = nearness;
      root.scale.setScalar(GLOW_FAR_SCALE + (1 - GLOW_FAR_SCALE) * nearness);
    },
  };
}

function rearCab(): THREE.Group {
  const cab = fuse(cabParts(false), -CAR.body / 2);
  cab.rotation.y = Math.PI;
  return cab;
}

function buildCars(): Car[] {
  const shell = fuse(carShellParts());
  const leafPair = [-1, 1].map((side) => fuse(leafParts(-side)));
  const riders = Array.from({ length: riderSetCount }, (_, i) => fuse(riderParts(i)));
  const last = CAR_INDICES.length - 1;
  return CAR_INDICES.map((index, n) => {
    const leaves = [-1, 1].map((side, k): Leaf => {
      const home = side * (DOOR.leaf / 2);
      const mesh = leafPair[k].clone();
      mesh.position.set(home, CAR.floor, -(CAR.halfWidth - DOOR.inset));
      return { mesh, home, side };
    });
    const cabs = [...(n === last ? [fuse(cabParts(true), CAR.body / 2)] : []), ...(n === 0 ? [rearCab()] : [])];
    const x = index * CAR_PITCH;
    const root = group(x, 0, 0, shell.clone(), riders[n % riders.length].clone(), ...leaves.map((l) => l.mesh), ...cabs);
    const opens = TRAIN_DOOR_XS.some((doorX) => Math.abs(doorX - (TRAIN_X + x)) < 0.01);
    return { root, x, leaves, opens };
  });
}

/** The platform train: hollow cars you can see into, drawn only while inside the modelled tunnel. */
export function makeMetro(): Metro {
  const cars = buildCars();
  const train = group(TRAIN_X, 0, 0, ...cars.map((c) => c.root));
  const coming = distantLamps(TUNNEL.x0 + 0.3, '#fff7d6');
  const going = distantLamps(TUNNEL.x1 - 0.3, '#ef4444');
  const margin = CAR.body / 2 + 0.2;
  const placeCars = (x: number, open: number): void => {
    for (const car of cars) {
      car.root.visible = x + car.x > TUNNEL.x0 + margin && x + car.x < TUNNEL.x1 - margin;
      if (!car.opens) continue;
      for (const leaf of car.leaves) leaf.mesh.position.x = leaf.home + leaf.side * open;
    }
  };
  return {
    root: group(0, 0, TRACK_Z, train, coming.root, going.root),
    update(t) {
      const x = TRAIN_X + drawnOffset(t);
      train.position.x = x;
      placeCars(x, doorOpenness(t) * DOOR.slide);
      train.visible = cars.some((car) => car.root.visible);
      coming.show(1 - (TUNNEL.x0 - (x + HALF_TRAIN)) / (ENTRY_SPEED * GLOW_SECONDS));
      going.show(1 - (x - HALF_TRAIN - TUNNEL.x1) / (EXIT_SPEED * GLOW_SECONDS));
    },
  };
}
