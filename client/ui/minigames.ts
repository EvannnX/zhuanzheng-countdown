import { QUIZ, RECIPE_STAGES } from '../../shared/tasks.ts';
import type { GameKind } from '../../shared/tasks.ts';
import { byId, h, setChildren } from './dom.ts';

type Outcome<S> = S | 'win' | 'lose';

interface GameDef<S> {
  readonly title: string;
  readonly hint: string;
  readonly seconds: number;
  init(): S;
  render(state: S, elapsed: number): HTMLElement[];
  onKey(state: S, code: string, elapsed: number): Outcome<S>;
}

const GIVE_UP = 'Backspace';
const TICK_MS = 40;
const TIMING_SPEED = 0.9;
const TIMING_HALF_ZONE = 0.09;
const TIMING_HITS = 3;
const KEY_LETTERS = 'ASDFJKL';
const KEY_COUNT = 8;
const INVOICE_COUNT = 6;
const QUIZ_COUNT = 3;
const MASH_TARGET = 14;
const RECIPE_PEEK_SECONDS = 3;

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const shuffled = <T,>(items: readonly T[]): T[] =>
  items.map((item) => ({ item, order: Math.random() })).sort((a, b) => a.order - b.order).map((x) => x.item);
/** "Digit3" / "Numpad3" → 2 (zero-based), otherwise -1. */
const digitIndex = (code: string): number => {
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  return match ? Number(match[1]) - 1 : -1;
};

function fillBar(className: string, ratio: number): HTMLElement {
  const fill = h('i');
  fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  return h('div', className, fill);
}

const keysGame: GameDef<{ seq: string[]; done: number }> = {
  title: '写周报',
  hint: '按顺序敲出字母，把「没做完」写成「持续推进中」。按错从头再来',
  seconds: 12,
  init: () => ({ seq: Array.from({ length: KEY_COUNT }, () => pick([...KEY_LETTERS])), done: 0 }),
  render: (s) => [h('div', 'mg-row', ...s.seq.map((c, i) => h('span', `keycap${i < s.done ? ' ok' : i === s.done ? ' next' : ''}`, c)))],
  onKey: (s, code) => {
    if (!/^Key[A-Z]$/.test(code)) return s;
    if (code !== `Key${s.seq[s.done]}`) return { ...s, done: 0 };
    return s.done + 1 >= s.seq.length ? 'win' : { ...s, done: s.done + 1 };
  },
};

const orderGame: GameDef<{ amounts: number[]; taken: number[] }> = {
  title: '贴发票',
  hint: '按金额从小到大，依次按下发票上的数字键',
  seconds: 15,
  init: () => {
    const amounts = new Set<number>();
    while (amounts.size < INVOICE_COUNT) amounts.add(Math.round((5 + Math.random() * 990) * 10) / 10);
    return { amounts: [...amounts], taken: [] };
  },
  render: (s) => [
    h('div', 'mg-row', ...s.amounts.map((a, i) => h('div', `card${s.taken.includes(i) ? ' ok' : ''}`, h('b', '', String(i + 1)), h('span', '', `¥${a.toFixed(1)}`)))),
  ],
  onKey: (s, code) => {
    const index = digitIndex(code);
    if (index < 0 || index >= s.amounts.length || s.taken.includes(index)) return s;
    const smallest = Math.min(...s.amounts.filter((_, i) => !s.taken.includes(i)));
    if (s.amounts[index] !== smallest) return 'lose';
    const taken = [...s.taken, index];
    return taken.length === s.amounts.length ? 'win' : { ...s, taken };
  },
};

const quizGame: GameDef<{ items: typeof QUIZ[number][]; index: number }> = {
  title: '整理会议纪要',
  hint: '总监说的话，真正的意思是？按 1 / 2 / 3 选择',
  seconds: 20,
  init: () => ({ items: shuffled(QUIZ).slice(0, QUIZ_COUNT), index: 0 }),
  render: (s) => [
    h('div', 'quote', `总监：「${s.items[s.index].quote}」`),
    h('div', 'mg-col', ...s.items[s.index].options.map((o, i) => h('div', 'choice', h('b', '', String(i + 1)), o))),
    h('div', 'mg-foot', `${s.index + 1} / ${s.items.length}`),
  ],
  onKey: (s, code) => {
    const index = digitIndex(code);
    if (index < 0 || index > 2) return s;
    if (index !== s.items[s.index].answer) return 'lose';
    return s.index + 1 >= s.items.length ? 'win' : { ...s, index: s.index + 1 };
  },
};

const recipeGame: GameDef<{ order: number[]; stage: number }> = {
  title: '给总监冲咖啡',
  hint: '记住总监的口味，然后按数字键依次选对',
  seconds: 15,
  init: () => ({ order: RECIPE_STAGES.map((st) => Math.floor(Math.random() * st.options.length)), stage: 0 }),
  render: (s, elapsed) => {
    if (elapsed < RECIPE_PEEK_SECONDS) {
      const wish = s.order.map((o, i) => RECIPE_STAGES[i].options[o]).join('、');
      return [h('div', 'quote', `总监：「${wish}，记住了吗？」`), h('div', 'mg-foot', '看清楚，马上消失')];
    }
    const stage = RECIPE_STAGES[s.stage];
    return [
      h('div', 'quote', `${stage.name}选哪个？`),
      h('div', 'mg-row', ...stage.options.map((o, i) => h('div', 'choice', h('b', '', String(i + 1)), o))),
      h('div', 'mg-foot', `${s.stage + 1} / ${RECIPE_STAGES.length}`),
    ];
  },
  onKey: (s, code, elapsed) => {
    const index = digitIndex(code);
    if (elapsed < RECIPE_PEEK_SECONDS || index < 0 || index >= RECIPE_STAGES[s.stage].options.length) return s;
    if (index !== s.order[s.stage]) return 'lose';
    return s.stage + 1 >= RECIPE_STAGES.length ? 'win' : { ...s, stage: s.stage + 1 };
  },
};

const mashGame: GameDef<{ hits: number }> = {
  title: '修打印机',
  hint: '狂按 E！',
  seconds: 5,
  init: () => ({ hits: 0 }),
  render: (s) => [fillBar('meter', s.hits / MASH_TARGET), h('div', 'mg-foot', `${s.hits} / ${MASH_TARGET}`)],
  onKey: (s, code) => {
    if (code !== 'KeyE') return s;
    return s.hits + 1 >= MASH_TARGET ? 'win' : { hits: s.hits + 1 };
  },
};

const pingPong = (t: number): number => {
  const phase = (t * TIMING_SPEED) % 2;
  return phase < 1 ? phase : 2 - phase;
};

const timingGame: GameDef<{ zone: number; hits: number }> = {
  title: '看准时机',
  hint: '滑块进入绿色区域时按 E，连续命中 3 次。按偏了从头再来',
  seconds: 14,
  init: () => ({ zone: 0.2 + Math.random() * 0.6, hits: 0 }),
  render: (s, elapsed) => {
    const zone = h('i', 'zone');
    zone.style.left = `${(s.zone - TIMING_HALF_ZONE) * 100}%`;
    zone.style.width = `${TIMING_HALF_ZONE * 200}%`;
    const marker = h('i', 'marker');
    marker.style.left = `${pingPong(elapsed) * 100}%`;
    return [h('div', 'track', zone, marker), h('div', 'mg-foot', `${s.hits} / ${TIMING_HITS}`)];
  },
  onKey: (s, code, elapsed) => {
    if (code !== 'KeyE') return s;
    if (Math.abs(pingPong(elapsed) - s.zone) > TIMING_HALF_ZONE) return { ...s, hits: 0 };
    return s.hits + 1 >= TIMING_HITS ? 'win' : { zone: 0.2 + Math.random() * 0.6, hits: s.hits + 1 };
  },
};

const TURNS = [
  { arrow: '←', text: '左转', keys: ['KeyA', 'ArrowLeft'] },
  { arrow: '↑', text: '直行', keys: ['KeyW', 'ArrowUp'] },
  { arrow: '→', text: '右转', keys: ['KeyD', 'ArrowRight'] },
] as const;
const TURN_KEYS: readonly string[] = TURNS.flatMap((t) => t.keys);
const DRIVE_TURNS = 6;

/** The away-day shuttle: follow the client's sat-nav; one wrong turn and the whole van takes the scenic route. */
const driveGame: GameDef<{ route: number[]; done: number }> = {
  title: '开外派班车',
  hint: '跟着导航按 A / W / D（或方向键）。按错一次 = 走错路，全车一起绕',
  seconds: 9,
  init: () => ({ route: Array.from({ length: DRIVE_TURNS }, () => Math.floor(Math.random() * TURNS.length)), done: 0 }),
  render: (s) => [
    h('div', 'quote', `导航：前方路口 ${TURNS[s.route[s.done]].arrow} ${TURNS[s.route[s.done]].text}`),
    h('div', 'mg-row', ...s.route.map((turn, i) => h('span', `keycap${i < s.done ? ' ok' : i === s.done ? ' next' : ''}`, TURNS[turn].arrow))),
    h('div', 'mg-foot', `${s.done} / ${DRIVE_TURNS} 个路口`),
  ],
  onKey: (s, code) => {
    if (!TURN_KEYS.includes(code)) return s;
    if (!(TURNS[s.route[s.done]].keys as readonly string[]).includes(code)) return 'lose';
    return s.done + 1 >= s.route.length ? 'win' : { ...s, done: s.done + 1 };
  },
};

const GAMES: Record<GameKind, GameDef<never>> = {
  drive: driveGame as unknown as GameDef<never>,
  timing: timingGame as unknown as GameDef<never>,
  keys: keysGame as unknown as GameDef<never>,
  order: orderGame as unknown as GameDef<never>,
  quiz: quizGame as unknown as GameDef<never>,
  recipe: recipeGame as unknown as GameDef<never>,
  mash: mashGame as unknown as GameDef<never>,
};

export interface Minigames {
  isOpen(): boolean;
  /** `title` names the job being done; it defaults to the game's own name. */
  open(kind: GameKind, onDone: (ok: boolean) => void, title?: string): void;
  key(code: string): void;
  /** Close without reporting (the server already ended it). */
  abort(): void;
}

export function createMinigames(): Minigames {
  const root = byId('mg');
  let session: { title: string; def: GameDef<unknown>; state: unknown; startedAt: number; timer: number; onDone: (ok: boolean) => void } | null = null;

  const elapsed = (): number => (session ? (performance.now() - session.startedAt) / 1000 : 0);

  const close = (): void => {
    if (session) clearInterval(session.timer);
    session = null;
    root.hidden = true;
  };

  const finish = (ok: boolean): void => {
    const done = session?.onDone;
    close();
    done?.(ok);
  };

  const render = (): void => {
    if (!session) return;
    const left = Math.max(0, session.def.seconds - elapsed());
    const bar = fillBar('timer', left / session.def.seconds);
    setChildren(root, [
      h('h2', '', session.title),
      h('p', 'mg-hint', session.def.hint),
      ...session.def.render(session.state, elapsed()),
      bar,
      h('p', 'mg-foot', '退格键放弃'),
    ]);
  };

  return {
    isOpen: () => session !== null,
    open(kind, onDone, title) {
      close();
      const def = GAMES[kind] as unknown as GameDef<unknown>;
      const timer = window.setInterval(() => {
        if (session && elapsed() >= session.def.seconds) finish(false);
        else render();
      }, TICK_MS);
      session = { title: title ?? def.title, def, state: def.init(), startedAt: performance.now(), timer, onDone };
      root.hidden = false;
      render();
    },
    key(code) {
      if (!session) return;
      if (code === GIVE_UP) return finish(false);
      const outcome = session.def.onKey(session.state, code, elapsed());
      if (outcome === 'win') return finish(true);
      if (outcome === 'lose') return finish(false);
      session = { ...session, state: outcome };
      render();
    },
    abort: close,
  };
}
