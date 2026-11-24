import type * as THREE from 'three';
import { WALL_HEIGHT } from '../../../shared/world.ts';
import { box, glow, group, rbox, shiny, turn } from '../kit.ts';
import { bodegaBag, deliCup, framedPrint, intercom, paperBag, pipeRun, pizzaBox, radiator, steamRiser, wallBike } from '../nycParts.ts';
import { at } from '../parts.ts';
import { hang } from '../shell.ts';
import { subwayMap } from '../texturesNyc.ts';

/** The pre-war walk-up layer over the flat: steam heat, a window AC, the buzzer and the debris of four interns. */

const PIPE = '#b9b3a4';
const WEST_WALL = 0.1;
const INNER_WALL = 0.08;
const PIPE_Y = 2.74;
const PICTURE_RAIL_Y = 2.36;
/** The lower sash of the bunk-room window the AC sits in. */
const AC = { z: 602.2, y: 1.15, bay: 1 };
/** Where the living-room coffee table stands and how high its top is. */
const COFFEE_TABLE = { x: 2.4, z: 608, top: 0.42 };

function steamHeat(): THREE.Object3D[] {
  const run = pipeRun(12.6, 0.035, PIPE, WALL_HEIGHT - PIPE_Y - 0.06);
  run.position.set(6.55, PIPE_Y, 604.8);
  return [
    at(WEST_WALL + 0.1, 603.1, Math.PI / 2, radiator(14)),
    at(5.2, 604.6 + INNER_WALL + 0.1, 0, radiator(12)),
    at(0.2, 601.5, 0, steamRiser(WALL_HEIGHT - 0.02)),
    at(0.22, 604.8, 0, steamRiser(WALL_HEIGHT - 0.02)),
    run,
    // branch down to the living-room radiator
    box(0.05, PIPE_Y - 0.2, 0.05, PIPE, 5.75, (PIPE_Y + 0.2) / 2, 604.76),
  ];
}

/** Window unit wedged under the lower sash, with its accordion side panels. */
function windowAc(): THREE.Object3D[] {
  const side = (AC.bay - 0.52) / 2;
  return [
    rbox(0.62, 0.38, 0.5, '#e7e2d6', -0.14, AC.y, AC.z, 0.02),
    box(0.012, 0.3, 0.44, '#cfc9bb', 0.176, AC.y + 0.01, AC.z),
    ...[-0.1, -0.04, 0.02, 0.08].map((dy) => box(0.016, 0.012, 0.4, '#a8a294', 0.178, AC.y + dy, AC.z - 0.01)),
    box(0.016, 0.03, 0.06, glow('#34d399'), 0.178, AC.y + 0.14, AC.z + 0.16),
    ...[-1, 1].map((s) => box(0.02, 0.4, side, '#efe9dc', 0.02, AC.y + 0.01, AC.z + s * (0.26 + side / 2))),
    box(0.04, 0.02, 0.5, shiny('#9ca3af'), -0.44, AC.y - 0.2, AC.z),
  ];
}

/** Timber picture rail round the living room, the way every pre-war flat has one. */
const pictureRail = (): THREE.Object3D[] => [
  box(0.03, 0.05, 5.2, '#efe9dc', 16 - 0.115, PICTURE_RAIL_Y, 609.3),
  box(15.8, 0.05, 0.03, '#efe9dc', 8, PICTURE_RAIL_Y, 612 - 0.115),
];

function clutter(): THREE.Object3D[] {
  return [
    hang(intercom(), 's', 612, 6.95, 1.42, 0.1),
    hang(wallBike('#d9482b'), 'n', 604.6, 11.85, 1.55, INNER_WALL),
    hang(framedPrint(subwayMap(), 0.7, 0.88), 's', 612, 8.75, 1.8, 0.1),
    // (the coffee-table builder is shared with the office, so the pizza on it is dressing placed here)
    at(COFFEE_TABLE.x, COFFEE_TABLE.z, 0, group(0.02, COFFEE_TABLE.top + 0.012, -0.02, turn(pizzaBox(true), 0.2)), group(-0.16, COFFEE_TABLE.top, -0.44, deliCup())),
    // last night's pizza by the bin, groceries dropped inside the door, mail on the mat
    at(15.5, 610.55, 0.2, pizzaBox(), group(0.02, 0.046, 0.01, pizzaBox()), group(-0.01, 0.092, 0.02, pizzaBox())),
    at(6.95, 611.68, 0.3, bodegaBag()),
    at(7.22, 611.55, -0.5, bodegaBag()),
    at(5.05, 611.25, 0.4, paperBag()),
    at(6.1, 611.5, 0.2, box(0.22, 0.004, 0.11, '#f8fafc', 0, 0.026, 0), box(0.2, 0.004, 0.1, '#fde68a', 0.05, 0.03, 0.04), box(0.24, 0.004, 0.16, '#dc2626', -0.08, 0.034, -0.06)),
  ];
}

export function homeNyc(): THREE.Object3D[] {
  return [...steamHeat(), ...windowAc(), ...pictureRail(), ...clutter()];
}
