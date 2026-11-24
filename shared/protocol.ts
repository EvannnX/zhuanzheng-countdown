import { MAX_NAME_LENGTH } from './constants.ts';
import type { GameKind, ItemKind, ShopItemId, Site } from './tasks.ts';
import { SHOP } from './tasks.ts';
import type { NpcId } from './world.ts';

export type Phase = 'lobby' | 'intro' | 'day' | 'summary' | 'final';
export type EventKind = 'inspection' | 'serverDown' | 'meeting' | 'fireDrill' | 'teaTime' | 'rush';
/** How far through the morning an intern has got. */
/**
 * Office days: home → street → subway → train → plaza → lobby → lift → work.
 * Away days carry on after the lift: dispatch (12F) → lift (down) → depart → van → work.
 */
export type Stage = 'home' | 'street' | 'subway' | 'train' | 'plaza' | 'lobby' | 'lift' | 'dispatch' | 'depart' | 'van' | 'work';
export type SlackMode = 'phone' | 'sleep' | 'stall' | 'bench';
export type Tone = 'good' | 'bad' | 'info' | 'alert';

export const ACT_KINDS = [
  'work', 'deliver', 'fix', 'blame', 'jam', 'sleep', 'stall', 'bench', 'phone', 'snack',
  'eat', 'tamper', 'repair', 'shop', 'steal', 'report', 'bribe', 'summon', 'drop',
  'wash', 'dress', 'breakfast', 'exit', 'pancake', 'enter', 'board', 'stun', 'shove', 'banana', 'assist', 'seat', 'catch', 'badge', 'lift', 'slip', 'drive', 'ride',
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

export type PlayerStatus = 'idle' | 'work' | 'eat' | 'wash' | 'dress' | 'seated' | 'sneaky' | SlackMode;

export interface PlayerView {
  readonly id: string;
  readonly name: string;
  readonly look: number;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  /** In the middle of a jump. */
  readonly air: boolean;
  /** Still in pyjamas: has not changed at the wardrobe today. */
  readonly pajamas: boolean;
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
  /** The colleague to find when the stage is done face to face. */
  readonly targetNpc?: NpcId;
  /** Finished steps and total steps (a final delivery counts as one). */
  readonly step?: number;
  readonly steps?: number;
  /** Shown instead of a KPI number (morning chores). */
  readonly reward?: string;
  readonly done?: boolean;
}

export type BusyView =
  | { readonly kind: 'hold'; readonly act: ActKind; readonly label: string; readonly progress: number }
  | { readonly kind: 'minigame'; readonly game: GameKind; readonly token: number; readonly label: string }
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
  /** Sitting on the train or in the shuttle: the camera drops and you stay put. */
  readonly seated: boolean;
  /** The train, lift or van you are in has set off. */
  readonly rolling: boolean;
  /** Punctuality is settled: the morning countdown no longer applies. */
  readonly clockedIn: boolean;
  readonly spawn: { readonly seq: number; readonly x: number; readonly z: number; readonly yaw: number };
}

export interface RankRow {
  readonly id: string;
  readonly name: string;
  readonly kpi: number;
  /** KPI earned since this morning: the race that ends the day. */
  readonly today: number;
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
  /** Department goal everyone works towards together. */
  readonly okr: { readonly done: number; readonly goal: number };
  /** The day ends when the best earner of the day reaches `target`. */
  readonly dayGoal: { readonly target: number; readonly best: number; readonly leader: string };
  readonly you: YouView;
}

export type ServerMsg =
  | Snapshot
  | { readonly t: 'joined'; readonly id: string; readonly code: string; readonly key: string }
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
  | { readonly t: 'join'; readonly name: string; readonly code: string }
  /** Take your seat back after a dropped connection; `key` was issued with `joined`. */
  | { readonly t: 'rejoin'; readonly code: string; readonly id: string; readonly key: string };

const ROOM_CODE = /^\d{4}$/;
const MAX_TARGET_LENGTH = 40;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

export function cleanName(raw: string): string {
  const name = raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, MAX_NAME_LENGTH);
  return name.length > 0 ? name : '实习生';
}

/** Validate an untrusted client message. Returns null when malformed. */
const MAX_KEY_LENGTH = 64;

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
    case 'rejoin':
      return typeof m.code === 'string' && ROOM_CODE.test(m.code) && isStr(m.id, MAX_TARGET_LENGTH) && isStr(m.key, MAX_KEY_LENGTH) ? { t: 'rejoin', code: m.code, id: m.id, key: m.key } : null;
    case 'join':
      return isStr(m.name, 64) && typeof m.code === 'string' && ROOM_CODE.test(m.code)
        ? { t: 'join', name: cleanName(m.name), code: m.code }
        : null;
    default:
      return null;
  }
}
