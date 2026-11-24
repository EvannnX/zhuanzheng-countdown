import * as THREE from 'three';
import { PROPS } from '../../shared/world.ts';
import type { Face, Prop } from '../../shared/world.ts';
import { box, group, rbox } from './kit.ts';
import { away } from './rooms/away.ts';
import { home } from './rooms/home.ts';
import { director } from './rooms/director.ts';
import { lobby } from './rooms/lobby.ts';
import { meeting } from './rooms/meeting.ts';
import { office } from './rooms/office.ts';
import { outdoor } from './rooms/outdoor.ts';
import { plaza } from './rooms/plaza.ts';
import { elevator } from './rooms/elevator.ts';
import { towerLobby } from './rooms/towerLobby.ts';
import { van } from './rooms/van.ts';
import { pantry } from './rooms/pantry.ts';
import { print } from './rooms/print.ts';
import { restroom } from './rooms/restroom.ts';
import { subway } from './rooms/subway.ts';
import { train } from './rooms/train.ts';
import type { Builder, RoomArt } from './rooms/types.ts';
import { contactShadow } from './textures.ts';

const ROOM_ART: readonly RoomArt[] = [office, meeting, director, pantry, print, restroom, lobby, outdoor, away, home, subway, train, plaza, towerLobby, elevator, van];
const BUILDERS: Readonly<Record<string, Builder>> = Object.assign({}, ...ROOM_ART.map((r) => r.builders));
const ROTATION: Record<Face, number> = { s: 0, e: Math.PI / 2, n: Math.PI, w: -Math.PI / 2 };
const NO_SHADOW_KINDS = ['partition', 'stallFront', 'parasol', 'homeWall', 'carBench', 'doorJamb', 'lobbyRail'];
const SHADOW_MARGIN = 0.5;
const RACK = { x: 17.3 - 0.46, z: 24 };

const fallback: Builder = (w, d) => [rbox(w, 1, d, '#f0abfc', 0, 0.5, 0)];

function buildProp(p: Prop, index: number): THREE.Group {
  const sideways = p.face === 'e' || p.face === 'w';
  const builder = BUILDERS[p.kind] ?? fallback;
  const g = group(p.x, 0, p.z, ...builder(sideways ? p.d : p.w, sideways ? p.w : p.d, index));
  g.rotation.y = ROTATION[p.face];
  return g;
}

/** Soft dark patch under each piece of furniture so it sits on the floor instead of floating. */
function groundShadows(): THREE.Object3D[] {
  const material = new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false, opacity: 0.75 });
  material.userData = { merge: true, noShadow: true };
  return PROPS.filter((p) => !NO_SHADOW_KINDS.includes(p.kind)).map((p) => {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(p.w + SHADOW_MARGIN, p.d + SHADOW_MARGIN), material);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(p.x, 0.008, p.z);
    return patch;
  });
}

export interface PropsHandle {
  /** Static furniture and dressing, ready to be merged with the rest of the scene. */
  readonly statics: THREE.Object3D[];
  /** Small animated bits that must stay separate. */
  readonly dynamic: THREE.Group;
  /** Blink the rack red while the servers are down. */
  setServerDown(down: boolean, time: number): void;
}

export function buildProps(): PropsHandle {
  const statics = [...PROPS.map(buildProp), ...ROOM_ART.flatMap((r) => r.decor()), ...groundShadows()];

  const ledMaterial = new THREE.MeshBasicMaterial({ color: '#22c55e' });
  const leds = Array.from({ length: 9 }, (_, row) =>
    [-0.8, -0.72, -0.64, 0.7, 0.8].map((z, i) => {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.025, 0.035), ledMaterial);
      led.position.set(RACK.x, 0.28 + row * 0.185, RACK.z + z);
      led.visible = (row + i) % 4 !== 0;
      return led;
    }),
  ).flat();
  const alarmMaterial = new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0 });
  const alarm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.9, 1.9), alarmMaterial);
  alarm.position.set(RACK.x - 0.02, 1.02, RACK.z);
  const beacon = box(0.14, 0.1, 0.14, alarmMaterial, RACK.x + 0.4, 2.1, RACK.z);

  return {
    statics,
    dynamic: group(0, 0, 0, ...leds, alarm, beacon),
    setServerDown(down, time) {
      ledMaterial.color.set(down ? '#ef4444' : '#22c55e');
      alarmMaterial.opacity = down ? 0.25 + 0.25 * Math.sin(time * 8) : 0;
    },
  };
}
