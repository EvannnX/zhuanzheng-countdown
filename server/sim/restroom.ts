import { INTEL_SECONDS, STALL_NO_PAPER_SECONDS, STALL_STORY_SECONDS, STALL_TIP_KPI } from '../../shared/constants.ts';
import { activePlayers, award, patchPlayer, roll, say } from './state.ts';
import type { GameState, Player } from './state.ts';

type Story = (s: GameState, p: Player) => GameState;

/** The director takes a call in the next stall and gives away where he is heading. */
const overheard: Story = (s, p) =>
  say(patchPlayer(s, p.id, { intelUntil: s.time + INTEL_SECONDS }), p.id, '隔壁隔间有人打电话，是王总监：「我一会儿去工位区转一圈」。他和 HR 的位置已经标在小地图上', 'good');

/** Somebody left next week's requirements on the cistern. */
const leftBehind: Story = (s, p) => say(award(s, p.id, STALL_TIP_KPI), p.id, `水箱上放着一份没带走的《下周需求清单》，你提前看完了 KPI +${STALL_TIP_KPI}`, 'good');

/** The classic. */
const noPaper: Story = (s, p) =>
  say(
    patchPlayer(s, p.id, { busy: { kind: 'hold', act: 'stun', target: '', startedAt: s.time, endsAt: s.time + STALL_NO_PAPER_SECONDS } }),
    p.id,
    '没纸了。你在隔间里沉默了很久，最后用了自己的周报',
    'bad',
  );

/** Who is ahead, as told by two voices at the sinks. */
const gossip: Story = (s, p) => {
  const leader = activePlayers(s).reduce((a, b) => (b.kpi > a.kpi ? b : a));
  const line = leader.id === p.id ? '洗手台边有人小声说：「听说今年第一就是隔间里那位」。你决定再蹲一会儿' : `洗手台边有人小声说：「${leader.name} 现在 KPI 最高，王总很看好」`;
  return say(s, p.id, line, 'info');
};

const STORIES: readonly Story[] = [overheard, leftBehind, noPaper, gossip];

/** Once a day, an intern who hides in a stall long enough gets a story out of it. */
export function tickRestroom(s: GameState): GameState {
  return activePlayers(s).reduce((acc, p0) => {
    const p = acc.players[p0.id];
    const busy = p.busy;
    if (busy?.kind !== 'slack' || busy.mode !== 'stall' || p.stallStoryDay === acc.day || acc.time - busy.startedAt < STALL_STORY_SECONDS) return acc;
    const [pick, rolled] = roll(acc);
    const marked = patchPlayer(rolled, p.id, { stallStoryDay: acc.day });
    return STORIES[Math.floor(pick * STORIES.length)](marked, marked.players[p.id]);
  }, s);
}
