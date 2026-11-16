import type { AreaId } from './world.ts';

/**
 * Moving hazards (traffic, forklifts, the metro train) are pure functions of the
 * room clock, so the server can test hits and every client can draw them in the
 * same place without any extra network traffic.
 */
export interface Lane {
  readonly id: string;
  readonly area: AreaId;
  readonly kind: 'car' | 'bus' | 'forklift';
  /** Vehicles drive along x at this z. */
  readonly z: number;
  readonly x0: number;
  readonly x1: number;
  readonly dir: 1 | -1;
  readonly speed: number;
  readonly count: number;
  readonly length: number;
  readonly width: number;
}

const lane = (id: string, area: AreaId, kind: Lane['kind'], z: number, dir: 1 | -1, speed: number, count: number): Lane => {
  const street = area === 'street';
  const size = { car: [4.2, 1.9], bus: [9, 2.4], forklift: [2.4, 1.3] }[kind];
  return { id, area, kind, z, dir, speed, count, length: size[0], width: size[1], x0: street ? 76 : 292, x1: street ? 156 : 348 };
};

export const ROADS: readonly { readonly z0: number; readonly z1: number }[] = [
  { z0: 610, z1: 616 },
  { z0: 624, z1: 630 },
];

export const LANES: readonly Lane[] = [
  lane('road1a', 'street', 'car', 611.5, 1, 9, 4),
  lane('road1b', 'street', 'car', 614.5, -1, 12, 4),
  lane('road2a', 'street', 'car', 625.5, 1, 14, 4),
  lane('road2b', 'street', 'bus', 628.5, -1, 8, 3),
  lane('fork1', 'warehouse', 'forklift', 605, -1, 4.5, 3),
  lane('fork2', 'warehouse', 'forklift', 612, 1, 6, 3),
  lane('fork3', 'warehouse', 'forklift', 619.3, -1, 5, 3),
];

/** Centre x of every vehicle in the lane at time `t` (seconds). */
export function vehiclesAt(l: Lane, t: number): number[] {
  const span = l.x1 - l.x0;
  const gap = span / l.count;
  // Uneven spacing so the gaps are not perfectly predictable.
  const jitter = (k: number): number => ((k * 7919) % 5) * 0.09 * gap;
  return Array.from({ length: l.count }, (_, k) => {
    const travelled = (((t * l.speed + k * gap + jitter(k)) % span) + span) % span;
    return l.dir === 1 ? l.x0 + travelled : l.x1 - travelled;
  });
}

const HIT_MARGIN = 0.3;

/** The lane whose vehicle is currently on top of this point, if any. */
export function laneHit(area: AreaId, x: number, z: number, t: number): Lane | null {
  for (const l of LANES) {
    if (l.area !== area || Math.abs(z - l.z) > l.width / 2 + HIT_MARGIN) continue;
    if (vehiclesAt(l, t).some((vx) => Math.abs(x - vx) <= l.length / 2 + HIT_MARGIN)) return l;
  }
  return null;
}

export const TRAIN = { period: 16, arrive: 2, open: 9, leave: 11, travel: 46 } as const;

export interface TrainState {
  /** Index of the current train since the day began. */
  readonly cycle: number;
  readonly doorsOpen: boolean;
  /** Metres from its stopping position (negative = still approaching). */
  readonly offset: number;
  readonly visible: boolean;
}

export function trainAt(t: number): TrainState {
  const cycle = Math.floor(t / TRAIN.period);
  const local = t - cycle * TRAIN.period;
  if (local < TRAIN.arrive) {
    const k = 1 - local / TRAIN.arrive;
    return { cycle, doorsOpen: false, offset: -TRAIN.travel * k * k, visible: true };
  }
  if (local < TRAIN.open) return { cycle, doorsOpen: true, offset: 0, visible: true };
  if (local < TRAIN.leave) {
    const k = (local - TRAIN.open) / (TRAIN.leave - TRAIN.open);
    return { cycle, doorsOpen: false, offset: TRAIN.travel * k * k, visible: true };
  }
  return { cycle, doorsOpen: false, offset: 0, visible: false };
}
