import type * as THREE from 'three';
import { PROPS } from '../../../shared/world.ts';
import { STAFF_LOOKS, makeCharacter } from '../characters.ts';
import { ball, box, cyl, group, pick, rbox, shiny, textPlane, turn } from '../kit.ts';
import { BRAND, DARK, STEEL, WHITE, WOOD, at, bin, deskLamp, deskPlant, keyboardSet, monitor, mug, noticeBoard, officeChair, papers, plant, rug, screen, wallClock, waterDispenser } from '../parts.ts';
import { hang, poster } from '../shell.ts';
import type { ScreenKind } from '../textures.ts';
import type { Builder, RoomArt } from './types.ts';

const FABRIC = '#aab4c0';
const TOP_Y = 0.76;
const CHAIRS = ['#2563eb', '#0f766e', '#7c3aed', '#374151'];
const SCREENS: readonly ScreenKind[] = ['code', 'sheet', 'code', 'chart'];
const NOTE = ['#fde047', '#fca5a5', '#86efac', '#93c5fd'];

function clutter(index: number, w: number, d: number): THREE.Object3D[] {
  const left = -w / 2 + 0.25;
  const options: THREE.Object3D[][] = [
    [group(left, TOP_Y, 0.1, mug('#ef4444')), group(left + 0.1, 0, -0.2, deskPlant(TOP_Y))],
    [group(left + 0.05, TOP_Y, 0.05, papers(6, index)), group(w / 2 - 0.25, 0, -0.22, deskLamp('#f59e0b', TOP_Y))],
    [group(left, TOP_Y, -0.15, mug('#2563eb')), group(left + 0.02, TOP_Y, 0.15, papers(3, index)), group(w / 2 - 0.3, TOP_Y, -0.2, box(0.14, 0.18, 0.02, '#1f2937', 0, 0.09, 0), box(0.11, 0.14, 0.022, '#fde68a', 0, 0.09, 0))],
    [group(left + 0.05, 0, -0.2, deskPlant(TOP_Y)), group(left, TOP_Y, 0.14, ball(0.05, '#f97316', 0, 0.05, 0), ball(0.035, '#fdba74', 0, 0.12, 0)), group(w / 2 - 0.25, TOP_Y, 0.1, mug('#16a34a'))],
  ];
  return options[index % options.length];
}

/** `staffed` desks have the chair pulled in, because a colleague is sitting on it. */
const deskWith = (staffed: boolean): Builder => (w, d, index) => {
  const accent = index % 4 === 2 ? '#3b82f6' : BRAND;
  const stickies = [0, 1, 2].map((i) => box(0.09, 0.09, 0.004, pick(NOTE, index + i), -0.6 + i * 0.13, 1.1 - (i % 2) * 0.06, -d / 2 + 0.065));
  return [
    rbox(w - 0.12, 0.04, d - 0.1, WOOD, 0, TOP_Y - 0.02, 0.02, 0.012),
    ...[-1, 1].flatMap((s) => [box(0.05, 0.72, 0.05, shiny(STEEL), s * (w / 2 - 0.14), 0.37, -d / 2 + 0.16), box(0.05, 0.72, 0.05, shiny(STEEL), s * (w / 2 - 0.14), 0.37, d / 2 - 0.12), box(0.06, 0.03, d - 0.1, shiny(STEEL), s * (w / 2 - 0.14), 0.015, 0.02)]),
    box(w - 0.4, 0.34, 0.018, '#d5d9de', 0, 0.5, -d / 2 + 0.16),
    box(w, 1.2, 0.06, FABRIC, 0, 0.72, -d / 2 + 0.03),
    box(0.06, 1.2, d, FABRIC, -w / 2 + 0.03, 0.72, 0),
    box(0.06, 1.2, d, FABRIC, w / 2 - 0.03, 0.72, 0),
    box(w + 0.02, 0.04, 0.08, accent, 0, 1.34, -d / 2 + 0.03),
    box(0.08, 0.04, d + 0.02, accent, -w / 2 + 0.03, 1.34, 0),
    box(0.08, 0.04, d + 0.02, accent, w / 2 - 0.03, 1.34, 0),
    box(w, 0.1, 0.07, '#6b7280', 0, 0.07, -d / 2 + 0.03),
    group(0, 0, -d / 2 + 0.3, monitor(SCREENS[index % SCREENS.length], TOP_Y)),
    group(-0.05, 0, 0.14, keyboardSet(TOP_Y)),
    group(w / 2 - 0.36, 0, 0.02, rbox(0.4, 0.56, 0.52, '#e5e7eb', 0, 0.3, 0, 0.02), ...[0.14, 0.32, 0.48].map((y) => box(0.36, 0.006, 0.01, '#9ca3af', 0, y + 0.05, 0.262)), ...[0.14, 0.32, 0.48].map((y) => box(0.12, 0.016, 0.02, shiny(STEEL), 0, y - 0.03, 0.268))),
    ...stickies,
    ...clutter(index, w, d),
    staffed
      ? turn(group(0, 0, d / 2 + 0.42, officeChair(pick(CHAIRS, index))), Math.PI)
      : turn(group(-0.5, 0, d / 2 + 0.5, officeChair(pick(CHAIRS, index))), 2.5 + (index % 3) * 0.25),
    group(-w / 2 + 0.3, 0, -0.1, bin()),
  ];
};

const SEAT_OFFSET = 0.86;

/** One seated colleague per staffed desk. */
function colleagues(): THREE.Object3D[] {
  return PROPS.flatMap((p, index) => {
    if (p.kind !== 'deskStaffed') return [];
    const south = p.face === 's';
    const person = makeCharacter(pick(STAFF_LOOKS, index * 7 + 3), '', p.x, p.z + (south ? SEAT_OFFSET : -SEAT_OFFSET), south ? Math.PI : 0);
    person.sit();
    return [person.root];
  });
}

const cabinets: Builder = (w, d) => {
  const units = 4;
  const unit = w / units;
  return [
    ...Array.from({ length: units }, (_, i) => {
      const x = -w / 2 + unit * (i + 0.5);
      return group(x, 0, 0, rbox(unit - 0.02, 1.3, d, '#cbd5e1', 0, 0.65, 0, 0.015), ...[0.22, 0.54, 0.86, 1.18].map((y) => box(unit - 0.08, 0.28, 0.012, '#e2e8f0', 0, y - 0.04, d / 2 + 0.002)), ...[0.22, 0.54, 0.86, 1.18].map((y) => box(0.16, 0.02, 0.03, shiny(STEEL), 0, y + 0.05, d / 2 + 0.02)));
    }),
    group(-w / 2 + 0.5, 1.3, 0, plant('bush', 0.6, '#fef3c7')),
    group(0.3, 1.3, 0, papers(8, 3)),
    group(w / 2 - 0.5, 1.3, 0, rbox(0.34, 0.26, 0.28, '#c99657', 0, 0.13, 0, 0.01), rbox(0.3, 0.22, 0.26, '#c99657', 0.03, 0.37, 0, 0.01)),
  ];
};

const vending: Builder = (w, d) => {
  const drinks = [0, 1, 2, 3].flatMap((row) => [0, 1, 2, 3].map((col) => cyl(0.035, 0.035, 0.13, shiny(pick(['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7'], row * 3 + col)), -0.24 + col * 0.1, 0.75 + row * 0.24, d / 2 - 0.09, 10)));
  return [
    rbox(w, 1.9, d, shiny('#dc2626'), 0, 0.95, 0, 0.03),
    box(w * 0.62, 1.1, 0.02, '#111827', -0.12, 1.15, d / 2 + 0.002),
    ...drinks,
    ...[0.66, 0.9, 1.14, 1.38].map((y) => box(w * 0.6, 0.015, 0.1, shiny(STEEL), -0.12, y, d / 2 - 0.06)),
    box(0.14, 0.3, 0.02, '#1f2937', w / 2 - 0.13, 1.2, d / 2 + 0.004),
    box(0.1, 0.08, 0.022, '#22c55e', w / 2 - 0.13, 1.28, d / 2 + 0.006),
    box(w * 0.6, 0.16, 0.02, '#111827', -0.12, 0.3, d / 2 + 0.004),
    (() => {
      const label = textPlane('冰阔落 ¥3', w * 0.8, 0.16, { bg: '#dc2626', fg: '#ffffff' });
      label.position.set(0, 1.78, d / 2 + 0.016);
      return label;
    })(),
  ];
};

function beanBag(color: string): THREE.Group {
  const bag = ball(0.42, color, 0, 0.26, 0);
  bag.scale.set(1, 0.65, 1);
  const back = ball(0.3, color, 0, 0.5, -0.22);
  back.scale.set(1, 0.9, 0.7);
  return group(0, 0, 0, bag, back);
}

function decor(): THREE.Object3D[] {
  const tv = hang(group(0, 0, 0, rbox(2.1, 1.2, 0.06, shiny(DARK), 0, 0, 0.03, 0.015), (() => {
    const face = screen(2, 1.1, 'kpi');
    face.position.z = 0.062;
    return face;
  })()), 's', 14, 12.6, 1.75, 0.1);
  const hanging = (text: string, x: number, z: number): THREE.Group => {
    const back = turn(textPlane(text, 1.5, 0.34, { bg: '#1f2937', fg: '#ffffff' }), Math.PI);
    back.position.set(0, 2.5, -0.022);
    const front = textPlane(text, 1.5, 0.34, { bg: '#1f2937', fg: '#ffffff' });
    front.position.set(0, 2.5, 0.022);
    return group(x, 0, z, box(1.54, 0.38, 0.04, shiny(DARK), 0, 2.5, 0), cyl(0.008, 0.008, 0.32, STEEL, -0.6, 2.84, 0, 6), cyl(0.008, 0.008, 0.32, STEEL, 0.6, 2.84, 0, 6), front, back);
  };
  return [
    tv,
    ...poster('今天不努力\n明天努力找工作', 2.2, 1, { bg: '#dc2626', fg: '#fff7d6' }, 's', 14, 9.6, 1.9),
    hang(noticeBoard(1.5, 1, 4), 'w', 0, 6.75, 1.6, 0.1),
    hang(wallClock(), 'e', 20, 8.4, 2.3, 0.1),
    ...poster('工位禁止睡觉\n（被发现的话）', 1.5, 0.7, { bg: '#fff7e6', fg: '#c2410c', border: BRAND }, 'e', 20, 12.6, 1.8),
    hanging('产品研发部', 8.8, 5),
    hanging('需求太多 · 人手太少', 8.8, 12.9),
    at(0.5, 13.3, Math.PI / 2, waterDispenser()),
    at(1.3, 12.6, 0, rug(2.4, 2, '#f59e0b', '#b45309')),
    at(0.9, 12.9, 0.6, beanBag('#22c55e')),
    at(2, 12.2, -0.5, beanBag('#3b82f6')),
    at(19.5, 13.3, 0, cyl(0.02, 0.02, 1.7, shiny(DARK), 0, 0.85, 0, 8), cyl(0.2, 0.22, 0.03, shiny(DARK), 0, 0.015, 0, 12), ...[0, 1, 2, 3].map((i) => turn(box(0.2, 0.02, 0.02, shiny(DARK), 0.1, 1.6, 0), (i * Math.PI) / 2)), rbox(0.1, 0.5, 0.3, '#1e3a8a', 0.2, 1.3, 0, 0.04)),
    at(19.4, 8.6, -Math.PI / 2, rbox(1.4, 0.9, 0.04, WHITE, 0, 1.35, 0, 0.01), box(1.46, 0.04, 0.06, shiny(STEEL), 0, 0.88, 0), box(1.46, 0.04, 0.06, shiny(STEEL), 0, 1.82, 0), box(0.04, 1.8, 0.04, shiny(STEEL), -0.72, 0.92, 0), box(0.04, 1.8, 0.04, shiny(STEEL), 0.72, 0.92, 0), box(0.04, 0.04, 0.5, shiny(STEEL), -0.72, 0.03, 0), box(0.04, 0.04, 0.5, shiny(STEEL), 0.72, 0.03, 0), box(0.5, 0.006, 0.01, '#dc2626', -0.2, 1.5, 0.024), box(0.7, 0.006, 0.01, '#1d4ed8', 0, 1.35, 0.024), box(0.4, 0.006, 0.01, '#16a34a', 0.2, 1.2, 0.024)),
    at(8.8, 0.6, 0, plant('leafy', 0.9)),
    at(0.6, 0.6, 0, plant('tree', 0.9)),
    ...colleagues(),
  ];
}

export const office: RoomArt = { builders: { desk: deskWith(false), deskStaffed: deskWith(true), cabinets, vending }, decor };
