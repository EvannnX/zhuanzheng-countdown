import { IMMUNE_SECONDS, MAX_WARNINGS, RUSH_KPI_FACTOR, SERVER_DOWN_KPI_FACTOR, START_ENERGY } from '../../shared/constants.ts';
import type { Vec } from '../../shared/geometry.ts';
import type { ActKind, EventKind, Phase, SlackMode, Stage, Tone } from '../../shared/protocol.ts';
import { nextRandom } from '../../shared/rng.ts';
import type { GameKind, ItemKind, Site } from '../../shared/tasks.ts';
import { DESK_COUNT, NPC_START, WAREHOUSE_BOSS_START, deskId, deskSpawn } from '../../shared/world.ts';
import type { NpcId } from '../../shared/world.ts';

export interface Item {
  readonly kind: ItemKind;
  readonly dest: string | null;
  readonly kpi: number;
  readonly taskUid: string | null;
}

export interface TaskInstance {
  readonly uid: string;
  readonly defId: string;
  readonly step: number;
  readonly dest: string | null;
}

export type Busy =
  | { readonly kind: 'hold'; readonly act: ActKind; readonly target: string; readonly startedAt: number; readonly endsAt: number }
  | { readonly kind: 'minigame'; readonly act: ActKind; readonly target: string; readonly game: GameKind; readonly startedAt: number }
  | { readonly kind: 'slack'; readonly mode: SlackMode; readonly target: string; readonly startedAt: number };

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly look: number;
  readonly deskIndex: number;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly movedAt: number;
  readonly spawnSeq: number;
  readonly kpi: number;
  readonly energy: number;
  readonly warnings: number;
  readonly fired: boolean;
  readonly carrying: Item | null;
  readonly busy: Busy | null;
  readonly tasks: readonly TaskInstance[];
  readonly exposure: number;
  readonly immuneUntil: number;
  readonly reportReadyAt: number;
  readonly summonReadyAt: number;
  readonly intelUntil: number;
  readonly fakeScreens: number;
  readonly slippersDay: number;
  readonly tamperedDay: number;
  /** Last day the restroom told this intern one of its stories. */
  readonly stallStoryDay: number;
  readonly stage: Stage;
  readonly washed: boolean;
  readonly dressed: boolean;
  readonly ate: boolean;
  readonly pancake: boolean;
  /** Mid-jump: peels on the floor cannot trip you. */
  readonly airborne: boolean;
  /** No vehicle can hit the player again before this time. */
  readonly safeUntil: number;
  readonly shoveReadyAt: number;
  readonly bananas: number;
  /** KPI at this morning's alarm, to measure what was earned today. */
  readonly dayStartKpi: number;
  /** When the train, lift or van this intern is riding sets off and when it gets there. */
  readonly rideStartsAt: number;
  readonly rideEndsAt: number;
  /** The seat taken on the train or in the shuttle, if any. */
  readonly seat: string | null;
  /** Which train, lift or van the intern is in. Riders only ever see their own cohort. */
  readonly cohort: string | null;
  /** Lines of lift small talk already heard on this ride. */
  readonly rideTalks: number;
  /** Riding the lift down (away days) rather than up. */
  readonly liftDown: boolean;
  /** The lobby turnstile has accepted today's badge swipe. */
  readonly badged: boolean;
  /** Holding today's dispatch slip (away days). */
  readonly hasSlip: boolean;
  /** Punctuality has been settled for today. */
  readonly clockedIn: boolean;
}

/** One trip of the away-day shuttle. */
export interface Van {
  readonly trip: number;
  readonly driverId: string;
  readonly leavesAt: number;
  readonly arrivesAt: number;
  /** On the road: nobody else can board. */
  readonly started: boolean;
  readonly detours: number;
}

export interface Trap {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly ownerId: string;
}

export interface Chase {
  readonly targetId: string;
  readonly until: number;
  readonly repathAt: number;
}

export interface Npc extends Vec {
  readonly id: NpcId;
  readonly yaw: number;
  readonly path: readonly Vec[];
  readonly waitUntil: number;
  readonly chase: Chase | null;
}

export interface EventState {
  readonly type: EventKind;
  readonly endsAt: number;
  readonly repairs: number;
  readonly arrived: readonly string[];
}

export interface Outgoing {
  readonly to: string | 'all';
  readonly text: string;
  readonly tone: Tone;
}

export interface GameState {
  readonly code: string;
  readonly hostId: string;
  readonly phase: Phase;
  readonly day: number;
  readonly time: number;
  readonly phaseEndsAt: number;
  /** The opening film has already been shown to this room. */
  readonly introShown: boolean;
  readonly players: Readonly<Record<string, Player>>;
  readonly npcs: readonly Npc[];
  readonly printer: { readonly broken: boolean; readonly culpritId: string | null };
  readonly event: EventState | null;
  readonly eventQueue: readonly { readonly at: number; readonly type: EventKind }[];
  readonly seed: number;
  readonly nextUid: number;
  readonly outbox: readonly Outgoing[];
  /** Where today's work happens. */
  readonly site: Site;
  readonly dayStartedAt: number;
  readonly breakfastLeft: number;
  /** How many interns have clocked in today. */
  readonly arrivals: number;
  readonly traps: readonly Trap[];
  /** Department goal: tasks finished by anyone today against the target. */
  readonly okr: { readonly done: number; readonly goal: number };
  /** Shuttles that are boarding or on the road. */
  readonly vans: readonly Van[];
  readonly nextVanTrip: number;
}

/** On away days the boss comes along to supervise; everyone else stays at the office. */
export const freshNpcs = (site: Site = 'office'): Npc[] =>
  (Object.keys(NPC_START) as NpcId[]).map((id) => ({
    id,
    ...(id === 'boss' && site === 'warehouse' ? WAREHOUSE_BOSS_START : NPC_START[id]),
    path: [],
    waitUntil: 0,
    chase: null,
  }));

export function createGame(code: string, seed: number): GameState {
  return {
    code,
    hostId: '',
    phase: 'lobby',
    day: 0,
    time: 0,
    phaseEndsAt: 0,
    introShown: false,
    players: {},
    npcs: freshNpcs(),
    printer: { broken: false, culpritId: null },
    event: null,
    eventQueue: [],
    seed,
    nextUid: 1,
    outbox: [],
    site: 'office',
    dayStartedAt: 0,
    breakfastLeft: 0,
    arrivals: 0,
    traps: [],
    okr: { done: 0, goal: 0 },
    vans: [],
    nextVanTrip: 1,
  };
}

export const playerList = (s: GameState): Player[] => Object.values(s.players);
export const activePlayers = (s: GameState): Player[] => playerList(s).filter((p) => !p.fired);

export const patchPlayer = (s: GameState, id: string, patch: Partial<Player>): GameState =>
  s.players[id] ? { ...s, players: { ...s.players, [id]: { ...s.players[id], ...patch } } } : s;

export const say = (s: GameState, to: string | 'all', text: string, tone: Tone = 'info'): GameState => ({
  ...s,
  outbox: [...s.outbox, { to, text, tone }],
});

export const roll = (s: GameState): [number, GameState] => {
  const [value, seed] = nextRandom(s.seed);
  return [value, { ...s, seed }];
};

/** Nothing ridden, swiped or collected yet: how every intern starts a morning. */
export const FRESH_TRIP = { rideStartsAt: 0, rideEndsAt: 0, seat: null, cohort: null, rideTalks: 0, liftDown: false, badged: false, hasSlip: false, clockedIn: false } as const;

/** Reset the per-game stats, keeping identity and seat. */
export function resetStats(p: Player, time: number): Player {
  return {
    ...p,
    ...deskSpawn(p.deskIndex),
    movedAt: time,
    spawnSeq: p.spawnSeq + 1,
    kpi: 0,
    energy: START_ENERGY,
    warnings: 0,
    fired: false,
    carrying: null,
    busy: null,
    tasks: [],
    exposure: 0,
    immuneUntil: 0,
    reportReadyAt: 0,
    summonReadyAt: 0,
    intelUntil: 0,
    fakeScreens: 0,
    slippersDay: 0,
    tamperedDay: 0,
    stallStoryDay: 0,
    stage: 'work',
    washed: false,
    dressed: false,
    ate: false,
    pancake: false,
    airborne: false,
    dayStartKpi: 0,
    ...FRESH_TRIP,
    safeUntil: 0,
    shoveReadyAt: 0,
    bananas: 0,
  };
}

export function addPlayer(s: GameState, id: string, name: string): GameState {
  const taken = new Set(playerList(s).map((p) => p.deskIndex));
  const deskIndex = Array.from({ length: DESK_COUNT }, (_, i) => i).find((i) => !taken.has(i));
  if (deskIndex === undefined) return s;
  const blank = { id, name, look: deskIndex, deskIndex, spawnSeq: 0 } as Player;
  const player = resetStats(blank, s.time);
  return { ...s, hostId: s.hostId || id, players: { ...s.players, [id]: player } };
}

export function removePlayer(s: GameState, id: string): GameState {
  const { [id]: _gone, ...rest } = s.players;
  const hostId = s.hostId === id ? (Object.keys(rest)[0] ?? '') : s.hostId;
  const printer = s.printer.culpritId === id ? { ...s.printer, culpritId: null } : s.printer;
  return { ...s, players: rest, hostId, printer };
}

export const ownDeskId = (p: Player): string => deskId(p.deskIndex);

export function award(s: GameState, id: string, amount: number): GameState {
  const p = s.players[id];
  if (!p || p.fired) return s;
  const boost = s.event?.type === 'serverDown' ? SERVER_DOWN_KPI_FACTOR : s.event?.type === 'rush' ? RUSH_KPI_FACTOR : 1;
  const factor = amount > 0 ? boost : 1;
  return patchPlayer(s, id, { kpi: Math.max(0, Math.round(p.kpi + amount * factor)) });
}

/** Put a task back to its first step (its item was lost or stolen). */
export function resetTask(s: GameState, uid: string | null): GameState {
  if (!uid) return s;
  const owner = playerList(s).find((p) => p.tasks.some((t) => t.uid === uid));
  if (!owner) return s;
  return patchPlayer(s, owner.id, { tasks: owner.tasks.map((t) => (t.uid === uid ? { ...t, step: 0 } : t)) });
}

export function warn(s: GameState, id: string, severity: number, text: string): GameState {
  const p = s.players[id];
  if (!p || p.fired) return s;
  const warnings = Math.min(MAX_WARNINGS, p.warnings + severity);
  const base = { warnings, busy: null, exposure: 0, immuneUntil: s.time + IMMUNE_SECONDS };
  const warned = say(patchPlayer(s, id, base), 'all', text, 'bad');
  if (warnings < MAX_WARNINGS) return warned;
  const dropped = resetTask(warned, p.carrying?.taskUid ?? null);
  const fired = patchPlayer(dropped, id, { fired: true, carrying: null, tasks: [] });
  return say(fired, 'all', `${p.name} 被劝退了，被王总返聘成了监工：现在轮到他抓别人摸鱼`, 'alert');
}
