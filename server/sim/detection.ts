import {
  CHASE_SECONDS,
  CLOSE_SIGHT_RANGE,
  DESK_COVER_RANGE,
  EXPOSE_SECONDS,
  EXPOSURE_DECAY,
  HR_STALL_CHECK_RANGE,
  IMMUNE_SECONDS,
  INSPECTION_RANGE_BONUS,
  PRINTER_BLAME_RANGE,
} from '../../shared/constants.ts';
import { angleDiff, dist, segmentHitsRect, yawTo } from '../../shared/geometry.ts';
import type { ActKind } from '../../shared/protocol.ts';
import { NPC_NAMES, NPC_SIGHT, SIGHT_BLOCKERS, roomAt, stationById, stationOfType } from '../../shared/world.ts';
import { activePlayers, ownDeskId, patchPlayer, say, warn } from './state.ts';
import type { GameState, Npc, Player } from './state.ts';

const SNEAKY_HOLDS: readonly ActKind[] = ['steal', 'blame'];
const SNACK_HOLDS: readonly ActKind[] = ['snack', 'eat'];
const TAMPER_SEVERITY = 2;

/** 0 = behaving, 1 = slacking or scheming, 2 = serious offence. */
export function misconduct(s: GameState, p: Player): number {
  const busy = p.busy;
  if (!busy || p.fired) return 0;
  if (busy.kind === 'slack') return 1;
  if (busy.kind !== 'hold') return 0;
  if (busy.act === 'tamper') return TAMPER_SEVERITY;
  if (SNEAKY_HOLDS.includes(busy.act)) return 1;
  if (SNACK_HOLDS.includes(busy.act)) return s.event?.type === 'teaTime' ? 0 : 1;
  return 0;
}

const inStall = (p: Player): boolean => p.busy?.kind === 'slack' && p.busy.mode === 'stall';

export function npcSees(s: GameState, npc: Npc, p: Player): boolean {
  if (npc.id !== 'boss' && npc.id !== 'hr') return false;
  if (inStall(p)) {
    // Only HR dares to knock on the stall doors.
    if (npc.id !== 'hr' || roomAt(npc) !== 'restroom' || dist(npc, p) > HR_STALL_CHECK_RANGE) return false;
    // The divider wall keeps HR from "hearing" someone in the other restroom.
    return !SIGHT_BLOCKERS.some((r) => segmentHitsRect(npc, p, r));
  }
  const sight = NPC_SIGHT[npc.id];
  const bonus = npc.id === 'boss' && s.event?.type === 'inspection' ? INSPECTION_RANGE_BONUS : 0;
  const d = dist(npc, p);
  if (d > sight.range + bonus) return false;
  const facing = Math.abs(angleDiff(yawTo(npc, p), npc.yaw)) <= sight.halfAngle;
  if (!facing && d > CLOSE_SIGHT_RANGE) return false;
  return !SIGHT_BLOCKERS.some((r) => segmentHitsRect(npc, p, r));
}

function coveredByFakeScreen(p: Player): boolean {
  if (p.fakeScreens <= 0 || p.busy?.kind !== 'slack') return false;
  if (p.busy.mode !== 'sleep' && p.busy.mode !== 'phone') return false;
  const desk = stationById(ownDeskId(p));
  return desk !== undefined && dist(desk, p) <= DESK_COVER_RANGE;
}

function catchPlayer(s: GameState, p: Player, npc: Npc, severity: number): GameState {
  if (coveredByFakeScreen(p)) {
    const saved = patchPlayer(s, p.id, {
      fakeScreens: p.fakeScreens - 1,
      exposure: 0,
      immuneUntil: s.time + IMMUNE_SECONDS,
    });
    return say(saved, p.id, '假屏幕救了你一命，总监以为你在写代码', 'good');
  }
  const who = NPC_NAMES[npc.id];
  if (severity >= TAMPER_SEVERITY) return warn(s, p.id, severity, `${p.name} 偷改绩效表被${who}抓了个正着！`);
  if (inStall(p) || npc.chase) return warn(s, p.id, severity, `${p.name} 摸鱼被${who}抓了个正着！`);
  // Spotted, but not caught yet: run for it.
  const until = s.time + CHASE_SECONDS;
  const fleeing = patchPlayer(s, p.id, { busy: null, exposure: 0, immuneUntil: until });
  const npcs = fleeing.npcs.map((n) => (n.id === npc.id ? { ...n, chase: { targetId: p.id, until, repathAt: 0 } } : n));
  const told = say({ ...fleeing, npcs }, p.id, `${who}发现你在摸鱼，正朝你冲过来——快跑！`, 'alert');
  return say(told, 'all', `${who}正在追 ${p.name}`, 'info');
}

export function tickDetection(s: GameState, dt: number): GameState {
  const watchers = s.npcs.filter((n) => n.id === 'boss' || n.id === 'hr');
  return activePlayers(s).reduce((acc, p0) => {
    const p = acc.players[p0.id];
    const severity = misconduct(acc, p);
    const watcher = severity > 0 && acc.time >= p.immuneUntil ? watchers.find((n) => npcSees(acc, n, p)) : undefined;
    if (!watcher) {
      if (p.exposure === 0) return acc;
      return patchPlayer(acc, p.id, { exposure: Math.max(0, p.exposure - dt * EXPOSURE_DECAY) });
    }
    const exposure = p.exposure + dt;
    if (exposure < EXPOSE_SECONDS) return patchPlayer(acc, p.id, { exposure });
    return catchPlayer(acc, p, watcher, severity);
  }, s);
}

/** The boss walking past a broken printer pins it on whoever is responsible. */
export function tickPrinterBlame(s: GameState): GameState {
  const culprit = s.printer.culpritId;
  const boss = s.npcs.find((n) => n.id === 'boss');
  const printer = stationOfType('printer');
  if (!s.printer.broken || !culprit || !boss || !printer) return s;
  if (roomAt(boss) !== 'print' || dist(boss, printer) > PRINTER_BLAME_RANGE) return s;
  const cleared = { ...s, printer: { ...s.printer, culpritId: null } };
  const name = s.players[culprit]?.name ?? '某人';
  return warn(cleared, culprit, 1, `王总监发现打印机坏了，责任人 ${name} 被警告`);
}
