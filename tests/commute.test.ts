import { describe, expect, test } from 'vitest';
import { COMMUTE_SECONDS, HOLD_SECONDS, LIFT_CAPACITY, LIFT_RIDE_SECONDS, RIDE_SECONDS, VAN_DETOUR_SECONDS, VAN_MAX_DETOURS, VAN_TRIP_SECONDS, VAN_WAIT_SECONDS } from '../shared/constants.ts';
import { AVENUE, CROSSWALK, LANES, LIFT, SIGNAL, TRAIN, laneHit, liftAt, liftCarAt, liftDoorsClose, signalAt, trainDoorsClose, vehiclesAt } from '../shared/hazards.ts';
import { LOBBY_GATE_Z, PLATFORM_EDGE_Z, TOWER_DOOR, TOWER_FACADE_Z, TRAIN_DOOR_XS, areaAt, stationById } from '../shared/world.ts';
import { getPrompts } from '../server/sim/prompts.ts';
import { buildSnapshots } from '../server/sim/snapshot.ts';
import { addPlayer, createGame, patchPlayer } from '../server/sim/state.ts';
import type { GameState, Player } from '../server/sim/state.ts';
import { applyCommand, startDay, step } from '../server/sim/step.ts';

const DT = 0.05;
const NAMES = ['甲', '乙', '丙', '丁', '戊'];

/** A fresh morning on `day` with the room clock rewound to 0, so trains and lifts are easy to time. */
function morning(players = 2, day = 1): GameState {
  const lobby = NAMES.slice(0, players).reduce((s, name, i) => addPlayer(s, `p${i + 1}`, name), createGame('1234', 7));
  const started = applyCommand({ ...lobby, introShown: true }, 'p1', { t: 'start' });
  return { ...(day === 1 ? started : startDay(started, day)), eventQueue: [], outbox: [] };
}

function run(s: GameState, seconds: number): GameState {
  let state = s;
  for (let t = 0; t < seconds; t += DT) state = step(state, DT);
  return state;
}

const runUntil = (s: GameState, time: number): GameState => run(s, Math.max(0, time - s.time));
const put = (s: GameState, pid: string, patch: Partial<Player>): GameState => patchPlayer(s, pid, { movedAt: s.time, ...patch });
const at = (s: GameState, pid: string, stationId: string, patch: Partial<Player> = {}): GameState => {
  const st = stationById(stationId);
  if (!st) throw new Error(`no station ${stationId}`);
  return put(s, pid, { x: st.x, z: st.z, ...patch });
};
const act = (s: GameState, pid: string, kind: Parameters<typeof applyCommand>[2] & { t: 'act' }): GameState => applyCommand(s, pid, kind);
const press = (s: GameState, pid: string, name: string, target: string): GameState => act(s, pid, { t: 'act', act: name as never, target });
const heard = (s: GameState, text: string): boolean => s.outbox.some((o) => o.text.includes(text));
const ids = (s: GameState): string[] => Object.keys(s.players);
const everyone = (s: GameState, fn: (acc: GameState, id: string) => GameState): GameState => ids(s).reduce(fn, s);

/** Swipe until the turnstile gives in (it is allowed to fail). */
function badgeIn(s0: GameState, pid: string): GameState {
  let s = at(s0, pid, 'badge1', { stage: 'lobby' });
  for (let i = 0; i < 20 && !s.players[pid].badged; i++) s = run(press(s, pid, 'badge', 'badge1'), HOLD_SECONDS.badge + 0.1);
  return s;
}

/** Wait for the next lift that has room, at the right door, and step in. */
function rideLift(s0: GameState, pid: string, down = false): GameState {
  let s = s0;
  for (let i = 0; i < 2000 && s.players[pid].stage !== 'lift'; i++) {
    const target = down ? 'lift12' : `lift${liftAt(s.time).door}`;
    s = step(press(at(s, pid, target), pid, 'lift', target), DT);
  }
  return s;
}

describe('train cohorts', () => {
  test('riders who board during the same stop share one arrival, however early or late they stepped in', () => {
    let s = morning(2);
    s = press(at({ ...s, time: TRAIN.arrive + 0.5 }, 'p1', 'traindoor1', { stage: 'subway' }), 'p1', 'board', 'traindoor1');
    s = runUntil(s, TRAIN.open - 0.5);
    s = press(at(s, 'p2', 'traindoor0', { stage: 'subway' }), 'p2', 'board', 'traindoor0');

    expect(s.players.p1.cohort).toBe(s.players.p2.cohort);
    const arrival = trainDoorsClose(0) + RIDE_SECONDS;
    s = runUntil(s, arrival - 0.3);
    expect([s.players.p1.stage, s.players.p2.stage]).toEqual(['train', 'train']);
    s = runUntil(s, arrival + 0.2);
    expect([s.players.p1.stage, s.players.p2.stage]).toEqual(['plaza', 'plaza']);
    expect(s.players.p1.cohort).toBeNull();
  });

  test('a train has emptied before the next one opens its doors', () => {
    expect(TRAIN.open + RIDE_SECONDS).toBeLessThanOrEqual(TRAIN.period + TRAIN.arrive);
  });

  test('riders of different trains never see each other and do not compete for seats', () => {
    let s = morning(3);
    s = at(s, 'p1', 'seat0', { stage: 'train', cohort: 'train:1', rideEndsAt: 1e9 });
    s = at(s, 'p2', 'seat0', { stage: 'train', cohort: 'train:1', rideEndsAt: 1e9 });
    s = at(s, 'p3', 'seat0', { stage: 'train', cohort: 'train:2', rideEndsAt: 1e9 });
    s = press(s, 'p1', 'seat', 'seat0');

    const seen = (pid: string): string[] => (buildSnapshots(s).get(pid)?.players ?? []).map((p) => p.id).sort();
    expect(seen('p1')).toEqual(['p1', 'p2']);
    expect(seen('p3')).toEqual(['p3']);
    expect(getPrompts(s, s.players.p2).find((q) => q.act === 'seat')?.disabled).toBe(true);
    expect(getPrompts(s, s.players.p3).find((q) => q.act === 'seat')?.disabled).toBe(false);
    expect(getPrompts(s, s.players.p3).some((q) => q.act === 'shove')).toBe(false);
  });
});

describe('walking onto the train', () => {
  const atEdge = (s: GameState, x: number): GameState => put(s, 'p1', { stage: 'subway', x, z: PLATFORM_EDGE_Z - 0.45 });

  test('standing in an open doorway boards without pressing anything', () => {
    const s = step(atEdge({ ...morning(1), time: TRAIN.arrive + 1 }, TRAIN_DOOR_XS[1] + 0.4), DT);
    expect(s.players.p1.stage).toBe('train');
    expect(areaAt(s.players.p1)).toBe('train');
  });

  test('closed doors and the wall between doors let nobody in', () => {
    const closed = step(atEdge({ ...morning(1), time: TRAIN.open + 0.5 }, TRAIN_DOOR_XS[1]), DT);
    const betweenDoors = step(atEdge({ ...morning(1), time: TRAIN.arrive + 1 }, (TRAIN_DOOR_XS[0] + TRAIN_DOOR_XS[1]) / 2), DT);
    expect(closed.players.p1.stage).toBe('subway');
    expect(betweenDoors.players.p1.stage).toBe('subway');
  });
});

describe('the avenue', () => {
  test('traffic waiting at the red light leaves the crossing clear in every lane', () => {
    const lanes = LANES.filter((l) => l.area === 'plaza');
    expect(lanes.length).toBeGreaterThanOrEqual(4);
    for (const cycle of [0, 1, 7]) {
      const t = cycle * SIGNAL.period + SIGNAL.go + 1;
      expect(signalAt(t).walk).toBe(true);
      for (const l of lanes) {
        const blocked = vehiclesAt(l, t).some((x) => x + l.length / 2 > CROSSWALK.x0 && x - l.length / 2 < CROSSWALK.x1);
        expect(blocked, `${l.id} cycle ${cycle}`).toBe(false);
        expect(vehiclesAt(l, t)).toEqual(vehiclesAt(l, t + 3));
      }
    }
  });

  test('jaywalking on a green light for cars throws you back to the far sidewalk', () => {
    const lane = LANES.find((l) => l.id === 'ave2') as (typeof LANES)[number];
    const t = 3;
    const x = vehiclesAt(lane, t)[0];
    expect(laneHit('plaza', x, lane.z, t)).not.toBeNull();
    const s = step(put({ ...morning(1), time: t - DT }, 'p1', { stage: 'plaza', x: Math.min(529, Math.max(501, x)), z: lane.z }), DT);
    if (laneHit('plaza', s.players.p1.x, lane.z, t)) expect(s.players.p1.z).toBeLessThan(AVENUE.z0);
  });
});

describe('tower lobby', () => {
  test('walking through the revolving door starts the lobby stage', () => {
    const outside = step(put(morning(1), 'p1', { stage: 'plaza', x: 515, z: TOWER_FACADE_Z - 1 }), DT);
    const inside = step(put(outside, 'p1', { x: (TOWER_DOOR.from + TOWER_DOOR.to) / 2, z: TOWER_FACADE_Z + 0.8 }), DT);
    expect(outside.players.p1.stage).toBe('plaza');
    expect(inside.players.p1.stage).toBe('lobby');
  });

  test('the guard sends back anyone who walks past the turnstiles without swiping', () => {
    const sneaking = step(put(morning(1), 'p1', { stage: 'lobby', x: 512.6, z: LOBBY_GATE_Z + 1.5 }), DT);
    const badged = step(put(morning(1), 'p1', { stage: 'lobby', badged: true, x: 512.6, z: LOBBY_GATE_Z + 1.5 }), DT);
    expect(sneaking.players.p1.z).toBeLessThan(LOBBY_GATE_Z);
    expect(heard(sneaking, '保安')).toBe(true);
    expect(badged.players.p1.z).toBeGreaterThan(LOBBY_GATE_Z);
  });

  test('a badge swipe sometimes fails and has to be repeated, but always works in the end', () => {
    const outcomes = Array.from({ length: 30 }, (_, seed) => {
      const s = run(press(at({ ...morning(1), seed }, 'p1', 'badge1', { stage: 'lobby' }), 'p1', 'badge', 'badge1'), HOLD_SECONDS.badge + 0.1);
      return { ok: s.players.p1.badged, refused: heard(s, '再刷一次') };
    });
    expect(outcomes.some((o) => o.ok)).toBe(true);
    expect(outcomes.some((o) => !o.ok && o.refused)).toBe(true);
    expect(outcomes.every((o) => o.ok !== o.refused)).toBe(true);
    expect(badgeIn(morning(1), 'p1').players.p1.badged).toBe(true);
  });

  test('the lifts are closed to anyone who has not swiped', () => {
    const s = at({ ...morning(1), time: LIFT.arrive + 1 }, 'p1', 'lift0', { stage: 'lobby' });
    expect(getPrompts(s, s.players.p1).find((q) => q.act === 'lift')?.disabled).toBe(true);
  });
});

describe('lifts', () => {
  const waiting = (players: number, time: number): GameState => everyone({ ...morning(players), time }, (acc, id) => at(acc, id, `lift${liftAt(time).door}`, { stage: 'lobby', badged: true }));

  test('a lift takes a limited number of people; the rest wait for the next one', () => {
    let s = waiting(5, LIFT.arrive + 0.5);
    for (const id of ids(s)) s = press(s, id, 'lift', 'lift0');

    const aboard = ids(s).filter((id) => s.players[id].stage === 'lift');
    expect(aboard).toHaveLength(LIFT_CAPACITY);
    const left = s.players.p5;
    expect(left.stage).toBe('lobby');
    expect(getPrompts(s, left).find((q) => q.act === 'lift')?.label).toContain('满员');
    expect(rideLift(s, 'p5').players.p5.cohort).not.toBe(s.players.p1.cohort);
  });

  test('everyone in the same lift reaches their desk at the same moment', () => {
    let s = waiting(2, LIFT.arrive + 0.2);
    s = press(s, 'p1', 'lift', 'lift0');
    s = press(runUntil(s, LIFT.open - 0.3), 'p2', 'lift', 'lift0');
    const arrival = liftDoorsClose(0) + LIFT_RIDE_SECONDS;

    s = runUntil(s, arrival - 0.3);
    expect([s.players.p1.stage, s.players.p2.stage]).toEqual(['lift', 'lift']);
    expect(areaAt(s.players.p1)).toBe('lift');
    s = runUntil(s, arrival + 0.2);
    expect([s.players.p1.stage, s.players.p2.stage]).toEqual(['work', 'work']);
    expect(heard(s, '第一个到公司')).toBe(true);
  });

  test('a closed lift, or the wrong door, cannot be entered; the prompt says which floor it is stuck on', () => {
    const closed = waiting(1, LIFT.open + 1);
    const wrongDoor = at(waiting(1, LIFT.arrive + 0.5), 'p1', 'lift1');
    expect(getPrompts(closed, closed.players.p1).find((q) => q.act === 'lift')).toMatchObject({ disabled: true, label: expect.stringContaining('楼') });
    expect(getPrompts(wrongDoor, wrongDoor.players.p1).find((q) => q.act === 'lift')?.disabled).toBe(true);
    expect(press(closed, 'p1', 'lift', `lift${liftAt(closed.time).door}`).players.p1.stage).toBe('lobby');
  });

  test('when the director jumps the queue only one intern fits', () => {
    const time = 2 * LIFT.period + LIFT.arrive + 0.5;
    let s = waiting(2, time);
    for (const id of ids(s)) s = press(s, id, 'lift', `lift${liftAt(time).door}`);
    expect(ids(s).filter((id) => s.players[id].stage === 'lift')).toEqual(['p1']);
    expect(getPrompts(s, s.players.p2).find((q) => q.act === 'lift')?.label).toContain('插队');
  });

  test('one lift has gone before the next opens, and the car stops on the way with a crowd outside', () => {
    expect(LIFT.open + LIFT_RIDE_SECONDS).toBeLessThanOrEqual(LIFT.period + LIFT.arrive);
    const ride = Array.from({ length: 70 }, (_, i) => liftCarAt(LIFT.open + (i * LIFT_RIDE_SECONDS) / 70, LIFT_RIDE_SECONDS));
    const floors = ride.map((r) => r.floor);
    expect(floors[0]).toBe(1);
    expect(Math.max(...floors)).toBeGreaterThanOrEqual(LIFT.floors - 1);
    expect(floors.every((f, i) => i === 0 || f >= floors[i - 1])).toBe(true);
    expect(ride.some((r) => r.crowd && r.doorsOpen)).toBe(true);
    expect(liftCarAt(LIFT.open - LIFT.period / 2 + 0.1, LIFT_RIDE_SECONDS, true).floor).toBe(LIFT.floors);
  });

  test('riders overhear small talk on the way up', () => {
    let s = waiting(1, LIFT.arrive + 0.5);
    s = runUntil(press(s, 'p1', 'lift', 'lift0'), liftDoorsClose(0) + LIFT_RIDE_SECONDS - 0.2);
    expect(s.players.p1.rideTalks).toBe(2);
  });
});

/** Take a lone intern from the platform to the 12th floor by the book. */
function soloToTwelfth(s0: GameState): GameState {
  let s = put(runUntil(s0, s0.time + 0.1), 'p1', { stage: 'subway', x: TRAIN_DOOR_XS[1], z: PLATFORM_EDGE_Z - 0.45 });
  for (let i = 0; i < 1000 && s.players.p1.stage === 'subway'; i++) s = step(s, DT);
  s = runUntil(s, s.players.p1.rideEndsAt + 0.1);
  expect(s.players.p1.stage).toBe('plaza');
  s = step(put(s, 'p1', { x: 515, z: TOWER_FACADE_Z + 1 }), DT);
  expect(s.players.p1.stage).toBe('lobby');
  s = rideLift(badgeIn(s, 'p1'), 'p1');
  return runUntil(s, s.players.p1.rideEndsAt + 0.1);
}

describe('whole journeys', () => {
  test('a solo intern gets from the platform to a desk on an office day', () => {
    const s = soloToTwelfth(morning(1));
    expect(s.players.p1.stage).toBe('work');
    expect(areaAt(s.players.p1)).toBe('office');
    expect(s.players.p1.tasks.length).toBeGreaterThan(0);
  });

  test('on an away day a solo intern clocks in upstairs, collects the slip, rides down and drives the van to the warehouse', () => {
    let s = soloToTwelfth(morning(1, 2));
    expect(s.site).toBe('warehouse');
    expect(s.players.p1).toMatchObject({ stage: 'dispatch', clockedIn: true });
    expect(areaAt(s.players.p1)).toBe('office');
    expect(getPrompts(at(s, 'p1', 'lift12'), at(s, 'p1', 'lift12').players.p1).find((q) => q.act === 'lift')?.disabled).toBe(true);

    s = run(press(at(s, 'p1', 'bossdesk'), 'p1', 'slip', 'bossdesk'), HOLD_SECONDS.slip + 0.1);
    expect(s.players.p1.hasSlip).toBe(true);
    s = rideLift(s, 'p1', true);
    expect(s.players.p1.liftDown).toBe(true);
    s = runUntil(s, s.players.p1.rideEndsAt + 0.1);
    expect(s.players.p1.stage).toBe('depart');
    expect(areaAt(s.players.p1)).toBe('plaza');

    s = step(press(at(s, 'p1', 'shuttle'), 'p1', 'drive', 'shuttle'), DT);
    expect(s.players.p1.stage).toBe('van');
    expect(areaAt(s.players.p1)).toBe('van');
    // Alone, the van does not wait for anyone.
    expect(s.players.p1.busy).toMatchObject({ kind: 'minigame', game: 'drive' });
    s = run(s, VAN_TRIP_SECONDS + 0.5);
    expect(s.players.p1.stage).toBe('work');
    expect(areaAt(s.players.p1)).toBe('warehouse');
    expect(s.vans).toHaveLength(0);
  });

  test('lateness is judged on reaching the office, not the warehouse', () => {
    let s = soloToTwelfth(morning(1, 2));
    const before = s.players.p1.kpi;
    s = at({ ...s, time: s.dayStartedAt + COMMUTE_SECONDS + 60, outbox: [] }, 'p1', 'shuttle', { stage: 'depart', hasSlip: true });
    s = run(press(s, 'p1', 'drive', 'shuttle'), VAN_TRIP_SECONDS + 1);
    expect(s.players.p1.stage).toBe('work');
    expect(heard(s, '迟到')).toBe(false);
    expect(s.players.p1.kpi).toBeGreaterThanOrEqual(before);
  });

  test('the morning alarm no longer gives the away day away, and office stations stay shut until work starts', () => {
    const s = startDay(morning(1), 2);
    expect(heard(s, '外派')).toBe(false);
    const upstairs = at(s, 'p1', 'perfpc', { stage: 'dispatch' });
    expect(getPrompts(upstairs, upstairs.players.p1).some((q) => q.act === 'tamper' || q.act === 'phone')).toBe(false);
  });
});

describe('the shuttle', () => {
  const kerb = (players: number): GameState => everyone(morning(players, 2), (acc, id) => at(acc, id, 'shuttle', { stage: 'depart', clockedIn: true, hasSlip: true }));

  test('the first aboard drives, the others ride, and everyone arrives together', () => {
    let s = press(kerb(3), 'p1', 'drive', 'shuttle');
    expect(getPrompts(s, s.players.p2).find((q) => q.target === 'shuttle')?.act).toBe('ride');
    s = press(s, 'p2', 'ride', 'shuttle');
    expect(s.players.p2.cohort).toBe(s.players.p1.cohort);
    expect(s.players.p2.seat).not.toBe(s.players.p1.seat);

    // p3 dawdles: the van leaves when the wait is up and a fresh one can be boarded.
    s = run(s, VAN_WAIT_SECONDS + 0.2);
    expect(s.players.p1.busy).toMatchObject({ kind: 'minigame', game: 'drive' });
    expect(s.players.p2.busy).toBeNull();
    expect(getPrompts(s, s.players.p3).find((q) => q.target === 'shuttle')?.act).toBe('drive');
    s = press(s, 'p3', 'drive', 'shuttle');
    expect(buildSnapshots(s).get('p3')?.players.map((p) => p.id)).toEqual(['p3']);

    s = run(s, VAN_TRIP_SECONDS - 1);
    expect([s.players.p1.stage, s.players.p2.stage]).toEqual(['van', 'van']);
    s = run(s, 1.2);
    expect([s.players.p1.stage, s.players.p2.stage]).toEqual(['work', 'work']);
    expect(s.players.p3.stage).toBe('van');
    expect(run(s, VAN_WAIT_SECONDS + VAN_TRIP_SECONDS).players.p3.stage).toBe('work');
  });

  test('good driving shortens the trip for the whole van, wrong turns lengthen it but only so many times', () => {
    const rolling = run(press(press(kerb(2), 'p1', 'drive', 'shuttle'), 'p2', 'ride', 'shuttle'), 2);
    const base = rolling.vans[0].arrivesAt;

    const quick = applyCommand(rolling, 'p1', { t: 'mg', ok: true });
    expect(quick.vans[0].arrivesAt).toBeLessThan(base);
    expect(heard(quick, '近路')).toBe(true);

    let lost = rolling;
    for (let i = 0; i < VAN_MAX_DETOURS + 2; i++) lost = run(applyCommand(lost, 'p1', { t: 'mg', ok: false }), 0.1);
    expect(lost.vans[0].arrivesAt).toBeCloseTo(base + VAN_MAX_DETOURS * VAN_DETOUR_SECONDS, 5);
    expect(heard(lost, '司机走错路了')).toBe(true);
    expect(lost.players.p1.busy).toBeNull();
    expect(runUntil(lost, lost.vans[0].arrivesAt + 0.2).players.p2.stage).toBe('work');
  });

  test('on office days the shuttle offers nothing', () => {
    const s = at(morning(1), 'p1', 'shuttle', { stage: 'plaza' });
    expect(getPrompts(s, s.players.p1).some((q) => q.target === 'shuttle')).toBe(false);
  });
});
