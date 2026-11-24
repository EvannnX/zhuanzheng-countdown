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
  /** Obeys the avenue's traffic light: stops while pedestrians have the walk sign. */
  readonly signal?: boolean;
}

const SIZES = { car: [4.2, 1.9], bus: [9, 2.4], forklift: [2.4, 1.3] } as const;
const SPANS: Partial<Record<AreaId, readonly [number, number]>> = { street: [76, 156], warehouse: [292, 348] };

const lane = (id: string, area: AreaId, kind: Lane['kind'], z: number, dir: 1 | -1, speed: number, count: number, extra: Partial<Lane> = {}): Lane => {
  const [x0, x1] = SPANS[area] ?? [0, 0];
  return { id, area, kind, z, dir, speed, count, length: SIZES[kind][0], width: SIZES[kind][1], x0, x1, ...extra };
};

/** The two roads of the morning street. */
export const ROADS: readonly { readonly z0: number; readonly z1: number }[] = [
  { z0: 610, z1: 616 },
  { z0: 624, z1: 630 },
];
/** The one-way avenue in front of the tower. */
export const AVENUE = { z0: 606, z1: 618 } as const;
/** The zebra crossing spans these x; stopped traffic always leaves it clear. */
export const CROSSWALK = { x0: 512, x1: 518 } as const;

/**
 * The avenue's light: traffic rolls for `go` seconds, then everything stops while
 * pedestrians cross. Each lane covers a whole number of car gaps per green, so the
 * queue always stops in the same places and never on the crossing.
 */
export const SIGNAL = { period: 17, go: 10, ramp: 0.12 } as const;

export interface SignalState {
  /** Pedestrians may cross. */
  readonly walk: boolean;
  /** Seconds until the light changes. */
  readonly left: number;
}

export function signalAt(t: number): SignalState {
  const local = ((t % SIGNAL.period) + SIGNAL.period) % SIGNAL.period;
  return local < SIGNAL.go ? { walk: false, left: SIGNAL.go - local } : { walk: true, left: SIGNAL.period - local };
}

/** Share of a green phase's distance covered `u` (0..1) of the way through it: pull away, cruise, brake. */
function greenTravel(u: number): number {
  const r = SIGNAL.ramp;
  const raw = u < r ? (u * u) / (2 * r) : u > 1 - r ? 1 - r - ((1 - u) * (1 - u)) / (2 * r) : u - r / 2;
  return raw / (1 - r);
}

/** Seconds of driving a signalled lane has done by time `t`. */
function signalClock(t: number): number {
  const cycle = Math.floor(t / SIGNAL.period);
  const local = t - cycle * SIGNAL.period;
  return (cycle + (local < SIGNAL.go ? greenTravel(local / SIGNAL.go) : 1)) * SIGNAL.go;
}

/** Avenue lanes: spans are placed so the stopped queue straddles the crossing at x 512..518. */
const AVENUE_CARS = { x0: 461.4, x1: 581.4, signal: true };
const AVENUE_BUSES = { x0: 447.8, x1: 567.8, signal: true };

export const LANES: readonly Lane[] = [
  lane('road1a', 'street', 'car', 611.5, 1, 9, 4),
  lane('road1b', 'street', 'car', 614.5, -1, 12, 4),
  lane('road2a', 'street', 'car', 625.5, 1, 14, 4),
  lane('road2b', 'street', 'bus', 628.5, -1, 8, 3),
  lane('fork1', 'warehouse', 'forklift', 605, -1, 4.5, 3),
  lane('fork2', 'warehouse', 'forklift', 612, 1, 6, 3),
  lane('fork3', 'warehouse', 'forklift', 619.3, -1, 5, 3),
  lane('ave1', 'plaza', 'car', 607.5, 1, 14, 6, AVENUE_CARS),
  lane('ave2', 'plaza', 'car', 610.5, 1, 10, 6, AVENUE_CARS),
  lane('ave3', 'plaza', 'car', 613.5, 1, 12, 6, AVENUE_CARS),
  lane('ave4', 'plaza', 'bus', 616.5, 1, 8, 3, AVENUE_BUSES),
];

/** Centre x of every vehicle in the lane at time `t` (seconds). */
export function vehiclesAt(l: Lane, t: number): number[] {
  const span = l.x1 - l.x0;
  const gap = span / l.count;
  // Uneven spacing so the gaps are not perfectly predictable.
  const jitter = (k: number): number => ((k * 7919) % 5) * 0.09 * gap;
  return Array.from({ length: l.count }, (_, k) => {
    const clock = l.signal ? signalClock(t) : t;
    const travelled = (((clock * l.speed + k * gap + jitter(k)) % span) + span) % span;
    return l.dir === 1 ? l.x0 + travelled : l.x1 - travelled;
  });
}

const HIT_MARGIN = 0.3;

/** The lane whose vehicle is currently on top of this point, if any. */
export function laneHit(area: AreaId, x: number, z: number, t: number): Lane | null {
  for (const l of LANES) {
    if (l.area !== area || Math.abs(z - l.z) > l.width / 2 + HIT_MARGIN) continue;
    // A queue waiting at the red light hurts nobody.
    if (l.signal && signalAt(t).walk) continue;
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

/** Absolute time at which train `cycle` shuts its doors. */
export const trainDoorsClose = (cycle: number): number => cycle * TRAIN.period + TRAIN.open;

/**
 * The tower's lifts, as deterministic as the trains: one car opens every `period`
 * seconds, at each of the bank's doors in turn, after stopping at every floor on the way.
 */
export const LIFT = { period: 14, arrive: 4, open: 8, floors: 12, doors: 3, floorSeconds: 1 } as const;

export interface LiftState {
  /** The car that is open now, or the next one to open. */
  readonly cycle: number;
  readonly doorsOpen: boolean;
  /** Which door of the ground-floor bank this car serves. */
  readonly door: number;
  /** Where the indicator says the car is. */
  readonly floor: number;
  readonly opensIn: number;
}

const liftClock = (t: number, down: boolean): number => t + (down ? LIFT.period / 2 : 0);

/** `down` asks about the lifts calling at the 12th floor instead of the lobby. */
export function liftAt(t: number, down = false): LiftState {
  const shifted = liftClock(t, down);
  const current = Math.floor(shifted / LIFT.period);
  const local = shifted - current * LIFT.period;
  const doorsOpen = local >= LIFT.arrive && local < LIFT.open;
  const cycle = local < LIFT.open ? current : current + 1;
  const opensIn = doorsOpen ? 0 : cycle * LIFT.period + LIFT.arrive - shifted;
  const away = Math.min(LIFT.floors - 1, Math.ceil(opensIn / LIFT.floorSeconds));
  return { cycle, doorsOpen, door: cycle % LIFT.doors, floor: down ? LIFT.floors - away : 1 + away, opensIn };
}

/** Absolute time at which lift `cycle` shuts its doors and sets off. */
export const liftDoorsClose = (cycle: number, down = false): number => cycle * LIFT.period + LIFT.open - (down ? LIFT.period / 2 : 0);

/** Stops on the way: [start, end] as shares of the ride, and the floor (counted from the boarding floor). */
const LIFT_STOPS = [
  { from: 0.3, to: 0.44, floor: 5 },
  { from: 0.62, to: 0.76, floor: 9 },
] as const;

export interface LiftCarState {
  readonly floor: number;
  readonly doorsOpen: boolean;
  /** The doors have opened on a floor full of people who also want in. */
  readonly crowd: boolean;
}

/** What riders inside the car see at time `t`, for a ride lasting `rideSeconds`. */
export function liftCarAt(t: number, rideSeconds: number, down = false): LiftCarState {
  const shifted = liftClock(t, down);
  const local = shifted - Math.floor(shifted / LIFT.period) * LIFT.period;
  const sinceClose = local >= LIFT.open ? local - LIFT.open : local + LIFT.period - LIFT.open;
  const show = (floor: number): number => (down ? LIFT.floors + 1 - floor : floor);
  if (sinceClose >= rideSeconds) return { floor: show(1), doorsOpen: local >= LIFT.arrive && local < LIFT.open, crowd: false };
  const u = sinceClose / rideSeconds;
  const stop = LIFT_STOPS.find((st) => u >= st.from && u < st.to);
  if (stop) return { floor: show(stop.floor), doorsOpen: true, crowd: true };
  const legs = [{ from: 0, to: LIFT_STOPS[0].from, a: 1, b: LIFT_STOPS[0].floor }, { from: LIFT_STOPS[0].to, to: LIFT_STOPS[1].from, a: LIFT_STOPS[0].floor, b: LIFT_STOPS[1].floor }, { from: LIFT_STOPS[1].to, to: 1, a: LIFT_STOPS[1].floor, b: LIFT.floors }];
  const leg = legs.find((l) => u < l.to) ?? legs[2];
  const k = Math.max(0, (u - leg.from) / (leg.to - leg.from));
  return { floor: show(Math.min(leg.b, Math.floor(leg.a + k * (leg.b - leg.a)))), doorsOpen: false, crowd: false };
}
