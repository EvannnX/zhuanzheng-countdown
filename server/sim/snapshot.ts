import {
  COMMUTE_SECONDS,
  DAY_SECONDS,
  EXPOSE_SECONDS,
  GHOST_SPEED_FACTOR,
  SLIPPER_SPEED_FACTOR,
  TIRED_SPEED_FACTOR,
  TOTAL_DAYS,
} from '../../shared/constants.ts';
import { clamp } from '../../shared/geometry.ts';
import type { ActKind, BusyView, PlayerStatus, PlayerView, Snapshot, TaskView, YouView } from '../../shared/protocol.ts';
import { taskDef } from '../../shared/tasks.ts';
import { stationById } from '../../shared/world.ts';
import { morningTasks } from './commute.ts';
import { getPrompts } from './prompts.ts';
import { ownDeskId, playerList } from './state.ts';
import type { GameState, Player } from './state.ts';
import { ranking } from './step.ts';
import { taskTarget, taskText, workAt } from './tasks.ts';

const SNEAKY: readonly ActKind[] = ['steal', 'blame', 'tamper', 'snack', 'jam'];

const HOLD_LABELS: Partial<Record<ActKind, string>> = {
  snack: '翻零食柜…',
  eat: '吃零食…',
  tamper: '修改绩效表…',
  blame: '悄悄甩锅…',
  steal: '伸手…',
  repair: '抢修服务器…',
  jam: '搞破坏…',
  wash: '刷牙洗脸…',
  dress: '换衣服…',
  breakfast: '狼吞虎咽…',
  pancake: '等煎饼…',
  stun: '眼冒金星…',
};

function statusOf(p: Player): PlayerStatus {
  const busy = p.busy;
  if (!busy) return 'idle';
  if (busy.kind === 'slack') return busy.mode;
  if (busy.kind === 'hold' && busy.act === 'eat') return 'eat';
  if (busy.kind === 'hold' && SNEAKY.includes(busy.act)) return 'sneaky';
  return 'work';
}

const playerView = (p: Player): PlayerView => ({
  id: p.id,
  name: p.name,
  look: p.look,
  x: p.x,
  z: p.z,
  yaw: p.yaw,
  air: p.airborne,
  kpi: p.kpi,
  warnings: p.warnings,
  fired: p.fired,
  carrying: p.carrying?.kind ?? null,
  status: statusOf(p),
});

function busyView(s: GameState, p: Player): BusyView | null {
  const busy = p.busy;
  if (!busy) return null;
  if (busy.kind === 'slack') return { kind: 'slack', mode: busy.mode };
  if (busy.kind === 'minigame') return { kind: 'minigame', game: busy.game, token: busy.startedAt };
  const st = stationById(busy.target);
  const label = busy.act === 'work' && st ? `${workAt(p, st)?.step.verb ?? '忙碌'}…` : (HOLD_LABELS[busy.act] ?? '忙碌…');
  const progress = clamp((s.time - busy.startedAt) / (busy.endsAt - busy.startedAt), 0, 1);
  return { kind: 'hold', label, progress };
}

const taskViews = (p: Player): TaskView[] =>
  p.tasks.map((t) => ({
    uid: t.uid,
    title: taskDef(t.defId)?.title ?? '',
    text: taskText(t),
    kpi: taskDef(t.defId)?.kpi ?? 0,
    target: taskTarget(p, t),
  }));

function speedFactor(s: GameState, p: Player): number {
  if (p.fired) return GHOST_SPEED_FACTOR;
  const tired = p.energy <= 0 ? TIRED_SPEED_FACTOR : 1;
  const slippers = p.slippersDay === s.day ? SLIPPER_SPEED_FACTOR : 1;
  return tired * slippers;
}

const youView = (s: GameState, p: Player): YouView => ({
  id: p.id,
  energy: Math.round(p.energy),
  exposure: clamp(p.exposure / EXPOSE_SECONDS, 0, 1),
  tasks: p.stage === 'work' ? taskViews(p) : morningTasks(s, p),
  prompts: getPrompts(s, p),
  busy: busyView(s, p),
  fakeScreens: p.fakeScreens,
  hasSlippers: p.slippersDay === s.day && s.day > 0,
  bananas: p.bananas,
  hasIntel: s.time < p.intelUntil,
  speedFactor: speedFactor(s, p),
  deskId: ownDeskId(p),
  stage: p.stage,
  chased: s.npcs.some((n) => n.chase?.targetId === p.id),
  spawn: { seq: p.spawnSeq, x: p.x, z: p.z, yaw: p.yaw },
});

const WAKE_UP = 8 * 60;
const WORK_START = 9 * 60;
const WORK_MINUTES = 9 * 60;

/** 8:00 at the alarm, 9:00 when work starts, 18:00 at the end of the day. */
function clockMinutes(s: GameState): number {
  if (s.phase !== 'day') return WORK_START;
  const elapsed = s.time - s.dayStartedAt;
  if (elapsed < COMMUTE_SECONDS) return WAKE_UP + (elapsed / COMMUTE_SECONDS) * (WORK_START - WAKE_UP);
  return WORK_START + clamp((elapsed - COMMUTE_SECONDS) / (DAY_SECONDS - COMMUTE_SECONDS), 0, 1) * WORK_MINUTES;
}

/** One personalised snapshot per player. */
export function buildSnapshots(s: GameState): Map<string, Snapshot> {
  const timeLeft = s.phase === 'day' || s.phase === 'summary' ? Math.max(0, s.phaseEndsAt - s.time) : 0;
  const shared = {
    t: 'snap' as const,
    code: s.code,
    hostId: s.hostId,
    phase: s.phase,
    day: s.day,
    totalDays: TOTAL_DAYS,
    dayProgress: s.phase === 'day' ? clamp(1 - timeLeft / DAY_SECONDS, 0, 1) : 0,
    time: s.time,
    clock: clockMinutes(s),
    workIn: s.phase === 'day' ? Math.max(0, s.dayStartedAt + COMMUTE_SECONDS - s.time) : 0,
    site: s.site,
    timeLeft,
    players: playerList(s).map(playerView),
    npcs: s.npcs.map((n) => ({ id: n.id, x: n.x, z: n.z, yaw: n.yaw })),
    printerBroken: s.printer.broken,
    traps: s.traps.map((t) => ({ id: t.id, x: t.x, z: t.z })),
    event: s.event
      ? { type: s.event.type, timeLeft: Math.max(0, s.event.endsAt - s.time), repairs: s.event.repairs }
      : null,
    ranking: ranking(s),
  };
  return new Map(playerList(s).map((p) => [p.id, { ...shared, you: youView(s, p) }]));
}
