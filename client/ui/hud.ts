import { MAX_WARNINGS, REPAIRS_NEEDED, promoteQuota } from '../../shared/constants.ts';
import type { EventKind, RankRow, Snapshot, TaskView, Tone, Stage } from '../../shared/protocol.ts';
import { SHOP } from '../../shared/tasks.ts';
import { byId, h, setChildren } from './dom.ts';

const TOAST_MS = 4500;
const MAX_TOASTS = 5;
const LOW_ENERGY = 20;
const STAGE_TITLES: Record<Stage, string> = {
  home: '⏰ 起床！早高峰',
  street: '🚦 上班路上',
  subway: '🚇 挤地铁',
  train: '🚇 地铁上',
  plaza: '🚥 公司楼下 · 过马路',
  lobby: '🪪 一楼大堂',
  lift: '🛗 电梯里',
  dispatch: '📋 临时通知：今天外派',
  depart: '🚐 下楼坐班车',
  van: '🚐 外派班车',
  work: '今日待办',
};
const MINOR_ACTS = ['phone', 'drop', 'eat', 'summon', 'banana'];

const EVENT_TITLES: Record<EventKind, string> = {
  inspection: '🚨 突击巡视',
  serverDown: '🔥 服务器宕机：去打印室抢修',
  meeting: '📣 临时会议：去会议室',
  fireDrill: '🧯 消防演习：去天台',
  teaTime: '🍰 下午茶：零食随便吃',
  rush: '🔥 甲方催单：KPI 翻倍',
};

const SLACK_TEXT = { phone: '刷手机中', sleep: '睡着了', stall: '带薪如厕中', bench: '发呆中' } as const;

export interface HudFlags {
  readonly showScores: boolean;
  readonly shopOpen: boolean;
  readonly locked: boolean;
}

export interface Hud {
  show(): void;
  update(snap: Snapshot, flags: HudFlags): void;
  toast(text: string, tone: Tone): void;
}

function clockText(snap: Snapshot): string {
  if (snap.phase === 'lobby') return '入职大厅 · 等待开局';
  if (snap.phase === 'intro') return '入职培训';
  if (snap.phase === 'final') return '实习期结束';
  if (snap.phase === 'summary') return `第 ${snap.day} 天 · 下班结算`;
  const minutes = Math.floor(snap.clock);
  const mm = String(minutes % 60).padStart(2, '0');
  const where = snap.site === 'warehouse' ? ' · 外派' : '';
  return `第 ${snap.day}/${snap.totalDays} 天${where} · ${Math.floor(minutes / 60)}:${mm}`;
}

function rankRows(rows: readonly RankRow[], meId: string, final: boolean): HTMLElement {
  return h(
    'div',
    'rows',
    ...rows.map((r, i) => {
      const tag = r.fired ? h('span', 'tag fired', '劝退') : final ? h('span', `tag${r.promoted ? '' : ' no'}`, r.promoted ? '转正' : '实习结束') : h('span', '', '⚠'.repeat(r.warnings));
      return h('div', `row${r.id === meId ? ' me' : ''}${r.fired ? ' out' : ''}`, h('span', '', String(i + 1)), h('span', '', r.name), h('span', '', `KPI ${r.kpi}`), tag);
    }),
  );
}

function panelContent(snap: Snapshot, flags: HudFlags): HTMLElement[] | null {
  const isHost = snap.hostId === snap.you.id;
  if (snap.phase === 'lobby') {
    return [
      h('h2', '', '房间号'),
      h('div', 'code', snap.code),
      h('p', '', '把房间号发给同事，最多 8 人。人到齐再开局，开场动画大家一起看'),
      h('div', 'rows', ...snap.players.map((p) => h('div', `row${p.id === snap.you.id ? ' me' : ''}`, h('span', '', p.id === snap.hostId ? '👑' : '·'), h('span', '', p.name), h('span', '', ''), h('span', '', '')))),
      h('p', '', isHost ? '人到齐后按 Enter 键开局' : '等待房主开局…'),
    ];
  }
  if (snap.phase === 'summary') {
    return [h('h2', '', `第 ${snap.day} 天结算`), rankRows(snap.ranking, snap.you.id, false), h('p', '', `${Math.ceil(snap.timeLeft)} 秒后开始下一天，警告会消掉一次`)];
  }
  if (snap.phase === 'final') {
    const me = snap.ranking.find((r) => r.id === snap.you.id);
    const verdict = me?.promoted ? '🎉 恭喜转正！明天开始正式加班' : me?.fired ? '👻 你被劝退了' : '📦 感谢付出，实习结束';
    return [h('h2', '', verdict), rankRows(snap.ranking, snap.you.id, true), h('p', '', isHost ? '按 Enter 键再来一届' : '等待房主重新开始…')];
  }
  if (flags.shopOpen) {
    return [
      h('h2', '', '老张的摸鱼小卖部'),
      h('p', '', '「年轻人，上班要讲究方法。」（用 KPI 结账）'),
      h('div', 'rows', ...SHOP.map((item, i) => h('div', 'row', h('b', 'key', String(i + 1)), h('span', '', `${item.name} · ${item.text}`), h('span', '', `${item.price} KPI`), h('span', '', '')))),
      h('p', '', '按数字键购买，走开即关闭'),
    ];
  }
  if (flags.showScores) return [h('h2', '', '转正排行榜'), rankRows(snap.ranking, snap.you.id, false)];
  return null;
}

/** The always-on leaderboard: total KPI, today's gain, and the line only the top third stays above. */
function liveRank(snap: Snapshot): HTMLElement[] {
  const rows = snap.ranking;
  const quota = promoteQuota(rows.length);
  const line = h('div', 'cut', `转正线 · 只留前 ${quota} 名`);
  const cells = rows.map((r, i) =>
    h('div', `row${r.id === snap.you.id ? ' me' : ''}${r.fired ? ' out' : ''}`, h('span', '', r.fired ? '✖' : i === 0 && r.kpi > 0 ? '👑' : String(i + 1)), h('span', 'who', r.name), h('em', '', r.fired ? '劝退' : `+${r.today}`), h('b', '', String(r.kpi))),
  );
  return [h('h3', '', 'KPI 实时排行', h('small', '', '今日 / 总计')), ...cells.slice(0, quota), line, ...cells.slice(quota)];
}

/** One pip per stage of a job, filled as the stages get done. */
function stepPips(t: TaskView): HTMLElement[] {
  if (!t.steps || t.steps < 2) return [];
  return [h('div', 'pips', ...Array.from({ length: t.steps }, (_, i) => h('i', i < (t.step ?? 0) ? 'on' : i === (t.step ?? 0) ? 'now' : '')))];
}

function goalRow(snap: Snapshot): HTMLElement {
  const fill = h('i', 'race');
  fill.style.width = `${Math.min(1, snap.dayGoal.best / snap.dayGoal.target) * 100}%`;
  return h('div', 'okr', h('span', '', `下班条件：有人今天做满 ${snap.dayGoal.target} KPI · 领先 ${snap.dayGoal.leader} ${snap.dayGoal.best}`), h('div', 'bar', fill));
}

function okrRow(snap: Snapshot): HTMLElement {
  const fill = h('i', snap.okr.done >= snap.okr.goal ? 'full' : '');
  fill.style.width = `${Math.min(1, snap.okr.done / Math.max(1, snap.okr.goal)) * 100}%`;
  return h('div', 'okr', h('span', '', `部门 OKR ${snap.okr.done}/${snap.okr.goal} · 大家一起完成`), h('div', 'bar', fill));
}

export function createHud(): Hud {
  const el = {
    hud: byId('hud'),
    clock: byId('clock'),
    kpi: byId('kpi'),
    energy: byId('energy'),
    warns: byId('warns'),
    perks: byId('perks'),
    tasks: byId('tasks'),
    rank: byId('rank'),
    banner: byId('banner'),
    toasts: byId('toasts'),
    exposure: byId('exposure'),
    busy: byId('busy'),
    prompts: byId('prompts'),
    panel: byId('panel'),
    lockhint: byId('lockhint'),
  };
  const exposureFill = el.exposure.querySelector('i') as HTMLElement;

  return {
    show() {
      el.hud.hidden = false;
    },

    update(snap, flags) {
      const me = snap.players.find((p) => p.id === snap.you.id);
      const you = snap.you;
      el.clock.textContent = clockText(snap);
      el.kpi.textContent = String(me?.kpi ?? 0);
      el.energy.style.width = `${you.energy}%`;
      el.energy.className = you.energy <= LOW_ENERGY ? 'low' : '';
      setChildren(el.warns, Array.from({ length: MAX_WARNINGS }, (_, i) => h('span', i < (me?.warnings ?? 0) ? 'on' : '')));
      const perks = [you.fakeScreens > 0 && `假屏幕 ×${you.fakeScreens}`, you.hasSlippers && '静音拖鞋', you.bananas > 0 && `香蕉皮 ×${you.bananas}`, you.hasIntel && '阿姨情报生效中', you.energy <= 0 && '精力耗尽：行动变慢'].filter(Boolean);
      el.perks.textContent = perks.join(' · ');

      const playing = snap.phase === 'day';
      el.tasks.hidden = !playing;
      el.rank.hidden = !playing;
      if (playing) setChildren(el.rank, liveRank(snap));
      if (me?.fired) {
        setChildren(el.tasks, [h('h3', '', '🕶️ 王总的监工'), h('div', 'task', h('span', '', '你被劝退后让王总返聘成了监工，拿不到 KPI 了。走到摸鱼的同事面前按 R 抓现行（给他一次警告），也可以弄坏打印机，或者按 Q 把王总叫过来。'))]);
      } else {
        setChildren(el.tasks, [
          h('h3', '', STAGE_TITLES[you.stage]),
          ...(you.stage === 'work' && snap.okr.goal > 0 ? [goalRow(snap), okrRow(snap)] : []),
          ...you.tasks.map((t) => h('div', `task${t.done ? ' done' : ''}`, h('b', '', `${t.done ? '✔ ' : ''}${t.title}`, h('em', '', t.reward ?? `+${t.kpi}`)), ...stepPips(t), h('span', '', t.text))),
        ]);
      }

      const commuting = playing && you.stage !== 'work' && !you.clockedIn && !me?.fired;
      el.banner.hidden = !snap.event && !commuting && !you.chased;
      el.banner.className = you.chased ? 'chase' : commuting && snap.workIn <= 0 ? 'late' : '';
      document.body.dataset.chased = you.chased ? '1' : '';
      if (you.chased) {
        el.banner.textContent = '🏃 被盯上了！甩开他，别被追到！';
      } else if (commuting) {
        el.banner.textContent = snap.workIn > 0 ? `⏰ 距离 9:00 打卡还有 ${Math.ceil(snap.workIn)} 秒` : '😱 已经迟到了！快赶去打卡！';
      } else if (snap.event) {
        const extra = snap.event.type === 'serverDown' ? ` ${snap.event.repairs}/${REPAIRS_NEEDED}` : '';
        el.banner.textContent = `${EVENT_TITLES[snap.event.type]}${extra} · ${Math.ceil(snap.event.timeLeft)}s`;
      }

      el.exposure.hidden = you.exposure <= 0;
      exposureFill.style.width = `${you.exposure * 100}%`;

      const busy = you.busy;
      el.busy.hidden = !busy || busy.kind === 'minigame';
      if (busy?.kind === 'hold') {
        const bar = h('div', 'bar', h('i', '', ''));
        (bar.firstElementChild as HTMLElement).style.width = `${busy.progress * 100}%`;
        setChildren(el.busy, [busy.label, bar, h('small', '', '按移动键取消')]);
      } else if (busy?.kind === 'slack') {
        setChildren(el.busy, [`${SLACK_TEXT[busy.mode]} · 精力恢复中`, h('small', '', '按移动键立刻装作在工作')]);
      }
      document.body.dataset.slack = busy?.kind === 'slack' ? busy.mode : '';

      setChildren(
        el.prompts,
        you.prompts.map((p) => {
          const minor = MINOR_ACTS.includes(p.act);
          return h('div', `prompt${p.disabled ? ' off' : ''}${minor ? ' minor' : ''}`, h('kbd', '', p.key), p.label);
        }),
      );

      const content = panelContent(snap, flags);
      el.panel.hidden = content === null;
      if (content) setChildren(el.panel, content);
      el.lockhint.hidden = flags.locked;
    },

    toast(text, tone) {
      const node = h('div', `toast ${tone}`, text);
      el.toasts.append(node);
      while (el.toasts.childElementCount > MAX_TOASTS) el.toasts.firstElementChild?.remove();
      window.setTimeout(() => node.remove(), TOAST_MS);
    },
  };
}
