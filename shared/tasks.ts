import type { StationType } from './world.ts';

export type ItemKind = 'doc' | 'coffee' | 'parcel' | 'milktea' | 'snack';
export type GameKind = 'keys' | 'order' | 'quiz' | 'recipe' | 'mash';

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
}

export const TASKS: readonly TaskDef[] = [
  {
    id: 'print',
    title: '打印季度报告',
    kpi: 16,
    steps: [{ station: 'printer', kind: 'hold', seconds: 3, gives: 'doc', text: '去打印室打印报告', verb: '打印报告' }],
    dests: ['bossdesk', 'whiteboard'],
  },
  {
    id: 'coffee',
    title: '给总监冲咖啡',
    kpi: 14,
    steps: [{ station: 'coffee', kind: 'minigame', game: 'recipe', gives: 'coffee', text: '去茶水间冲咖啡', verb: '冲咖啡' }],
    dests: ['bossdesk'],
  },
  {
    id: 'weekly',
    title: '写周报',
    kpi: 13,
    steps: [{ station: 'desk', kind: 'minigame', game: 'keys', text: '回自己工位写周报', verb: '写周报' }],
  },
  {
    id: 'invoice',
    title: '贴发票',
    kpi: 12,
    steps: [{ station: 'invoice', kind: 'minigame', game: 'order', text: '去打印室贴发票', verb: '贴发票' }],
  },
  {
    id: 'minutes',
    title: '整理会议纪要',
    kpi: 14,
    steps: [{ station: 'whiteboard', kind: 'minigame', game: 'quiz', text: '去会议室白板整理纪要', verb: '整理会议纪要' }],
  },
  {
    id: 'parcel',
    title: '代取快递',
    kpi: 11,
    steps: [{ station: 'locker', kind: 'hold', seconds: 2, gives: 'parcel', text: '去前台外卖柜取快递', verb: '取快递' }],
    dests: ['bossdesk', 'zhang', 'whiteboard'],
  },
  {
    id: 'milktea',
    title: '帮总监拿奶茶',
    kpi: 12,
    steps: [{ station: 'locker', kind: 'hold', seconds: 2, gives: 'milktea', text: '去前台外卖柜拿奶茶', verb: '拿奶茶' }],
    dests: ['bossdesk'],
  },
  // ---- 外派：物流仓库 ----
  {
    id: 'sort',
    title: '分拣包裹',
    kpi: 8,
    site: 'warehouse',
    steps: [{ station: 'conveyor', kind: 'hold', seconds: 1.2, gives: 'parcel', text: '去传送带取包裹（小心叉车）', verb: '取包裹' }],
    dests: ['bayA', 'bayB', 'bayC'],
  },
  {
    id: 'label',
    title: '贴面单',
    kpi: 11,
    site: 'warehouse',
    steps: [{ station: 'labelDesk', kind: 'minigame', game: 'order', text: '去打单台按重量排面单', verb: '贴面单' }],
  },
  {
    id: 'stock',
    title: '盘点库存',
    kpi: 12,
    site: 'warehouse',
    steps: [{ station: 'stockPc', kind: 'minigame', game: 'keys', text: '去盘点电脑录入库存', verb: '盘点库存' }],
  },
  {
    id: 'tea',
    title: '给甲方倒茶',
    kpi: 10,
    site: 'warehouse',
    steps: [{ station: 'waterBar', kind: 'hold', seconds: 2, gives: 'coffee', text: '去饮水机接一杯茶', verb: '接茶' }],
    dests: ['client'],
  },
  {
    id: 'brief',
    title: '听甲方提需求',
    kpi: 13,
    site: 'warehouse',
    steps: [{ station: 'client', kind: 'minigame', game: 'quiz', text: '去找甲方王总听需求', verb: '听甲方提需求' }],
  },
];

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
