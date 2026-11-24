import * as THREE from 'three';
import { LIFT_BOSS_EVERY, LIFT_RIDE_SECONDS } from '../../shared/constants.ts';
import { AVENUE, CROSSWALK, LIFT, liftAt, liftCarAt, signalAt } from '../../shared/hazards.ts';
import { LIFT_CARS, LIFT_DOOR_XS, TOWER_DOOR, TOWER_FACADE_Z, TOWER_LOBBY, areaById } from '../../shared/world.ts';
import type { AreaId } from '../../shared/world.ts';
import { NPC_LOOKS, STAFF_LOOKS, makeCharacter } from './characters.ts';
import { box, cyl, glass, glow, group, shiny, textPlane, turn } from './kit.ts';
import { CAR_DOOR } from './rooms/elevator.ts';
import { LIFT_DOOR } from './rooms/towerLobby.ts';

const DOOR_SPIN = 0.7;
const SLIDE_RATE = 0.2;
const YELLOW_SECONDS = 2;
const VAN_SPEED = 16;
const VAN_LOOP = 54;
const DIGITS = { bg: '#050505', fg: '#fb923c' };

export interface CommuteFx {
  readonly root: THREE.Group;
  /** `t` is the shared room clock; `rolling` says whether the vehicle you sit in is on the move. */
  update(t: number, place: AreaId, rolling: boolean): void;
}

/** A floor indicator: one plane whose face is swapped between pre-drawn numbers. */
function indicator(w: number, h: number): { mesh: THREE.Mesh; show(floor: number): void } {
  const faces = Array.from({ length: LIFT.floors }, (_, i) => textPlane(`${i + 1}`, w, h, DIGITS).material);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faces[0]);
  return { mesh, show: (floor) => void (mesh.material = faces[Math.max(1, Math.min(LIFT.floors, floor)) - 1]) };
}

/** Two leaves that part from a centre line along x. `open` is 0..1. */
function slidingDoor(x: number, z: number, width: number, height: number): { leaves: THREE.Mesh[]; set(open: number): void } {
  const leaves = [-1, 1].map((side) => box(width / 2, height, 0.03, shiny('#aeb4ba'), x + (side * width) / 4, height / 2, z));
  let at = 0;
  return {
    leaves,
    set(open) {
      at += (open - at) * SLIDE_RATE;
      leaves.forEach((leaf, i) => (leaf.position.x = x + (i === 0 ? -1 : 1) * (width / 4 + at * (width / 2 - 0.04))));
    },
  };
}

/** Avenue lights and the revolving door. */
function plazaFx(): { root: THREE.Group; update(t: number): void } {
  const doorX = (TOWER_DOOR.from + TOWER_DOOR.to) / 2;
  const wings = group(doorX, 0, TOWER_FACADE_Z, cyl(0.06, 0.06, 2.54, shiny('#94a3b8'), 0, 1.27, 0, 10), ...[0, 1, 2, 3].map((i) => turn(group(0, 0, 0, box(1.4, 2.4, 0.03, glass('#e0f2fe', 0.4), 0.74, 1.25, 0), box(0.04, 2.5, 0.05, shiny('#94a3b8'), 1.44, 1.25, 0)), (i * Math.PI) / 2)));
  const face = (text: string, fg: string, x: number, z: number, ry: number): THREE.Mesh => {
    const m = turn(textPlane(text, 0.38, 0.42, { bg: '#0a0a0a', fg }), ry);
    m.position.set(x, 2.75, z + Math.cos(ry) * 0.155);
    return m;
  };
  const poles = [{ x: CROSSWALK.x0 - 0.5, z: AVENUE.z0 - 0.6 }, { x: CROSSWALK.x1 + 0.5, z: AVENUE.z1 + 0.6 }];
  const walk = poles.flatMap((p) => [0, Math.PI].map((ry) => face('WALK', '#f8fafc', p.x, p.z, ry)));
  const stop = poles.flatMap((p) => [0, Math.PI].map((ry) => face('DONT\nWALK', '#f97316', p.x, p.z, ry)));
  const lamp = (color: string, y: number, z: number): THREE.Mesh => turn(cyl(0.12, 0.12, 0.03, new THREE.MeshBasicMaterial({ color }), CROSSWALK.x0 - 1.6 - 0.18, 5.55 + y, AVENUE.z1 + 0.8 + z, 14), 0, 0, Math.PI / 2);
  const heads = [-2.4, -5.4, -8].map((z) => ({ red: lamp('#ef4444', 0.34, z), amber: lamp('#facc15', 0, z), green: lamp('#22c55e', -0.34, z) }));
  const lit = (mesh: THREE.Mesh, on: boolean, color: string): void => void (mesh.material as THREE.MeshBasicMaterial).color.set(on ? color : '#1c1c1e');
  return {
    root: group(0, 0, 0, wings, ...walk, ...stop, ...heads.flatMap((h) => [h.red, h.amber, h.green])),
    update(t) {
      wings.rotation.y = -t * DOOR_SPIN;
      const light = signalAt(t);
      for (const m of walk) m.visible = light.walk;
      for (const m of stop) m.visible = !light.walk;
      for (const h of heads) {
        lit(h.red, light.walk, '#ef4444');
        lit(h.amber, !light.walk && light.left <= YELLOW_SECONDS, '#facc15');
        lit(h.green, !light.walk && light.left > YELLOW_SECONDS, '#22c55e');
      }
    },
  };
}

/** The ground-floor lift bank: doors that open in turn and indicators that crawl down floor by floor. */
function bankFx(): { root: THREE.Group; update(t: number): void } {
  const z = TOWER_LOBBY.z1 - 0.11;
  const doors = LIFT_DOOR_XS.map((x) => slidingDoor(x, z - 0.1, LIFT_DOOR.width, LIFT_DOOR.height));
  const signs = LIFT_DOOR_XS.map((x) => {
    const sign = indicator(0.6, 0.24);
    sign.mesh.rotation.y = Math.PI;
    sign.mesh.position.set(x, 2.46, z - 0.08);
    return sign;
  });
  return {
    root: group(0, 0, 0, ...doors.flatMap((d) => d.leaves), ...signs.map((s) => s.mesh)),
    update(t) {
      const lift = liftAt(t);
      doors.forEach((door, i) => door.set(lift.doorsOpen && lift.door === i ? 1 : 0));
      signs.forEach((sign, i) => {
        // Cars that are not next in line are further up the building.
        const turnsAway = (i - lift.door + LIFT.doors) % LIFT.doors;
        const wait = lift.opensIn + turnsAway * LIFT.period;
        sign.show(1 + Math.min(LIFT.floors - 1, Math.ceil(wait / LIFT.floorSeconds)));
      });
    },
  };
}

/** Inside the two lift cars: doors, the floor counter, the crowd outside, and the director when he cuts in. */
function carsFx(): { root: THREE.Group; update(t: number): void } {
  const cars = LIFT_CARS.map((c, i) => {
    const cx = (c.x0 + c.x1) / 2;
    const door = slidingDoor(cx, c.z0 + 0.04, CAR_DOOR.width, CAR_DOOR.height);
    const sign = indicator(0.56, 0.22);
    sign.mesh.position.set(cx, CAR_DOOR.height + 0.25, c.z0 + 0.102);
    const crowd = group(0, 0, 0, ...[-0.78, -0.26, 0.26, 0.78].map((o, k) => makeCharacter(STAFF_LOOKS[(k + i * 2) % STAFF_LOOKS.length], '', cx + o, c.z0 - 0.5 - (k % 2) * 0.35, 0).root));
    return { door, sign, crowd, down: i === 1 };
  });
  const up = LIFT_CARS[0];
  const vips = group(0, 0, 0, makeCharacter(NPC_LOOKS.boss, '', up.x0 + 0.55, up.z1 - 0.45, Math.PI).root, makeCharacter(STAFF_LOOKS[2], '', up.x1 - 0.55, up.z1 - 0.45, Math.PI).root);
  return {
    root: group(0, 0, 0, vips, ...cars.flatMap((c) => [...c.door.leaves, c.sign.mesh, c.crowd])),
    update(t) {
      for (const car of cars) {
        const state = liftCarAt(t, LIFT_RIDE_SECONDS, car.down);
        car.door.set(state.doorsOpen ? 1 : 0);
        car.sign.show(state.floor);
        car.crowd.visible = state.crowd;
      }
      // The car serving cycle c is in use from the moment its doors open until the next car's do.
      const cycle = Math.floor((t - LIFT.arrive) / LIFT.period);
      vips.visible = cycle % LIFT_BOSS_EVERY === LIFT_BOSS_EVERY - 1;
    },
  };
}

/** Lane paint and city blocks sliding past the shuttle's windows. */
function vanFx(): { root: THREE.Group; update(t: number, rolling: boolean): void } {
  const v = areaById('van');
  const cx = (v.x0 + v.x1) / 2;
  const dashes = Array.from({ length: 12 }, (_, i) => box(0.14, 0.004, 2.2, '#e5e7eb', cx + (i % 2 === 0 ? -1.9 : 1.9), 0.004, 0));
  const tones = ['#8f5b45', '#b8ad98', '#6b7280', '#9a6a4f'];
  const blocks = Array.from({ length: 10 }, (_, i) => box(7, 9 + (i % 4) * 5, 8, tones[i % tones.length], cx + (i % 2 === 0 ? -9.5 : 9.5), (9 + (i % 4) * 5) / 2, 0));
  let travelled = 0;
  let last = 0;
  return {
    root: group(0, 0, 0, ...dashes, ...blocks),
    update(t, rolling) {
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      if (rolling) travelled += dt * VAN_SPEED;
      const place = (i: number, count: number): number => v.z0 - VAN_LOOP + 12 + ((travelled + (Math.floor(i / 2) * VAN_LOOP * 2) / count) % VAN_LOOP);
      dashes.forEach((dash, i) => (dash.position.z = place(i, dashes.length)));
      blocks.forEach((block, i) => (block.position.z = place(i, blocks.length)));
    },
  };
}

/** Everything on the way to work that moves on the room clock: lights, doors, lift counters, the view from the van. */
export function makeCommuteFx(): CommuteFx {
  const plaza = plazaFx();
  const bank = bankFx();
  const cars = carsFx();
  const shuttle = vanFx();
  const plazaRoot = group(0, 0, 0, plaza.root, bank.root);
  return {
    root: group(0, 0, 0, plazaRoot, cars.root, shuttle.root),
    update(t, place, rolling) {
      plazaRoot.visible = place === 'plaza';
      cars.root.visible = place === 'lift';
      shuttle.root.visible = place === 'van';
      if (plazaRoot.visible) {
        plaza.update(t);
        bank.update(t);
      }
      if (cars.root.visible) cars.update(t);
      if (shuttle.root.visible) shuttle.update(t, rolling);
    },
  };
}
