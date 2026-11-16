import {
  BREAKFAST_ENERGY,
  BREAKFAST_SHARE,
  COMMUTE_SECONDS,
  FIRST_ARRIVAL_REWARD,
  HIT_ENERGY_COST,
  HIT_KPI_COST,
  HIT_PUSH_METERS,
  HIT_SAFE_SECONDS,
  HOLD_SECONDS,
  LATE_PENALTY,
  MAX_ENERGY,
  ON_TIME_REWARD,
  PAJAMAS_PENALTY,
  PANCAKE_ENERGY,
  PLAYER_RADIUS,
  TRAIN_SHARE,
  UNWASHED_PENALTY,
} from '../../shared/constants.ts';
import { laneHit, trainAt } from '../../shared/hazards.ts';
import type { ActKind, Prompt, TaskView } from '../../shared/protocol.ts';
import { areaAt, deskSpawn, streetSpawn, subwaySpawn, warehouseSpawn } from '../../shared/world.ts';
import type { Station } from '../../shared/world.ts';
import { activePlayers, award, patchPlayer, playerList, resetTask, say } from './state.ts';
import type { GameState, Player } from './state.ts';
import { fillTasks } from './tasks.ts';

type Option = Omit<Prompt, 'key'>;
const option = (act: ActKind, target: string, label: string, disabled = false): Option => ({ act, target, label, disabled });

export const breakfastPortions = (players: number): number => Math.max(1, Math.ceil(players * BREAKFAST_SHARE));
const trainCapacity = (s: GameState): number => Math.max(1, Math.ceil(playerList(s).length * TRAIN_SHARE));

const washing = (s: GameState, stationId: string): boolean =>
  activePlayers(s).some((o) => o.busy?.kind === 'hold' && o.busy.act === 'wash' && o.busy.target === stationId);

/** What a station in the flat, on the street or on the platform offers. */
export function commuteOptions(s: GameState, p: Player, st: Station): Option[] {
  switch (st.type) {
    case 'wash':
      if (p.washed) return [];
      return [washing(s, st.id) ? option('wash', st.id, '有人在用，排队中', true) : option('wash', st.id, '洗漱')];
    case 'dress':
      return p.dressed ? [] : [option('dress', st.id, '换上白衬衫')];
    case 'breakfast':
      if (p.ate) return [];
      return [s.breakfastLeft > 0 ? option('breakfast', st.id, `吃早餐（还剩 ${s.breakfastLeft} 份）`) : option('breakfast', st.id, '早餐被室友抢光了', true)];
    case 'homeDoor':
      return [option('exit', st.id, '出门上班')];
    case 'pancake':
      return p.pancake ? [] : [option('pancake', st.id, '买个煎饼果子（恢复精力）')];
    case 'subwayGate':
      return [option('enter', st.id, '进地铁站')];
    case 'trainDoor': {
      const train = trainAt(s.time);
      if (!train.doorsOpen) return [option('board', st.id, '列车还没到站', true)];
      const boarded = s.train.cycle === train.cycle ? s.train.boarded : 0;
      return [boarded < trainCapacity(s) ? option('board', st.id, '挤上地铁！') : option('board', st.id, '挤不上去了，等下一班', true)];
    }
    default:
      return [];
  }
}

export const COMMUTE_INSTANT: readonly ActKind[] = ['exit', 'enter', 'board'];

function teleport(s: GameState, pid: string, to: { x: number; z: number; yaw: number }): GameState {
  const p = s.players[pid];
  return patchPlayer(s, pid, { ...to, movedAt: s.time, spawnSeq: p.spawnSeq + 1 });
}

/** Clock in: move to the day's workplace, hand out tasks, settle the morning's bonuses and fines. */
export function arrive(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  if (!p || p.stage === 'work') return s;
  const spawn = s.site === 'office' ? deskSpawn(p.deskIndex) : warehouseSpawn(p.deskIndex);
  const moved = patchPlayer(teleport(s, pid, spawn), pid, { stage: 'work', busy: null });
  const isFirst = s.arrivals === 0;
  const isLate = s.time > s.dayStartedAt + COMMUTE_SECONDS;
  let next = fillTasks({ ...moved, arrivals: s.arrivals + 1 }, pid);
  const where = s.site === 'office' ? '公司' : '外派仓库';
  if (isLate) next = say(award(next, pid, -LATE_PENALTY), 'all', `${p.name} 迟到了，扣全勤 KPI -${LATE_PENALTY}`, 'bad');
  else if (isFirst) next = say(award(next, pid, FIRST_ARRIVAL_REWARD), 'all', `${p.name} 第一个到${where}！KPI +${FIRST_ARRIVAL_REWARD}`, 'good');
  else next = say(award(next, pid, ON_TIME_REWARD), pid, `准时打卡 KPI +${ON_TIME_REWARD}`, 'good');
  if (!p.dressed) next = say(award(next, pid, -PAJAMAS_PENALTY), 'all', `${p.name} 穿着睡衣来上班 KPI -${PAJAMAS_PENALTY}`, 'bad');
  if (!p.washed) next = say(award(next, pid, -UNWASHED_PENALTY), pid, `没洗漱，蓬头垢面 KPI -${UNWASHED_PENALTY}`, 'bad');
  return next;
}

/** Effects of the morning actions. Returns null for acts this module does not own. */
export function completeCommute(s: GameState, pid: string, act: ActKind): GameState | null {
  const p = s.players[pid];
  switch (act) {
    case 'wash':
      return say(patchPlayer(s, pid, { washed: true }), pid, '洗漱完毕，人模人样', 'good');
    case 'dress':
      return say(patchPlayer(s, pid, { dressed: true }), pid, '换好衣服，戴上工牌', 'good');
    case 'breakfast': {
      if (s.breakfastLeft <= 0) return say(s, pid, '慢了一步，早餐没了', 'bad');
      const fed = patchPlayer(s, pid, { ate: true, energy: Math.min(MAX_ENERGY, p.energy + BREAKFAST_ENERGY) });
      return say({ ...fed, breakfastLeft: s.breakfastLeft - 1 }, pid, '吃饱了，精力大涨', 'good');
    }
    case 'pancake':
      return say(patchPlayer(s, pid, { pancake: true, energy: Math.min(MAX_ENERGY, p.energy + PANCAKE_ENERGY) }), pid, '煎饼果子加蛋，真香', 'good');
    case 'exit':
      return say(patchPlayer(teleport(s, pid, streetSpawn(p.deskIndex)), pid, { stage: 'street' }), pid, '冲！过两条马路到地铁口，小心车（空格可以跳）', 'alert');
    case 'enter':
      return say(patchPlayer(teleport(s, pid, subwaySpawn(p.deskIndex)), pid, { stage: 'subway' }), pid, '车门一开就按 E 挤上去，每班车位置有限', 'alert');
    case 'board': {
      const train = trainAt(s.time);
      const boarded = s.train.cycle === train.cycle ? s.train.boarded : 0;
      if (!train.doorsOpen || boarded >= trainCapacity(s)) return s;
      return arrive({ ...s, train: { cycle: train.cycle, boarded: boarded + 1 } }, pid);
    }
    default:
      return null;
  }
}

/** Anyone standing where a car or forklift is gets knocked flat. */
export function tickHazards(s: GameState): GameState {
  return activePlayers(s).reduce((acc, p0) => {
    const p = acc.players[p0.id];
    const area = areaAt(p);
    if ((area !== 'street' && area !== 'warehouse') || acc.time < p.safeUntil) return acc;
    const lane = laneHit(area, p.x, p.z, acc.time);
    if (!lane) return acc;
    // On the street you are thrown back to the kerb you came from; in the warehouse to the nearer side.
    const side = area === 'street' || p.z < lane.z ? -1 : 1;
    const z = lane.z + side * (lane.width / 2 + HIT_PUSH_METERS + PLAYER_RADIUS);
    const dropped = resetTask(acc, p.carrying?.taskUid ?? null);
    const flat = patchPlayer(teleport(dropped, p.id, { x: p.x, z, yaw: p.yaw }), p.id, {
      carrying: null,
      energy: Math.max(0, p.energy - HIT_ENERGY_COST),
      safeUntil: acc.time + HOLD_SECONDS.stun + HIT_SAFE_SECONDS,
      busy: { kind: 'hold', act: 'stun', target: '', startedAt: acc.time, endsAt: acc.time + HOLD_SECONDS.stun },
    });
    if (lane.kind === 'forklift') return say(award(flat, p.id, -HIT_KPI_COST), 'all', `${p.name} 被叉车铲飞了 KPI -${HIT_KPI_COST}`, 'bad');
    return say(flat, 'all', `${p.name} 被${lane.kind === 'bus' ? '公交车' : '车'}撞飞了！`, 'bad');
  }, s);
}

const chore = (uid: string, title: string, text: string, reward: string, target: string, done: boolean): TaskView => ({
  uid,
  title,
  text,
  kpi: 0,
  reward,
  target: done ? null : target,
  done,
});

/** The to-do list shown before the intern has clocked in. */
export function morningTasks(s: GameState, p: Player): TaskView[] {
  if (p.stage === 'home') {
    return [
      chore('wash', '洗漱', '两个洗漱台，要排队', '不洗 -KPI', washing(s, 'wash0') ? 'wash1' : 'wash0', p.washed),
      chore('dress', '换衣服', '去衣柜换下睡衣', '不换 -KPI', 'wardrobe', p.dressed),
      chore('eat', '吃早餐', `冰箱里只剩 ${s.breakfastLeft} 份`, '+精力', 'fridge', p.ate),
      chore('exit', '出门', '9:00 前到岗，否则算迟到', '必做', 'homedoor', false),
    ];
  }
  if (p.stage === 'street') {
    return [
      chore('pancake', '煎饼果子', '两条马路中间的小摊', '+精力', 'pancake', p.pancake),
      chore('gate', '去地铁口', '穿过两条马路，被撞会晕 2 秒', '必做', 'gate', false),
    ];
  }
  return [chore('board', '挤上地铁', '车门打开时按 E，先到先上', '必做', 'traindoor1', false)];
}
