import * as THREE from 'three';
import type { PlayerStatus } from '../../shared/protocol.ts';
import type { ItemKind } from '../../shared/tasks.ts';
import { NPC_LOOKS, PLAYER_LOOKS, makeCharacter } from './characters.ts';
import type { Character, Look } from './characters.ts';

export type Spot = readonly [x: number, z: number];

/** Where one actor stands or walks during a cutscene shot. */
export interface Cue {
  readonly who: ActorId;
  readonly from: Spot;
  /** Walk here over the shot; omitted for an actor who stays put. */
  readonly to?: Spot;
  /** Facing when standing still (0 looks towards +z). Walkers face where they go. */
  readonly yaw?: number;
  /** Fraction of the shot that passes before the actor sets off. */
  readonly wait?: number;
  readonly status?: PlayerStatus;
  readonly carrying?: ItemKind;
  readonly pajamas?: boolean;
}

const INTERN_IDS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
export type ActorId = (typeof INTERN_IDS)[number] | 'boss' | 'hr';

const ROLES: Record<ActorId, { look: Look; name: string; intern: boolean }> = {
  ...(Object.fromEntries(INTERN_IDS.map((id, i) => [id, { look: PLAYER_LOOKS[i], name: '实习生', intern: true }])) as Record<(typeof INTERN_IDS)[number], { look: Look; name: string; intern: boolean }>),
  boss: { look: NPC_LOOKS.boss, name: '王总监', intern: false },
  hr: { look: NPC_LOOKS.hr, name: 'HR', intern: false },
};

export interface Cast {
  readonly root: THREE.Group;
  /** Pose the actors for a shot at progress `t` (0..1); `null` clears the stage. */
  direct(cues: readonly Cue[] | null, t: number, dt: number): void;
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Scripted extras for cutscenes: they exist only on this client and only while a film plays. */
export function makeCast(): Cast {
  const root = new THREE.Group();
  root.visible = false;
  const actors = new Map<ActorId, Character>();
  let current: readonly Cue[] | null = null;

  const actor = (id: ActorId): Character => {
    const existing = actors.get(id);
    if (existing) return existing;
    const role = ROLES[id];
    const created = makeCharacter(role.look, role.name, 0, 0, 0, role.intern);
    actors.set(id, created);
    root.add(created.root);
    return created;
  };

  const place = (cue: Cue, t: number): { x: number; z: number; yaw: number } => {
    const to = cue.to ?? cue.from;
    const wait = cue.wait ?? 0;
    const k = THREE.MathUtils.clamp((t - wait) / Math.max(1e-3, 1 - wait), 0, 1);
    const heading = cue.to ? Math.atan2(to[0] - cue.from[0], to[1] - cue.from[1]) : 0;
    return { x: mix(cue.from[0], to[0], k), z: mix(cue.from[1], to[1], k), yaw: cue.yaw ?? heading };
  };

  return {
    root,
    direct(cues, t, dt) {
      root.visible = cues !== null;
      const isNewShot = cues !== current;
      current = cues;
      if (!cues) return;
      for (const [id, character] of actors) character.root.visible = cues.some((c) => c.who === id);
      for (const cue of cues) {
        const character = actor(cue.who);
        const spot = place(cue, t);
        if (isNewShot) {
          // Cut, do not glide, to the opening mark of a new shot.
          character.root.visible = true;
          character.root.position.set(spot.x, 0, spot.z);
          character.root.rotation.y = spot.yaw;
          character.setStatus(cue.status ?? 'idle', cue.carrying ?? null, false);
          if (ROLES[cue.who].intern) character.setOutfit(cue.pajamas === true);
        }
        character.moveTo(spot.x, spot.z, spot.yaw);
        character.update(dt);
      }
    },
  };
}
