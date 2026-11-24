import {
  ASSIST_REWARD,
  CATCH_COOLDOWN,
  BLAME_RANGE,
  FIX_REWARD,
  HOLD_SECONDS,
  INTEL_SECONDS,
  MAX_BANANAS,
  MAX_ENERGY,
  MINIGAME_MIN_SECONDS,
  PRINTER_JAM_CHANCE,
  REPAIRS_NEEDED,
  REPAIR_REWARD,
  REPORT_COOLDOWN,
  REPORT_REWARD,
  SNACK_ENERGY,
  STEAL_KEEP_RANGE,
  SUMMON_COOLDOWN,
  TAMPER_REWARD,
  TEA_SNACK_ENERGY,
  TIRED_HOLD_FACTOR,
  WORK_ENERGY_COST,
} from '../../shared/constants.ts';
import { dist } from '../../shared/geometry.ts';
import { findPath } from '../../shared/nav.ts';
import type { ActKind } from '../../shared/protocol.ts';
import { ITEM_NAMES, SHOP } from '../../shared/tasks.ts';
import type { GameKind, ShopItemId } from '../../shared/tasks.ts';
import { stationById } from '../../shared/world.ts';
import { COMMUTE_INSTANT, completeCommute } from './commute.ts';
import { misconduct } from './detection.ts';
import { dropBanana, shove } from './rivalry.ts';
import { driveResult } from './van.ts';
import { getPrompts, nearestStation } from './prompts.ts';
import { countTowardsGoal, helpersAt, liftInProgress, shortOfHands } from './teamwork.ts';
import { activePlayers, award, patchPlayer, resetTask, roll, say, warn } from './state.ts';
import type { GameState } from './state.ts';
import { replaceTask, workOn } from './tasks.ts';

const SLACK_ACTS = ['phone', 'sleep', 'stall', 'bench'] as const;
const INSTANT_ACTS: readonly ActKind[] = ['deliver', 'bribe', 'report', 'summon', 'drop', 'shove', 'banana', 'catch'];
type SlackAct = (typeof SLACK_ACTS)[number];
const isSlackAct = (act: ActKind): act is SlackAct => (SLACK_ACTS as readonly ActKind[]).includes(act);

function completeWork(s: GameState, pid: string, stationId: string): GameState {
  const p = s.players[pid];
  const st = stationById(stationId);
  const job = workOn(p, stationId);
  if (!job) return s;
  const tired = patchPlayer(s, pid, { energy: Math.max(0, p.energy - WORK_ENERGY_COST) });

  if (st?.type === 'printer') {
    const [chance, rolled] = roll(tired);
    if (chance < PRINTER_JAM_CHANCE) {
      const jammed = { ...rolled, printer: { broken: true, culpritId: pid } };
      return say(jammed, pid, '打印机卡纸了！修好它，或者趁没人看见甩锅', 'bad');
    }
    return finishStep(rolled, pid, stationId);
  }
  return finishStep(tired, pid, stationId);
}

/** Pay the interns who helped carry, and let go of their hands. */
function releaseHelpers(s: GameState, ownerId: string, stationId: string): GameState {
  const owner = s.players[ownerId];
  return helpersAt(s, ownerId, stationId).reduce((acc, h) => {
    const freed = patchPlayer(acc, h.id, { busy: null });
    return say(award(freed, h.id, ASSIST_REWARD), h.id, `帮 ${owner.name} 抬完了 KPI +${ASSIST_REWARD}`, 'good');
  }, s);
}

function finishStep(s0: GameState, pid: string, stationId: string): GameState {
  const job = workOn(s0.players[pid], stationId);
  if (!job) return s0;
  const { task, def, step } = job;
  const s = (step.crew ?? 1) > 1 ? releaseHelpers(s0, pid, stationId) : s0;
  const p = s.players[pid];
  const stepsDone = task.step + 1 >= def.steps.length;
  const ownItem = p.carrying?.taskUid === task.uid;
  if (stepsDone && !def.dests) {
    const cleared = ownItem ? patchPlayer(s, pid, { carrying: null }) : s;
    const paid = say(award(cleared, pid, def.kpi), pid, `完成「${def.title}」 KPI +${def.kpi}`, 'good');
    return countTowardsGoal(replaceTask(paid, pid, task.uid));
  }
  const tasks = p.tasks.map((t) => (t.uid === task.uid ? { ...t, step: t.step + 1 } : t));
  // The item only becomes deliverable once every step before the hand-over is done.
  const dest = stepsDone ? task.dest : null;
  const kind = step.gives ?? (ownItem ? p.carrying?.kind : undefined);
  const carrying = kind ? { kind, dest, kpi: def.kpi, taskUid: task.uid } : p.carrying;
  const next = def.steps[task.step + 1];
  const hint = next ? `下一步：${next.text}` : `最后一步：送到${stationById(task.dest ?? '')?.label ?? '目的地'}`;
  return say(patchPlayer(s, pid, { tasks, carrying }), pid, `「${def.title}」${hint}`, 'info');
}

function deliver(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  const item = p.carrying;
  if (!item) return s;
  const paid = award(patchPlayer(s, pid, { carrying: null }), pid, item.kpi);
  const told = say(paid, pid, `${ITEM_NAMES[item.kind]}已送达 KPI +${item.kpi}`, 'good');
  const own = item.taskUid && p.tasks.some((t) => t.uid === item.taskUid);
  const settled = own ? replaceTask(told, pid, item.taskUid as string) : told;
  return item.taskUid ? countTowardsGoal(settled) : settled;
}

function steal(s: GameState, pid: string, victimId: string): GameState {
  const thief = s.players[pid];
  const victim = s.players[victimId];
  if (!victim?.carrying || thief.carrying || dist(thief, victim) > STEAL_KEEP_RANGE) {
    return say(s, pid, '没抢到，对方溜了', 'info');
  }
  const item = victim.carrying;
  const moved = patchPlayer(patchPlayer(s, victimId, { carrying: null }), pid, { carrying: item });
  const reset = resetTask(moved, item.taskUid);
  const toldVictim = say(reset, victimId, `${thief.name} 抢走了你的${ITEM_NAMES[item.kind]}！`, 'bad');
  return say(toldVictim, pid, `抢到了${ITEM_NAMES[item.kind]}，送过去功劳就是你的`, 'good');
}

function blame(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  const others = activePlayers(s).filter((o) => o.id !== pid && dist(o, p) <= BLAME_RANGE);
  if (others.length === 0) return say(s, pid, '附近没有人可以甩锅', 'info');
  const scapegoat = others.reduce((a, b) => (dist(b, p) < dist(a, p) ? b : a));
  const shifted = { ...s, printer: { ...s.printer, culpritId: scapegoat.id } };
  return say(say(shifted, pid, `锅已经甩给 ${scapegoat.name}`, 'good'), scapegoat.id, '打印机坏了，现在责任人是你', 'bad');
}

function report(s: GameState, pid: string, targetId: string): GameState {
  const p = s.players[pid];
  const target = s.players[targetId];
  if (!target) return s;
  const cooled = patchPlayer(s, pid, { reportReadyAt: s.time + REPORT_COOLDOWN });
  if (misconduct(s, target) === 0) {
    return say(award(cooled, pid, -REPORT_REWARD), pid, `举报不实，KPI -${REPORT_REWARD}`, 'bad');
  }
  const warned = warn(cooled, targetId, 1, `${target.name} 被 ${p.name} 举报摸鱼，警告一次`);
  return say(award(warned, pid, REPORT_REWARD), pid, `举报成功 KPI +${REPORT_REWARD}`, 'good');
}

/** A sacked intern working as floor monitor writes up whoever they catch slacking. */
function catchSlacker(s: GameState, pid: string, targetId: string): GameState {
  const monitor = s.players[pid];
  const target = s.players[targetId];
  if (!target || !monitor.fired) return s;
  const cooled = patchPlayer(s, pid, { reportReadyAt: s.time + CATCH_COOLDOWN });
  if (misconduct(s, target) === 0) return say(cooled, pid, `${target.name} 这会儿在认真干活，没抓到`, 'info');
  return say(warn(cooled, targetId, 1, `监工 ${monitor.name} 抓到 ${target.name} 摸鱼，警告一次`), pid, '抓到了！王总很满意', 'good');
}

function summon(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  const npcs = s.npcs.map((n) => (n.id === 'boss' ? { ...n, path: findPath(n, p), waitUntil: 0 } : n));
  const called = patchPlayer({ ...s, npcs }, pid, { summonReadyAt: s.time + SUMMON_COOLDOWN });
  return say(called, 'all', '有人匿名举报，王总监正在赶往现场', 'alert');
}

function repair(s: GameState, pid: string): GameState {
  if (s.event?.type !== 'serverDown') return s;
  const repairs = s.event.repairs + 1;
  const paid = say(award(s, pid, REPAIR_REWARD), pid, `抢修进度 ${repairs}/${REPAIRS_NEEDED}`, 'good');
  if (repairs < REPAIRS_NEEDED) return { ...paid, event: { ...s.event, repairs } };
  return say({ ...paid, event: null }, 'all', '服务器恢复了，大家继续搬砖', 'good');
}

/** Apply the effect of an action that has finished (hold elapsed, minigame won, or instant). */
export function completeAct(s0: GameState, pid: string, act: ActKind, target: string): GameState {
  const s = patchPlayer(s0, pid, { busy: null });
  const p = s.players[pid];
  if (!p) return s0;
  const isTea = s.event?.type === 'teaTime';
  switch (act) {
    case 'work':
      return completeWork(s, pid, target);
    case 'deliver':
      return deliver(s, pid);
    case 'snack':
      return patchPlayer(s, pid, { carrying: { kind: 'snack', dest: null, kpi: 0, taskUid: null } });
    case 'eat': {
      const gain = isTea ? TEA_SNACK_ENERGY : SNACK_ENERGY;
      return patchPlayer(s, pid, { carrying: null, energy: Math.min(MAX_ENERGY, p.energy + gain) });
    }
    case 'tamper': {
      const edited = patchPlayer(award(s, pid, TAMPER_REWARD), pid, { tamperedDay: s.day });
      return say(edited, pid, `绩效表改好了 KPI +${TAMPER_REWARD}`, 'good');
    }
    case 'blame':
      return blame(s, pid);
    case 'steal':
      return steal(s, pid, target);
    case 'repair':
      return repair(s, pid);
    case 'jam':
      return say({ ...s, printer: { broken: true, culpritId: null } }, 'all', '打印机莫名其妙坏了……', 'alert');
    case 'fix': {
      const fixed = { ...s, printer: { broken: false, culpritId: null } };
      return say(award(fixed, pid, FIX_REWARD), pid, `打印机修好了 KPI +${FIX_REWARD}`, 'good');
    }
    case 'bribe': {
      const bribed = patchPlayer(s, pid, { carrying: null, intelUntil: s.time + INTEL_SECONDS });
      return say(bribed, pid, '保洁阿姨：总监和 HR 在哪我都告诉你（小地图已标出）', 'good');
    }
    case 'report':
      return report(s, pid, target);
    case 'catch':
      return catchSlacker(s, pid, target);
    case 'shove':
      return shove(s, pid, target);
    case 'banana':
      return dropBanana(s, pid);
    case 'summon':
      return summon(s, pid);
    case 'assist':
      return s;
    case 'drop':
      return resetTask(patchPlayer(s, pid, { carrying: null }), p.carrying?.taskUid ?? null);
    default:
      return completeCommute(s, pid, act, target) ?? s;
  }
}

export function startAct(s: GameState, pid: string, act: ActKind, target: string): GameState {
  const p = s.players[pid];
  if (!p) return s;
  const allowed = getPrompts(s, p).some((q) => q.act === act && q.target === target && !q.disabled);
  if (!allowed) return s;

  const hold = (seconds: number): GameState => {
    const duration = seconds * (p.energy <= 0 ? TIRED_HOLD_FACTOR : 1);
    return patchPlayer(s, pid, { busy: { kind: 'hold', act, target, startedAt: s.time, endsAt: s.time + duration } });
  };
  const minigame = (game: GameKind): GameState =>
    patchPlayer(s, pid, { busy: { kind: 'minigame', act, target, game, startedAt: s.time } });

  if (isSlackAct(act)) return patchPlayer(s, pid, { busy: { kind: 'slack', mode: act, target, startedAt: s.time } });
  if (INSTANT_ACTS.includes(act) || COMMUTE_INSTANT.includes(act)) return completeAct(s, pid, act, target);
  if (act === 'shop') return s;
  if (act === 'fix') return minigame('mash');
  if (act === 'work') {
    const st = stationById(target);
    const job = workOn(p, target);
    if (!job) return s;
    if (job.step.kind === 'minigame') return minigame(job.step.game ?? 'mash');
    const started = hold(job.step.seconds ?? 2);
    return (job.step.crew ?? 1) > 1 ? say(started, 'all', `${p.name} 在${st?.label}需要人搭把手：过去按 E 帮忙 KPI +${ASSIST_REWARD}`, 'alert') : started;
  }
  return hold(HOLD_SECONDS[act as keyof typeof HOLD_SECONDS] ?? 2);
}

export function finishMinigame(s: GameState, pid: string, ok: boolean): GameState {
  const busy = s.players[pid]?.busy;
  if (busy?.kind !== 'minigame') return s;
  const won = ok && s.time - busy.startedAt >= MINIGAME_MIN_SECONDS;
  if (busy.act === 'drive') return driveResult(patchPlayer(s, pid, { busy: null }), pid, won);
  if (!won) return patchPlayer(s, pid, { busy: null });
  return completeAct(s, pid, busy.act, busy.target);
}

export function cancelBusy(s: GameState, pid: string): GameState {
  const busy = s.players[pid]?.busy;
  // You cannot shake off being knocked down.
  if (!busy || (busy.kind === 'hold' && busy.act === 'stun')) return s;
  return patchPlayer(s, pid, { busy: null });
}

export function buy(s: GameState, pid: string, itemId: ShopItemId): GameState {
  const p = s.players[pid];
  const item = SHOP.find((i) => i.id === itemId);
  if (!p || !item || p.fired || s.phase !== 'day' || nearestStation(p)?.type !== 'shop') return s;
  if (p.kpi < item.price) return say(s, pid, '老张：KPI 不够，小本生意概不赊账', 'bad');
  if (itemId === 'slippers' && p.slippersDay === s.day) return say(s, pid, '老张：你脚上已经穿着一双了', 'info');
  if (itemId === 'banana' && p.bananas >= MAX_BANANAS) return say(s, pid, '老张：香蕉皮你兜里都装不下了', 'info');
  const perks = { fakeScreen: { fakeScreens: p.fakeScreens + 1 }, slippers: { slippersDay: s.day }, banana: { bananas: p.bananas + 1 } };
  const perk = perks[itemId];
  const paid = patchPlayer(s, pid, { kpi: p.kpi - item.price, ...perk });
  return say(paid, pid, `买到了${item.name}`, 'good');
}

/** Finish every hold whose timer has run out; lifts that are short of hands stand still. */
export function tickHolds(s: GameState, dt: number): GameState {
  return Object.values(s.players).reduce((acc, p) => {
    const busy = acc.players[p.id]?.busy;
    if (busy?.kind !== 'hold') return acc;
    if (busy.act === 'assist' && !liftInProgress(acc, busy.target)) return patchPlayer(acc, p.id, { busy: null });
    if (busy.act === 'work' && shortOfHands(acc, p.id)) {
      return patchPlayer(acc, p.id, { busy: { ...busy, startedAt: busy.startedAt + dt, endsAt: busy.endsAt + dt } });
    }
    if (acc.time < busy.endsAt) return acc;
    return completeAct(acc, p.id, busy.act, busy.target);
  }, s);
}
