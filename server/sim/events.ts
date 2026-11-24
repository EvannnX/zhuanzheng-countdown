import {
  COMMUTE_SECONDS,
  DAY_SECONDS,
  EVENT_WINDOW_SECONDS,
  DRILL_FIRST_REWARD,
  DRILL_PENALTY,
  DRILL_REWARD,
  EVENT_JITTER,
  EVENT_SECONDS,
  EVENT_SLOTS,
  MEETING_ENERGY_COST,
  MEETING_REWARD,
  SERVER_DOWN_PENALTY,
} from '../../shared/constants.ts';
import type { EventKind } from '../../shared/protocol.ts';
import { roomAt } from '../../shared/world.ts';
import { activePlayers, award, patchPlayer, roll, say, warn } from './state.ts';
import type { GameState } from './state.ts';

const OFFICE_EVENTS: readonly EventKind[] = ['inspection', 'serverDown', 'meeting', 'fireDrill', 'teaTime', 'rush'];
/** The warehouse has no meeting room or servers, so only these make sense there. */
const AWAY_EVENTS: readonly EventKind[] = ['inspection', 'rush'];

const ANNOUNCE: Record<EventKind, string> = {
  inspection: '突击巡视！王总监今天心情不好，走得更快、看得更远',
  serverDown: '服务器宕机！去打印室抢修，修好之前 KPI 收益减半',
  meeting: '临时会议！倒计时结束前必须站在会议室里',
  fireDrill: '消防演习！所有人立刻去天台集合',
  teaTime: '下午茶时间！现在拿零食、吃零食都不算摸鱼',
  rush: '甲方催单！接下来 30 秒所有任务 KPI 翻倍',
};

/** Pick this day's events: one per slot, never the same kind twice. */
export function scheduleEvents(s: GameState, dayStart: number): GameState {
  let state = s;
  let pool = [...(s.site === 'office' ? OFFICE_EVENTS : AWAY_EVENTS)];
  const queue = EVENT_SLOTS.map((slot) => {
    const [pick, s1] = roll(state);
    const [jitter, s2] = roll(s1);
    state = s2;
    const type = pool[Math.floor(pick * pool.length)];
    pool = pool.filter((k) => k !== type);
    const workSeconds = Math.min(DAY_SECONDS - COMMUTE_SECONDS, EVENT_WINDOW_SECONDS);
    return { type, at: dayStart + COMMUTE_SECONDS + workSeconds * (slot + (jitter * 2 - 1) * EVENT_JITTER) };
  });
  return { ...state, eventQueue: queue, event: null };
}

function resolveEvent(s: GameState, type: EventKind): GameState {
  // Anyone still stuck on the commute is judged when they arrive, not by office events.
  const players = activePlayers(s).filter((p) => p.stage === 'work');
  switch (type) {
    case 'serverDown': {
      const fined = players.reduce((acc, p) => award(acc, p.id, -SERVER_DOWN_PENALTY), s);
      return say(fined, 'all', `服务器没人修好，全员 KPI -${SERVER_DOWN_PENALTY}`, 'bad');
    }
    case 'meeting':
      return players.reduce((acc, p) => {
        if (roomAt(p) !== 'meeting') return warn(acc, p.id, 1, `${p.name} 开会缺席，警告一次`);
        const drained = patchPlayer(acc, p.id, { energy: Math.max(0, acc.players[p.id].energy - MEETING_ENERGY_COST) });
        return say(award(drained, p.id, MEETING_REWARD), p.id, `听完了总监画的饼 KPI +${MEETING_REWARD}`, 'good');
      }, say(s, 'all', '会议结束', 'info'));
    case 'fireDrill': {
      const arrived = s.event?.arrived ?? [];
      const absent = players.filter((p) => !arrived.includes(p.id));
      const fined = absent.reduce((acc, p) => say(award(acc, p.id, -DRILL_PENALTY), p.id, `演习没到场 KPI -${DRILL_PENALTY}`, 'bad'), s);
      return say(fined, 'all', '消防演习结束，回去上班', 'info');
    }
    default:
      return s;
  }
}

function trackDrill(s: GameState): GameState {
  if (s.event?.type !== 'fireDrill') return s;
  return activePlayers(s).reduce((acc, p) => {
    const event = acc.event;
    if (!event || event.arrived.includes(p.id) || roomAt(p) !== 'terrace') return acc;
    const reward = event.arrived.length === 0 ? DRILL_FIRST_REWARD : DRILL_REWARD;
    const logged = { ...acc, event: { ...event, arrived: [...event.arrived, p.id] } };
    return say(award(logged, p.id, reward), p.id, `到达集合点 KPI +${reward}`, 'good');
  }, s);
}

export function tickEvents(s: GameState): GameState {
  if (s.event) {
    if (s.time < s.event.endsAt) return trackDrill(s);
    return { ...resolveEvent(s, s.event.type), event: null };
  }
  const next = s.eventQueue[0];
  if (!next || s.time < next.at) return s;
  const event = { type: next.type, endsAt: s.time + EVENT_SECONDS[next.type], repairs: 0, arrived: [] };
  return say({ ...s, event, eventQueue: s.eventQueue.slice(1) }, 'all', ANNOUNCE[next.type], 'alert');
}
