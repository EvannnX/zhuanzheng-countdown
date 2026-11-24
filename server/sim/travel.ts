import { COMMUTE_SECONDS, FIRST_ARRIVAL_REWARD, LATE_PENALTY, ON_TIME_REWARD, PAJAMAS_PENALTY, UNWASHED_PENALTY } from '../../shared/constants.ts';
import type { ActKind, Prompt } from '../../shared/protocol.ts';
import { deskSpawn, warehouseSpawn } from '../../shared/world.ts';
import { award, patchPlayer, playerList, say } from './state.ts';
import type { GameState, Player } from './state.ts';
import { fillTasks } from './tasks.ts';

export type Option = Omit<Prompt, 'key'>;
export const option = (act: ActKind, target: string, label: string, disabled = false): Option => ({ act, target, label, disabled });

export function teleport(s: GameState, pid: string, to: { x: number; z: number; yaw: number }): GameState {
  const p = s.players[pid];
  return patchPlayer(s, pid, { ...to, movedAt: s.time, spawnSeq: p.spawnSeq + 1 });
}

/** Everyone riding the same train, lift or van. */
export const cohortMates = (s: GameState, cohort: string): Player[] => playerList(s).filter((p) => p.cohort === cohort);

/**
 * Cars of different trains (and vans of different trips) share one set of
 * coordinates, so riders must only ever see and touch their own cohort.
 */
export const canSee = (viewer: Player, other: Player): boolean => viewer.cohort === other.cohort;

/** Reaching the 12th floor: settle the morning's bonuses and fines, once a day. */
export function clockIn(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  if (!p || p.clockedIn) return s;
  const isFirst = s.arrivals === 0;
  const isLate = s.time > s.dayStartedAt + COMMUTE_SECONDS;
  let next = patchPlayer({ ...s, arrivals: s.arrivals + 1 }, pid, { clockedIn: true });
  if (isLate) next = say(award(next, pid, -LATE_PENALTY), 'all', `${p.name} 迟到了，扣全勤 KPI -${LATE_PENALTY}`, 'bad');
  else if (isFirst) next = say(award(next, pid, FIRST_ARRIVAL_REWARD), 'all', `${p.name} 第一个到公司！KPI +${FIRST_ARRIVAL_REWARD}`, 'good');
  else next = say(award(next, pid, ON_TIME_REWARD), pid, `准时打卡 KPI +${ON_TIME_REWARD}`, 'good');
  if (!p.dressed) next = say(award(next, pid, -PAJAMAS_PENALTY), 'all', `${p.name} 穿着睡衣来上班 KPI -${PAJAMAS_PENALTY}`, 'bad');
  if (!p.washed) next = say(award(next, pid, -UNWASHED_PENALTY), pid, `没洗漱，蓬头垢面 KPI -${UNWASHED_PENALTY}`, 'bad');
  return next;
}

/** Start working: move to the day's workplace and hand out tasks (clocking in first if that has not happened). */
export function arrive(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  if (!p || p.stage === 'work') return s;
  const spawn = s.site === 'office' ? deskSpawn(p.deskIndex) : warehouseSpawn(p.deskIndex);
  const moved = patchPlayer(teleport(s, pid, spawn), pid, { stage: 'work', busy: null, cohort: null, seat: null });
  return fillTasks(clockIn(moved, pid), pid);
}
