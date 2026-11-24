import { VAN_DETOUR_SECONDS, VAN_DRIVER_REWARD, VAN_MAX_DETOURS, VAN_MIN_REMAINING, VAN_SEATS, VAN_SHORTCUT_SECONDS, VAN_TRIP_SECONDS, VAN_WAIT_SECONDS } from '../../shared/constants.ts';
import type { ActKind } from '../../shared/protocol.ts';
import { vanSeat } from '../../shared/world.ts';
import type { Station } from '../../shared/world.ts';
import { activePlayers, award, patchPlayer, say } from './state.ts';
import type { GameState, Player, Van } from './state.ts';
import { arrive, cohortMates, option, teleport } from './travel.ts';
import type { Option } from './travel.ts';

const DRIVE_TARGET = 'van';
const vanCohort = (trip: number): string => `van:${trip}`;
const riders = (s: GameState, van: Van): Player[] => cohortMates(s, vanCohort(van.trip));
/** The shuttle still standing at the kerb, if there is one. */
const boardingVan = (s: GameState): Van | undefined => s.vans.find((v) => !v.started);
const patchVan = (s: GameState, trip: number, patch: Partial<Van>): GameState => ({ ...s, vans: s.vans.map((v) => (v.trip === trip ? { ...v, ...patch } : v)) });
const tellRiders = (s: GameState, van: Van, text: string, tone: 'good' | 'bad' | 'alert'): GameState => riders(s, van).reduce((acc, p) => say(acc, p.id, text, tone), s);

/** The shuttle at the kerb: the first intern aboard has to drive, the rest ride. */
export function vanOptions(s: GameState, p: Player, st: Station): Option[] {
  if (st.type !== 'shuttle' || s.site !== 'warehouse') return [];
  if (p.stage !== 'depart') return p.stage === 'plaza' || p.stage === 'lobby' ? [option('ride', st.id, '班车还没发车：先上楼打卡', true)] : [];
  const van = boardingVan(s);
  if (!van) return [option('drive', st.id, '驾驶位空着：坐上去，今天你开车')];
  if (riders(s, van).length >= VAN_SEATS) return [option('ride', st.id, '坐满了，等下一辆', true)];
  return [option('ride', st.id, `上车坐后排（${Math.max(0, Math.ceil(van.leavesAt - s.time))} 秒后发车）`)];
}

function sitIn(s: GameState, pid: string, van: Van, seat: number): GameState {
  return patchPlayer(teleport(s, pid, vanSeat(seat)), pid, { stage: 'van', cohort: vanCohort(van.trip), seat: `van${seat}`, busy: null });
}

function takeWheel(s: GameState, pid: string): GameState {
  if (boardingVan(s) || s.players[pid].stage !== 'depart') return s;
  const leavesAt = s.time + VAN_WAIT_SECONDS;
  const van: Van = { trip: s.nextVanTrip, driverId: pid, leavesAt, arrivesAt: leavesAt + VAN_TRIP_SECONDS, started: false, detours: 0 };
  const seated = sitIn({ ...s, vans: [...s.vans, van], nextVanTrip: s.nextVanTrip + 1 }, pid, van, 0);
  return say(seated, 'all', `${s.players[pid].name} 坐上了班车驾驶位，${VAN_WAIT_SECONDS} 秒后发车，过时不候`, 'alert');
}

function hopIn(s: GameState, pid: string): GameState {
  const van = boardingVan(s);
  if (!van || s.players[pid].stage !== 'depart') return s;
  const aboard = riders(s, van).length;
  if (aboard >= VAN_SEATS) return s;
  return say(sitIn(s, pid, van, aboard), pid, '上车了。系好安全带，司机是你同事', 'info');
}

/** Effects of the shuttle actions. Returns null for acts this module does not own. */
export function completeVan(s: GameState, pid: string, act: ActKind): GameState | null {
  if (act === 'drive') return takeWheel(s, pid);
  if (act === 'ride') return hopIn(s, pid);
  return null;
}

const atWheel = (s: GameState, van: Van): GameState =>
  s.players[van.driverId]?.cohort === vanCohort(van.trip)
    ? patchPlayer(s, van.driverId, { busy: { kind: 'minigame', act: 'drive', target: DRIVE_TARGET, game: 'drive', startedAt: s.time } })
    : s;

function setOff(s: GameState, van: Van): GameState {
  const rolling = patchVan(s, van.trip, { started: true, arrivesAt: s.time + VAN_TRIP_SECONDS });
  return atWheel(tellRiders(rolling, van, '发车！司机跟着导航开，开错路全车陪你绕', 'alert'), van);
}

/** The driver finished (or botched) a stretch of navigation: the whole van gets there sooner or later. */
export function driveResult(s: GameState, pid: string, ok: boolean): GameState {
  const van = s.vans.find((v) => v.driverId === pid && v.started);
  const driver = s.players[pid];
  if (!van || !driver) return s;
  if (ok) {
    const arrivesAt = Math.max(s.time + VAN_MIN_REMAINING, van.arrivesAt - VAN_SHORTCUT_SECONDS);
    const sooner = award(patchVan(s, van.trip, { arrivesAt }), pid, VAN_DRIVER_REWARD);
    return tellRiders(sooner, van, `${driver.name} 抄了条近路，提前 ${VAN_SHORTCUT_SECONDS} 秒到！`, 'good');
  }
  const detours = van.detours + 1;
  const later = patchVan(s, van.trip, { detours, arrivesAt: van.arrivesAt + VAN_DETOUR_SECONDS });
  const told = tellRiders(later, van, `司机走错路了，全车绕路 +${VAN_DETOUR_SECONDS} 秒`, 'bad');
  // After too many wrong turns the sat-nav takes over, so nobody can hold the van hostage.
  return detours < VAN_MAX_DETOURS ? atWheel(told, { ...van, detours }) : say(told, pid, '导航接管了方向盘。你被请到了副驾', 'info');
}

/** Shuttles leave when everyone still on the way is aboard or the wait is up, and unload together at the warehouse. */
export function tickVans(s: GameState): GameState {
  return s.vans.reduce((acc, v0) => {
    const van = acc.vans.find((v) => v.trip === v0.trip);
    if (!van) return acc;
    const aboard = riders(acc, van);
    if (aboard.length === 0) return { ...acc, vans: acc.vans.filter((v) => v.trip !== van.trip) };
    if (!van.started) {
      const everyone = activePlayers(acc).every((p) => p.stage === 'work' || p.cohort === vanCohort(van.trip));
      return everyone || acc.time >= van.leavesAt ? setOff(acc, van) : acc;
    }
    if (acc.time < van.arrivesAt) return acc;
    const unloaded = aboard.reduce((st, p) => say(arrive(st, p.id), p.id, '到甲方仓库了，全车一起下', 'alert'), acc);
    return { ...unloaded, vans: unloaded.vans.filter((v) => v.trip !== van.trip) };
  }, s);
}
