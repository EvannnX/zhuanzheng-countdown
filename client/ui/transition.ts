import type { Snapshot, Stage } from '../../shared/protocol.ts';
import { byId, h, setChildren } from './dom.ts';

const SHOW_MS = 6500;

interface Scene {
  readonly icon: string;
  readonly title: string;
  /** What just happened. */
  readonly what: string;
  /** What to do now, as short steps. */
  readonly next: readonly string[];
}

/** One card per place the game takes you to; `null` means nothing changed worth announcing. */
function sceneFor(snap: Snapshot): Scene | null {
  const away = snap.site === 'warehouse';
  if (snap.phase === 'intro') return null;
  if (snap.phase === 'lobby') {
    return { icon: '🪪', title: '入职大厅', what: '房间已建好。人到齐后由房主开局，所有人一起看开场。', next: ['把房间号发给同事', '先到处逛逛熟悉地形', '房主按 Enter 开局'] };
  }
  if (snap.phase === 'summary') {
    return { icon: '🌙', title: `第 ${snap.day} 天 · 下班`, what: '今天的 KPI 已结算：第一名有奖，最后一名记警告。', next: ['看一眼排行榜', '警告会消掉一次', '马上开始下一天'] };
  }
  if (snap.phase === 'final') {
    return { icon: '📜', title: '实习期结束', what: '五天过去了，转正名单已经公布。', next: ['看看谁转正了', '房主按 Enter 再来一届'] };
  }
  return STAGE_SCENES[snap.you.stage](snap, away);
}

/** One card per stage of the day: what just happened and what to do next. */
const STAGE_SCENES: Record<Stage, (snap: Snapshot, away: boolean) => Scene> = {
  home: (snap) => ({ icon: '⏰', title: `第 ${snap.day} 天 · 合租屋`, what: '闹钟响了。9:00 前必须到公司打卡。', next: ['洗漱（要排队）', '去衣柜换衣服', '抢冰箱里的早餐', '从大门出门'] }),
  street: () => ({ icon: '🚶', title: '上班路上', what: '你冲出了小区，地铁口在街道另一头。', next: ['过两条马路，车不会让你', '路中间可以买煎饼补精力', '走到地铁口按 E 进站'] }),
  subway: () => ({ icon: '🚇', title: '地铁站', what: '你下到了站台。同一班车上车的人，会一起到站。', next: ['穿过闸机走到站台边', '车门打开时直接走进车门', '没赶上就等下一班'] }),
  train: () => ({ icon: '🚋', title: '地铁车厢', what: '你挤上了车。车门一关就出发，全车人一起到站。', next: ['抢个空座位回精力（座位不够分）', '到站后全车一起下车'] }),
  plaza: () => ({ icon: '🚥', title: '公司楼下', what: '你出了地铁口。鲸跃大厦在大街对面，中间隔着四条车道。', next: ['等行人绿灯，走斑马线过马路', '闯红灯会被撞回原地', '走进旋转门就进了大堂'] }),
  lobby: () => ({ icon: '🪪', title: '一楼大堂', what: '你穿过旋转门进了鲸跃大厦。上楼之前还有两关。', next: ['到闸机前按 E 刷工牌（可能要刷好几次）', '走到开门的那部电梯前按 E 挤进去', '满员就等下一趟，总监可能插队'] }),
  lift: () => ({ icon: '🛗', title: '电梯里', what: '你挤进了电梯。同一部电梯的人一起到。', next: ['站好别动', '每层都停，忍一忍', '门开了自动出去'] }),
  dispatch: () => ({ icon: '📋', title: '12 楼 · 临时通知', what: '卡是打上了，可今天不在公司干活：全组外派去甲方仓库。', next: ['去总监办公室的办公桌领外派单', '回前台，从电梯下楼', '到楼下坐外派班车'] }),
  depart: () => ({ icon: '🚐', title: '一楼大堂 · 出发', what: '你拿着外派单下了楼。班车停在大门外右手边。', next: ['穿过大堂，从旋转门出去', '到白色班车旁按 E 上车', '第一个上车的人要负责开车'] }),
  van: () => ({ icon: '🚐', title: '外派班车', what: '班车坐满或者等够时间就发车，全车一起到仓库。', next: ['司机：跟着导航按方向键，别走错路', '乘客：坐稳，祈祷司机认路', '到了自动下车开工'] }),
  work: (_snap, away) =>
    away
      ? { icon: '📦', title: '外派 · 物流仓库', what: '班车把你们拉到了甲方仓库，总监也跟来盯着。', next: ['按右上角待办一步步做', '过道上小心叉车', '和同事一起完成部门 OKR'] }
      : { icon: '🏢', title: '鲸跃科技 · 开工', what: '电梯终于到了 12 楼，你打上了卡。', next: ['按右上角待办一步步做', '摸鱼别被总监和 HR 看到', '和同事一起完成部门 OKR'] },
};

const sceneKey = (snap: Snapshot): string => (snap.phase === 'day' ? `day:${snap.day}:${snap.you.stage}` : `${snap.phase}:${snap.day}`);

export interface Transition {
  /** Play the scene card whenever the player has been taken somewhere new. */
  update(snap: Snapshot): void;
}

/**
 * `stage` runs before the card: it gets the snapshot and a callback that drops
 * the card in, so a cutscene can play first.
 */
export function createTransition(stage: (snap: Snapshot, showCard: () => void) => void): Transition {
  const root = byId('transition');
  let lastKey = '';
  let timer = 0;

  const play = (scene: Scene): void => {
    setChildren(root, [
      h('div', 'scene-card card', h('div', 'scene-icon', scene.icon), h('h2', '', scene.title), h('p', 'what', scene.what), h('div', 'next', h('b', '', '接下来'), ...scene.next.map((step, i) => h('span', '', `${i + 1}. ${step}`)))),
    ]);
    // Re-inserting the nodes restarts the CSS animations.
    root.hidden = false;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      root.hidden = true;
    }, SHOW_MS);
  };

  return {
    update(snap) {
      const key = sceneKey(snap);
      if (key === lastKey) return;
      lastKey = key;
      const fired = snap.players.find((p) => p.id === snap.you.id)?.fired;
      if (fired && snap.phase === 'day') return;
      const scene = sceneFor(snap);
      stage(snap, () => {
        if (scene) play(scene);
      });
    },
  };
}
