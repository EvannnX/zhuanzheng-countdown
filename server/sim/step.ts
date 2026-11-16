import {
  DAY_SECONDS,
  ENERGY_DRAIN_PER_SECOND,
  HOME_ENERGY,
  MAX_BANANAS,
  MAX_ENERGY,
  MAX_MOVE_SPEED,
  MOVE_SLACK_METERS,
  SLACK_RATE,
  SUMMARY_SECONDS,
  TOTAL_DAYS,
} from '../../shared/constants.ts';
import { clamp, dist } from '../../shared/geometry.ts';
import type { Site } from '../../shared/tasks.ts';
import type { Command, RankRow } from '../../shared/protocol.ts';
import { homeSpawn } from '../../shared/world.ts';
import { buy, cancelBusy, finishMinigame, startAct, tickHolds } from './acts.ts';
import { breakfastPortions, tickHazards } from './commute.ts';
import { tickDetection, tickPrinterBlame } from './detection.ts';
import { scheduleEvents, tickEvents } from './events.ts';
import { tickNpcs } from './npc.ts';
import { settleRanking, tickTraps } from './rivalry.ts';
import { freshNpcs, patchPlayer, playerList, resetStats, say } from './state.ts';
import type { GameState, Player } from './state.ts';

const mapPlayers = (s: GameState, fn: (p: Player) => Player): GameState => ({
  ...s,
  players: Object.fromEntries(playerList(s).map((p) => [p.id, fn(p)])),
});

/** Days 2 and 4 are spent on loan to the client's warehouse. */
const SITES: readonly Site[] = ['office', 'warehouse', 'office', 'warehouse', 'office'];

export function startDay(s: GameState, day: number): GameState {
  const site = SITES[(day - 1) % SITES.length];
  const headcount = playerList(s).length;
  const fresh = mapPlayers(s, (p) => ({
    ...p,
    ...homeSpawn(p.deskIndex),
    movedAt: s.time,
    spawnSeq: p.spawnSeq + 1,
    energy: HOME_ENERGY,
    stage: 'home' as const,
    washed: false,
    dressed: false,
    ate: false,
    pancake: false,
    airborne: false,
    safeUntil: 0,
    shoveReadyAt: 0,
    // Everyone finds one free banana peel in the bin each morning.
    bananas: Math.min(MAX_BANANAS, p.bananas + 1),
    warnings: p.fired ? p.warnings : Math.max(0, p.warnings - (day > 1 ? 1 : 0)),
    carrying: null,
    busy: null,
    tasks: [],
    exposure: 0,
    immuneUntil: 0,
  }));
  const base: GameState = {
    ...fresh,
    phase: 'day',
    day,
    phaseEndsAt: s.time + DAY_SECONDS,
    npcs: freshNpcs(site),
    printer: { broken: false, culpritId: null },
    site,
    dayStartedAt: s.time,
    breakfastLeft: breakfastPortions(headcount),
    train: { cycle: -1, boarded: 0 },
    arrivals: 0,
    traps: [],
  };
  const scheduled = scheduleEvents(base, s.time);
  const where = site === 'office' ? '回公司上班' : '今天外派去甲方仓库';
  return say(scheduled, 'all', `第 ${day} 天 8:00 闹钟响了！${where}，9:00 前必须到岗`, 'alert');
}

export function ranking(s: GameState): RankRow[] {
  const sorted = playerList(s)
    .slice()
    .sort((a, b) => Number(a.fired) - Number(b.fired) || b.kpi - a.kpi);
  const quota = Math.max(1, Math.ceil(sorted.length / 3));
  return sorted.map((p, i) => ({
    id: p.id,
    name: p.name,
    kpi: p.kpi,
    warnings: p.warnings,
    fired: p.fired,
    promoted: s.phase === 'final' && !p.fired && i < quota,
  }));
}

function endDay(s: GameState): GameState {
  const cleared = mapPlayers({ ...s, event: null, eventQueue: [] }, (p) => ({ ...p, busy: null, carrying: null }));
  if (s.day >= TOTAL_DAYS) return say({ ...cleared, phase: 'final' }, 'all', '实习期结束，转正名单公布', 'alert');
  const settled = settleRanking(cleared);
  return say({ ...settled, phase: 'summary', phaseEndsAt: s.time + SUMMARY_SECONDS }, 'all', '18:00 下班（才怪）', 'info');
}

function tickEnergy(s: GameState, dt: number): GameState {
  return mapPlayers(s, (p) => {
    if (p.fired) return p;
    const rate = p.busy?.kind === 'slack' ? SLACK_RATE[p.busy.mode] : -ENERGY_DRAIN_PER_SECOND;
    return { ...p, energy: clamp(p.energy + rate * dt, 0, MAX_ENERGY) };
  });
}

/** Advance the simulation by dt seconds. Pure: returns a new state. */
export function step(s0: GameState, dt: number): GameState {
  const s = { ...s0, time: s0.time + dt };
  if (s.phase === 'summary') return s.time >= s.phaseEndsAt ? startDay(s, s.day + 1) : s;
  if (s.phase !== 'day') return s;
  if (s.time >= s.phaseEndsAt) return endDay(s);
  const stages = [
    (x: GameState) => tickEnergy(x, dt),
    tickHolds,
    tickHazards,
    tickTraps,
    (x: GameState) => tickNpcs(x, dt),
    (x: GameState) => tickDetection(x, dt),
    tickPrinterBlame,
    tickEvents,
  ];
  return stages.reduce((acc, stage) => stage(acc), s);
}

function move(s: GameState, pid: string, x: number, z: number, yaw: number, air: boolean): GameState {
  const p = s.players[pid];
  if (p.busy) return patchPlayer(s, pid, { yaw, airborne: false });
  const target = { x, z };
  const allowed = MAX_MOVE_SPEED * (s.time - p.movedAt) + MOVE_SLACK_METERS;
  if (dist(p, target) > allowed) return s;
  return patchPlayer(s, pid, { ...target, yaw, airborne: air, movedAt: s.time });
}

export function applyCommand(s: GameState, pid: string, cmd: Command): GameState {
  if (!s.players[pid]) return s;
  switch (cmd.t) {
    case 'move':
      return move(s, pid, cmd.x, cmd.z, cmd.yaw, cmd.air);
    case 'act':
      return startAct(s, pid, cmd.act, cmd.target);
    case 'cancel':
      return cancelBusy(s, pid);
    case 'mg':
      return finishMinigame(s, pid, cmd.ok);
    case 'buy':
      return buy(s, pid, cmd.item);
    case 'start': {
      if (pid !== s.hostId || s.phase !== 'lobby') return s;
      return startDay(mapPlayers(s, (p) => resetStats(p, s.time)), 1);
    }
    case 'restart': {
      if (pid !== s.hostId || s.phase !== 'final') return s;
      return { ...mapPlayers(s, (p) => resetStats(p, s.time)), phase: 'lobby', day: 0, event: null };
    }
    default:
      return s;
  }
}

/** A player who joins mid-day wakes up at home like everyone else did. */
export function onJoin(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  if (s.phase !== 'day' || !p) return s;
  return patchPlayer(s, pid, { ...homeSpawn(p.deskIndex), stage: 'home', energy: HOME_ENERGY, movedAt: s.time, spawnSeq: p.spawnSeq + 1 });
}
