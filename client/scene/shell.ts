import * as THREE from 'three';
import { DOORS, ROOMS, WALLS, WALL_HEIGHT, roomName } from '../../shared/world.ts';
import type { Door, Room, RoomId } from '../../shared/world.ts';
import { box, cyl, glass, glow, group, rbox, shiny, textPlane, turn } from './kit.ts';
import type { Paint, TextStyle } from './kit.ts';
import { carpet, ceilingGrid, ceramic, deck, terrazzo, wood } from './textures.ts';

export const WALL = '#efe7d8';
const FRAME = '#dfe5ea';
const TRIM = '#8a6a4a';
const BRAND = '#ff7a2f';
const PLASTER = '#f6f1e7';
const CORNICE = '#fbf8f1';
const WALL_T = 0.2;
const DOOR_TOP = 2.2;
const LIGHT_SPACING = 4.5;
const CEILING_PANEL = 0.6;

interface Surface {
  readonly floor: () => THREE.CanvasTexture;
  /** Metres covered by one texture repeat. */
  readonly tile: number;
  readonly baseboard: string;
  readonly wainscot?: { readonly color: Paint; readonly height: number };
  /** A plain painted ceiling instead of office grid panels, optionally with a cornice. */
  readonly ceiling?: { readonly color: string; readonly cornice?: boolean };
}

const SURFACES: Record<RoomId, Surface> = {
  office: { floor: () => carpet('#8d99a8', '#7f8b9b'), tile: 1.2, baseboard: '#5b6470' },
  meeting: { floor: () => carpet('#5c7391', '#536985'), tile: 1.2, baseboard: '#3d4b5f', wainscot: { color: '#c7b299', height: 0.9 } },
  director: { floor: () => wood('#a8733f', '#5e3a1c'), tile: 1.6, baseboard: '#5a3519', wainscot: { color: '#7a4a2b', height: 0.9 } },
  corridor: { floor: () => terrazzo('#e6e0d2'), tile: 2.4, baseboard: '#6b7280', wainscot: { color: '#e9e2d3', height: 0.9 } },
  pantry: { floor: () => ceramic('#f1e3bd', '#c9b98f', 4), tile: 2, baseboard: '#b49a6a', wainscot: { color: shiny('#fff6dc'), height: 0.9 } },
  print: { floor: () => terrazzo('#cdd3d9'), tile: 2.4, baseboard: '#5b6470' },
  restroom: { floor: () => ceramic('#d5ecef', '#8fb7bd', 4), tile: 1.2, baseboard: '#6fa3aa', wainscot: { color: shiny('#bfe3e6'), height: 1.8 } },
  lobby: { floor: () => terrazzo('#f2ede3'), tile: 3, baseboard: '#374151' },
  terrace: { floor: () => deck('#b98556'), tile: 1.5, baseboard: '#000000' },
  home: { floor: () => wood('#c9a36b', '#7a5a34'), tile: 1.6, baseboard: '#8a6a4a', ceiling: { color: PLASTER, cornice: true } },
  street: { floor: () => ceramic('#c3c7cc', '#9aa0a6', 4), tile: 2.4, baseboard: '#000000' },
  subway: { floor: () => terrazzo('#9a9da1'), tile: 3, baseboard: '#3f4348', ceiling: { color: '#3d4046' } },
  warehouse: { floor: () => terrazzo('#aeb4ba'), tile: 4, baseboard: '#facc15' },
};

interface Win {
  readonly axis: 'x' | 'z';
  readonly at: number;
  readonly from: number;
  readonly to: number;
  readonly sill?: number;
  readonly head?: number;
  readonly blind?: boolean;
}

const win = (axis: 'x' | 'z', at: number, from: number, to: number, extra: Partial<Win> = {}): Win => ({ axis, at, from, to, ...extra });
const FROSTED = { sill: 1.9, head: 2.5 };

const WINDOWS: readonly Win[] = [
  win('z', 0, 1.5, 4.5), win('z', 0, 6, 9, { blind: true }), win('z', 0, 10.5, 13.5), win('z', 0, 15, 18, { blind: true }),
  win('z', 0, 20.5, 22.9), win('z', 0, 27.1, 29.5), win('z', 0, 30.6, 33.4, { blind: true }), win('z', 0, 36.6, 39.4),
  win('x', 0, 2, 5), win('x', 0, 8.5, 11.5, { blind: true }),
  win('z', 28, 0.8, 3.2), win('z', 28, 6, 8.4), win('z', 28, 10, 12.2), win('z', 28, 15, 17.5, { blind: true }),
  win('z', 28, 18.6, 19.6, FROSTED), win('z', 28, 20.4, 21.4, FROSTED), win('z', 28, 22.6, 23.6, FROSTED), win('z', 28, 24.4, 25.4, FROSTED),
  win('z', 28, 27, 29.8), win('z', 28, 37, 39.4),
  win('x', 40, 1.5, 5), win('x', 40, 10.8, 13.4),
  // the flat: one window for the bunk room, one over the sofa
  win('x', 0, 601.7, 603.7), win('x', 0, 606.6, 609.4),
];

/** A box running along a wall line: `a..b` along the line, centred on `at`. */
function along(axis: 'x' | 'z', at: number, a: number, b: number, y0: number, y1: number, thickness: number, p: Paint, offset = 0): THREE.Mesh {
  const length = b - a;
  const mid = (a + b) / 2;
  const height = y1 - y0;
  return axis === 'z'
    ? box(length, height, thickness, p, mid, y0 + height / 2, at + offset)
    : box(thickness, height, length, p, at + offset, y0 + height / 2, mid);
}

/** +1 when the room interior is on the positive side of an outer wall. */
const inward = (at: number): number => (at < 20 ? 1 : -1);

function windowUnit(w: Win): THREE.Object3D[] {
  const sill = w.sill ?? 0.9;
  const head = w.head ?? 2.5;
  const inside = inward(w.at);
  const panes = Math.max(1, Math.round((w.to - w.from) / 1.2));
  const step = (w.to - w.from) / panes;
  const mullions = Array.from({ length: panes - 1 }, (_, i) => along(w.axis, w.at, w.from + step * (i + 1) - 0.025, w.from + step * (i + 1) + 0.025, sill, head, 0.08, shiny(FRAME)));
  const frosted = w.sill !== undefined;
  return [
    along(w.axis, w.at, w.from, w.to, 0, sill, WALL_T, WALL),
    along(w.axis, w.at, w.from, w.to, head, WALL_HEIGHT, WALL_T, WALL),
    along(w.axis, w.at, w.from, w.to, sill, sill + 0.06, 0.24, shiny(FRAME)),
    along(w.axis, w.at, w.from, w.to, head - 0.06, head, 0.24, shiny(FRAME)),
    along(w.axis, w.at, w.from, w.from + 0.06, sill, head, 0.24, shiny(FRAME)),
    along(w.axis, w.at, w.to - 0.06, w.to, sill, head, 0.24, shiny(FRAME)),
    ...mullions,
    along(w.axis, w.at, w.from + 0.06, w.to - 0.06, sill + 0.06, head - 0.06, 0.02, frosted ? glass('#ffffff', 0.7) : glass()),
    along(w.axis, w.at, w.from - 0.06, w.to + 0.06, sill - 0.04, sill, 0.22, '#e7e2d6', inside * 0.2),
    ...(w.blind ? [along(w.axis, w.at, w.from + 0.08, w.to - 0.08, head - 0.5, head - 0.04, 0.025, '#e5e0d2', inside * 0.08), along(w.axis, w.at, w.from + 0.08, w.to - 0.08, head - 0.54, head - 0.5, 0.04, shiny(FRAME), inside * 0.08)] : []),
  ];
}

function railing(axis: 'x' | 'z', at: number, a: number, b: number): THREE.Object3D[] {
  const posts = Math.max(2, Math.round((b - a) / 2) + 1);
  const step = (b - a) / (posts - 1);
  return [
    along(axis, at, a, b, 0, 0.14, 0.24, '#8b929a'),
    along(axis, at, a, b, 0.2, 1.02, 0.02, glass('#bfe6f5', 0.3)),
    along(axis, at, a, b, 1.04, 1.1, 0.09, shiny('#4b5563')),
    ...Array.from({ length: posts }, (_, i) => along(axis, at, a + i * step - 0.03, a + i * step + 0.03, 0.14, 1.05, 0.06, shiny('#4b5563'))),
  ];
}

function walls(): THREE.Object3D[] {
  return WALLS.filter((w) => !w.hidden).flatMap((w) => {
    const axis: 'x' | 'z' = w.x1 - w.x0 > w.z1 - w.z0 ? 'z' : 'x';
    const at = axis === 'z' ? (w.z0 + w.z1) / 2 : (w.x0 + w.x1) / 2;
    const [a, b] = axis === 'z' ? [w.x0, w.x1] : [w.z0, w.z1];
    if (w.low) return railing(axis, at, a, b);
    const cuts = WINDOWS.filter((o) => o.axis === axis && Math.abs(o.at - at) < 0.01 && o.from >= a && o.to <= b).sort((p, q) => p.from - q.from);
    const edges = [a, ...cuts.flatMap((o) => [o.from, o.to]), b];
    const solid = edges.flatMap((start, i) => (i % 2 === 0 && edges[i + 1] > start ? [along(axis, at, start, edges[i + 1], 0, WALL_HEIGHT, WALL_T, WALL)] : []));
    return [...solid, ...cuts.flatMap(windowUnit)];
  });
}

/** Strips hugging the inside of a room's four walls, skipping doorways. */
function perimeter(room: Room, y0: number, y1: number, thickness: number, p: Paint): THREE.Object3D[] {
  const edges: { axis: 'x' | 'z'; at: number; a: number; b: number; side: number }[] = [
    { axis: 'z', at: room.z0, a: room.x0, b: room.x1, side: 1 },
    { axis: 'z', at: room.z1, a: room.x0, b: room.x1, side: -1 },
    { axis: 'x', at: room.x0, a: room.z0, b: room.z1, side: 1 },
    { axis: 'x', at: room.x1, a: room.z0, b: room.z1, side: -1 },
  ];
  return edges.flatMap((e) => {
    const gaps = DOORS.filter((d) => d.axis === e.axis && d.at === e.at && d.from >= e.a && d.to <= e.b).sort((p1, p2) => p1.from - p2.from);
    const cuts = [e.a + 0.1, ...gaps.flatMap((g) => [g.from - 0.05, g.to + 0.05]), e.b - 0.1];
    return cuts.flatMap((start, i) =>
      i % 2 === 0 && cuts[i + 1] > start ? [along(e.axis, e.at, start, cuts[i + 1], y0, y1, thickness, p, e.side * (WALL_T / 2 + thickness / 2))] : [],
    );
  });
}

function plainCeiling(room: Room, color: string): THREE.Mesh {
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(room.x1 - room.x0, room.z1 - room.z0), new THREE.MeshLambertMaterial({ color }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set((room.x0 + room.x1) / 2, WALL_HEIGHT - 0.02, (room.z0 + room.z1) / 2);
  return ceiling;
}

function roomSurfaces(room: Room): THREE.Object3D[] {
  const surface = SURFACES[room.id];
  const w = room.x1 - room.x0;
  const d = room.z1 - room.z0;
  const cx = (room.x0 + room.x1) / 2;
  const cz = (room.z0 + room.z1) / 2;
  const floorMap = surface.floor();
  floorMap.repeat.set(w / surface.tile, d / surface.tile);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: floorMap }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0, cz);
  floor.receiveShadow = true;
  if (room.outdoor) return [floor];
  if (surface.ceiling) {
    const cornice = surface.ceiling.cornice ? perimeter(room, WALL_HEIGHT - 0.12, WALL_HEIGHT - 0.02, 0.05, CORNICE) : [];
    return [floor, plainCeiling(room, surface.ceiling.color), ...cornice, ...perimeter(room, 0, 0.1, 0.025, surface.baseboard)];
  }

  const ceilingMap = ceilingGrid();
  ceilingMap.repeat.set(w / CEILING_PANEL, d / CEILING_PANEL);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: ceilingMap }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(cx, WALL_HEIGHT - 0.02, cz);

  const lights: THREE.Object3D[] = [];
  for (let x = room.x0 + LIGHT_SPACING / 2; x < room.x1 - 0.5; x += LIGHT_SPACING) {
    for (let z = room.z0 + LIGHT_SPACING / 2; z < room.z1 - 0.5; z += LIGHT_SPACING) {
      lights.push(box(1.24, 0.03, 0.64, shiny('#c4c8cc'), x, WALL_HEIGHT - 0.03, z), box(1.16, 0.02, 0.56, glow('#fffdf5'), x, WALL_HEIGHT - 0.044, z));
    }
  }
  const vent = [box(0.6, 0.02, 0.6, shiny('#d4d4d8'), room.x0 + 1.5, WALL_HEIGHT - 0.028, room.z1 - 1.5), ...[-0.2, -0.07, 0.07, 0.2].map((o) => box(0.5, 0.012, 0.04, '#71717a', room.x0 + 1.5, WALL_HEIGHT - 0.042, room.z1 - 1.5 + o))];
  const sprinkler = cyl(0.03, 0.05, 0.05, shiny('#b91c1c'), cx + 0.7, WALL_HEIGHT - 0.045, cz + 0.9, 10);
  const wainscot = surface.wainscot
    ? [...perimeter(room, 0.1, surface.wainscot.height, 0.012, surface.wainscot.color), ...perimeter(room, surface.wainscot.height, surface.wainscot.height + 0.04, 0.03, room.id === 'corridor' ? BRAND : TRIM)]
    : [];
  return [floor, ceiling, ...lights, ...vent, sprinkler, ...perimeter(room, 0, 0.1, 0.025, surface.baseboard), ...wainscot];
}

const SIGN: TextStyle = { bg: '#1f2937', fg: '#ffffff' };

function leaf(width: number, glazed: boolean): THREE.Group {
  if (glazed) {
    return group(0, 0, 0, box(width - 0.1, 2, 0.02, glass('#cfe9f6', 0.3), 0, 1.08, 0), box(width, 0.08, 0.05, shiny(FRAME), 0, 0.06, 0), box(width, 0.08, 0.05, shiny(FRAME), 0, 2.12, 0), box(0.06, 2.1, 0.05, shiny(FRAME), -width / 2 + 0.03, 1.08, 0), box(0.06, 2.1, 0.05, shiny(FRAME), width / 2 - 0.03, 1.08, 0), box(0.03, 0.5, 0.09, shiny('#4b5563'), width / 2 - 0.14, 1.1, 0));
  }
  return group(0, 0, 0, rbox(width, 2.12, 0.045, '#b98d5f', 0, 1.07, 0, 0.012), box(0.2, 0.7, 0.05, glass('#dbeef7', 0.45), width / 2 - 0.26, 1.5, 0), rbox(0.14, 0.03, 0.09, shiny('#9ca3af'), -width / 2 + 0.14, 1.02, 0, 0.012), box(width - 0.1, 0.22, 0.05, '#8a6a4a', 0, 0.16, 0));
}

function doorway(door: Door): THREE.Object3D[] {
  const width = door.to - door.from;
  const mid = (door.from + door.to) / 2;
  const glazed = door.room === 'lobby' || door.room === 'terrace';
  const trim = glazed ? shiny(FRAME) : TRIM;
  const frame = [
    along(door.axis, door.at, door.from, door.to, DOOR_TOP, WALL_HEIGHT, WALL_T, WALL),
    along(door.axis, door.at, door.from - 0.07, door.from + 0.03, 0, DOOR_TOP + 0.07, 0.26, trim),
    along(door.axis, door.at, door.to - 0.03, door.to + 0.07, 0, DOOR_TOP + 0.07, 0.26, trim),
    along(door.axis, door.at, door.from, door.to, DOOR_TOP - 0.03, DOOR_TOP + 0.07, 0.26, trim),
    along(door.axis, door.at, door.from, door.to, 0, 0.012, 0.22, shiny('#9ca3af')),
  ];
  const label = door.label ?? roomName(door.room);
  if (door.axis === 'x') {
    // Terrace door: the corridor is on the -x side, the open leaf rests against the outside wall.
    const plate = turn(textPlane(label, 0.9, 0.34, SIGN), -Math.PI / 2);
    plate.position.set(door.at - 0.115, 2.6, mid);
    const open = turn(leaf(width, true), Math.PI / 2);
    open.position.set(door.at + 0.16, 0, door.to + width / 2);
    return [...frame, plate, open];
  }
  const into = door.at === 14 ? -1 : 1; // which way the room lies from the corridor wall
  const plate = turn(textPlane(label, Math.max(0.9, label.length * 0.26), 0.34, SIGN), into === -1 ? 0 : Math.PI);
  plate.position.set(mid, 2.6, door.at - into * 0.115);
  const bladeZ = door.at - into * 0.45;
  const blade = [
    box(0.04, 0.34, 0.66, shiny('#1f2937'), door.from - 0.2, 2.42, bladeZ),
    box(0.03, 0.03, 0.2, shiny('#4b5563'), door.from - 0.2, 2.6, door.at - into * 0.2),
    ...[-1, 1].map((side) => {
      const face = turn(textPlane(label, 0.62, 0.3, SIGN), (side * Math.PI) / 2);
      face.position.set(door.from - 0.2 + side * 0.022, 2.42, bladeZ);
      return face;
    }),
  ];
  const leaves = glazed
    ? [group(door.from - width / 4, 0, door.at + into * 0.16, leaf(width / 2, true)), group(door.to + width / 4, 0, door.at + into * 0.16, leaf(width / 2, true))]
    : [group(door.to + width / 2, 0, door.at + into * 0.16, leaf(width, false))];
  return [...frame, plate, ...blade, ...leaves];
}

type Side = 'n' | 's' | 'e' | 'w';
const WALL_OFFSET = 0.118;

/** Hang something flat on the inside of a wall. `side` names the wall it hangs on. */
export function hang<T extends THREE.Object3D>(item: T, side: Side, wallAt: number, alongAt: number, y: number, gap = WALL_OFFSET): T {
  item.rotation.y = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 }[side];
  if (side === 'n') item.position.set(alongAt, y, wallAt + gap);
  if (side === 's') item.position.set(alongAt, y, wallAt - gap);
  if (side === 'w') item.position.set(wallAt + gap, y, alongAt);
  if (side === 'e') item.position.set(wallAt - gap, y, alongAt);
  return item;
}

/** A poster in a thin frame. */
export function poster(text: string, w: number, h: number, style: TextStyle, side: Side, wallAt: number, alongAt: number, y: number): THREE.Object3D[] {
  return [hang(box(w + 0.08, h + 0.08, 0.02, shiny('#374151')), side, wallAt, alongAt, y, 0.11), hang(textPlane(text, w, h, style), side, wallAt, alongAt, y, 0.123)];
}

export function buildShell(): THREE.Object3D[] {
  return [...ROOMS.flatMap(roomSurfaces), ...walls(), ...DOORS.flatMap(doorway)];
}
