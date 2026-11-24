import { DAY_KPI_TARGET, INTRO_SECONDS, MAX_WARNINGS, TOTAL_DAYS } from '../shared/constants.ts';
import type { Shot } from './cutscene.ts';
import type { Cue } from './scene/cast.ts';

const NORTH = Math.PI;
const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
/** The film runs a touch past the server's timer, so day one cuts in over it rather than after a gap. */
const OVERRUN_SECONDS = 1;

const LINE_Z = 23.5;
const LINE_XS = [29.5, 30.7, 31.9, 33.1, 34.3, 35.5];
const INTERNS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
/** The whole intake lined up in front of the 12th-floor reception. */
const lineUp = (stepForward: readonly string[] = []): Cue[] =>
  INTERNS.map((who, i) => (stepForward.includes(who) ? { who, from: [LINE_XS[i], LINE_Z], to: [LINE_XS[i], LINE_Z - 1.3], wait: 0.45 } : { who, from: [LINE_XS[i], LINE_Z], yaw: NORTH }));

/** The story so far, as scripted: seconds are relative weights, scaled to the server's timer below. */
const SCRIPT: readonly Shot[] = [
  {
    from: [515, 2.4, 603.6], to: [515, 4.4, 605.2], lookFrom: [515, 5, 627], lookTo: [515, 20, 627], seconds: 5,
    text: '鲸跃科技。一家号称“从不加班”的互联网大厂。',
    cast: [{ who: 'a', from: [512.6, 605.2], yaw: 0 }, { who: 'b', from: [513.7, 605.4], yaw: 0 }, { who: 'c', from: [516.4, 605.3], yaw: 0 }, { who: 'd', from: [517.5, 605.1], yaw: 0 }],
  },
  {
    from: [509.6, 2.2, 629.4], to: [511, 1.9, 630.8], lookFrom: [515.5, 1.2, 631], lookTo: [516, 1.2, 633], seconds: 5.5,
    text: '这个夏天，它招进来一批实习生。你，就是其中一个。',
    cast: [{ who: 'a', from: [514.4, 628.2], to: [514.2, 632.8] }, { who: 'b', from: [515.6, 627.8], to: [515.8, 632.4] }, { who: 'c', from: [514.8, 627.4], to: [515, 631.2], wait: 0.15 }, { who: 'd', from: [516.2, 627.3], to: [516.8, 630.8], wait: 0.25 }],
  },
  {
    from: [27.4, 2.4, 20.4], to: [28.4, 2.1, 20.8], lookFrom: [33, 1.1, 22.7], lookTo: [33, 1.1, 22.7], seconds: 6.5,
    text: '实习生不是正式员工：没有合同，没有保障，只有一张临时工牌。',
    cast: [...lineUp(), { who: 'hr', from: [32.5, 21.2], yaw: 0 }],
  },
  {
    from: [8.9, 2.5, 5], to: [8.2, 2.3, 4.9], lookFrom: [3.4, 1, 4.3], lookTo: [3, 1, 4.2], seconds: 6.5,
    text: '活却一样多：写周报、对账、跑腿、背锅。做完一件，涨一点 KPI。',
    cast: [{ who: 'a', from: [2.2, 4.05], yaw: NORTH, status: 'work' }, { who: 'b', from: [5.4, 4.05], yaw: NORTH, status: 'work' }, { who: 'c', from: [0.9, 5], to: [5.6, 5], carrying: 'doc' }],
  },
  {
    from: [32, 2, 10.5], to: [33, 1.75, 8.4], lookFrom: [35, 1.2, 4], lookTo: [35, 1.3, 3.6], seconds: 6,
    text: `王总监只认一个数字：KPI。而实习期，只有 ${TOTAL_DAYS} 天。`,
    cast: [{ who: 'boss', from: [36.6, 4.9], yaw: WEST }, { who: 'a', from: [34.4, 5], yaw: EAST }],
  },
  {
    from: [32.5, 1.95, 20.3], to: [32.5, 1.7, 20.7], lookFrom: [32.5, 1.2, 23.5], lookTo: [32.5, 1.2, 23.5], seconds: 7,
    text: `${TOTAL_DAYS} 天后按 KPI 排名。只有前三分之一的人，能换到正式工牌。`,
    cast: lineUp(['b', 'e']),
  },
  {
    from: [28.6, 1.8, 26.2], to: [29.6, 1.7, 25.8], lookFrom: [33, 1.1, 24.4], lookTo: [33.8, 1.1, 25.2], seconds: 6,
    text: '其余的人，当晚抱着纸箱离开。没有补偿，也没有第二次机会。',
    cast: [{ who: 'a', from: [30.6, 21.6], to: [34.2, 26.4], carrying: 'parcel' }, { who: 'c', from: [31.6, 20.8], to: [33.4, 25], carrying: 'parcel', wait: 0.2 }, { who: 'd', from: [33, 20.6], to: [34.8, 24.2], carrying: 'parcel', wait: 0.35 }, { who: 'f', from: [34.6, 20.6], to: [35.6, 23.2], carrying: 'parcel', wait: 0.5 }],
  },
  {
    from: [8.5, 2.05, 5.2], to: [8.9, 1.95, 5], lookFrom: [11.2, 1.1, 4.3], lookTo: [11.2, 1.1, 4.3], seconds: 7,
    text: `还未必撑得到那天：摸鱼被总监或 HR 抓到记警告，${MAX_WARNINGS} 次当场劝退。`,
    cast: [{ who: 'd', from: [10.6, 4.05], yaw: NORTH, status: 'phone' }, { who: 'boss', from: [15.2, 5], to: [11.7, 4.8], wait: 0.2 }],
  },
  {
    from: [14.8, 2.1, 605.2], to: [14.75, 2, 604.7], lookFrom: [14.6, 1.15, 602.1], lookTo: [14.6, 1.15, 602.1], seconds: 5.5,
    text: '每天从合租屋开始：洗漱要排队，早餐不够分，慢的人饿着出门。',
    cast: [{ who: 'a', from: [14.4, 602], yaw: EAST, status: 'wash', pajamas: true }, { who: 'b', from: [13.9, 603.1], yaw: NORTH, pajamas: true }],
  },
  {
    from: [116, 4.4, 600.8], to: [116, 2.8, 607.5], lookFrom: [116, 0.5, 622], lookTo: [116, 1.4, 636], seconds: 5,
    text: '然后穿过不让人的车流，挤进早高峰的地铁。',
    cast: [{ who: 'a', from: [114.6, 610], to: [114.8, 620] }, { who: 'b', from: [117, 609], to: [117.2, 618], wait: 0.1 }, { who: 'c', from: [115.8, 608.4], to: [116, 616.5], wait: 0.2 }],
  },
  {
    from: [207.6, 2.2, 603.6], to: [214, 1.8, 604.2], lookFrom: [226, 1.3, 606.6], lookTo: [226, 1.5, 607.4], seconds: 5,
    text: '过马路、刷工牌、等电梯。9:00 前没打上卡，先扣 KPI。',
    cast: [{ who: 'a', from: [216.6, 604.5], yaw: 0 }, { who: 'b', from: [217.9, 604.6], yaw: 0, status: 'phone' }, { who: 'c', from: [219.3, 604.4], yaw: 0 }, { who: 'd', from: [220.8, 604.6], yaw: 0 }],
  },
  {
    from: [15.6, 1.9, 19], to: [14.8, 1.8, 19.5], lookFrom: [11, 1.1, 21.2], lookTo: [11, 1.1, 21.2], seconds: 6.5,
    text: '同事也是对手：可以推人、丢香蕉皮、抢东西、打小报告。',
    cast: [{ who: 'a', from: [10.8, 21], yaw: WEST, status: 'work' }, { who: 'e', from: [15, 23.4], to: [11.9, 21.4], status: 'sneaky', wait: 0.15 }],
  },
  {
    from: [25, 1.9, 5.6], to: [25, 1.7, 4.6], lookFrom: [25, 1.3, 1], lookTo: [25, 1.3, 1], seconds: 5.5,
    text: '可部门 OKR 要所有人一起扛，有些活一个人根本搬不动。',
    cast: [{ who: 'b', from: [24.3, 1.5], yaw: NORTH, status: 'work' }, { who: 'c', from: [25.7, 1.5], yaw: NORTH, status: 'work' }, { who: 'f', from: [22.4, 4.6], to: [23.3, 2.2], carrying: 'doc' }],
  },
  {
    from: [1.5, 2.3, 12.6], to: [13, 1.95, 9], lookFrom: [12, 1.1, 4], lookTo: [19, 1.1, 5], seconds: 6.5,
    text: `谁先做满 ${DAY_KPI_TARGET} KPI，全员立刻下班结算：第一有奖，垫底记警告。`,
    cast: [{ who: 'a', from: [2.2, 4.05], yaw: NORTH, status: 'work' }, { who: 'b', from: [5.4, 4.05], yaw: NORTH, status: 'work' }, { who: 'c', from: [10.6, 4.05], yaw: NORTH, status: 'work' }, { who: 'd', from: [13.8, 4.05], yaw: NORTH, status: 'work' }, { who: 'boss', from: [18, 5], to: [9, 5] }],
  },
  {
    from: [32.5, 1.9, 20.2], to: [32.5, 1.6, 21.4], lookFrom: [32.5, 1.3, 23.5], lookTo: [32.5, 1.35, 23.5], seconds: 5.5,
    text: '转正，还是纸箱？倒计时现在开始。祝你好运，实习生。',
    cast: [{ who: 'a', from: [32.5, LINE_Z], yaw: NORTH }],
  },
];

const scripted = SCRIPT.reduce((sum, shot) => sum + shot.seconds, 0);
const pace = (INTRO_SECONDS + OVERRUN_SECONDS) / scripted;

/** The opening film: what an intern is, what is at stake, how a day goes, how you lose. */
export const INTRO: readonly Shot[] = SCRIPT.map((shot) => ({ ...shot, seconds: shot.seconds * pace }));
