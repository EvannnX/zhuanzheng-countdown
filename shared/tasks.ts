import type { NpcId, StationType } from './world.ts';

export type ItemKind = 'doc' | 'coffee' | 'parcel' | 'milktea' | 'snack';
export type GameKind = 'keys' | 'order' | 'quiz' | 'recipe' | 'mash' | 'timing' | 'drive';

export type Site = 'office' | 'warehouse';

export const ITEM_NAMES: Record<ItemKind, string> = {
  doc: '报告',
  coffee: '咖啡',
  parcel: '快递',
  milktea: '奶茶',
  snack: '零食',
};

export interface StepDef {
  readonly station: StationType;
  readonly kind: 'hold' | 'minigame';
  readonly seconds?: number;
  readonly game?: GameKind;
  readonly gives?: ItemKind;
  /** How many interns must hold together; the owner waits until helpers join. */
  readonly crew?: number;
  /** Done face to face with this colleague, wherever they happen to be, instead of at the station. */
  readonly npc?: NpcId;
  readonly text: string;
  readonly verb: string;
}

export interface TaskDef {
  readonly id: string;
  readonly title: string;
  readonly kpi: number;
  readonly steps: readonly StepDef[];
  /** When set, the task ends by carrying the produced item to one of these stations. */
  readonly dests?: readonly string[];
  /** Where this job exists. Defaults to the office. */
  readonly site?: Site;
  /** First day this kind of work is handed out. Defaults to day 1. */
  readonly minDay?: number;
}

const hold = (station: StationType, seconds: number, verb: string, text: string, extra: Partial<StepDef> = {}): StepDef => ({ station, kind: 'hold', seconds, verb, text, ...extra });
const play = (station: StationType, game: GameKind, verb: string, text: string, extra: Partial<StepDef> = {}): StepDef => ({ station, kind: 'minigame', game, verb, text, ...extra });

const OFFICE_TASKS: readonly TaskDef[] = [
  {
    id: 'print',
    title: '季度报告',
    kpi: 22,
    steps: [
      play('desk', 'keys', '写报告初稿', '回自己工位写初稿'),
      hold('printer', 3, '打印报告', '去打印室把报告打出来', { gives: 'doc' }),
      play('bossdesk', 'timing', '请王总监签字', '找到王总监本人（他在到处巡视），当面递上去签字', { npc: 'boss' }),
    ],
    dests: ['bossdesk'],
  },
  {
    id: 'coffee',
    title: '给总监冲咖啡',
    kpi: 18,
    steps: [hold('snack', 1.5, '拿咖啡豆', '去茶水间零食柜拿咖啡豆'), play('coffee', 'recipe', '冲咖啡', '到咖啡机按总监的口味冲一杯', { gives: 'coffee' })],
    dests: ['bossdesk'],
  },
  {
    id: 'weekly',
    title: '写周报',
    kpi: 16,
    steps: [play('desk', 'keys', '写周报', '回自己工位写周报'), hold('server', 2.5, '上传内网', '去打印室的机房把周报传上内网')],
  },
  {
    id: 'parcel',
    title: '代取快递',
    kpi: 14,
    steps: [hold('locker', 2, '取快递', '去前台外卖柜取快递', { gives: 'parcel' }), hold('invoice', 2, '登记签收', '拿到打印室的登记桌签收')],
    dests: ['bossdesk', 'zhang'],
  },
  {
    id: 'invoice',
    title: '报销单',
    kpi: 22,
    minDay: 2,
    steps: [
      hold('locker', 2, '取发票信封', '去前台外卖柜取发票信封', { gives: 'doc' }),
      play('invoice', 'order', '贴发票', '到打印室把发票按金额贴好'),
      play('bossdesk', 'timing', '请王总监签字', '找到王总监本人，当面签字', { npc: 'boss' }),
    ],
    dests: ['zhang'],
  },
  {
    id: 'paper',
    title: '合抬打印纸',
    kpi: 24,
    minDay: 2,
    steps: [hold('locker', 4, '合抬打印纸', '前台到了一整箱打印纸，要两个人一起抬', { gives: 'parcel', crew: 2 })],
    dests: ['printer'],
  },
  {
    id: 'minutes',
    title: '会议纪要',
    kpi: 22,
    minDay: 3,
    steps: [
      play('whiteboard', 'quiz', '听会', '去会议室听领导讲话，听懂潜台词'),
      play('desk', 'keys', '整理纪要', '回工位把纪要敲出来'),
      hold('printer', 3, '打印纪要', '去打印室打印', { gives: 'doc' }),
    ],
    dests: ['bossdesk'],
  },
  {
    id: 'milktea',
    title: '帮总监拿奶茶',
    kpi: 16,
    minDay: 3,
    steps: [hold('locker', 2, '拿奶茶', '去前台外卖柜拿奶茶', { gives: 'milktea' }), hold('coffee', 2, '加冰', '总监要去冰变少冰：去茶水间加冰')],
    dests: ['bossdesk'],
  },
  {
    id: 'deploy',
    title: '版本上线',
    kpi: 30,
    minDay: 5,
    steps: [
      play('desk', 'keys', '改最后一个 bug', '回工位改最后一个 bug'),
      play('server', 'mash', '重启服务', '去机房重启服务（狂按 E）'),
      play('whiteboard', 'quiz', '上线汇报', '去会议室做上线汇报'),
      play('bossdesk', 'timing', '请王总监验收', '找到王总监本人验收签字', { npc: 'boss' }),
    ],
  },
];

const WAREHOUSE_TASKS: readonly TaskDef[] = [
  {
    id: 'sort',
    title: '分拣包裹',
    kpi: 13,
    steps: [hold('conveyor', 1.2, '取包裹', '去传送带取包裹（小心叉车）', { gives: 'parcel' }), play('labelDesk', 'timing', '扫码', '到打单台对准条码扫一下')],
    dests: ['bayA', 'bayB', 'bayC'],
  },
  {
    id: 'label',
    title: '贴面单',
    kpi: 16,
    steps: [play('stockPc', 'keys', '导出订单', '去盘点电脑导出今天的订单'), play('labelDesk', 'order', '贴面单', '到打单台按重量排面单')],
  },
  {
    id: 'stock',
    title: '盘点库存',
    kpi: 16,
    steps: [hold('boxpile', 2.5, '清点纸箱', '去西墙边的纸箱堆（📦 标记）把库存数一遍'), play('stockPc', 'keys', '录入库存', '到盘点电脑录入数字')],
  },
  {
    id: 'brief',
    title: '伺候甲方',
    kpi: 20,
    steps: [
      hold('waterBar', 2, '接茶', '去饮水机给甲方接一杯茶', { gives: 'coffee' }),
      play('client', 'quiz', '听甲方提需求', '端过去，顺便听王总提需求'),
      play('stockPc', 'keys', '录入需求', '到盘点电脑把需求录进系统'),
    ],
  },
  {
    id: 'heavy',
    title: '合抬大件',
    kpi: 24,
    steps: [hold('boxpile', 4, '合抬大件', '西墙边的纸箱堆（📦 标记）有一件大货，要两个人一起抬', { gives: 'parcel', crew: 2 })],
    dests: ['bayA', 'bayB', 'bayC'],
  },
  {
    id: 'rush',
    title: '甲方加急单',
    kpi: 28,
    minDay: 4,
    steps: [
      play('client', 'quiz', '确认加急单', '去找王总确认加急单'),
      hold('conveyor', 1.5, '截下包裹', '去传送带把那件包裹截下来', { gives: 'parcel' }),
      play('labelDesk', 'timing', '重打面单', '到打单台重打面单'),
    ],
    dests: ['bayA', 'bayB', 'bayC'],
  },
];

export const TASKS: readonly TaskDef[] = [...OFFICE_TASKS, ...WAREHOUSE_TASKS.map((t) => ({ ...t, site: 'warehouse' as const }))];

export const taskDef = (id: string): TaskDef | undefined => TASKS.find((t) => t.id === id);

export interface QuizItem {
  readonly quote: string;
  readonly options: readonly [string, string, string];
  readonly answer: number;
}

export const QUIZ: readonly QuizItem[] = [
  { quote: '这个需求很简单', options: ['今晚通宵', '真的很简单', '可以不做'], answer: 0 },
  { quote: '我们对齐一下', options: ['大家站成一排', '按我说的改', '各抒己见'], answer: 1 },
  { quote: '年轻人要多锻炼', options: ['公司报销健身卡', '活多钱不涨', '可以早下班'], answer: 1 },
  { quote: '原则上不加班', options: ['准点下班', '原则可以打破', '禁止加班'], answer: 1 },
  { quote: '我简单说两句', options: ['两句话结束', '至少四十分钟', '散会'], answer: 1 },
  { quote: '这个你先跟一下', options: ['以后都归你了', '看看就行', '跟着走两步'], answer: 0 },
  { quote: '公司是一个大家庭', options: ['发年终奖', '别谈钱', '管三餐'], answer: 1 },
  { quote: '有没有抓手', options: ['门把手坏了', '有没有具体办法', '谁来握个手'], answer: 1 },
  { quote: '下班前给我', options: ['你的下班时间取决于它', '明天也行', '下周再说'], answer: 0 },
  { quote: '形成闭环', options: ['画个圆', '事情要有结果', '绕场一周'], answer: 1 },
  { quote: '颗粒度再细一点', options: ['咖啡磨细点', '方案写得更具体', '字号调小'], answer: 1 },
  { quote: '我不是针对你', options: ['就是在说你', '在说别人', '在夸你'], answer: 0 },
];

export const RECIPE_STAGES: readonly { readonly name: string; readonly options: readonly string[] }[] = [
  { name: '温度', options: ['热', '冰', '常温'] },
  { name: '浓缩', options: ['单份', '双份', '三份'] },
  { name: '糖', options: ['不加糖', '半糖', '全糖'] },
];

export type ShopItemId = 'fakeScreen' | 'slippers' | 'banana';

export const SHOP: readonly { readonly id: ShopItemId; readonly name: string; readonly price: number; readonly text: string }[] = [
  { id: 'fakeScreen', name: '假屏幕', price: 10, text: '在自己工位摸鱼被抓时自动挡一次' },
  { id: 'slippers', name: '静音拖鞋', price: 8, text: '今天移动速度 +20%' },
  { id: 'banana', name: '香蕉皮', price: 5, text: '按 V 丢在地上，同事踩到会滑倒并掉东西' },
];
