import { inRect } from './geometry.ts';
import type { Rect, Vec } from './geometry.ts';

export type RoomId =
  | 'office'
  | 'meeting'
  | 'director'
  | 'corridor'
  | 'pantry'
  | 'print'
  | 'restroom'
  | 'lobby'
  | 'terrace'
  | 'home'
  | 'street'
  | 'subway'
  | 'warehouse';

export interface Room extends Rect {
  readonly id: RoomId;
  readonly name: string;
  readonly floor: string;
  readonly outdoor?: boolean;
}

/**
 * The game spans five separate places. They share one coordinate space but sit
 * hundreds of metres apart, so only the one you are standing in is ever visible.
 */
export type AreaId = 'office' | 'home' | 'street' | 'subway' | 'warehouse';
export interface Area extends Rect {
  readonly id: AreaId;
  readonly name: string;
}
export const AREAS: readonly Area[] = [
  { id: 'office', name: '鲸跃科技 12F', x0: 0, z0: 0, x1: 52, z1: 28 },
  { id: 'home', name: '合租屋', x0: 0, z0: 600, x1: 16, z1: 612 },
  { id: 'street', name: '上班路上', x0: 100, z0: 600, x1: 132, z1: 640 },
  { id: 'subway', name: '地铁站', x0: 200, z0: 600, x1: 228, z1: 610 },
  { id: 'warehouse', name: '外派 · 物流仓库', x0: 300, z0: 600, x1: 340, z1: 624 },
];
export const areaAt = (p: Vec): AreaId | null => AREAS.find((a) => inRect(a, p))?.id ?? null;
export const areaById = (id: AreaId): Area => AREAS.find((a) => a.id === id) as Area;
export const WALL_HEIGHT = 3;
export const RAIL_HEIGHT = 1.1;
const WALL_HALF = 0.1;

export const ROOMS: readonly Room[] = [
  { id: 'office', name: '开放工位区', floor: '#d8c6a0', x0: 0, z0: 0, x1: 20, z1: 14 },
  { id: 'meeting', name: '会议室', floor: '#b7c8d8', x0: 20, z0: 0, x1: 30, z1: 14 },
  { id: 'director', name: '总监办公室', floor: '#a9754f', x0: 30, z0: 0, x1: 40, z1: 14 },
  { id: 'corridor', name: '走廊', floor: '#e9e4d8', x0: 0, z0: 14, x1: 40, z1: 17 },
  { id: 'pantry', name: '茶水间', floor: '#f3e1b3', x0: 0, z0: 17, x1: 9, z1: 28 },
  { id: 'print', name: '打印室', floor: '#ccd3da', x0: 9, z0: 17, x1: 18, z1: 28 },
  { id: 'restroom', name: '洗手间', floor: '#bfe1e6', x0: 18, z0: 17, x1: 26, z1: 28 },
  { id: 'lobby', name: '前台', floor: '#efe8dc', x0: 26, z0: 17, x1: 40, z1: 28 },
  { id: 'terrace', name: '天台', floor: '#9fa89e', x0: 40, z0: 8, x1: 52, z1: 24, outdoor: true },
  { id: 'home', name: '合租屋', floor: '#c9a36b', x0: 0, z0: 600, x1: 16, z1: 612 },
  { id: 'street', name: '街道', floor: '#b9bec4', x0: 100, z0: 600, x1: 132, z1: 640, outdoor: true },
  { id: 'subway', name: '站台', floor: '#d9dde2', x0: 200, z0: 600, x1: 228, z1: 610 },
  { id: 'warehouse', name: '仓库', floor: '#aeb4ba', x0: 300, z0: 600, x1: 340, z1: 624 },
];

export const roomAt = (p: Vec): RoomId | null => ROOMS.find((r) => inRect(r, p))?.id ?? null;
export const roomName = (id: RoomId): string => ROOMS.find((r) => r.id === id)?.name ?? '';

/** A door is a gap [from,to] in the wall line `axis = at`. */
export interface Door {
  readonly room: RoomId;
  readonly axis: 'x' | 'z';
  readonly at: number;
  readonly from: number;
  readonly to: number;
  /** Overrides the room name on the door sign. */
  readonly label?: string;
}

export const DOORS: readonly Door[] = [
  { room: 'office', axis: 'z', at: 14, from: 5, to: 6.6 },
  { room: 'office', axis: 'z', at: 14, from: 15, to: 16.6 },
  { room: 'meeting', axis: 'z', at: 14, from: 24, to: 25.6 },
  { room: 'director', axis: 'z', at: 14, from: 34, to: 35.6 },
  { room: 'pantry', axis: 'z', at: 17, from: 4, to: 5.6 },
  { room: 'print', axis: 'z', at: 17, from: 13, to: 14.6 },
  { room: 'restroom', axis: 'z', at: 17, from: 19.2, to: 20.8, label: '男洗手间' },
  { room: 'restroom', axis: 'z', at: 17, from: 23.2, to: 24.8, label: '女洗手间' },
  // Next to the reception desk, so visitors pass the front desk before entering the office.
  { room: 'lobby', axis: 'z', at: 17, from: 27.5, to: 30.5 },
  { room: 'terrace', axis: 'x', at: 40, from: 14.7, to: 16.3 },
];

export const RESTROOM_DIVIDER_X = 22;

export interface WallRect extends Rect {
  /** Low walls (railings) block movement but not sight. */
  readonly low: boolean;
  /** Collision only: the scenery around it is drawn separately (street edges). */
  readonly hidden?: boolean;
}

function wallLine(axis: 'x' | 'z', at: number, from: number, to: number, low = false, hidden = false): WallRect[] {
  const gaps = DOORS.filter((d) => d.axis === axis && d.at === at && d.from >= from && d.to <= to)
    .slice()
    .sort((a, b) => a.from - b.from);
  const cuts = [from, ...gaps.flatMap((g) => [g.from, g.to]), to];
  const spans: [number, number][] = [];
  for (let i = 0; i < cuts.length; i += 2) {
    if (cuts[i + 1] > cuts[i]) spans.push([cuts[i], cuts[i + 1]]);
  }
  return spans.map(([a, b]) =>
    axis === 'z'
      ? { x0: a, x1: b, z0: at - WALL_HALF, z1: at + WALL_HALF, low, hidden }
      : { x0: at - WALL_HALF, x1: at + WALL_HALF, z0: a, z1: b, low, hidden },
  );
}

const enclose = (a: Rect, hidden = false): WallRect[] => [
  ...wallLine('z', a.z0, a.x0, a.x1, false, hidden),
  ...wallLine('z', a.z1, a.x0, a.x1, false, hidden),
  ...wallLine('x', a.x0, a.z0, a.z1, false, hidden),
  ...wallLine('x', a.x1, a.z0, a.z1, false, hidden),
];

/** z of the platform edge: beyond it are the tracks. */
export const PLATFORM_EDGE_Z = 606;

export const WALLS: readonly WallRect[] = [
  ...enclose(areaById('home')),
  ...enclose(areaById('street'), true),
  ...enclose(areaById('subway')),
  // Collision only: the platform edge is open, as on a real platform.
  ...wallLine('z', PLATFORM_EDGE_Z, 200, 228, true, true),
  ...enclose(areaById('warehouse')),
  ...wallLine('z', 0, 0, 40),
  ...wallLine('z', 28, 0, 40),
  ...wallLine('x', 0, 0, 28),
  ...wallLine('x', 40, 0, 28),
  ...wallLine('z', 14, 0, 40),
  ...wallLine('z', 17, 0, 40),
  ...wallLine('x', 20, 0, 14),
  ...wallLine('x', 30, 0, 14),
  ...wallLine('x', 9, 17, 28),
  ...wallLine('x', 18, 17, 28),
  ...wallLine('x', 26, 17, 28),
  // Divider between the men's and women's restrooms.
  ...wallLine('x', RESTROOM_DIVIDER_X, 17, 28),
  ...wallLine('z', 8, 40, 52, true),
  ...wallLine('z', 24, 40, 52, true),
  ...wallLine('x', 52, 8, 24, true),
];

export const SIGHT_BLOCKERS: readonly Rect[] = WALLS.filter((w) => !w.low);

export type Face = 'n' | 's' | 'e' | 'w';

export interface Prop {
  readonly kind: string;
  readonly x: number;
  readonly z: number;
  /** World-aligned footprint. */
  readonly w: number;
  readonly d: number;
  /** Which way the front of the prop points. */
  readonly face: Face;
  readonly solid: boolean;
}

/** Standing spots inside the four toilet stalls (two per restroom). */
const STALL_XS = [19.4, 21.35, 23.4, 25.35];

const prop = (kind: string, x: number, z: number, w: number, d: number, face: Face = 's', solid = true): Prop => ({
  kind,
  x,
  z,
  w,
  d,
  face,
  solid,
});

/**
 * Desks sit in back-to-back benches like a real open-plan floor: each bench row
 * is a north-facing desk and a south-facing desk sharing one spine.
 */
const DESK_W = 1.6;
const DESK_D = 0.9;
const WEST_BLOCK = [2.2, 3.8, 5.4, 7];
const EAST_BLOCK = [10.6, 12.2, 13.8, 15.4];
const BOTH_BLOCKS = [...WEST_BLOCK, ...EAST_BLOCK];
/** Row three leaves the south-west corner free for the lounge. */
const SHORT_ROW = [...WEST_BLOCK.slice(1), ...EAST_BLOCK];
const ROW_SPINES = [2.6, 7, 11];
const southSide = (spine: number): number => spine + DESK_D / 2;
const northSide = (spine: number): number => spine - DESK_D / 2;

/** The eight intern desks, spread over the first two benches. Users stand on the south side. */
export const DESK_POSITIONS: readonly Vec[] = [
  ...[2.2, 5.4, 10.6, 13.8].map((x) => ({ x, z: southSide(ROW_SPINES[0]) })),
  ...[3.8, 7, 12.2, 15.4].map((x) => ({ x, z: southSide(ROW_SPINES[1]) })),
];

const isInternDesk = (x: number, z: number): boolean => DESK_POSITIONS.some((p) => p.x === x && p.z === z);

/** Every other desk on the floor belongs to a (non-playing) colleague. */
const COLLEAGUE_DESKS: readonly { x: number; z: number; face: Face }[] = ROW_SPINES.flatMap((spine, row) => {
  const xs = row === 2 ? SHORT_ROW : BOTH_BLOCKS;
  return [
    ...xs.map((x) => ({ x, z: northSide(spine), face: 'n' as const })),
    ...xs.filter((x) => !isInternDesk(x, southSide(spine))).map((x) => ({ x, z: southSide(spine), face: 's' as const })),
  ];
});

export const BAY_XS = [310, 320, 330];
const RACK_XS = [312, 320, 328];

const HOME_WALL_T = 0.16;
/** Doorways (from, to) in the flat's inner walls; the client hangs headers over them. */
export const HOME_DOORWAYS = {
  bedroomWest: { axis: 'z', at: 604.6, from: 1.4, to: 3 },
  bedroomEast: { axis: 'z', at: 604.6, from: 7.4, to: 9 },
  washNorth: { axis: 'x', at: 13, from: 602, to: 603.5 },
  washSouth: { axis: 'z', at: 606.6, from: 13.4, to: 14.8 },
} as const;
/** Inner walls of the flat as [x, z, w, d] footprints. */
const HOME_WALLS: readonly (readonly [number, number, number, number])[] = [
  [0.7, 604.6, 1.4, HOME_WALL_T],
  [5.2, 604.6, 4.4, HOME_WALL_T],
  [11, 604.6, 4, HOME_WALL_T],
  [13, 601, HOME_WALL_T, 2],
  [13, 605.05, HOME_WALL_T, 3.1],
  [13.16, 606.6, 0.48, HOME_WALL_T],
  [15.4, 606.6, 1.2, HOME_WALL_T],
];

/** Furniture of the four places outside the office. */
const AWAY_PROPS: readonly Prop[] = [
  // home: a shared flat — bunk room, wash nook, living room and kitchen corner
  ...[1.6, 4.8, 8, 11.2].map((x) => prop('bunk', x, 600.75, 2.1, 1.1)),
  ...[3.2, 6.4, 9.6].map((x) => prop('nightstand', x, 600.45, 0.5, 0.45)),
  prop('wardrobe', 5.2, 604.15, 2.4, 0.7, 'n'),
  prop('dresser', 10.9, 604.25, 1.6, 0.5, 'n'),
  ...HOME_WALLS.map(([x, z, w, d]) => prop('homeWall', x, z, w, d)),
  prop('washstand', 15.45, 602, 0.9, 1.4, 'w'),
  prop('washstand', 15.45, 605, 0.9, 1.4, 'w'),
  prop('washer', 15.5, 600.55, 0.7, 0.7),
  prop('homeSofa', 0.65, 608, 0.9, 2.2, 'e'),
  prop('coffeeTable', 2.4, 608, 0.6, 1.1),
  prop('tvStand', 2.3, 611.62, 2, 0.45, 'n'),
  prop('shoeCabinet', 4.3, 611.7, 1.3, 0.36, 'n'),
  prop('studyDesk', 8.3, 611.5, 1.6, 0.7, 'n'),
  prop('kitchenette', 12.5, 611.35, 4.4, 1, 'n'),
  prop('diningTable', 11.2, 608.5, 2.4, 1.1),
  prop('dryingRack', 6.2, 606.3, 1.3, 0.6),
  prop('beanbag', 4.5, 609.5, 0.8, 0.8),
  prop('boxes', 12.3, 605.4, 0.9, 1.2),
  prop('homeLamp', 0.5, 605.3, 0.4, 0.4),
  prop('homePlant', 0.55, 610.4, 0.5, 0.5),
  // street
  prop('pancakeStall', 108, 619.4, 2.4, 1.4),
  prop('subwayEntrance', 116, 638.6, 6, 2.4, 'n'),
  prop('busStop', 126, 620, 3.4, 1.2),
  // subway platform
  ...[209, 215, 221].map((x) => prop('pillar', x, 602.2, 0.4, 0.4)),
  ...[206.2, 211, 217, 223].map((x) => prop('pillar', x, 605.3, 0.4, 0.4)),
  // fare line: you walk between the turnstiles to reach the platform
  ...[600.4, 601.8, 603.2, 604.6].map((z) => prop('turnstile', 206.2, z, 1.2, 0.3)),
  prop('tokenBooth', 201.3, 604.9, 1.8, 1.6, 'e'),
  prop('fareMachine', 202.4, 600.5, 0.9, 0.7),
  prop('fareMachine', 203.5, 600.5, 0.9, 0.7),
  prop('platformBench', 210, 600.6, 2.4, 0.7),
  prop('platformBench', 218, 600.6, 2.4, 0.7),
  // warehouse
  prop('conveyor', 320, 601.3, 26, 1.4),
  ...RACK_XS.flatMap((x) => [608, 616].map((z) => prop('rack', x, z, 6, 1.4))),
  ...BAY_XS.map((x) => prop('bay', x, 623, 4, 1.6, 'n')),
  prop('packDesk', 338.6, 606.5, 1, 2.2, 'w'),
  prop('packDesk', 338.6, 615.5, 1, 2.2, 'w'),
  prop('sofa', 338.9, 621.3, 0.9, 2.4, 'w'),
  prop('dispenser', 301, 601, 0.45, 0.45),
  prop('boxes', 302.2, 617, 0.9, 1.2),
];

export const PROPS: readonly Prop[] = [
  ...AWAY_PROPS,
  ...DESK_POSITIONS.map((p) => prop('desk', p.x, p.z, DESK_W, DESK_D, 's')),
  // Two in three colleague desks have someone sitting at them.
  ...COLLEAGUE_DESKS.map((p, i) => prop(i % 3 === 2 ? 'desk' : 'deskStaffed', p.x, p.z, DESK_W, DESK_D, p.face)),
  prop('desk', 17.9, 10.5, 0.9, 1.7, 'e'),
  prop('meetingTable', 25, 7, 2, 5),
  prop('bossDesk', 35, 3.5, 2.4, 1, 's'),
  prop('perfDesk', 39.3, 9, 0.9, 1.6, 'w'),
  prop('sofa', 30.7, 10, 0.9, 2.4, 'e'),
  prop('counter', 0.7, 21, 1, 5, 'e'),
  prop('fridge', 0.7, 25, 1, 1, 'e'),
  prop('snackCabinet', 4.5, 27.4, 2, 0.8, 'n'),
  prop('roundTable', 6.5, 22, 1.2, 1.2),
  prop('printer', 9.8, 21, 1, 1.2, 'e'),
  prop('copier', 9.8, 24.5, 1, 1.2, 'e'),
  prop('invoiceTable', 13.5, 27.2, 2.4, 1, 'n'),
  prop('serverRack', 17.3, 24, 0.9, 2, 'w'),
  prop('shelf', 17.3, 19.8, 0.9, 2, 'w'),
  prop('partition', 20, 26.5, 0.1, 3),
  prop('partition', 24, 26.5, 0.1, 3),
  ...STALL_XS.map((x) => prop('toilet', x - 0.35, 27.4, 0.6, 0.8, 'n')),
  prop('stallFrontM', 18.45, 25, 0.7, 0.08),
  prop('stallFrontM', 20.4, 25, 0.7, 0.08),
  prop('stallFrontF', 22.45, 25, 0.7, 0.08),
  prop('stallFrontF', 24.4, 25, 0.7, 0.08),
  prop('sink', 18.55, 20.5, 0.9, 2.4, 'e'),
  prop('urinals', 21.7, 21.6, 0.4, 2.6, 'w'),
  prop('sink', 25.45, 20.5, 0.9, 2.4, 'w'),
  // Reception faces the lifts on the south wall.
  prop('reception', 34.5, 19.2, 4, 1, 's'),
  prop('locker', 39.3, 20, 1, 3, 'w'),
  prop('sofa', 26.7, 24, 0.9, 3, 'e'),
  prop('bench', 46, 9, 2.4, 0.7, 's'),
  prop('bench', 51, 18, 0.7, 2.4, 'w'),
  prop('planter', 41, 9, 0.8, 0.8),
  prop('planter', 41, 23, 0.8, 0.8),
  prop('planter', 51, 23, 0.8, 0.8),
  prop('planter', 39.3, 17.65, 0.8, 0.8),
  prop('planter', 19, 1, 0.8, 0.8),
  // Larger furniture added with the art pass. Solid, so NPC routes avoid it too.
  prop('cabinets', 19.6, 5, 0.7, 3.6, 'w'),
  prop('credenza', 20.45, 10.5, 0.6, 3, 'e'),
  prop('bookshelf', 30.45, 4, 0.6, 3.6, 'e'),
  prop('coffeeTable', 32.2, 10, 0.7, 1.2),
  prop('fishTank', 39.55, 6.5, 0.6, 1.5, 'w'),
  prop('dispenser', 8.5, 17.55, 0.45, 0.45),
  prop('bins', 2.3, 27.6, 1.3, 0.45, 'n'),
  prop('barTable', 8.6, 24.8, 0.5, 3.4, 'w'),
  prop('boxes', 9.65, 26.9, 0.9, 1.2),
  prop('ups', 17.5, 26.2, 0.6, 0.9, 'w'),
  prop('shredder', 11, 17.5, 0.45, 0.5),
  prop('coffeeTable', 28.3, 24, 0.7, 1.2),
  prop('vending', 0.55, 15.5, 0.8, 1, 'e'),
  prop('parasol', 46.5, 20.5, 1.2, 1.2),
  prop('acUnits', 40.5, 11, 0.6, 2.2, 'e'),
  prop('lounger', 43, 22.3, 0.7, 1.8),
  prop('lounger', 44.3, 22.3, 0.7, 1.8),
];

export const propRect = (p: Prop): Rect => ({
  x0: p.x - p.w / 2,
  x1: p.x + p.w / 2,
  z0: p.z - p.d / 2,
  z1: p.z + p.d / 2,
});

export const COLLIDERS: readonly Rect[] = [...WALLS, ...PROPS.filter((p) => p.solid).map(propRect)];

export type StationType =
  | 'desk'
  | 'shop'
  | 'whiteboard'
  | 'bossdesk'
  | 'perfpc'
  | 'coffee'
  | 'snack'
  | 'printer'
  | 'invoice'
  | 'server'
  | 'stall'
  | 'locker'
  | 'bench'
  | 'wash'
  | 'dress'
  | 'breakfast'
  | 'homeDoor'
  | 'pancake'
  | 'subwayGate'
  | 'trainDoor'
  | 'conveyor'
  | 'bay'
  | 'labelDesk'
  | 'stockPc'
  | 'waterBar'
  | 'client';

export interface Station extends Vec {
  readonly id: string;
  readonly type: StationType;
  readonly label: string;
  readonly icon: string;
  /** Where the floating icon sits (above the prop, not the standing spot). */
  readonly ax: number;
  readonly az: number;
}

const station = (
  id: string,
  type: StationType,
  label: string,
  icon: string,
  x: number,
  z: number,
  ax: number,
  az: number,
): Station => ({ id, type, label, icon, x, z, ax, az });

export const deskId = (index: number): string => `desk${index}`;

export const TRAIN_DOOR_XS = [208, 214, 220];

const AWAY_STATIONS: readonly Station[] = [
  station('wash0', 'wash', '洗漱台', '🪥', 14.4, 602, 15.45, 602),
  station('wash1', 'wash', '洗漱台', '🪥', 14.4, 605, 15.45, 605),
  station('wardrobe', 'dress', '衣柜', '👔', 5.2, 603.2, 5.2, 604.15),
  station('fridge', 'breakfast', '冰箱', '🍞', 14.2, 610.2, 14.25, 611.35),
  station('homedoor', 'homeDoor', '大门', '🚪', 6, 611.1, 6, 611.9),
  station('pancake', 'pancake', '煎饼摊', '🥞', 108, 620.9, 108, 619.4),
  station('gate', 'subwayGate', '地铁口', '🚇', 116, 636.6, 116, 638.6),
  ...TRAIN_DOOR_XS.map((x, i) => station(`traindoor${i}`, 'trainDoor', '车门', '🚪', x, 605.2, x, 606)),
  station('conveyor', 'conveyor', '传送带', '📦', 320, 602.8, 320, 601.3),
  ...BAY_XS.map((x, i) => station(`bay${'ABC'[i]}`, 'bay', `${'ABC'[i]} 区货位`, '🅿️', x, 621.4, x, 623)),
  station('labeldesk', 'labelDesk', '打单台', '🏷️', 337.4, 606.5, 338.6, 606.5),
  station('stockpc', 'stockPc', '盘点电脑', '🖥️', 337.4, 615.5, 338.6, 615.5),
  station('waterbar', 'waterBar', '饮水机', '🚰', 301.7, 601.8, 301, 601),
  station('client', 'client', '甲方王总', '🤵', 337.6, 621.3, 338.9, 621.3),
  station('boxpile', 'bench', '纸箱堆', '🌤️', 303.4, 617, 302.2, 617),
];

export const STATIONS: readonly Station[] = [
  ...AWAY_STATIONS,
  ...DESK_POSITIONS.map((p, i) => station(deskId(i), 'desk', `${i + 1} 号工位`, '💻', p.x, p.z + 1, p.x, p.z)),
  station('zhang', 'shop', '老张', '🧓', 17.1, 10.5, 18.9, 10.5),
  station('whiteboard', 'whiteboard', '会议室', '📋', 25, 1.2, 25, 0.3),
  station('bossdesk', 'bossdesk', '总监办公室', '👔', 35, 4.7, 35, 3.5),
  station('perfpc', 'perfpc', '绩效电脑', '📈', 38.4, 9, 39.3, 9),
  station('coffee', 'coffee', '咖啡机', '☕', 1.7, 20, 0.7, 20),
  station('snack', 'snack', '零食柜', '🍪', 4.5, 26.5, 4.5, 27.4),
  station('printer', 'printer', '打印机', '🖨️', 10.8, 21, 9.8, 21),
  station('invoice', 'invoice', '发票桌', '🧾', 13.5, 26.2, 13.5, 27.2),
  station('server', 'server', '服务器', '🗄️', 16.4, 24, 17.3, 24),
  ...STALL_XS.map((x, i) => station(`stall${i}`, 'stall', '隔间', '🚽', x, 26.3, x - 0.35, 27.4)),
  station('locker', 'locker', '外卖柜', '📦', 38.3, 20, 39.3, 20),
  station('bench0', 'bench', '长椅', '🌤️', 46, 10, 46, 9),
  station('bench1', 'bench', '长椅', '🌤️', 50, 18, 51, 18),
];

export const stationById = (id: string): Station | undefined => STATIONS.find((s) => s.id === id);
export const stationOfType = (type: StationType): Station | undefined => STATIONS.find((s) => s.type === type);

export const DESK_COUNT = DESK_POSITIONS.length;

/** Standing in front of a desk, facing the monitor (north). */
export function deskSpawn(index: number): { x: number; z: number; yaw: number } {
  const p = DESK_POSITIONS[index % DESK_COUNT];
  return { x: p.x, z: p.z + 1, yaw: Math.PI };
}

type Spawn = { x: number; z: number; yaw: number };
const SOUTH = 0;
const NORTH = Math.PI;
const EAST = Math.PI / 2;

/** Where intern `index` appears when a stage begins. */
export const homeSpawn = (index: number): Spawn => ({ x: 1.1 + (index % DESK_COUNT) * 1.55, z: 602.2, yaw: SOUTH });
export const streetSpawn = (index: number): Spawn => ({ x: 106 + (index % DESK_COUNT) * 2.4, z: 601.6, yaw: SOUTH });
export const subwaySpawn = (index: number): Spawn => ({ x: 201.5 + (index % 4) * 1.1, z: 601.6 + Math.floor((index % DESK_COUNT) / 4) * 1.4, yaw: EAST });
export const warehouseSpawn = (index: number): Spawn => ({ x: 301.6 + (index % 4) * 1.1, z: 608.2 + Math.floor((index % DESK_COUNT) / 4) * 1.2, yaw: EAST });
export const FACING_NORTH = NORTH;

export const WAREHOUSE_PATROL: readonly Vec[] = [
  { x: 306, z: 610 }, { x: 334, z: 610 }, { x: 320, z: 603.4 }, { x: 334, z: 620.4 }, { x: 306, z: 620.4 }, { x: 335, z: 612 }, { x: 320, z: 612 },
];
export const WAREHOUSE_BOSS_START = { x: 334, z: 612, yaw: -EAST };

export type NpcId = 'boss' | 'hr' | 'cleaner' | 'zhang';

export const NPC_NAMES: Record<NpcId, string> = {
  boss: '王总监',
  hr: 'HR Linda',
  cleaner: '保洁阿姨',
  zhang: '老张',
};

export const NPC_START: Record<NpcId, { x: number; z: number; yaw: number }> = {
  boss: { x: 35, z: 6.5, yaw: 0 },
  hr: { x: 30, z: 21.5, yaw: 0 },
  cleaner: { x: 20, z: 15.5, yaw: 0 },
  zhang: { x: 18.9, z: 10.5, yaw: -Math.PI / 2 },
};

export const NPC_SIGHT: Record<'boss' | 'hr', { speed: number; range: number; halfAngle: number }> = {
  boss: { speed: 2.3, range: 9, halfAngle: 0.65 },
  hr: { speed: 2.0, range: 7, halfAngle: 0.6 },
};
export const CLEANER_SPEED = 1.2;

const pt = (x: number, z: number): Vec => ({ x, z });

export const PATROL: Record<'boss' | 'hr' | 'cleaner', readonly Vec[]> = {
  boss: [
    // The aisles right behind the intern benches, then the rest of the floor.
    pt(4.6, 4.75), pt(13, 4.75), pt(8.8, 4.8), pt(4.6, 9), pt(13, 9), pt(10, 13), pt(16.8, 8),
    pt(10, 15.5), pt(20, 15.5), pt(30, 15.5),
    pt(22, 7), pt(28, 3),
    pt(35, 6.5), pt(33, 10),
    pt(5, 22), pt(6, 25),
    pt(13.5, 22), pt(12, 24.5),
    pt(30, 21.5), pt(36, 25),
    pt(44, 16),
  ],
  hr: [
    pt(20.2, 20), pt(20.2, 23.5), pt(24, 20), pt(24, 23.5),
    pt(45, 12), pt(48, 19),
    pt(5, 22), pt(10, 13), pt(15, 15.5), pt(30, 21.5), pt(28, 11),
  ],
  cleaner: [pt(20.2, 20), pt(24, 22), pt(6, 25), pt(5, 15.5), pt(35, 15.5), pt(37, 24), pt(22, 11), pt(15, 20), pt(8.8, 7)],
};

export const MEETING_POINTS: readonly Vec[] = [pt(22.5, 2.5), pt(27.5, 2.5)];
export const DRILL_POINTS: readonly Vec[] = [pt(44, 16), pt(47, 14)];
