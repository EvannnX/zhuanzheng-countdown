import { CHASE_CATCH_RANGE, CHASE_REPATH_SECONDS, CHASE_SPEED, ESCAPE_REWARD, INSPECTION_SPEED_FACTOR, NPC_SCAN_SPEED, NPC_WAIT_SECONDS } from '../../shared/constants.ts';
import { dist, yawTo } from '../../shared/geometry.ts';
import type { Vec } from '../../shared/geometry.ts';
import { findPath } from '../../shared/nav.ts';
import { CLEANER_SPEED, DRILL_POINTS, MEETING_POINTS, NPC_NAMES, NPC_SIGHT, PATROL, WAREHOUSE_PATROL } from '../../shared/world.ts';
import { award, roll, say, warn } from './state.ts';
import type { GameState, Npc } from './state.ts';

const RETRY_SECONDS = 1;

function speedOf(s: GameState, npc: Npc): number {
  if (npc.id === 'cleaner') return CLEANER_SPEED;
  if (npc.id === 'zhang') return 0;
  if (npc.chase) return CHASE_SPEED;
  const rush = npc.id === 'boss' && s.event?.type === 'inspection' ? INSPECTION_SPEED_FACTOR : 1;
  return NPC_SIGHT[npc.id].speed * rush;
}

function goalsFor(s: GameState, npc: Npc): readonly Vec[] {
  if (npc.id === 'zhang') return [];
  if (npc.id === 'boss' && s.site === 'warehouse') return WAREHOUSE_PATROL;
  if (npc.id === 'boss' && s.event?.type === 'meeting') return MEETING_POINTS;
  if (npc.id !== 'cleaner' && s.event?.type === 'fireDrill') return DRILL_POINTS;
  return PATROL[npc.id];
}

const setNpc = (s: GameState, index: number, patch: Partial<Npc>): GameState => ({
  ...s,
  npcs: s.npcs.map((n, i) => (i === index ? { ...n, ...patch } : n)),
});

/** Run the target down, give up when the clock runs out. Returns null when not chasing. */
function tickChase(s: GameState, index: number): GameState | null {
  const npc = s.npcs[index];
  const chase = npc.chase;
  if (!chase) return null;
  const target = s.players[chase.targetId];
  const calm = { chase: null, path: [], waitUntil: s.time + NPC_WAIT_SECONDS };
  if (!target || target.fired || target.stage !== 'work') return setNpc(s, index, calm);
  if (dist(npc, target) <= CHASE_CATCH_RANGE) {
    return warn(setNpc(s, index, calm), target.id, 1, `${target.name} 没跑掉，被${NPC_NAMES[npc.id]}当场抓获！`);
  }
  if (s.time >= chase.until) {
    const escaped = say(award(setNpc(s, index, calm), target.id, ESCAPE_REWARD), target.id, `甩掉了！心跳加速 KPI +${ESCAPE_REWARD}`, 'good');
    return say(escaped, 'all', `${target.name} 从${NPC_NAMES[npc.id]}眼皮底下溜了`, 'info');
  }
  if (s.time < chase.repathAt) return s;
  return setNpc(s, index, { path: findPath(npc, target), chase: { ...chase, repathAt: s.time + CHASE_REPATH_SECONDS } });
}

function tickNpc(s0: GameState, index: number, dt: number): GameState {
  if (s0.npcs[index].id === 'zhang') return s0;
  const s = tickChase(s0, index) ?? s0;
  const npc = s.npcs[index];

  if (npc.path.length > 0) {
    const target = npc.path[0];
    const remaining = dist(npc, target);
    const stride = speedOf(s, npc) * dt;
    if (remaining <= stride) {
      const path = npc.path.slice(1);
      const waitUntil = path.length === 0 ? s.time + NPC_WAIT_SECONDS : npc.waitUntil;
      return setNpc(s, index, { x: target.x, z: target.z, path, waitUntil });
    }
    const k = stride / remaining;
    return setNpc(s, index, {
      x: npc.x + (target.x - npc.x) * k,
      z: npc.z + (target.z - npc.z) * k,
      yaw: yawTo(npc, target),
    });
  }

  if (npc.chase) return s;
  if (s.time < npc.waitUntil) return setNpc(s, index, { yaw: npc.yaw + NPC_SCAN_SPEED * dt });

  const goals = goalsFor(s, npc);
  const [pick, rolled] = roll(s);
  const goal = goals[Math.floor(pick * goals.length)];
  const path = findPath(npc, goal);
  return setNpc(rolled, index, { path, waitUntil: path.length === 0 ? rolled.time + RETRY_SECONDS : 0 });
}

export function tickNpcs(s: GameState, dt: number): GameState {
  return s.npcs.reduce((acc, _npc, index) => tickNpc(acc, index, dt), s);
}
