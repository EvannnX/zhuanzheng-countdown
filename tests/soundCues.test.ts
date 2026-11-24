import { describe, expect, test } from 'vitest';
import { cuesCrossed, strideAfter, vehicleProximity, STEP_METRES } from '../client/soundCues.ts';
import { LANES, vehiclesAt } from '../shared/hazards.ts';

describe('vehicleProximity', () => {
  const fork = LANES.find((l) => l.kind === 'forklift')!;

  test('is 1 when standing on a forklift', () => {
    const t = 12.5;
    const x = vehiclesAt(fork, t)[0]!;

    expect(vehicleProximity('warehouse', ['forklift'], { x, z: fork.z }, t, 6)).toBeCloseTo(1);
  });

  test('falls off with distance', () => {
    const t = 3;
    const x = vehiclesAt(fork, t)[0]!;

    const near = vehicleProximity('warehouse', ['forklift'], { x, z: fork.z - 2 }, t, 6);
    const far = vehicleProximity('warehouse', ['forklift'], { x, z: fork.z - 200 }, t, 6);

    expect(near).toBeGreaterThan(far);
    expect(far).toBeLessThan(0.01);
  });

  test('is 0 when the place has no such vehicle', () => {
    expect(vehicleProximity('office', ['forklift'], { x: 0, z: 0 }, 1, 6)).toBe(0);
    expect(vehicleProximity('warehouse', ['car', 'bus'], { x: 320, z: 605 }, 1, 6)).toBe(0);
  });
});

describe('cuesCrossed', () => {
  const cues = [
    { at: 2, sound: 'a' },
    { at: 15, sound: 'b' },
  ] as const;

  test('fires a cue when the clock passes it', () => {
    expect(cuesCrossed(cues, 16, 1.99, 2.01)).toEqual(['a']);
    expect(cuesCrossed(cues, 16, 16 * 7 + 14.99, 16 * 7 + 15)).toEqual(['b']);
  });

  test('fires nothing between cues', () => {
    expect(cuesCrossed(cues, 16, 2.01, 2.05)).toEqual([]);
  });

  test('ignores clock jumps and a clock running backwards', () => {
    expect(cuesCrossed(cues, 16, 0, 40)).toEqual([]);
    expect(cuesCrossed(cues, 16, 3, 1)).toEqual([]);
  });
});

describe('strideAfter', () => {
  test('steps once enough ground is covered and carries the remainder', () => {
    const first = strideAfter(0, STEP_METRES * 0.6);
    const second = strideAfter(first.carried, STEP_METRES * 0.6);

    expect(first.hasStepped).toBe(false);
    expect(second.hasStepped).toBe(true);
    expect(second.carried).toBeCloseTo(STEP_METRES * 0.2);
  });

  test('treats a teleport as standing still', () => {
    expect(strideAfter(0.5, 80)).toEqual({ carried: 0, hasStepped: false });
  });
});
