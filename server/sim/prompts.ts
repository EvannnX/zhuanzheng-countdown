import {
  ASSIST_REWARD,
  BRIBE_RANGE,
  FACE_TO_FACE_RANGE,
  INTERACT_RANGE,
  REPORT_HALF_ANGLE,
  REPORT_RANGE,
  STEAL_HALF_ANGLE,
  STEAL_RANGE,
} from '../../shared/constants.ts';
import { angleDiff, dist, segmentHitsRect, yawTo } from '../../shared/geometry.ts';
import type { Vec } from '../../shared/geometry.ts';
import type { ActKind, Prompt, PromptKey } from '../../shared/protocol.ts';
import { ITEM_NAMES } from '../../shared/tasks.ts';
import { SIGHT_BLOCKERS, STATIONS } from '../../shared/world.ts';
import type { Station } from '../../shared/world.ts';
import { commuteOptions } from './commute.ts';
import { canSee } from './travel.ts';
import { rivalryPrompts } from './rivalry.ts';
import { activePlayers, ownDeskId } from './state.ts';
import type { GameState, Player } from './state.ts';
import { NPC_TARGET, currentStep, workAt } from './tasks.ts';

type Option = Omit<Prompt, 'key'>;

const option = (act: ActKind, target: string, label: string, disabled = false): Option => ({
  act,
  target,
  label,
  disabled,
});

export const hasLineOfSight = (a: Vec, b: Vec): boolean => !SIGHT_BLOCKERS.some((r) => segmentHitsRect(a, b, r));

export function nearestStation(p: Vec): Station | null {
  const near = STATIONS.filter((s) => dist(s, p) <= INTERACT_RANGE);
  if (near.length === 0) return null;
  return near.reduce((a, b) => (dist(b, p) < dist(a, p) ? b : a));
}

/** The closest other intern roughly in front of the player. */
export function facingPlayer(s: GameState, p: Player, range: number, halfAngle: number): Player | null {
  const seen = activePlayers(s).filter(
    (o) =>
      o.id !== p.id &&
      canSee(p, o) &&
      dist(o, p) <= range &&
      Math.abs(angleDiff(yawTo(p, o), p.yaw)) <= halfAngle &&
      hasLineOfSight(p, o),
  );
  if (seen.length === 0) return null;
  return seen.reduce((a, b) => (dist(b, p) < dist(a, p) ? b : a));
}

const stallTaken = (s: GameState, stationId: string): boolean =>
  activePlayers(s).some((o) => o.busy?.kind === 'slack' && o.busy.target === stationId);

/** Someone else waiting at this station for a second pair of hands. */
export function liftWaiting(s: GameState, p: Player, st: Station): Player | null {
  return (
    activePlayers(s).find((o) => {
      if (o.id === p.id || o.busy?.kind !== 'hold' || o.busy.act !== 'work' || o.busy.target !== st.id) return false;
      return (workAt(o, st)?.step.crew ?? 1) > 1;
    }) ?? null
  );
}

function workOptions(p: Player, st: Station, printerBroken: boolean): Option[] {
  const job = workAt(p, st);
  if (!job) return [];
  if (st.type === 'printer' && printerBroken) return [option('work', st.id, '打印机卡纸了，先修好', true)];
  if (job.step.gives && p.carrying && p.carrying.taskUid !== job.task.uid) return [option('work', st.id, `${job.step.verb}（手上拿着东西）`, true)];
  return [option('work', st.id, job.step.verb)];
}

function stationOptions(s: GameState, p: Player, st: Station): Option[] {
  // Until work starts, the office's own stations are closed: only the commute is on offer.
  if (p.stage !== 'work') return commuteOptions(s, p, st);
  const out: Option[] = [];
  if (p.carrying?.dest === st.id) out.push(option('deliver', st.id, `上交${ITEM_NAMES[p.carrying.kind]}`));
  const lifter = liftWaiting(s, p, st);
  if (lifter) out.push(option('assist', st.id, `帮 ${lifter.name} 搭把手（KPI +${ASSIST_REWARD}）`));
  out.push(...workOptions(p, st, s.printer.broken));
  switch (st.type) {
    case 'printer':
      if (s.printer.broken) out.push(option('fix', st.id, '修打印机'));
      if (s.printer.broken && s.printer.culpritId === p.id) out.push(option('blame', st.id, '甩锅给附近的同事'));
      break;
    case 'desk':
      if (st.id === ownDeskId(p)) out.push(option('sleep', st.id, '趴桌睡觉'));
      break;
    case 'stall':
      out.push(option('stall', st.id, stallTaken(s, st.id) ? '隔间有人' : '带薪如厕', stallTaken(s, st.id)));
      break;
    case 'bench':
      out.push(option('bench', st.id, '坐下发呆'));
      break;
    case 'snack':
      if (!p.carrying) out.push(option('snack', st.id, s.event?.type === 'teaTime' ? '领下午茶' : '偷拿零食'));
      break;
    case 'perfpc':
      if (p.tamperedDay !== s.day) out.push(option('tamper', st.id, '偷改绩效表（高风险）'));
      break;
    case 'server':
      if (s.event?.type === 'serverDown') out.push(option('repair', st.id, '抢修服务器'));
      break;
    case 'shop':
      out.push(option('shop', st.id, '找老张买摸鱼道具'));
      break;
    default:
      out.push(...commuteOptions(s, p, st));
      break;
  }
  return out;
}

/** Stages done by walking up to a colleague, such as getting the director's signature. */
function faceToFace(s: GameState, p: Player): Prompt[] {
  for (const task of p.tasks) {
    const step = currentStep(task);
    const npc = step?.npc ? s.npcs.find((n) => n.id === step.npc) : undefined;
    if (step && npc && dist(npc, p) <= FACE_TO_FACE_RANGE) return [{ key: 'E', ...option('work', `${NPC_TARGET}${npc.id}`, step.verb) }];
  }
  return [];
}

function ghostPrompts(s: GameState, p: Player): Prompt[] {
  const out: Prompt[] = [];
  const st = nearestStation(p);
  if (st?.type === 'printer' && !s.printer.broken) out.push({ key: 'E', ...option('jam', st.id, '弄坏打印机') });
  const suspect = facingPlayer(s, p, REPORT_RANGE, REPORT_HALF_ANGLE);
  const canCatch = s.time >= p.reportReadyAt;
  if (suspect) out.push({ key: 'R', ...option('catch', suspect.id, canCatch ? `监工：抓 ${suspect.name} 摸鱼` : '刚抓过人，歇一会', !canCatch) });
  const ready = s.time >= p.summonReadyAt;
  out.push({ key: 'Q', ...option('summon', '', ready ? '匿名举报：把总监叫到这里' : '匿名举报冷却中', !ready) });
  return out;
}

/** Everything the player may do right now. Also the single source of truth for validation. */
export function getPrompts(s: GameState, p: Player): Prompt[] {
  if (s.phase !== 'day' || p.busy) return [];
  if (p.fired) return ghostPrompts(s, p);

  const stationKeys: PromptKey[] = ['E', 'F'];
  const st = nearestStation(p);
  const out: Prompt[] = (st ? stationOptions(s, p, st) : [])
    .slice(0, stationKeys.length)
    .map((o, i) => ({ key: stationKeys[i], ...o }));
  const fFree = (): boolean => !out.some((o) => o.key === 'F');

  if (!out.some((o) => o.key === 'E')) out.push(...faceToFace(s, p));
  // Packed into a lift or belted into the van, there is no room for dirty tricks.
  if (p.stage !== 'lift' && p.stage !== 'van') out.push(...rivalryPrompts(s, p));
  // Before clocking in there is nobody to report, rob or hide from.
  if (p.stage !== 'work') return out;

  const cleaner = s.npcs.find((n) => n.id === 'cleaner');
  if (cleaner && p.carrying?.kind === 'snack' && dist(cleaner, p) <= BRIBE_RANGE && fFree()) {
    out.push({ key: 'F', ...option('bribe', 'cleaner', '塞零食给保洁阿姨换情报') });
  }
  const victim = facingPlayer(s, p, STEAL_RANGE, STEAL_HALF_ANGLE);
  if (victim?.carrying && !p.carrying && fFree()) {
    out.push({ key: 'F', ...option('steal', victim.id, `抢走 ${victim.name} 的${ITEM_NAMES[victim.carrying.kind]}`) });
  }
  const suspect = facingPlayer(s, p, REPORT_RANGE, REPORT_HALF_ANGLE);
  if (suspect && s.time >= p.reportReadyAt) {
    out.push({ key: 'R', ...option('report', suspect.id, `举报 ${suspect.name} 摸鱼`) });
  }
  out.push({ key: 'Q', ...option('phone', '', '掏出手机摸鱼') });
  if (p.carrying?.kind === 'snack') out.push({ key: 'G', ...option('eat', '', '吃零食') });
  if (p.carrying) out.push({ key: 'X', ...option('drop', '', `扔掉${ITEM_NAMES[p.carrying.kind]}`) });
  return out;
}
