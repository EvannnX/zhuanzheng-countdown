import { describe, expect, test } from 'vitest';
import { PLAYER_RADIUS } from '../shared/constants.ts';
import { angleDiff, inCone, resolveCircle, segmentHitsRect } from '../shared/geometry.ts';
import { findPath, isWalkable } from '../shared/nav.ts';
import { parseClientMsg } from '../shared/protocol.ts';
import { COLLIDERS, DRILL_POINTS, MEETING_POINTS, NPC_START, PATROL, STATIONS, WAREHOUSE_BOSS_START, WAREHOUSE_PATROL, roomAt } from '../shared/world.ts';

describe('geometry', () => {
  const wall = { x0: 0, x1: 10, z0: 4.9, z1: 5.1 };

  test('segment crossing a wall is blocked', () => {
    expect(segmentHitsRect({ x: 5, z: 0 }, { x: 5, z: 10 }, wall)).toBe(true);
  });

  test('segment beside a wall is clear', () => {
    expect(segmentHitsRect({ x: 12, z: 0 }, { x: 12, z: 10 }, wall)).toBe(false);
  });

  test('angleDiff wraps across ±π', () => {
    expect(angleDiff(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(-0.2);
  });

  test('inCone accepts targets ahead and rejects targets behind', () => {
    const origin = { x: 0, z: 0 };
    expect(inCone(origin, 0, { x: 0, z: 5 }, 9, 0.6)).toBe(true);
    expect(inCone(origin, 0, { x: 0, z: -5 }, 9, 0.6)).toBe(false);
  });

  test('resolveCircle pushes a player out of a wall', () => {
    const out = resolveCircle({ x: 5, z: 5.2 }, PLAYER_RADIUS, [wall]);
    expect(out.z).toBeGreaterThanOrEqual(5.1 + PLAYER_RADIUS - 1e-6);
  });
});

describe('world', () => {
  test('every station standing spot is inside a room and not inside furniture', () => {
    for (const st of STATIONS) {
      expect(roomAt(st), st.id).not.toBeNull();
      const pushed = resolveCircle(st, 0.2, COLLIDERS);
      expect(Math.hypot(pushed.x - st.x, pushed.z - st.z), st.id).toBeLessThan(0.01);
    }
  });

  test('every patrol point is walkable and reachable from the boss start', () => {
    const points = [...PATROL.boss, ...PATROL.hr, ...PATROL.cleaner, ...MEETING_POINTS, ...DRILL_POINTS];
    for (const w of WAREHOUSE_PATROL) expect(findPath(WAREHOUSE_BOSS_START, w).length, `warehouse ${w.x},${w.z}`).toBeGreaterThan(0);
    for (const p of points) {
      expect(isWalkable(p), `${p.x},${p.z}`).toBe(true);
      expect(findPath(NPC_START.boss, p).length, `${p.x},${p.z}`).toBeGreaterThan(0);
    }
  });

  test('a path into another room ends at the goal', () => {
    const goal = { x: 5, z: 22 };
    const path = findPath({ x: 35, z: 6.5 }, goal);
    const last = path[path.length - 1];
    expect(Math.hypot(last.x - goal.x, last.z - goal.z)).toBeLessThan(0.6);
  });
});

describe('parseClientMsg', () => {
  test('accepts a well-formed move', () => {
    expect(parseClientMsg('{"t":"move","x":1,"z":2,"yaw":0}')).toEqual({ t: 'move', x: 1, z: 2, yaw: 0, air: false });
  });

  test('rejects garbage, unknown acts and bad room codes', () => {
    expect(parseClientMsg('not json')).toBeNull();
    expect(parseClientMsg('{"t":"move","x":"1","z":2,"yaw":0}')).toBeNull();
    expect(parseClientMsg('{"t":"act","act":"cheat","target":"x"}')).toBeNull();
    expect(parseClientMsg('{"t":"join","name":"a","code":"12ab"}')).toBeNull();
  });

  test('cleans and truncates names', () => {
    const msg = parseClientMsg(JSON.stringify({ t: 'create', name: '  <b>一二三四五六七八九十十一</b> ' }));
    expect(msg).toEqual({ t: 'create', name: 'b一二三四五六七八九' });
  });
});
