import * as THREE from 'three';
import type { BusyView } from '../../shared/protocol.ts';
import type { ItemKind } from '../../shared/tasks.ts';
import { box, group, makeItem, rbox } from './kit.ts';

const SLEEVE = '#ffffff';
const SKIN = '#ffd2a8';
const REST_Y = -0.34;
const RAISED_Y = -0.2;
const EASE = 10;

export interface Hands {
  readonly root: THREE.Group;
  update(dt: number, walking: boolean, carrying: ItemKind | null, busy: BusyView | null): void;
}

/** First-person arms parented to the camera. */
export function makeHands(): Hands {
  const arm = (side: number): THREE.Group => {
    const g = group(
      side * 0.27, REST_Y, -0.42,
      rbox(0.1, 0.1, 0.42, SLEEVE, 0, 0, 0.12, 0.04),
      rbox(0.108, 0.108, 0.05, '#e2e8f0', 0, 0, -0.07, 0.02),
      rbox(0.085, 0.05, 0.1, SKIN, 0, 0, -0.14, 0.022),
      ...[-0.03, -0.01, 0.01, 0.03].map((x) => rbox(0.018, 0.035, 0.06, SKIN, x, -0.012, -0.2, 0.008)),
      rbox(0.024, 0.03, 0.06, SKIN, side * -0.05, 0.004, -0.15, 0.01),
    );
    g.rotation.set(0.25, side * -0.25, 0);
    return g;
  };
  const left = arm(-1);
  const right = arm(1);
  const itemSlot = group(0, -0.24, -0.58);
  const phone = group(0.02, 0.07, -0.14, box(0.08, 0.15, 0.012, '#111827'), box(0.07, 0.13, 0.014, '#60a5fa', 0, 0, 0.002));
  phone.rotation.x = -0.5;
  phone.visible = false;
  right.add(phone);

  const root = group(0, 0, 0, left, right, itemSlot);
  let shown: ItemKind | null = null;
  let phase = 0;

  return {
    root,
    update(dt, walking, carrying, busy) {
      if (carrying !== shown) {
        shown = carrying;
        itemSlot.clear();
        if (carrying) {
          const item = makeItem(carrying);
          item.scale.setScalar(1.2);
          itemSlot.add(item);
        }
      }
      const onPhone = busy?.kind === 'slack' && busy.mode === 'phone';
      const working = busy?.kind === 'hold' || busy?.kind === 'minigame';
      const raised = carrying !== null || working;
      phone.visible = onPhone;
      root.visible = !(busy?.kind === 'slack' && busy.mode !== 'phone');

      phase = walking ? phase + dt * 9 : phase * 0.9;
      const bob = Math.sin(phase) * 0.012;
      const fidget = working ? Math.sin(performance.now() / 70) * 0.012 : 0;
      const k = 1 - Math.exp(-EASE * dt);
      const leftY = (raised ? RAISED_Y : REST_Y) + bob + fidget;
      const rightY = (raised || onPhone ? RAISED_Y : REST_Y) - bob - fidget;
      left.position.y += (leftY - left.position.y) * k;
      right.position.y += (rightY - right.position.y) * k;
      const inward = raised ? 0.16 : 0.27;
      left.position.x += (-inward - left.position.x) * k;
      right.position.x += ((onPhone ? 0.12 : inward) - right.position.x) * k;
    },
  };
}
