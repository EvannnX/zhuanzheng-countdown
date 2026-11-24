import { OKR_PENALTY, OKR_PER_PLAYER, OKR_REWARD } from '../../shared/constants.ts';
import { stationById } from '../../shared/world.ts';
import { activePlayers, award, say } from './state.ts';
import type { GameState, Player } from './state.ts';
import { workAt } from './tasks.ts';

/** Interns currently lending a hand to `ownerId` at a station. */
export const helpersAt = (s: GameState, ownerId: string, stationId: string): Player[] =>
  activePlayers(s).filter((o) => o.id !== ownerId && o.busy?.kind === 'hold' && o.busy.act === 'assist' && o.busy.target === stationId);

/** How many pairs of hands the step this intern is holding on needs. */
function crewNeeded(s: GameState, pid: string): number {
  const p = s.players[pid];
  if (p?.busy?.kind !== 'hold' || p.busy.act !== 'work') return 1;
  const st = stationById(p.busy.target);
  return (st ? workAt(p, st)?.step.crew : undefined) ?? 1;
}

/** True while a two-person lift is still waiting for its helper. */
export function shortOfHands(s: GameState, pid: string): boolean {
  const busy = s.players[pid]?.busy;
  const needed = crewNeeded(s, pid);
  return needed > 1 && busy?.kind === 'hold' && helpersAt(s, pid, busy.target).length < needed - 1;
}

/** Whether anybody is still holding a team lift at this station. */
export const liftInProgress = (s: GameState, stationId: string): boolean =>
  activePlayers(s).some((o) => o.busy?.kind === 'hold' && o.busy.act === 'work' && o.busy.target === stationId && crewNeeded(s, o.id) > 1);

export const okrGoal = (day: number, headcount: number): number => OKR_PER_PLAYER[Math.min(day, OKR_PER_PLAYER.length) - 1] * Math.max(1, headcount);

/** A finished task counts for the whole department; hitting the goal pays everyone. */
export function countTowardsGoal(s: GameState): GameState {
  const done = s.okr.done + 1;
  const counted = { ...s, okr: { ...s.okr, done } };
  if (s.okr.goal === 0 || done !== s.okr.goal) return counted;
  const paid = activePlayers(counted).reduce((acc, p) => award(acc, p.id, OKR_REWARD), counted);
  return say(paid, 'all', `部门 OKR 达成！全员 KPI +${OKR_REWARD}`, 'good');
}

/** End of day: a department that missed its goal is docked across the board. */
export function settleGoal(s: GameState): GameState {
  if (s.okr.goal === 0 || s.okr.done >= s.okr.goal) return s;
  const docked = activePlayers(s).reduce((acc, p) => award(acc, p.id, -OKR_PENALTY), s);
  return say(docked, 'all', `部门 OKR 没完成（${s.okr.done}/${s.okr.goal}），全员 KPI -${OKR_PENALTY}`, 'bad');
}
