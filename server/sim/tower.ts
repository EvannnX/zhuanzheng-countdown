import { BADGE_FAIL_CHANCE, LIFT_BOSS_CAPACITY, LIFT_BOSS_EVERY, LIFT_CAPACITY, LIFT_RIDE_SECONDS, LIFT_TALKS, LOBBY_GATE_SLACK } from '../../shared/constants.ts';
import { inRect } from '../../shared/geometry.ts';
import { liftAt, liftDoorsClose } from '../../shared/hazards.ts';
import type { ActKind } from '../../shared/protocol.ts';
import { LOBBY_GATE_Z, TOWER_FACADE_Z, TOWER_LOBBY, dispatchSpawn, liftSpawn, lobbySpawn } from '../../shared/world.ts';
import type { Station } from '../../shared/world.ts';
import { activePlayers, patchPlayer, playerList, roll, say } from './state.ts';
import type { GameState, Player } from './state.ts';
import { arrive, clockIn, cohortMates, option, teleport } from './travel.ts';
import type { Option } from './travel.ts';

const DOWN_STATION = 'lift12';
/** How far inside the facade counts as having come through the revolving door. */
const DOOR_DEPTH = 0.4;
const GUARD_PUSH_METERS = 1.2;

const liftCohort = (cycle: number, down: boolean): string => `${down ? 'liftdown' : 'liftup'}:${cycle}`;
/** The director jumps the queue on a fixed rhythm, leaving room for one intern. */
export const bossCuts = (cycle: number): boolean => cycle % LIFT_BOSS_EVERY === LIFT_BOSS_EVERY - 1;
export const liftCapacity = (cycle: number): number => (bossCuts(cycle) ? LIFT_BOSS_CAPACITY : LIFT_CAPACITY);

function liftOption(s: GameState, st: Station, down: boolean): Option {
  const lift = liftAt(s.time, down);
  if (!lift.doorsOpen) return option('lift', st.id, `电梯在 ${lift.floor} 楼，每层都停……`, true);
  if (!down && st.id !== `lift${lift.door}`) return option('lift', st.id, `开门的是 ${lift.door + 1} 号梯，快过去`, true);
  const aboard = cohortMates(s, liftCohort(lift.cycle, down)).length;
  const capacity = liftCapacity(lift.cycle);
  if (aboard >= capacity) return option('lift', st.id, bossCuts(lift.cycle) ? '王总监带客户插队，满员了，等下一趟' : '满员了，等下一趟', true);
  return option('lift', st.id, bossCuts(lift.cycle) ? '王总监插队占了大半部，贴门挤进去' : `挤进电梯（${aboard}/${capacity}）`);
}

/** What the lobby turnstiles, the lifts and the director's desk offer on the way in (and out). */
export function towerOptions(s: GameState, p: Player, st: Station): Option[] {
  switch (st.type) {
    case 'badge':
      return p.stage === 'lobby' && !p.badged ? [option('badge', st.id, '刷工牌')] : [];
    case 'liftCall':
      if (p.stage !== 'lobby') return [];
      return [p.badged ? liftOption(s, st, false) : option('lift', st.id, '先回闸机刷工牌', true)];
    case 'liftDown':
      if (p.stage !== 'dispatch') return [];
      return [p.hasSlip ? liftOption(s, st, true) : option('lift', st.id, '先去总监办公室领外派单', true)];
    case 'bossdesk':
      return p.stage === 'dispatch' && !p.hasSlip ? [option('slip', st.id, '领外派单')] : [];
    default:
      return [];
  }
}

function swipe(s: GameState, pid: string): GameState {
  const [chance, rolled] = roll(s);
  if (chance < BADGE_FAIL_CHANCE) return say(rolled, pid, '工牌没反应，再刷一次', 'bad');
  return say(patchPlayer(rolled, pid, { badged: true }), pid, '滴——闸机开了。去等电梯', 'good');
}

function enterLift(s: GameState, pid: string, down: boolean): GameState {
  const p = s.players[pid];
  const lift = liftAt(s.time, down);
  const cohort = liftCohort(lift.cycle, down);
  if (!lift.doorsOpen || cohortMates(s, cohort).length >= liftCapacity(lift.cycle)) return s;
  const closes = liftDoorsClose(lift.cycle, down);
  const inside = patchPlayer(teleport(s, pid, liftSpawn(p.deskIndex, down)), pid, {
    stage: 'lift',
    cohort,
    liftDown: down,
    rideStartsAt: closes,
    rideEndsAt: closes + LIFT_RIDE_SECONDS,
    rideTalks: 0,
    busy: null,
  });
  return say(inside, pid, bossCuts(lift.cycle) ? '你贴着门站在王总监和客户中间，大气不敢出' : '挤进来了。每一层都有人按，慢慢熬', 'info');
}

/** Effects of the lobby and lift actions. Returns null for acts this module does not own. */
export function completeTower(s: GameState, pid: string, act: ActKind, target: string): GameState | null {
  switch (act) {
    case 'badge':
      return swipe(s, pid);
    case 'lift':
      return enterLift(s, pid, target === DOWN_STATION);
    case 'slip':
      return say(patchPlayer(s, pid, { hasSlip: true }), pid, '外派单到手：“甲方仓库，自带干粮”。回前台坐电梯下楼', 'alert');
    default:
      return null;
  }
}

/** Coming through the revolving door starts the lobby stage; the guard turns back anyone who has not swiped. */
export function tickLobby(s: GameState): GameState {
  return activePlayers(s).reduce((acc, p) => {
    if (!inRect(TOWER_LOBBY, p)) return acc;
    if (p.stage === 'plaza' && p.z > TOWER_FACADE_Z + DOOR_DEPTH) {
      return say(patchPlayer(acc, p.id, { stage: 'lobby' }), p.id, '进了大堂。先刷工牌过闸机，再去等电梯', 'alert');
    }
    if (p.stage !== 'lobby' || p.badged || p.z <= LOBBY_GATE_Z + LOBBY_GATE_SLACK) return acc;
    const back = patchPlayer(teleport(acc, p.id, { x: p.x, z: LOBBY_GATE_Z - GUARD_PUSH_METERS, yaw: p.yaw }), p.id, { busy: null });
    return say(back, p.id, '保安：“哎哎哎，刷卡！别跟着别人混进去。”', 'bad');
  }, s);
}

const STOP_LINES = ['门开了。外面站着十几个人，没人挤得进来，门又关上了', '有人把每一层都按亮了，没有人承认', '门一开，外面的人看了一眼，说“我等下一趟”'];
const CHAT_LINES = ['“最近忙吗？”“还行。”——然后是漫长的沉默', '同事小声问：“你们组……还招人吗？”', '王姐：“周末团建，自愿参加，不来的写个说明。”', '电梯里信号全无，你的周报卡在了“发送中”'];

/** The same line for everyone in the car: it is picked from the ride, not from chance. */
function talkLine(p: Player): string {
  const lines = p.rideTalks % 2 === 0 ? STOP_LINES : CHAT_LINES;
  return lines[Math.abs(Math.floor(p.rideStartsAt) + p.rideTalks) % lines.length];
}

function stepOut(s: GameState, p: Player): GameState {
  const free = { cohort: null, liftDown: false };
  if (p.liftDown) {
    const down = patchPlayer(teleport(s, p.id, lobbySpawn(p.deskIndex)), p.id, { ...free, stage: 'depart' });
    return say(down, p.id, '一楼到了。穿过大堂出旋转门，班车停在门口右手边', 'alert');
  }
  if (s.site === 'office') return arrive(patchPlayer(s, p.id, free), p.id);
  const up = patchPlayer(teleport(clockIn(s, p.id), p.id, dispatchSpawn(p.deskIndex)), p.id, { ...free, stage: 'dispatch' });
  return say(up, p.id, '刚到 12 楼就被通知：今天外派去甲方仓库！先去总监办公室领外派单', 'alert');
}

/** Lift riders overhear small talk on the way and all step out together at the end. */
export function tickLifts(s: GameState): GameState {
  return playerList(s).reduce((acc, p0) => {
    const p = acc.players[p0.id];
    if (p.stage !== 'lift' || p.fired) return acc;
    if (acc.time >= p.rideEndsAt) return stepOut(acc, p);
    const due = p.rideStartsAt + ((p.rideTalks + 1) * LIFT_RIDE_SECONDS) / (LIFT_TALKS + 1);
    if (p.rideTalks >= LIFT_TALKS || acc.time < due) return acc;
    return say(patchPlayer(acc, p.id, { rideTalks: p.rideTalks + 1 }), p.id, talkLine(p), 'info');
  }, s);
}
