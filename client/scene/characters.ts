import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PlayerStatus } from '../../shared/protocol.ts';
import type { ItemKind } from '../../shared/tasks.ts';
import type { NpcId } from '../../shared/world.ts';
import { ball, box, cyl, group, labelSprite, makeItem, mat, rbox } from './kit.ts';

type HairStyle = 'flat' | 'part' | 'bun' | 'bob' | 'spiky' | 'combover' | 'curly';

export interface Look {
  readonly skin: string;
  readonly shirt: string;
  readonly pants: string;
  readonly hair: string;
  readonly hairStyle: HairStyle;
  readonly badge: string;
  readonly scale: number;
  readonly tie?: string;
  readonly glasses?: boolean;
  readonly shoes?: string;
  readonly cuff?: string;
  readonly collar?: string;
  readonly belt?: string;
}

const INTERN = { skin: '#ffd2a8', shirt: '#ffffff', pants: '#334155', scale: 1 } as const;

/** Eight interns: same white shirt, told apart by hair and badge colour. */
export const PLAYER_LOOKS: readonly Look[] = [
  { ...INTERN, hair: '#1f2937', hairStyle: 'flat', badge: '#ef4444' },
  { ...INTERN, hair: '#0e7490', hairStyle: 'bun', badge: '#3b82f6' },
  { ...INTERN, hair: '#92400e', hairStyle: 'part', badge: '#22c55e', glasses: true },
  { ...INTERN, hair: '#7f1d1d', hairStyle: 'bob', badge: '#f59e0b' },
  { ...INTERN, hair: '#f97316', hairStyle: 'spiky', badge: '#a855f7' },
  { ...INTERN, hair: '#0f766e', hairStyle: 'flat', badge: '#ec4899', glasses: true },
  { ...INTERN, hair: '#be185d', hairStyle: 'bun', badge: '#14b8a6' },
  { ...INTERN, hair: '#facc15', hairStyle: 'part', badge: '#64748b' },
];

const STAFF = { skin: '#f6caa2', pants: '#1f2937', scale: 1, shoes: '#111827' } as const;

/** Full-time colleagues wear their own clothes, so interns in white shirts stand out. */
export const STAFF_LOOKS: readonly Look[] = [
  { ...STAFF, shirt: '#2563eb', hair: '#111827', hairStyle: 'flat', badge: '#f8fafc' },
  { ...STAFF, shirt: '#0f766e', hair: '#3f2a1d', hairStyle: 'bun', badge: '#f8fafc', glasses: true },
  { ...STAFF, shirt: '#9f1239', hair: '#1f2937', hairStyle: 'part', badge: '#f8fafc' },
  { ...STAFF, shirt: '#475569', hair: '#78350f', hairStyle: 'spiky', badge: '#f8fafc', glasses: true },
  { ...STAFF, shirt: '#b45309', hair: '#111827', hairStyle: 'bob', badge: '#f8fafc' },
  { ...STAFF, shirt: '#6d28d9', hair: '#0f172a', hairStyle: 'curly', badge: '#f8fafc' },
];

export const NPC_LOOKS: Record<NpcId, Look> = {
  boss: { skin: '#f2c29b', shirt: '#1e293b', pants: '#0f172a', hair: '#111827', hairStyle: 'combover', badge: '#facc15', scale: 1.16, tie: '#dc2626', glasses: true, shoes: '#111827', cuff: '#f8fafc', collar: '#f8fafc' },
  hr: { skin: '#ffd9bd', shirt: '#7e22ce', pants: '#1f2937', hair: '#3f2a1d', hairStyle: 'bun', badge: '#f472b6', scale: 1.04, shoes: '#111827', collar: '#f8fafc' },
  cleaner: { skin: '#f0c49a', shirt: '#38bdf8', pants: '#0369a1', hair: '#6b7280', hairStyle: 'curly', badge: '#e2e8f0', scale: 0.95, shoes: '#1f2937', belt: '#0369a1' },
  zhang: { skin: '#eebf96', shirt: '#a16207', pants: '#44403c', hair: '#9ca3af', hairStyle: 'part', badge: '#84cc16', scale: 1, glasses: true, shoes: '#44403c', collar: '#fef3c7' },
};

function hair(style: HairStyle, color: string): THREE.Object3D[] {
  const cap = box(0.54, 0.14, 0.5, color, 0, 1.66, -0.01);
  switch (style) {
    case 'flat':
      return [cap, box(0.54, 0.08, 0.06, color, 0, 1.57, 0.22)];
    case 'part':
      return [cap, box(0.3, 0.1, 0.5, color, -0.13, 1.74, 0), box(0.2, 0.08, 0.06, color, -0.17, 1.57, 0.22)];
    case 'bun':
      return [cap, ball(0.14, color, 0, 1.82, -0.1), box(0.54, 0.26, 0.08, color, 0, 1.48, -0.22)];
    case 'bob':
      return [cap, box(0.06, 0.34, 0.46, color, -0.26, 1.46, -0.02), box(0.06, 0.34, 0.46, color, 0.26, 1.46, -0.02), box(0.54, 0.34, 0.06, color, 0, 1.46, -0.24), box(0.5, 0.07, 0.05, color, 0, 1.58, 0.23)];
    case 'spiky':
      return [cap, ...[-0.16, 0, 0.16].map((x) => cyl(0, 0.09, 0.2, color, x, 1.8, 0, 5))];
    case 'combover':
      return [box(0.54, 0.05, 0.14, color, 0, 1.62, -0.18), box(0.5, 0.03, 0.05, color, 0, 1.63, 0.02), box(0.06, 0.16, 0.3, color, -0.26, 1.5, -0.08), box(0.06, 0.16, 0.3, color, 0.26, 1.5, -0.08)];
    default:
      return [cap, ...[-0.18, 0, 0.18].flatMap((x) => [ball(0.12, color, x, 1.72, 0.08), ball(0.12, color, x, 1.72, -0.14)])];
  }
}

const STATUS_ICONS: Record<PlayerStatus, string> = {
  idle: '',
  work: '',
  phone: '📱',
  sleep: '💤',
  stall: '🚽',
  bench: '🌤️',
  eat: '🍪',
  sneaky: '🤫',
};

/** A jump as other players see it: a 0.7 s arc. */
const HOP_SECONDS = 0.7;
const HOP_HEIGHT = 0.8;

export interface Character {
  readonly root: THREE.Group;
  /** Smoothly follow a server position. */
  moveTo(x: number, z: number, yaw: number, air?: boolean): void;
  update(dt: number): void;
  setStatus(status: PlayerStatus, carrying: ItemKind | null, ghost: boolean): void;
  /** Freeze in a seated typing pose (for colleagues who never move). */
  sit(): void;
  dispose(): void;
}

const GHOST_MATERIAL = new THREE.MeshLambertMaterial({ color: '#cbd5e1', transparent: true, opacity: 0.45 });
const FOLLOW_RATE = 12;
const STRIDE = 7;

export function makeCharacter(look: Look, name: string, x: number, z: number, yaw: number): Character {
  const leg = (side: number): THREE.Group =>
    group(side * 0.11, 0.5, 0, rbox(0.15, 0.46, 0.17, look.pants, 0, -0.22, 0, 0.05), rbox(0.16, 0.09, 0.27, look.shoes ?? '#f8fafc', 0, -0.455, 0.04, 0.04), box(0.16, 0.025, 0.27, '#94a3b8', 0, -0.49, 0.04));
  const legL = leg(-1);
  const legR = leg(1);
  const arm = (side: number): THREE.Group =>
    group(side * 0.3, 1.1, 0, rbox(0.11, 0.4, 0.11, look.shirt, 0, -0.2, 0, 0.045), rbox(0.115, 0.05, 0.115, look.cuff ?? look.shirt, 0, -0.39, 0, 0.02), ball(0.065, look.skin, 0, -0.45, 0));
  const armL = arm(-1);
  const armR = arm(1);

  const head = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.46, 0.46, 3, 0.1), mat(look.skin));
  head.position.set(0, 1.4, 0);
  const face: THREE.Object3D[] = [
    ball(0.035, '#111111', -0.1, 1.43, 0.225),
    ball(0.035, '#111111', 0.1, 1.43, 0.225),
    box(0.09, 0.02, 0.02, look.hair, -0.1, 1.52, 0.23),
    box(0.09, 0.02, 0.02, look.hair, 0.1, 1.52, 0.23),
    box(0.08, 0.018, 0.02, '#b45309', 0, 1.28, 0.23),
    ball(0.05, look.skin, -0.27, 1.4, 0),
    ball(0.05, look.skin, 0.27, 1.4, 0),
  ];
  const glasses = look.glasses
    ? [box(0.14, 0.1, 0.02, '#111827', -0.1, 1.43, 0.245), box(0.14, 0.1, 0.02, '#111827', 0.1, 1.43, 0.245), box(0.1, 0.02, 0.02, '#111827', 0, 1.44, 0.245)]
    : [];
  const lensShine = look.glasses ? [box(0.1, 0.06, 0.02, '#e0f2fe', -0.1, 1.43, 0.25), box(0.1, 0.06, 0.02, '#e0f2fe', 0.1, 1.43, 0.25)] : [];

  const torso = cyl(0.2, 0.28, 0.62, look.shirt, 0, 0.82, 0, 10);
  const lanyard = [
    box(0.02, 0.26, 0.02, look.badge, -0.07, 1.0, 0.2),
    box(0.02, 0.26, 0.02, look.badge, 0.07, 1.0, 0.2),
    box(0.15, 0.19, 0.03, look.badge, 0, 0.8, 0.27),
    box(0.1, 0.06, 0.035, '#ffffff', 0, 0.83, 0.275),
  ];
  const tie = look.tie ? [box(0.07, 0.34, 0.02, look.tie, 0, 0.92, 0.245)] : [];
  const collar = [
    cyl(0.1, 0.12, 0.08, look.skin, 0, 1.15, 0, 12),
    ...[-1, 1].map((side) => {
      const flap = box(0.12, 0.06, 0.03, look.collar ?? look.shirt, side * 0.07, 1.12, 0.17);
      flap.rotation.z = side * -0.5;
      return flap;
    }),
    cyl(0.285, 0.285, 0.05, look.belt ?? '#1f2937', 0, 0.54, 0, 14),
    ...[0.98, 0.86, 0.74].map((y) => ball(0.014, '#cbd5e1', 0, y, 0.235 + (1.0 - y) * 0.11)),
  ];

  const body = group(0, 0, 0, legL, legR, armL, armR, torso, head, ...face, ...glasses, ...lensShine, ...hair(look.hairStyle, look.hair), ...lanyard, ...tie, ...collar);
  body.scale.setScalar(look.scale);
  body.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 16), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;

  const nameTag = name ? labelSprite(name, 0.2) : new THREE.Group();
  nameTag.position.y = 1.95 * look.scale + 0.05;
  const iconSlot = group(0, 2.25 * look.scale + 0.05, 0);
  const itemSlot = group(0, 0.95, 0.36);
  body.add(itemSlot);

  const root = group(x, 0, z, body, shadow, nameTag, iconSlot);
  root.rotation.y = yaw;

  const target = { x, z, yaw };
  let phase = 0;
  let status: PlayerStatus = 'idle';
  let carried: ItemKind | null = null;
  let isGhost = false;

  const disposeTree = (node: THREE.Object3D): void => {
    node.traverse((child) => {
      if (child instanceof THREE.Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
      }
    });
  };

  let hop = HOP_SECONDS;

  return {
    root,
    moveTo(nx, nz, nyaw, air = false) {
      if (air && hop >= HOP_SECONDS) hop = 0;
      target.x = nx;
      target.z = nz;
      target.yaw = nyaw;
    },
    update(dt) {
      const k = 1 - Math.exp(-FOLLOW_RATE * dt);
      const dx = (target.x - root.position.x) * k;
      const dz = (target.z - root.position.z) * k;
      root.position.x += dx;
      root.position.z += dz;
      hop = Math.min(HOP_SECONDS, hop + dt);
      const air = hop / HOP_SECONDS;
      root.position.y = 4 * HOP_HEIGHT * air * (1 - air);
      const turn = Math.atan2(Math.sin(target.yaw - root.rotation.y), Math.cos(target.yaw - root.rotation.y));
      root.rotation.y += turn * k;

      const speed = Math.hypot(dx, dz) / Math.max(dt, 1e-4);
      const walking = speed > 0.3;
      phase = walking ? phase + dt * STRIDE : 0;
      const swing = walking ? Math.sin(phase) * 0.6 : 0;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      const holding = carried !== null || status === 'eat';
      armL.rotation.x = holding ? -1.1 : -swing;
      armR.rotation.x = status === 'phone' || holding ? -1.1 : swing;
      body.rotation.x = status === 'sleep' ? 0.55 : status === 'sneaky' ? 0.2 : 0;
      body.position.y = status === 'stall' || status === 'bench' ? -0.22 : walking ? Math.abs(Math.sin(phase)) * 0.03 : 0;
    },
    setStatus(next, carrying, ghost) {
      if (next !== status || ghost !== isGhost) {
        status = next;
        for (const child of [...iconSlot.children]) {
          disposeTree(child);
          iconSlot.remove(child);
        }
        const icon = ghost ? '👻' : STATUS_ICONS[next];
        if (icon) iconSlot.add(labelSprite(icon, 0.34));
      }
      if (ghost !== isGhost) {
        isGhost = ghost;
        body.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.userData.solid ??= child.material;
          child.material = ghost ? GHOST_MATERIAL : child.userData.solid;
        });
      }
      if (carrying !== carried) {
        carried = carrying;
        itemSlot.clear();
        if (carrying) itemSlot.add(makeItem(carrying));
      }
    },
    sit() {
      legL.rotation.x = -1.45;
      legR.rotation.x = -1.45;
      armL.rotation.x = -1.15;
      armR.rotation.x = -1.15;
      body.rotation.x = 0.06;
    },
    dispose() {
      disposeTree(root);
      root.removeFromParent();
    },
  };
}
