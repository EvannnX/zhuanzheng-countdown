import type * as THREE from 'three';
import { WALL_HEIGHT } from '../../../shared/world.ts';
import { box, group, turn } from '../kit.ts';
import { linearPendant, spiralDuct, sprinklerLine } from '../loftParts.ts';
import { masonry, tiledBox } from '../masonry.ts';
import { framedPrint, neonSign } from '../nycParts.ts';
import { hang } from '../shell.ts';
import { cabArt, skylinePrint, subwayMap } from '../texturesNyc.ts';

/** The converted-loft layer over the office floor: exposed services under the slab, brick piers, beams and New York wall art. */

const CONCRETE = '#b9b5ab';
const STONE = '#cfc6b4';
const PENDANT_Y = 2.56;
const PENDANT_DROP = WALL_HEIGHT - PENDANT_Y - 0.08;
const DUCT_Y = 2.6;
const BEAM_DEPTH = 0.14;
/** Structural bays of the open office: a brick pier on the window wall and a beam running south from it. */
const BAY_XS = [5.25, 9.85, 14.25];
const PIER = { width: 0.5, depth: 0.16 };

const alongZ = <T extends THREE.Object3D>(o: T): T => turn(o, Math.PI / 2);

function pendantRow(z: number, xs: readonly number[], length: number): THREE.Object3D[] {
  return xs.map((x) => group(x, PENDANT_Y, z, linearPendant(length, PENDANT_DROP)));
}

function openOffice(): THREE.Object3D[] {
  const structure = BAY_XS.flatMap((x) => [
    tiledBox(PIER.width, WALL_HEIGHT - 0.04, PIER.depth, masonry('brownBrick'), x, (WALL_HEIGHT - 0.04) / 2, 0.1 + PIER.depth / 2),
    box(PIER.width + 0.06, 0.12, PIER.depth + 0.04, STONE, x, 0.06, 0.1 + PIER.depth / 2),
    box(0.3, BEAM_DEPTH, 13.7, CONCRETE, x, WALL_HEIGHT - 0.02 - BEAM_DEPTH / 2, 7),
    box(0.36, 0.2, 0.16, CONCRETE, x, WALL_HEIGHT - 0.26, 13.82),
  ]);
  return [
    ...structure,
    group(10, DUCT_Y, 7, spiralDuct(19, 0.2, WALL_HEIGHT - DUCT_Y - 0.14)),
    ...[4.2, 13].map((x) => alongZ(group(x, DUCT_Y + 0.06, 7, spiralDuct(11, 0.12, WALL_HEIGHT - DUCT_Y - 0.14)))),
    ...[4.3, 9.6].map((z) => group(10, 2.88, z, sprinklerLine(19.4))),
    ...[0.95, 4.75, 9, 13.05].flatMap((z) => pendantRow(z, [2.6, 6.6, 11.4, 16.4], 2.4)),
    hang(neonSign('HUSTLE\n搬砖不止', '#ff4fa3', 1.8, 0.9), 'w', 0, 6.75, 1.8, 0.1),
  ];
}

function corridor(): THREE.Object3D[] {
  return [
    group(20, 2.8, 14.5, spiralDuct(38.6, 0.13, 0.08)),
    group(20, 2.9, 16.6, sprinklerLine(39)),
    ...pendantRow(15.5, [4, 10, 16, 24, 30, 36], 2),
    hang(framedPrint(subwayMap(), 1, 1.25), 'n', 14, 13.3, 1.75, 0.1),
  ];
}

function pantry(): THREE.Object3D[] {
  return [
    alongZ(group(4.6, 2.68, 22.5, spiralDuct(10, 0.15, 0.2))),
    ...[20, 25.2].map((z) => alongZ(group(2.9, PENDANT_Y, z, linearPendant(2, PENDANT_DROP)))),
    hang(neonSign('COFFEE\n续命水', '#ffb02e', 1.5, 0.8), 'n', 17, 7, 2.05, 0.1),
  ];
}

function printRoom(): THREE.Object3D[] {
  return [
    alongZ(group(11.6, 2.68, 22.5, spiralDuct(10, 0.15, 0.2))),
    ...[20, 24.6].map((z) => alongZ(group(13.6, PENDANT_Y, z, linearPendant(2.2, PENDANT_DROP)))),
    alongZ(group(15.4, 2.9, 22.5, sprinklerLine(10.4))),
  ];
}

function wallArt(): THREE.Object3D[] {
  return [
    hang(framedPrint(cabArt(), 1.5, 1.05), 'w', 20, 10.5, 1.95, 0.1),
    hang(framedPrint(skylinePrint(), 1.9, 0.95, '#3b2a20'), 's', 14, 32, 1.85, 0.1),
    hang(framedPrint(cabArt(), 1.6, 1.12), 'e', 40, 22.9, 1.75, 0.1),
    hang(framedPrint(skylinePrint(), 1.8, 0.9), 'n', 17, 16.2, 1.85, 0.1),
  ];
}

export function officeLoft(): THREE.Object3D[] {
  return [...openOffice(), ...corridor(), ...pantry(), ...printRoom(), ...wallArt()];
}
