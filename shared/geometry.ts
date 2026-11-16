export interface Vec {
  readonly x: number;
  readonly z: number;
}

export interface Rect {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}

export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.z - b.z);

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const inRect = (r: Rect, p: Vec): boolean =>
  p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1;

export const inflate = (r: Rect, m: number): Rect => ({
  x0: r.x0 - m,
  z0: r.z0 - m,
  x1: r.x1 + m,
  z1: r.z1 + m,
});

/** Liang–Barsky: does segment a→b pass through the rectangle? */
export function segmentHitsRect(a: Vec, b: Vec, r: Rect): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const p = [-dx, dx, -dz, dz];
  const q = [a.x - r.x0, r.x1 - a.x, a.z - r.z0, r.z1 - a.z];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
      continue;
    }
    const t = q[i] / p[i];
    if (p[i] < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

/** Yaw convention: forward = (sin yaw, cos yaw) on the x/z plane. */
export const yawTo = (from: Vec, to: Vec): number => Math.atan2(to.x - from.x, to.z - from.z);

export function angleDiff(a: number, b: number): number {
  const d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) return d - Math.PI * 2;
  if (d < -Math.PI) return d + Math.PI * 2;
  return d;
}

export function inCone(origin: Vec, yaw: number, target: Vec, range: number, halfAngle: number): boolean {
  if (dist(origin, target) > range) return false;
  return Math.abs(angleDiff(yawTo(origin, target), yaw)) <= halfAngle;
}

function pushOut(p: Vec, radius: number, r: Rect): Vec {
  const cx = clamp(p.x, r.x0, r.x1);
  const cz = clamp(p.z, r.z0, r.z1);
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d = Math.hypot(dx, dz);
  if (d >= radius) return p;
  if (d > 1e-6) {
    const k = radius / d;
    return { x: cx + dx * k, z: cz + dz * k };
  }
  // Centre is inside the rectangle: leave through the nearest side.
  const exits = [
    { x: r.x0 - radius, z: p.z, cost: p.x - r.x0 },
    { x: r.x1 + radius, z: p.z, cost: r.x1 - p.x },
    { x: p.x, z: r.z0 - radius, cost: p.z - r.z0 },
    { x: p.x, z: r.z1 + radius, cost: r.z1 - p.z },
  ];
  const best = exits.reduce((a, b) => (b.cost < a.cost ? b : a));
  return { x: best.x, z: best.z };
}

/** Slide a circle out of every rectangle it overlaps. */
export function resolveCircle(p: Vec, radius: number, rects: readonly Rect[]): Vec {
  const once = (start: Vec): Vec => rects.reduce((acc, r) => pushOut(acc, radius, r), start);
  return once(once(p));
}
