import { LIFT_CAPACITY } from '../../shared/constants.ts';
import { liftAt, signalAt } from '../../shared/hazards.ts';
import type { Stage, TaskView } from '../../shared/protocol.ts';
import { STATIONS } from '../../shared/world.ts';
import { seatTaken, washing } from './commute.ts';
import type { GameState, Player } from './state.ts';

const chore = (uid: string, title: string, text: string, reward: string, target: string, done: boolean): TaskView => ({
  uid,
  title,
  text,
  kpi: 0,
  reward,
  target: done ? null : target,
  done,
});

const secondsLeft = (s: GameState, until: number): number => Math.max(0, Math.ceil(until - s.time));

function homeTasks(s: GameState, p: Player): TaskView[] {
  return [
    chore('wash', '洗漱', '两个洗漱台，要排队', '不洗 -KPI', washing(s, 'wash0') ? 'wash1' : 'wash0', p.washed),
    chore('dress', '换衣服', '去衣柜换下睡衣', '不换 -KPI', 'wardrobe', p.dressed),
    chore('eat', '吃早餐', `冰箱里只剩 ${s.breakfastLeft} 份`, '+精力', 'fridge', p.ate),
    chore('exit', '出门', '9:00 前到岗，否则算迟到', '必做', 'homedoor', false),
  ];
}

function trainTasks(s: GameState, p: Player): TaskView[] {
  const free = STATIONS.find((st) => st.type === 'seat' && !seatTaken(s, p, st.id));
  return [
    chore('seat', '抢座位', free ? '座位不够分，坐下能回精力' : '座位被抢光了', '+精力', free?.id ?? 'seat0', p.seat !== null),
    chore('ride', '坐到公司', `同车的人一起到站，还有 ${secondsLeft(s, p.rideEndsAt)} 秒`, '自动', '', true),
  ];
}

function plazaTasks(s: GameState): TaskView[] {
  const light = signalAt(s.time);
  const text = light.walk ? `绿灯！走斑马线，还剩 ${Math.ceil(light.left)} 秒` : `红灯，${Math.ceil(light.left)} 秒后变绿（闯红灯会被撞）`;
  // The arrow hovers over the turnstiles, straight through the revolving door.
  return [chore('cross', '过马路', text, '必做', '', true), chore('door', '进鲸跃大厦', '穿过旋转门，闸机就在里面', '必做', 'badge1', false)];
}

function lobbyTasks(s: GameState, p: Player): TaskView[] {
  const lift = liftAt(s.time);
  const wait = lift.doorsOpen ? `${lift.door + 1} 号梯开门了，最多 ${LIFT_CAPACITY} 人` : `下一趟是 ${lift.door + 1} 号梯，现在在 ${lift.floor} 楼`;
  return [chore('badge', '刷工牌', '闸机偶尔没反应，多刷几次', '必做', 'badge1', p.badged), chore('lift', '等电梯', wait, '必做', `lift${lift.door}`, false)];
}

function dispatchTasks(s: GameState, p: Player): TaskView[] {
  const lift = liftAt(s.time, true);
  const wait = lift.doorsOpen ? '电梯开门了，快进去' : `电梯在 ${lift.floor} 楼，慢慢等`;
  return [chore('slip', '领外派单', '总监办公室的办公桌上', '必做', 'bossdesk', p.hasSlip), chore('down', '坐电梯下楼', wait, '必做', 'lift12', false)];
}

function vanTasks(s: GameState, p: Player): TaskView[] {
  const van = s.vans.find((v) => p.cohort === `van:${v.trip}`);
  const driving = van?.driverId === p.id;
  const text = !van ? '' : van.started ? `还有 ${secondsLeft(s, van.arrivesAt)} 秒到仓库` : `${secondsLeft(s, van.leavesAt)} 秒后发车`;
  return [chore('van', driving ? '你来开车' : '坐稳', driving ? `跟着导航按方向键。${text}` : `司机是你同事。${text}`, driving ? '开好 +KPI' : '自动', '', true)];
}

const SIMPLE: Partial<Record<Stage, TaskView[]>> = {
  street: [chore('gate', '去地铁口', '穿过两条马路，被撞会晕 2 秒', '必做', 'gate', false)],
  subway: [chore('board', '挤上地铁', '车门打开时直接走进去（或按 E）', '必做', 'traindoor1', false)],
  depart: [chore('shuttle', '上外派班车', '出旋转门右手边。第一个上车的人开车', '必做', 'shuttle', false)],
};

/** The to-do list shown before the intern has started work. */
export function morningTasks(s: GameState, p: Player): TaskView[] {
  switch (p.stage) {
    case 'home':
      return homeTasks(s, p);
    case 'street':
      return [chore('pancake', '煎饼果子', '两条马路中间的小摊', '+精力', 'pancake', p.pancake), ...(SIMPLE.street ?? [])];
    case 'train':
      return trainTasks(s, p);
    case 'plaza':
      return plazaTasks(s);
    case 'lobby':
      return lobbyTasks(s, p);
    case 'lift':
      return [chore('ride', p.liftDown ? '下楼' : '上 12 楼', `每层都停，还有 ${secondsLeft(s, p.rideEndsAt)} 秒`, '自动', '', true)];
    case 'dispatch':
      return dispatchTasks(s, p);
    case 'van':
      return vanTasks(s, p);
    default:
      return SIMPLE[p.stage] ?? [];
  }
}
