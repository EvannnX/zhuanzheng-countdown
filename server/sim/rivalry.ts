import {
  CHAMPION_REWARD,
  MAX_TRAPS,
  PLAYER_RADIUS,
  SHOVE_COOLDOWN,
  SHOVE_ENERGY_COST,
  SHOVE_HALF_ANGLE,
  SHOVE_PUSH_METERS,
  SHOVE_RANGE,
  SHOVE_STEP_METERS,
  SHOVE_STUN_SECONDS,
  TRAP_RADIUS,
  TRAP_STUN_SECONDS,
} from '../../shared/constants.ts';
import { dist, inflate, inRect } from '../../shared/geometry.ts';
import type { Vec } from '../../shared/geometry.ts';
import type { Prompt } from '../../shared/protocol.ts';
import { COLLIDERS } from '../../shared/world.ts';
import { facingPlayer } from './prompts.ts';
import { activePlayers, award, patchPlayer, resetTask, say, warn } from './state.ts';
import type { GameState, Player } from './state.ts';

const isStunned = (p: Player): boolean => p.busy?.kind === 'hold' && p.busy.act === 'stun';

const knockDown = (s: GameState, pid: string, seconds: number): GameState =>
  patchPlayer(s, pid, { busy: { kind: 'hold', act: 'stun', target: '', startedAt: s.time, endsAt: s.time + seconds } });

/** Things interns can do to each other anywhere: at home, on the street, at work. */
export function rivalryPrompts(s: GameState, p: Player): Prompt[] {
  const out: Prompt[] = [];
  const target = facingPlayer(s, p, SHOVE_RANGE, SHOVE_HALF_ANGLE);
  if (target) {
    const ready = s.time >= p.shoveReadyAt;
    out.push({ key: 'C', act: 'shove', target: target.id, label: ready ? `推开 ${target.name}` : '推人冷却中', disabled: !ready });
  }
  if (p.bananas > 0) out.push({ key: 'V', act: 'banana', target: '', label: `丢香蕉皮（剩 ${p.bananas}）` });
  return out;
}

const blocked = (p: Vec): boolean => COLLIDERS.some((r) => inRect(inflate(r, PLAYER_RADIUS), p));

/** Slide the victim away step by step, stopping at the first wall or piece of furniture. */
function pushedTo(from: Vec, dx: number, dz: number): Vec {
  let spot = from;
  for (let d = SHOVE_STEP_METERS; d <= SHOVE_PUSH_METERS; d += SHOVE_STEP_METERS) {
    const next = { x: from.x + dx * d, z: from.z + dz * d };
    if (blocked(next)) break;
    spot = next;
  }
  return spot;
}

/** Shove: the victim flies backwards, drops whatever they were doing, and is dazed for a moment. */
export function shove(s: GameState, pid: string, targetId: string): GameState {
  const p = s.players[pid];
  const victim = s.players[targetId];
  if (!victim || victim.fired || s.time < p.shoveReadyAt || dist(p, victim) > SHOVE_RANGE + 0.5) return s;
  const gap = dist(p, victim);
  const dx = gap > 0.01 ? (victim.x - p.x) / gap : Math.sin(p.yaw);
  const dz = gap > 0.01 ? (victim.z - p.z) / gap : Math.cos(p.yaw);
  const spot = pushedTo(victim, dx, dz);
  const moved = patchPlayer(s, targetId, { ...spot, movedAt: s.time, spawnSeq: victim.spawnSeq + 1 });
  const dazed = knockDown(moved, targetId, SHOVE_STUN_SECONDS);
  const tired = patchPlayer(dazed, pid, { shoveReadyAt: s.time + SHOVE_COOLDOWN, energy: Math.max(0, p.energy - SHOVE_ENERGY_COST) });
  return say(tired, targetId, `${p.name} 推了你一把！`, 'bad');
}

export function dropBanana(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  if (p.bananas <= 0) return s;
  const trap = { id: `b${s.nextUid}`, x: p.x, z: p.z, ownerId: pid };
  const traps = [...s.traps, trap].slice(-MAX_TRAPS);
  return say(patchPlayer({ ...s, traps, nextUid: s.nextUid + 1 }, pid, { bananas: p.bananas - 1 }), pid, '香蕉皮已就位，等同事路过', 'info');
}

/** Anyone but the owner who steps on a peel goes down and drops what they carry. */
export function tickTraps(s: GameState): GameState {
  if (s.traps.length === 0) return s;
  return s.traps.reduce((acc, trap) => {
    const victim = activePlayers(acc).find((p) => p.id !== trap.ownerId && !p.airborne && !isStunned(p) && dist(p, trap) <= TRAP_RADIUS);
    if (!victim) return acc;
    const cleared = { ...acc, traps: acc.traps.filter((t) => t.id !== trap.id) };
    const dropped = patchPlayer(resetTask(cleared, victim.carrying?.taskUid ?? null), victim.id, { carrying: null });
    const owner = acc.players[trap.ownerId]?.name ?? '某人';
    return say(knockDown(dropped, victim.id, TRAP_STUN_SECONDS), 'all', `${victim.name} 踩到 ${owner} 的香蕉皮，摔了个四脚朝天`, 'alert');
  }, s);
}

/** End of day: the top earner gets a bonus, the bottom one a warning. */
export function settleRanking(s: GameState): GameState {
  const ranked = activePlayers(s).slice().sort((a, b) => b.kpi - a.kpi);
  if (ranked.length < 2) return s;
  const top = ranked[0];
  const last = ranked[ranked.length - 1];
  if (top.kpi === last.kpi) return s;
  const crowned = say(award(s, top.id, CHAMPION_REWARD), 'all', `今日 KPI 冠军：${top.name}，奖励 +${CHAMPION_REWARD}`, 'good');
  return warn(crowned, last.id, 1, `末位警告：${last.name} 今天 KPI 垫底`);
}
