import * as THREE from 'three';
import { LANES, trainAt, vehiclesAt } from '../../shared/hazards.ts';
import type { Lane } from '../../shared/hazards.ts';
import { TRAIN_DOOR_XS } from '../../shared/world.ts';
import { box, cyl, glass, glow, group, pick, rbox, shiny, turn } from './kit.ts';

const CAR_COLORS = ['#ef4444', '#f8fafc', '#1d4ed8', '#111827', '#facc15', '#22c55e', '#94a3b8'];
const TRAIN_Z = 607.9;
const TRAIN_X = 214;
const CAR_LENGTH = 6.2;
const DOOR_SLIDE = 0.55;
const STAINLESS = '#c5cad0';
const ROUTE_COLOR = '#b933ad';

const wheel = (x: number, z: number, r: number): THREE.Mesh => turn(cyl(r, r, 0.22, '#111827', x, r, z, 14), 0, Math.PI / 2);

/** All vehicle models face +x. */
function car(color: string): THREE.Group {
  return group(
    0, 0, 0,
    rbox(4.2, 0.62, 1.8, shiny(color), 0, 0.62, 0, 0.14),
    rbox(2.3, 0.56, 1.6, shiny(color), -0.25, 1.16, 0, 0.16),
    box(2.2, 0.4, 1.62, glass('#0f172a', 0.75), -0.25, 1.18, 0),
    ...[-1.35, 1.35].flatMap((x) => [wheel(x, 0.82, 0.34), wheel(x, -0.82, 0.34)]),
    ...[-0.6, 0.6].map((z) => box(0.06, 0.16, 0.36, glow('#fff7d6'), 2.1, 0.68, z)),
    ...[-0.6, 0.6].map((z) => box(0.06, 0.14, 0.36, glow('#ef4444'), -2.1, 0.7, z)),
  );
}

function bus(): THREE.Group {
  return group(
    0, 0, 0,
    rbox(9, 2.5, 2.4, shiny('#16a34a'), 0, 1.6, 0, 0.16),
    box(8.4, 0.9, 2.42, glass('#0f172a', 0.7), 0, 2.05, 0),
    box(9.02, 0.3, 2.42, '#f8fafc', 0, 1.05, 0),
    ...[-3, 3].flatMap((x) => [wheel(x, 1.1, 0.48), wheel(x, -1.1, 0.48)]),
    box(0.06, 0.3, 1.6, glow('#fbbf24'), 4.5, 2.65, 0),
    ...[-0.8, 0.8].map((z) => box(0.06, 0.2, 0.4, glow('#fff7d6'), 4.5, 0.8, z)),
  );
}

function forklift(): THREE.Group {
  return group(
    0, 0, 0,
    rbox(1.5, 0.7, 1.1, shiny('#f59e0b'), -0.3, 0.6, 0, 0.08),
    rbox(0.5, 0.5, 1.12, '#374151', -0.85, 0.75, 0, 0.06),
    ...[-0.5, 0.5].map((z) => box(0.06, 1.3, 0.06, shiny('#374151'), 0.25, 1.55, z)),
    ...[-0.5, 0.5].map((z) => box(0.06, 1.3, 0.06, shiny('#374151'), -0.75, 1.55, z)),
    box(1.1, 0.06, 1.12, shiny('#374151'), -0.25, 2.2, 0),
    ...[-0.3, 0.3].map((z) => box(0.1, 2.1, 0.1, shiny('#1f2937'), 0.55, 1.15, z)),
    ...[-0.3, 0.3].map((z) => box(1, 0.05, 0.12, shiny('#9ca3af'), 1.05, 0.28, z)),
    rbox(0.9, 0.6, 0.9, '#c99657', 1.1, 0.62, 0, 0.012),
    wheel(0.2, 0.55, 0.28), wheel(0.2, -0.55, 0.28), wheel(-0.8, 0.5, 0.22), wheel(-0.8, -0.5, 0.22),
    cyl(0.08, 0.08, 0.12, glow('#f97316'), -0.25, 2.3, 0, 10),
    rbox(0.3, 0.5, 0.4, '#1d4ed8', -0.3, 1.2, 0, 0.08),
  );
}

function model(lane: Lane, k: number): THREE.Group {
  const body = lane.kind === 'bus' ? bus() : lane.kind === 'forklift' ? forklift() : car(pick(CAR_COLORS, k * 3 + lane.z));
  body.rotation.y = lane.dir === 1 ? 0 : Math.PI;
  body.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return body;
}

/** Stainless-steel car with corrugated flanks, in the style of a New York subway train. */
function metroCar(): THREE.Group {
  const side = -1.356;
  return group(
    0, 0, 0,
    rbox(CAR_LENGTH - 0.12, 2.5, 2.7, shiny(STAINLESS), 0, 1.55, 0, 0.1),
    ...[0.5, 0.62, 0.74, 0.86, 0.98].map((y) => box(CAR_LENGTH - 0.3, 0.025, 0.012, '#8e959c', 0, y, side)),
    box(CAR_LENGTH - 1.2, 0.75, 2.72, glass('#0f172a', 0.72), 0, 1.85, 0),
    box(1, 0.16, 0.012, glow('#ff8a1f'), -CAR_LENGTH / 4, 2.48, side),
    box(0.5, 0.3, 0.012, '#1d4ed8', CAR_LENGTH / 2 - 0.6, 1.25, side),
    box(CAR_LENGTH - 0.4, 0.3, 2.2, '#26282b', 0, 0.15, 0),
    box(0.1, 2.2, 2.3, '#1b1c1e', CAR_LENGTH / 2 - 0.02, 1.5, 0),
  );
}

/** The cab end: black mask, route bullet and headlights. */
function cabFront(x: number): THREE.Object3D[] {
  return [
    box(0.08, 2.3, 2.6, '#101113', x, 1.6, 0),
    box(0.02, 0.8, 1, glass('#1e293b', 0.8), x + 0.045, 2, 0.6),
    turn(cyl(0.2, 0.2, 0.03, glow(ROUTE_COLOR), x + 0.05, 2.1, -0.75, 18), 0, 0, Math.PI / 2),
    ...[-0.9, 0.9].flatMap((z) => [box(0.03, 0.12, 0.2, glow('#fff7d6'), x + 0.05, 0.85, z), box(0.03, 0.08, 0.12, glow('#ef4444'), x + 0.05, 0.68, z)]),
  ];
}

export interface Traffic {
  readonly root: THREE.Group;
  /** Move everything to where it is at room time `t`. */
  update(t: number): void;
}

export function makeTraffic(): Traffic {
  const fleets = LANES.map((lane) => ({ lane, bodies: Array.from({ length: lane.count }, (_, k) => model(lane, k)) }));
  for (const fleet of fleets) for (const body of fleet.bodies) body.position.z = fleet.lane.z;

  const doors = TRAIN_DOOR_XS.flatMap((x) => [-1, 1].map((side) => ({ side, home: x - TRAIN_X + side * 0.32, mesh: group(x - TRAIN_X + side * 0.32, 1.25, -1.38, box(0.62, 1.9, 0.06, shiny('#aeb4ba')), box(0.36, 0.7, 0.07, glass('#0f172a', 0.75), 0, 0.35, 0)) })));
  const train = group(TRAIN_X, 0, TRAIN_Z, ...[-1, 0, 1].map((i) => group(i * CAR_LENGTH, 0, 0, metroCar())), ...doors.map((d) => d.mesh), ...cabFront(CAR_LENGTH * 1.5 - 0.04));

  return {
    root: group(0, 0, 0, ...fleets.flatMap((f) => f.bodies), train),
    update(t) {
      for (const { lane, bodies } of fleets) {
        vehiclesAt(lane, t).forEach((x, k) => {
          bodies[k].position.x = x;
        });
      }
      const state = trainAt(t);
      train.visible = state.visible;
      train.position.x = TRAIN_X + state.offset;
      for (const d of doors) d.mesh.position.x = d.home + (state.doorsOpen ? d.side * DOOR_SLIDE : 0);
    },
  };
}
