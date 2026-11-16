import { MAX_NAME_LENGTH } from './constants.ts';
import type { GameKind, ItemKind, ShopItemId, Site } from './tasks.ts';
import { SHOP } from './tasks.ts';
import type { NpcId } from './world.ts';

export type Phase = 'lobby' | 'day' | 'summary' | 'final';
export type EventKind = 'inspection' | 'serverDown' | 'meeting' | 'fireDrill' | 'teaTime' | 'rush';
/** How far through the morning an intern has got. */
export type Stage = 'home' | 'street' | 'subway' | 'work';
export type SlackMode = 'phone' | 'sleep' | 'stall' | 'bench';
export type Tone = 'good' | 'bad' | 'info' | 'alert';

export const ACT_KINDS = [
  'work', 'deliver', 'fix', 'blame', 'jam', 'sleep', 'stall', 'bench', 'phone', 'snack',
  'eat', 'tamper', 'repair', 'shop', 'steal', 'report', 'bribe', 'summon', 'drop',
  'wash', 'dress', 'breakfast', 'exit', 'pancake', 'enter', 'board', 'stun', 'shove', 'banana',
] as const;
export type ActKind = (typeof ACT_KINDS)[number];

export type PromptKey = 'E' | 'F' | 'R' | 'Q' | 'G' | 'X' | 'C' | 'V';

export interface Prompt {
  readonly key: PromptKey;
  readonly act: ActKind;
  readonly target: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export type PlayerStatus = 'idle' | 'work' | 'eat' | 'sneaky' | SlackMode;

export interface PlayerView {
  readonly id: string;
  readonly name: string;
  readonly look: number;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  /** In the middle of a jump. */
  readonly air: boolean;
  readonly kpi: number;
  readonly warnings: number;
  readonly fired: boolean;
  readonly carrying: ItemKind | null;
  readonly status: PlayerStatus;
}

export interface NpcView {
  readonly id: NpcId;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
}

export interface TaskView {
  readonly uid: string;
  readonly title: string;
  readonly text: string;
  readonly kpi: number;
  readonly target: string | null;
  /** Shown instead of a KPI number (morning chores). */
  readonly reward?: string;
  readonly done?: boolean;
}

export type BusyView =
  | { readonly kind: 'hold'; readonly label: string; readonly progress: number }
  | { readonly kind: 'minigame'; readonly game: GameKind; readonly token: number }
  | { readonly kind: 'slack'; readonly mode: SlackMode };

export interface YouView {
  readonly id: string;
  readonly energy: number;
  readonly exposure: number;
  readonly tasks: readonly TaskView[];
  readonly prompts: readonly Prompt[];
  readonly busy: BusyView | null;
  readonly fakeScreens: number;
  readonly hasSlippers: boolean;
  readonly bananas: number;
  readonly hasIntel: boolean;
  readonly speedFactor: number;
  readonly deskId: string;
  readonly stage: Stage;
  /** True while the boss or HR is running after you. */
  readonly chased: boolean;
  readonly spawn: { readonly seq: number; readonly x: number; readonly z: number; readonly yaw: number };
}

export interface RankRow {
  readonly id: string;
  readonly name: string;
  readonly kpi: number;
  readonly warnings: number;
  readonly fired: boolean;
  readonly promoted: boolean;
}

export interface Snapshot {
  readonly t: 'snap';
  readonly code: string;
  readonly hostId: string;
  readonly phase: Phase;
  readonly day: number;
  readonly totalDays: number;
  readonly dayProgress: number;
  /** Room clock in seconds; drives traffic and trains on every client. */
  readonly time: number;
  /** In-game time of day, minutes since midnight. */
  readonly clock: number;
  /** Seconds until work starts (0 once it has). */
  readonly workIn: number;
  readonly site: Site;
  readonly timeLeft: number;
  readonly players: readonly PlayerView[];
  readonly npcs: readonly NpcView[];
  readonly printerBroken: boolean;
  /** Banana peels lying on the floor. */
  readonly traps: readonly { readonly id: string; readonly x: number; readonly z: number }[];
  readonly event: { readonly type: EventKind; readonly timeLeft: number; readonly repairs: number } | null;
  readonly ranking: readonly RankRow[];
  readonly you: YouView;
}

export type ServerMsg =
  | Snapshot
  | { readonly t: 'joined'; readonly id: string; readonly code: string }
  | { readonly t: 'error'; readonly text: string }
  | { readonly t: 'toast'; readonly text: string; readonly tone: Tone };

export type Command =
  | { readonly t: 'move'; readonly x: number; readonly z: number; readonly yaw: number; readonly air: boolean }
  | { readonly t: 'act'; readonly act: ActKind; readonly target: string }
  | { readonly t: 'cancel' }
  | { readonly t: 'mg'; readonly ok: boolean }
  | { readonly t: 'buy'; readonly item: ShopItemId }
  | { readonly t: 'start' }
  | { readonly t: 'restart' };

export type ClientMsg =
  | Command
  | { readonly t: 'create'; readonly name: string }
  | { readonly t: 'join'; readonly name: string; readonly code: string };

const ROOM_CODE = /^\d{4}$/;
const MAX_TARGET_LENGTH = 40;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

export function cleanName(raw: string): string {
  const name = raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, MAX_NAME_LENGTH);
  return name.length > 0 ? name : '实习生';
}

/** Validate an untrusted client message. Returns null when malformed. */
export function parseClientMsg(raw: string): ClientMsg | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const m = data as Record<string, unknown>;
  switch (m.t) {
    case 'move':
      return isNum(m.x) && isNum(m.z) && isNum(m.yaw) ? { t: 'move', x: m.x, z: m.z, yaw: m.yaw, air: m.air === true } : null;
    case 'act':
      return isStr(m.target, MAX_TARGET_LENGTH) && (ACT_KINDS as readonly unknown[]).includes(m.act)
        ? { t: 'act', act: m.act as ActKind, target: m.target }
        : null;
    case 'cancel':
    case 'start':
    case 'restart':
      return { t: m.t };
    case 'mg':
      return typeof m.ok === 'boolean' ? { t: 'mg', ok: m.ok } : null;
    case 'buy':
      return SHOP.some((i) => i.id === m.item) ? { t: 'buy', item: m.item as ShopItemId } : null;
    case 'create':
      return isStr(m.name, 64) ? { t: 'create', name: cleanName(m.name) } : null;
    case 'join':
      return isStr(m.name, 64) && typeof m.code === 'string' && ROOM_CODE.test(m.code)
        ? { t: 'join', name: cleanName(m.name), code: m.code }
        : null;
    default:
      return null;
  }
}
