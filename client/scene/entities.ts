import * as THREE from 'three';
import type { Snapshot } from '../../shared/protocol.ts';
import { NPC_NAMES, STATIONS } from '../../shared/world.ts';
import { NPC_LOOKS, PLAYER_LOOKS, makeCharacter } from './characters.ts';
import type { Character } from './characters.ts';
import { ball, group, labelSprite, rbox, turn } from './kit.ts';

const ICON_Y = 2.25;
const ARROW_Y = 2.75;
const CROWN_Y = 2.55;

/** A banana peel: three flaps around a stub. */
function peel(): THREE.Group {
  const flaps = [0, 1, 2].map((i) => turn(group(0, 0, 0, turn(rbox(0.07, 0.015, 0.26, '#fde047', 0, 0.02, 0.13, 0.006), 0, 0.12)), (i * Math.PI * 2) / 3));
  return group(0, 0, 0, ...flaps, ball(0.04, '#a16207', 0, 0.05, 0));
}

export interface Entities {
  readonly root: THREE.Group;
  sync(snap: Snapshot): void;
  update(dt: number, time: number): void;
}

/** Keeps the 3D characters and station markers in step with server snapshots. */
export function makeEntities(): Entities {
  const root = new THREE.Group();
  const characters = new Map<string, Character>();
  const peels = new Map<string, THREE.Group>();
  const crown = labelSprite('👑', 0.36);
  crown.visible = false;
  let leaderId = '';

  const markers = new Map(
    STATIONS.filter((s) => s.type !== 'desk' && s.type !== 'shop').map((s) => {
      const icon = labelSprite(s.icon, 0.34);
      icon.position.set(s.ax, ICON_Y, s.az);
      return [s.id, icon] as const;
    }),
  );
  const arrows = new Map(
    STATIONS.map((s) => {
      const arrow = labelSprite('▼', 0.42, { fg: '#fde047' });
      arrow.position.set(s.ax, ARROW_Y, s.az);
      arrow.visible = false;
      return [s.id, arrow] as const;
    }),
  );
  const alert = labelSprite('⚠️ 卡纸', 0.36, { bg: '#dc2626', fg: '#ffffff' });
  const printer = STATIONS.find((s) => s.type === 'printer');
  if (printer) alert.position.set(printer.ax, 1.7, printer.az);
  alert.visible = false;
  const stall = labelSprite('老张 · 摸鱼小卖部', 0.3, { bg: '#b45309', fg: '#fff7d6' });
  stall.position.set(18.6, 2.5, 10.5);
  root.add(...markers.values(), ...arrows.values(), alert, stall, crown);

  const ensure = (id: string, make: () => Character): Character => {
    const existing = characters.get(id);
    if (existing) return existing;
    const created = make();
    characters.set(id, created);
    root.add(created.root);
    return created;
  };

  return {
    root,
    sync(snap) {
      const alive = new Set<string>();
      for (const p of snap.players) {
        if (p.id === snap.you.id) continue;
        alive.add(p.id);
        const look = PLAYER_LOOKS[p.look % PLAYER_LOOKS.length];
        const character = ensure(p.id, () => makeCharacter(look, p.name, p.x, p.z, p.yaw));
        character.moveTo(p.x, p.z, p.yaw, p.air);
        character.setStatus(p.status, p.carrying, p.fired);
      }
      for (const n of snap.npcs) {
        alive.add(n.id);
        ensure(n.id, () => makeCharacter(NPC_LOOKS[n.id], NPC_NAMES[n.id], n.x, n.z, n.yaw)).moveTo(n.x, n.z, n.yaw);
      }
      for (const [id, character] of characters) {
        if (alive.has(id)) continue;
        character.dispose();
        characters.delete(id);
      }
      const targets = new Set(snap.you.tasks.map((t) => t.target));
      for (const [id, arrow] of arrows) arrow.visible = snap.phase === 'day' && targets.has(id);
      alert.visible = snap.printerBroken;

      const seen = new Set(snap.traps.map((t) => t.id));
      for (const t of snap.traps) {
        if (peels.has(t.id)) continue;
        const mesh = peel();
        mesh.position.set(t.x, 0.01, t.z);
        peels.set(t.id, mesh);
        root.add(mesh);
      }
      for (const [id, mesh] of peels) {
        if (seen.has(id)) continue;
        mesh.removeFromParent();
        peels.delete(id);
      }
      // The KPI leader wears a crown, so everyone knows who to go after.
      const leader = snap.ranking[0];
      leaderId = snap.players.length > 1 && leader && leader.kpi > 0 && !leader.fired ? leader.id : '';
    },
    update(dt, time) {
      for (const character of characters.values()) character.update(dt);
      const wearer = characters.get(leaderId);
      crown.visible = wearer !== undefined;
      if (wearer) crown.position.set(wearer.root.position.x, CROWN_Y + Math.sin(time * 3) * 0.04, wearer.root.position.z);
      const bounce = Math.sin(time * 4) * 0.08;
      for (const arrow of arrows.values()) if (arrow.visible) arrow.position.y = ARROW_Y + bounce;
    },
  };
}
