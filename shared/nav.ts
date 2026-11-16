import { inRect, inflate } from './geometry.ts';
import type { Rect, Vec } from './geometry.ts';
import { AREAS, COLLIDERS } from './world.ts';

const CELL = 0.5;
const NPC_CLEARANCE = 0.3;
const SNAP_RADIUS_CELLS = 4;
const LOS_SAMPLE = 0.2;
const DIAGONAL_COST = 1.414;

interface Grid {
  readonly bounds: Rect;
  readonly cols: number;
  readonly rows: number;
  readonly blocked: readonly boolean[];
}

const cellCentre = (g: Grid, index: number): Vec => ({
  x: g.bounds.x0 + ((index % g.cols) + 0.5) * CELL,
  z: g.bounds.z0 + (Math.floor(index / g.cols) + 0.5) * CELL,
});

function buildGrid(bounds: Rect): Grid {
  const cols = Math.ceil((bounds.x1 - bounds.x0) / CELL);
  const rows = Math.ceil((bounds.z1 - bounds.z0) / CELL);
  const fat = COLLIDERS.filter((r) => r.x1 >= bounds.x0 && r.x0 <= bounds.x1 && r.z1 >= bounds.z0 && r.z0 <= bounds.z1).map((r) => inflate(r, NPC_CLEARANCE));
  const shell: Grid = { bounds, cols, rows, blocked: [] };
  const blocked = Array.from({ length: cols * rows }, (_, i) => {
    const c = cellCentre(shell, i);
    return fat.some((r) => inRect(r, c));
  });
  return { ...shell, blocked };
}

/** Grids are built on first use; NPCs only ever walk inside one area at a time. */
const grids = new Map<string, Grid>();

function gridAt(p: Vec): Grid | null {
  const area = AREAS.find((a) => inRect(a, p));
  if (!area) return null;
  const hit = grids.get(area.id);
  if (hit) return hit;
  const made = buildGrid(area);
  grids.set(area.id, made);
  return made;
}

const cellOf = (g: Grid, p: Vec): { cx: number; cz: number } => ({
  cx: Math.floor((p.x - g.bounds.x0) / CELL),
  cz: Math.floor((p.z - g.bounds.z0) / CELL),
});

const isFree = (g: Grid, cx: number, cz: number): boolean =>
  cx >= 0 && cz >= 0 && cx < g.cols && cz < g.rows && !g.blocked[cx + cz * g.cols];

const walkableIn = (g: Grid, p: Vec): boolean => {
  const { cx, cz } = cellOf(g, p);
  return isFree(g, cx, cz);
};

export const isWalkable = (p: Vec): boolean => {
  const g = gridAt(p);
  return g !== null && walkableIn(g, p);
};

function nearestFreeCell(g: Grid, p: Vec): number | null {
  const { cx, cz } = cellOf(g, p);
  for (let radius = 0; radius <= SNAP_RADIUS_CELLS; radius++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        if (isFree(g, cx + dx, cz + dz)) return cx + dx + (cz + dz) * g.cols;
      }
    }
  }
  return null;
}

function clearLine(g: Grid, a: Vec, b: Vec): boolean {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(length / LOS_SAMPLE));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!walkableIn(g, { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
  }
  return true;
}

function smooth(g: Grid, points: readonly Vec[]): Vec[] {
  if (points.length <= 2) return [...points];
  const out: Vec[] = [points[0]];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = points.length - 1;
    while (next > anchor + 1 && !clearLine(g, points[anchor], points[next])) next--;
    out.push(points[next]);
    anchor = next;
  }
  return out;
}

const NEIGHBOURS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

/** A* over the walkable grid. Returns waypoints after `from`, or [] when unreachable. */
export function findPath(from: Vec, to: Vec): Vec[] {
  const g = gridAt(to);
  if (!g || g !== gridAt(from)) return [];
  const start = nearestFreeCell(g, from);
  const goal = nearestFreeCell(g, to);
  if (start === null || goal === null) return [];
  if (start === goal) return [cellCentre(g, goal)];

  const goalCentre = cellCentre(g, goal);
  const heuristic = (i: number): number => {
    const c = cellCentre(g, i);
    return Math.hypot(c.x - goalCentre.x, c.z - goalCentre.z) / CELL;
  };
  const cost = new Map<number, number>([[start, 0]]);
  const cameFrom = new Map<number, number>();
  const open = new Map<number, number>([[start, heuristic(start)]]);
  const closed = new Set<number>();

  while (open.size > 0) {
    let current = -1;
    let best = Infinity;
    for (const [index, score] of open) {
      if (score < best) {
        best = score;
        current = index;
      }
    }
    if (current === goal) break;
    open.delete(current);
    closed.add(current);
    const cx = current % g.cols;
    const cz = Math.floor(current / g.cols);
    for (const [dx, dz] of NEIGHBOURS) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (!isFree(g, nx, nz)) continue;
      // No cutting corners between two blocked cells.
      if (dx !== 0 && dz !== 0 && (!isFree(g, cx + dx, cz) || !isFree(g, cx, cz + dz))) continue;
      const next = nx + nz * g.cols;
      if (closed.has(next)) continue;
      const stepCost = (cost.get(current) ?? 0) + (dx !== 0 && dz !== 0 ? DIAGONAL_COST : 1);
      if (stepCost >= (cost.get(next) ?? Infinity)) continue;
      cost.set(next, stepCost);
      cameFrom.set(next, current);
      open.set(next, stepCost + heuristic(next));
    }
  }
  if (!cameFrom.has(goal)) return [];

  const cells: number[] = [goal];
  while (cells[0] !== start) cells.unshift(cameFrom.get(cells[0]) as number);
  return smooth(g, cells.map((c) => cellCentre(g, c))).slice(1);
}
