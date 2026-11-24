import type * as THREE from 'three';
import { SEAT_XS, areaById } from '../../../shared/world.ts';
import { STAFF_LOOKS, makeCharacter } from '../characters.ts';
import { box, cyl, glass, glow, group, rbox, shiny, textPlane, turn } from '../kit.ts';
import type { Builder, RoomArt } from './types.ts';

const CAR = areaById('train');
const LENGTH = CAR.x1 - CAR.x0;
const MID_X = (CAR.x0 + CAR.x1) / 2;
const MID_Z = (CAR.z0 + CAR.z1) / 2;
const STEEL = '#c5cad0';
const STEEL_DARK = '#8e959c';
const SEAT_COLORS = ['#f59e0b', '#fbbf24'];
const CEILING = 2.25;
const WINDOW = { sill: 0.95, head: 1.9 };
const DOOR_XS = [402.2, 409, 415.8];
const ADS = ['加班？先来一杯', '租房免中介费（假的）', '英语 30 天速成', '今天你对齐了吗', '脱发热线 400-KPI', '周末不上班的公司，招人'];
const SEAT_PITCH = 0.5;

/** A run of moulded bucket seats; the wall is at -z. */
const carBench: Builder = (w, d, index) => {
  const count = Math.floor(w / SEAT_PITCH);
  return [
    box(w, 0.36, d - 0.1, STEEL_DARK, 0, 0.18, -0.02),
    ...Array.from({ length: count }, (_, i) => {
      const x = -w / 2 + SEAT_PITCH * (i + 0.5);
      const color = SEAT_COLORS[(i + index) % 2];
      return [rbox(SEAT_PITCH - 0.03, 0.08, d - 0.04, shiny(color), x, 0.42, 0.02, 0.03), turn(rbox(SEAT_PITCH - 0.03, 0.42, 0.06, shiny(color), x, 0.68, -d / 2 + 0.07, 0.025), 0, -0.12)];
    }).flat(),
    ...[-w / 2 + 0.02, w / 2 - 0.02].map((x) => box(0.04, 0.5, d, shiny(STEEL), x, 0.62, 0)),
  ];
};

/** One long side of the car: steel dado, windows between posts, ad strip above. `inward` points into the car. */
function sideWall(z: number, inward: number): THREE.Object3D[] {
  const posts = Array.from({ length: 10 }, (_, i) => CAR.x0 + i * 2);
  const ads = ADS.map((text, i) => {
    const ad = turn(textPlane(text, 2.2, 0.3, { bg: i % 2 === 0 ? '#fde047' : '#1e3a8a', fg: i % 2 === 0 ? '#111111' : '#ffffff' }), inward > 0 ? 0 : Math.PI);
    ad.position.set(CAR.x0 + 2 + i * 2.8, 2.07, z + inward * 0.045);
    return ad;
  });
  const doors = DOOR_XS.flatMap((x) => [-0.33, 0.33].flatMap((o) => [box(0.62, 1.95, 0.05, shiny('#aeb4ba'), x + o, 0.98, z + inward * 0.03), box(0.36, 0.7, 0.06, glass('#0b1220', 0.85), x + o, 1.4, z + inward * 0.03)]));
  const sills = DOOR_XS.flatMap((x) => [box(1.3, 0.012, 0.3, shiny(STEEL_DARK), x, 0.007, z + inward * 0.19), box(1.3, 0.014, 0.06, '#f2c230', x, 0.008, z + inward * 0.37)]);
  return [
    ...sills,
    box(LENGTH, WINDOW.sill, 0.08, shiny(STEEL), MID_X, WINDOW.sill / 2, z),
    box(LENGTH, CEILING - WINDOW.head, 0.08, shiny(STEEL), MID_X, (CEILING + WINDOW.head) / 2, z),
    ...posts.map((x) => box(0.3, WINDOW.head - WINDOW.sill, 0.08, shiny(STEEL), x, (WINDOW.sill + WINDOW.head) / 2, z)),
    box(LENGTH, WINDOW.head - WINDOW.sill, 0.02, glass('#0b1220', 0.55), MID_X, (WINDOW.sill + WINDOW.head) / 2, z - inward * 0.02),
    box(LENGTH, 3, 0.1, '#050506', MID_X, 1.5, z - inward * 0.9),
    ...ads,
    ...doors,
  ];
}

function endWall(x: number, inward: number): THREE.Object3D[] {
  return [box(0.08, CEILING, CAR.z1 - CAR.z0, shiny(STEEL), x, CEILING / 2, MID_Z), box(0.05, 1.95, 0.8, shiny('#aeb4ba'), x + inward * 0.045, 0.98, MID_Z), box(0.06, 0.6, 0.45, glass('#0b1220', 0.85), x + inward * 0.05, 1.45, MID_Z)];
}

function ceilingAndRails(): THREE.Object3D[] {
  const sign = (ry: number, x: number): THREE.Mesh => {
    const m = turn(textPlane('下一站  鲸跃大厦  Next stop: Jingyue Tower', 2.6, 0.2, { bg: '#050505', fg: '#fb923c' }), ry);
    m.position.set(x, CEILING - 0.16, MID_Z);
    return m;
  };
  return [
    box(LENGTH, 0.06, CAR.z1 - CAR.z0, '#e8eaec', MID_X, CEILING + 0.03, MID_Z),
    ...[-0.75, 0.75].map((o) => box(LENGTH - 0.6, 0.03, 0.16, glow('#fbfdf6'), MID_X, CEILING - 0.015, MID_Z + o)),
    ...[-0.62, 0.62].map((o) => turn(cyl(0.02, 0.02, LENGTH - 0.6, shiny(STEEL), MID_X, 1.95, MID_Z + o, 8), 0, 0, Math.PI / 2)),
    ...Array.from({ length: 8 }, (_, i) => [-0.62, 0.62].map((o) => box(0.03, 0.22, 0.012, '#1f2937', CAR.x0 + 1.6 + i * 2.1, 1.83, MID_Z + o))).flat(),
    ...Array.from({ length: 8 }, (_, i) => cyl(0.022, 0.022, CEILING, shiny(STEEL), CAR.x0 + 1.1 + i * 2.25, CEILING / 2, MID_Z + (i % 2 === 0 ? 0.62 : -0.62), 8)),
    turn(sign(Math.PI / 2, MID_X - 0.03), 0),
    sign(-Math.PI / 2, MID_X + 0.03),
    box(0.06, 0.26, 2.7, '#050505', MID_X, CEILING - 0.16, MID_Z),
  ];
}

/** Bucket-seat centres on the south bench segments (clear of the doorways) taken by seated commuters. */
const RIDER_XS = [400.55, 403.85, 405.35, 407.35, 410.65, 412.65, 414.15, 417.45];

/** Commuters who got there first: they fill the south bench and never look up. */
function riders(): THREE.Object3D[] {
  return RIDER_XS.map((x, i) => {
    const rider = makeCharacter(STAFF_LOOKS[i % STAFF_LOOKS.length], '', x, CAR.z1 - 0.42, Math.PI);
    rider.sit();
    return rider.root;
  });
}

function trainDecor(): THREE.Object3D[] {
  const free = SEAT_XS.map((x) => box(0.4, 0.004, 0.3, glow('#bbf7d0'), x, 0.466, CAR.z0 + 0.4));
  return [...sideWall(CAR.z0 + 0.04, 1), ...sideWall(CAR.z1 - 0.04, -1), ...endWall(CAR.x0 + 0.04, 1), ...endWall(CAR.x1 - 0.04, -1), ...ceilingAndRails(), ...riders(), ...free, group(0, 0, 0)];
}

export const train: RoomArt = { builders: { carBench }, decor: trainDecor };
