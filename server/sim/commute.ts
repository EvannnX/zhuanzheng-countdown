import {
  BOARD_DEPTH,
  BOARD_HALF_WIDTH,
  BREAKFAST_ENERGY,
  BREAKFAST_SHARE,
  HIT_ENERGY_COST,
  HIT_KPI_COST,
  HIT_PUSH_METERS,
  HIT_SAFE_SECONDS,
  HOLD_SECONDS,
  MAX_ENERGY,
  PANCAKE_ENERGY,
  PLAYER_RADIUS,
  RIDE_SECONDS,
  SEAT_ENERGY,
} from '../../shared/constants.ts';
import { AVENUE, laneHit, trainAt, trainDoorsClose } from '../../shared/hazards.ts';
import type { ActKind } from '../../shared/protocol.ts';
import { PLATFORM_EDGE_Z, STATIONS, TRAIN_DOOR_XS, areaAt, plazaSpawn, streetSpawn, subwaySpawn, trainSpawn } from '../../shared/world.ts';
import type { Station } from '../../shared/world.ts';
import { activePlayers, award, patchPlayer, playerList, resetTask, say } from './state.ts';
import type { GameState, Player } from './state.ts';
import { completeTower, tickLifts, tickLobby, towerOptions } from './tower.ts';
import { cohortMates, option, teleport } from './travel.ts';
import type { Option } from './travel.ts';
import { completeVan, tickVans, vanOptions } from './van.ts';

export { arrive } from './travel.ts';
export { morningTasks } from './morning.ts';

export const breakfastPortions = (players: number): number => Math.max(1, Math.ceil(players * BREAKFAST_SHARE));
/** Seats belong to one train: a later train's riders find them free again. */
export const seatTaken = (s: GameState, p: Player, seatId: string): boolean =>
  p.cohort !== null && cohortMates(s, p.cohort).some((o) => o.stage === 'train' && o.seat === seatId);

export const washing = (s: GameState, stationId: string): boolean =>
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
    case 'trainDoor':
      return [trainAt(s.time).doorsOpen ? option('board', st.id, '挤上地铁！') : option('board', st.id, '列车还没到站', true)];
    case 'seat':
      if (p.stage !== 'train' || p.seat) return [];
      return [seatTaken(s, p, st.id) ? option('seat', st.id, '有人坐了', true) : option('seat', st.id, `抢座位（精力 +${SEAT_ENERGY}）`)];
    default:
      return [...towerOptions(s, p, st), ...vanOptions(s, p, st)];
  }
}

export const COMMUTE_INSTANT: readonly ActKind[] = ['exit', 'enter', 'board', 'seat', 'lift', 'drive', 'ride'];

/** Step into the train that is standing at the platform. Everyone who boards it shares one car and one arrival. */
function board(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  const train = trainAt(s.time);
  if (!train.doorsOpen) return s;
  const closes = trainDoorsClose(train.cycle);
  const aboard = patchPlayer(teleport(s, pid, trainSpawn(p.deskIndex)), pid, {
    stage: 'train',
    cohort: `train:${train.cycle}`,
    rideStartsAt: closes,
    rideEndsAt: closes + RIDE_SECONDS,
    seat: null,
    busy: null,
  });
  return say(aboard, pid, '挤上来了！抢个座位回点精力，站稳扶好', 'good');
}

/** How far in front of the seat back a rider's hips end up. */
const SEAT_DEPTH = 0.12;
const nearestSeat = (p: Player): Station | undefined =>
  STATIONS.filter((st) => st.type === 'seat').sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];

function takeSeat(s: GameState, pid: string): GameState {
  const p = s.players[pid];
  const st = nearestSeat(p);
  if (!st || p.seat || seatTaken(s, p, st.id)) return s;
  const sat = patchPlayer(teleport(s, pid, { x: st.ax, z: st.az + SEAT_DEPTH, yaw: 0 }), pid, { seat: st.id, energy: Math.min(MAX_ENERGY, p.energy + SEAT_ENERGY) });
  return say(sat, pid, `坐下了，精力 +${SEAT_ENERGY}。到站自动起身`, 'good');
}

/** Effects of the morning actions. Returns null for acts this module does not own. */
export function completeCommute(s: GameState, pid: string, act: ActKind, target = ''): GameState | null {
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
      return say(patchPlayer(teleport(s, pid, subwaySpawn(p.deskIndex)), pid, { stage: 'subway' }), pid, '穿过闸机，车门一开就走进去', 'alert');
    case 'board':
      return board(s, pid);
    case 'seat':
      return takeSeat(s, pid);
    default:
      return completeTower(s, pid, act, target) ?? completeVan(s, pid, act);
  }
}

/** Walking up to an open train door is enough to board: no key press needed. */
function tickBoarding(s: GameState): GameState {
  if (!trainAt(s.time).doorsOpen) return s;
  return activePlayers(s).reduce((acc, p) => {
    const atDoor = p.z >= PLATFORM_EDGE_Z - BOARD_DEPTH && TRAIN_DOOR_XS.some((x) => Math.abs(p.x - x) <= BOARD_HALF_WIDTH);
    return p.stage === 'subway' && !p.busy && atDoor ? board(acc, p.id) : acc;
  }, s);
}

/** A train's riders all step off together when it pulls in. */
function tickTrains(s: GameState): GameState {
  return playerList(s).reduce((acc, p) => {
    if (p.stage !== 'train' || p.fired || acc.time < p.rideEndsAt) return acc;
    const out = patchPlayer(teleport(acc, p.id, plazaSpawn(p.deskIndex)), p.id, { stage: 'plaza', seat: null, cohort: null });
    return say(out, p.id, '到站了！等绿灯过马路，从旋转门进鲸跃大厦', 'alert');
  }, s);
}

/** Everything that moves interns along without them pressing a key. */
export const tickRides = (s: GameState): GameState => tickVans(tickLifts(tickLobby(tickTrains(tickBoarding(s)))));

const KERB_METERS = PLAYER_RADIUS + 0.4;

/** Anyone standing where a car or forklift is gets knocked flat. */
export function tickHazards(s: GameState): GameState {
  return activePlayers(s).reduce((acc, p0) => {
    const p = acc.players[p0.id];
    const area = areaAt(p);
    if ((area !== 'street' && area !== 'warehouse' && area !== 'plaza') || acc.time < p.safeUntil) return acc;
    const lane = laneHit(area, p.x, p.z, acc.time);
    if (!lane) return acc;
    // On the street you are thrown back to the kerb you came from; in the warehouse to the nearer side.
    const side = area === 'street' || p.z < lane.z ? -1 : 1;
    const beside = lane.z + side * (lane.width / 2 + HIT_PUSH_METERS + PLAYER_RADIUS);
    // The avenue is four lanes wide: you land back on the sidewalk you set out from.
    const z = area !== 'plaza' ? beside : p.stage === 'depart' ? AVENUE.z1 + KERB_METERS : AVENUE.z0 - KERB_METERS;
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
