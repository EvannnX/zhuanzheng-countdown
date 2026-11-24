import type { Snapshot } from '../shared/protocol.ts';
import type { Point, Shot } from './cutscene.ts';
import { INTRO } from './storyIntro.ts';

/** Every shot is held this much longer than scripted, so the captions can be read. */
const PACE = 1.35;
const shot = (from: Point, to: Point, lookFrom: Point, lookTo: Point, seconds: number, text: string): Shot => ({ from, to, lookFrom, lookTo, seconds: seconds * PACE, text });

const NIGHT: Shot = shot([-26, 9, 44], [-18, 15, 38], [20, 6, 14], [20, 9, 14], 4, '18:00，下班时间到了。大楼的灯一盏也没灭。');

const WAKE_LINE = '第一天。闹钟响了，合租屋里所有人同时醒来。';

/** The lift car being ridden: the down car sits ten metres east of the up car. */
const LIFT_CAR_GAP = 10;

/** The camera moves that introduce wherever the snapshot says the player now is. */
/** Names the film a snapshot calls for; the same key on a later day means the same film. */
export function storyKey(snap: Snapshot): string {
  if (snap.phase !== 'day') return snap.phase;
  return snap.you.stage === 'work' ? `work:${snap.site}` : snap.you.stage;
}

export function storyShots(snap: Snapshot): readonly Shot[] {
  if (snap.phase === 'lobby') return [];
  if (snap.phase === 'intro') return INTRO;
  if (snap.phase === 'summary') return [NIGHT];
  if (snap.phase === 'final') return [{ ...NIGHT, text: '五天结束了。有人拿到了工牌，有人拿到了纸箱。' }];
  const me = snap.players.find((p) => p.id === snap.you.id);
  const at: Point = [me?.x ?? 0, 1.2, me?.z ?? 0];
  switch (snap.you.stage) {
    case 'home':
      return [
        shot([at[0] + 4.2, 2.4, at[2] + 0.9], [at[0] + 2.2, 1.7, at[2] + 1.1], at, at, 3.6, WAKE_LINE),
        shot([14.6, 1.9, 606], [14.4, 1.7, 604.4], [15.6, 1.2, 602], [15.6, 1.3, 603.5], 2.8, '洗漱台只有两个，早餐不够分。动作要快。'),
      ];
    case 'street':
      return [shot([116, 4.4, 600.8], [116, 2.6, 609], [116, 0.5, 622], [116, 1.6, 638], 4.6, '地铁口在两条马路对面。这条街上的车从来不让人。')];
    case 'plaza':
      return [shot([515, 2.4, 603.6], [515, 4.4, 605.4], [515, 5, 627], [515, 20, 627], 3.6, '鲸跃大厦就在大街对面。这条街上，车不让人，只有灯让。')];
    case 'lobby':
      return [shot([515, 2.3, 628.8], [515, 2, 632.2], [515, 1.1, 634.5], [515, 1.7, 641], 3.4, '一楼大堂。工牌刷三次才认一次，电梯每一层都要停。')];
    case 'lift': {
      const dx = at[0] > 606 ? LIFT_CAR_GAP : 0;
      return [shot([602.3 + dx, 2.15, 602], [602.1 + dx, 1.95, 601.85], [601.4 + dx, 1.5, 600], [601.4 + dx, 2.2, 600], 2.6, '电梯里没有人说话。所有人都盯着那个慢慢跳动的楼层数字。')];
    }
    case 'dispatch':
      return [shot([36.5, 1.9, 22.6], [34.2, 1.8, 24.2], [33, 1.3, 20], [30, 1.3, 18], 3.2, '12 楼。卡刚打上，通知就来了：今天全组外派，甲方仓库。')];
    case 'depart':
      return [shot([515, 2.2, 639.2], [515, 1.95, 636.4], [515, 1.4, 630], [515, 1.4, 627], 3, '外派单在手。班车就停在门口——第一个上车的人，负责开车。')];
    case 'van':
      return [shot([701.1, 1.5, 604.9], [701.1, 1.42, 604], [701.1, 1.25, 600], [701.1, 1.2, 600], 2.8, '外派班车。司机是你同事，导航是甲方发的。')];
    case 'train':
      return [shot([400.8, 1.9, 601.4], [405, 1.6, 601.4], [417, 1.3, 601.3], [417, 1.3, 601.5], 2.6, '车厢里挤满了同样没睡醒的人。下一站，鲸跃大厦。')];
    case 'subway':
      return [shot([207.6, 2.2, 603.6], [216, 1.8, 604.5], [226, 1.3, 606.6], [226, 1.5, 607.6], 4.6, '早高峰的站台。同一班车上去的人，会在同一刻到站。')];
    default:
      return snap.site === 'warehouse'
        ? [shot([301.6, 2.6, 603.6], [309.5, 2.2, 610.6], [326, 0.9, 612], [334, 1, 615], 4.8, '甲方的物流仓库。总监也跟来了，就站在你身后。')]
        : [shot([36, 1.9, 21.5], [29.5, 1.8, 18.2], [24, 1.3, 15.6], [14, 1.2, 15.5], 2.8, '9:00，鲸跃科技。'), shot([18.6, 2.6, 13], [9, 2.1, 9], [4, 1, 4], [3, 1, 3], 3, '新的一天，新的 KPI。排名从现在开始算。')];
  }
}

const DEMOS: Record<string, Partial<Snapshot> & { stage?: string }> = {
  intro: { phase: 'intro' },
  night: { phase: 'summary' },
  home: { phase: 'day', stage: 'home' },
  street: { phase: 'day', stage: 'street' },
  subway: { phase: 'day', stage: 'subway' },
  train: { phase: 'day', stage: 'train' },
  plaza: { phase: 'day', stage: 'plaza' },
  towerlobby: { phase: 'day', stage: 'lobby' },
  lift: { phase: 'day', stage: 'lift' },
  dispatch: { phase: 'day', stage: 'dispatch' },
  depart: { phase: 'day', stage: 'depart' },
  van: { phase: 'day', stage: 'van' },
  office: { phase: 'day', stage: 'work', site: 'office' },
  warehouse: { phase: 'day', stage: 'work', site: 'warehouse' },
};

/** `?cine=<name>` previews a cutscene without joining a room (art review only). */
export function demoShots(name: string): readonly Shot[] {
  const demo = DEMOS[name];
  if (!demo) return [];
  const fake = { day: 1, site: 'office', ...demo, players: [{ id: 'me', x: 4.2, z: 602.2 }], you: { id: 'me', stage: demo.stage ?? 'home' } };
  return storyShots(fake as unknown as Snapshot);
}
