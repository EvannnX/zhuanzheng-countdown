import { describe, expect, test } from 'vitest';
import { ASSIST_REWARD, DAY_KPI_TARGET, DAY_SECONDS, EVENT_SECONDS, INTRO_SECONDS, MAX_WARNINGS, OKR_PENALTY, OKR_REWARD, SEAT_ENERGY, STALL_STORY_SECONDS, SUMMARY_SECONDS, TASK_SLOTS, TOTAL_DAYS } from '../shared/constants.ts';
import { STATIONS, stationById } from '../shared/world.ts';
import { getPrompts } from '../server/sim/prompts.ts';
import { buildSnapshots } from '../server/sim/snapshot.ts';
import { arrive } from '../server/sim/commute.ts';
import { settleRanking } from '../server/sim/rivalry.ts';
import { countTowardsGoal, settleGoal } from '../server/sim/teamwork.ts';
import { addPlayer, createGame, patchPlayer } from '../server/sim/state.ts';
import type { GameState, Npc } from '../server/sim/state.ts';
import { applyCommand, ranking, step } from '../server/sim/step.ts';

const DT = 0.05;

function startedGame(names: string[] = ['甲', '乙']): GameState {
  const lobby = names.reduce((s, name, i) => addPlayer(s, `p${i + 1}`, name), createGame('1234', 7));
  const morning = applyCommand({ ...lobby, introShown: true }, 'p1', { t: 'start' });
  // Skip the commute: everyone clocks in, then scores and events are cleared so tests control them.
  const atWork = Object.keys(morning.players).reduce((s, id) => arrive(s, id), morning);
  const clean = Object.keys(atWork.players).reduce((s, id) => patchPlayer(s, id, { kpi: 0, energy: 70 }), atWork);
  return { ...clean, eventQueue: [], outbox: [] };
}

function run(s: GameState, seconds: number): GameState {
  let state = s;
  for (let t = 0; t < seconds; t += DT) state = step(state, DT);
  return state;
}

const at = (s: GameState, pid: string, stationId: string): GameState => {
  const st = stationById(stationId);
  if (!st) throw new Error(`no station ${stationId}`);
  return patchPlayer(s, pid, { x: st.x, z: st.z });
};

const parkNpcs = (s: GameState, patch: Partial<Npc> = {}): GameState => ({
  ...s,
  npcs: s.npcs.map((n) => ({ ...n, x: 45, z: 16, path: [], waitUntil: 1e9, ...patch })),
});

const withTask = (s: GameState, pid: string, defId: string, dest: string | null): GameState =>
  patchPlayer(s, pid, { tasks: [{ uid: 'tx', defId, step: 0, dest }] });

describe('game flow', () => {
  test('only the host can start, and starting hands every player a full task list', () => {
    const lobby = addPlayer(addPlayer(createGame('1234', 1), 'p1', '甲'), 'p2', '乙');
    expect(applyCommand(lobby, 'p2', { t: 'start' }).phase).toBe('lobby');
    const film = applyCommand(lobby, 'p1', { t: 'start' });
    expect(film.phase).toBe('intro');
    expect(film.players.p2.stage).not.toBe('home');
    const s = run(film, INTRO_SECONDS + 1);
    expect(s.phase).toBe('day');
    expect(s.day).toBe(1);
    expect(s.players.p2.stage).toBe('home');
    expect(arrive(s, 'p2').players.p2.tasks).toHaveLength(TASK_SLOTS);
  });

  test('the opening film plays once per room, and the ranking tracks KPI earned today', () => {
    const lobby = addPlayer(addPlayer(createGame('1234', 1), 'p1', '甲'), 'p2', '乙');
    const film = applyCommand(lobby, 'p1', { t: 'start' });
    const again = applyCommand({ ...film, phase: 'lobby' }, 'p1', { t: 'start' });
    expect(again.phase).toBe('day');
    const earned = patchPlayer(again, 'p2', { kpi: 25, dayStartKpi: 10 });
    expect(ranking(earned)[0]).toMatchObject({ id: 'p2', kpi: 25, today: 15 });
  });

  test('days roll into a summary and the last day ends in the final ranking', () => {
    let s = parkNpcs(startedGame());
    s = run(s, DAY_SECONDS + 1);
    expect(s.phase).toBe('summary');
    s = run(s, SUMMARY_SECONDS + 1);
    expect(s.phase).toBe('day');
    expect(s.day).toBe(2);
    s = { ...s, day: TOTAL_DAYS, eventQueue: [], phaseEndsAt: s.time + DAY_SECONDS };
    s = run(parkNpcs(s), DAY_SECONDS + 1);
    expect(s.phase).toBe('final');
  });

  test('ranking promotes the top third and never a fired player', () => {
    const base = startedGame(['甲', '乙', '丙']);
    const scored = patchPlayer(patchPlayer(base, 'p1', { kpi: 50, fired: true }), 'p2', { kpi: 30 });
    const rows = ranking({ ...scored, phase: 'final' });
    expect(rows.map((r) => r.id)).toEqual(['p2', 'p3', 'p1']);
    expect(rows.filter((r) => r.promoted).map((r) => r.id)).toEqual(['p2']);
  });

  test('snapshots are personalised', () => {
    const snaps = buildSnapshots(startedGame());
    expect(snaps.get('p1')?.you.id).toBe('p1');
    expect(snaps.get('p2')?.you.deskId).toBe('desk1');
  });
});

describe('tasks', () => {
  /** Fetch the parcel, sign it in at the print room: now it can be delivered. */
  const parcelReady = (s0: GameState): GameState => {
    let s = run(applyCommand(at(s0, 'p1', 'locker'), 'p1', { t: 'act', act: 'work', target: 'locker' }), 2.2);
    s = run(applyCommand(at(s, 'p1', 'invoice'), 'p1', { t: 'act', act: 'work', target: 'invoice' }), 2.2);
    return s;
  };

  test('a job runs through its stages before the delivery pays and refills the list', () => {
    let s = parkNpcs(withTask(startedGame(), 'p1', 'parcel', 'bossdesk'));
    s = run(applyCommand(at(s, 'p1', 'locker'), 'p1', { t: 'act', act: 'work', target: 'locker' }), 2.2);
    expect(s.players.p1.carrying?.kind).toBe('parcel');
    // Not signed in yet: the director will not take it.
    expect(getPrompts(at(s, 'p1', 'bossdesk'), at(s, 'p1', 'bossdesk').players.p1).some((q) => q.act === 'deliver')).toBe(false);

    s = run(applyCommand(at(s, 'p1', 'invoice'), 'p1', { t: 'act', act: 'work', target: 'invoice' }), 2.2);
    s = applyCommand(at(s, 'p1', 'bossdesk'), 'p1', { t: 'act', act: 'deliver', target: 'bossdesk' });

    expect(s.players.p1.kpi).toBe(14);
    expect(s.players.p1.carrying).toBeNull();
    expect(s.players.p1.tasks.some((t) => t.uid === 'tx')).toBe(false);
    expect(s.okr.done).toBe(1);
  });

  test('a minigame stage only advances when the minigame is won', () => {
    let s = parkNpcs(withTask(startedGame(), 'p1', 'weekly', null));
    s = applyCommand(s, 'p1', { t: 'act', act: 'work', target: 'desk0' });
    expect(s.players.p1.busy?.kind).toBe('minigame');
    const lost = applyCommand(run(s, 2), 'p1', { t: 'mg', ok: false });
    expect(lost.players.p1.tasks[0].step).toBe(0);
    let won = applyCommand(run(s, 2), 'p1', { t: 'mg', ok: true });
    expect(won.players.p1.tasks[0].step).toBe(1);
    won = run(applyCommand(at(won, 'p1', 'server'), 'p1', { t: 'act', act: 'work', target: 'server' }), 2.8);
    expect(won.players.p1.kpi).toBe(16);
  });

  test('acts that are not on offer are ignored', () => {
    const s = startedGame();
    expect(applyCommand(s, 'p1', { t: 'act', act: 'tamper', target: 'perfpc' })).toBe(s);
  });

  test('stealing moves the item, resets the victim task, and the thief gets the KPI', () => {
    let s = parcelReady(parkNpcs(withTask(startedGame(), 'p1', 'parcel', 'bossdesk')));
    const victim = s.players.p1;
    s = patchPlayer(s, 'p2', { x: victim.x - 1, z: victim.z, yaw: Math.PI / 2 });
    expect(getPrompts(s, s.players.p2).some((p) => p.act === 'steal')).toBe(true);
    s = run(applyCommand(s, 'p2', { t: 'act', act: 'steal', target: 'p1' }), 1.4);
    expect(s.players.p2.carrying?.kind).toBe('parcel');
    expect(s.players.p1.tasks[0].step).toBe(0);
    s = applyCommand(at(s, 'p2', 'bossdesk'), 'p2', { t: 'act', act: 'deliver', target: 'bossdesk' });
    expect(s.players.p2.kpi).toBe(14);
    expect(s.players.p1.kpi).toBe(0);
  });
});

describe('commute and monitors', () => {
  test('a seat on the train restores energy and can only hold one rider', () => {
    let s = applyCommand({ ...addPlayer(addPlayer(createGame('1234', 3), 'p1', '甲'), 'p2', '乙'), introShown: true }, 'p1', { t: 'start' });
    for (const id of ['p1', 'p2']) s = patchPlayer(at(s, id, 'seat0'), id, { stage: 'train', cohort: 'train:0', rideEndsAt: s.time + 10, seat: null, energy: 40 });
    s = applyCommand(s, 'p1', { t: 'act', act: 'seat', target: 'seat0' });
    expect(s.players.p1.energy).toBe(40 + SEAT_ENERGY);
    expect(getPrompts(s, s.players.p2).find((q) => q.act === 'seat')?.disabled).toBe(true);
  });

  test('a sacked intern starts the next day at work and can write up a slacker', () => {
    let s = parkNpcs(patchPlayer(startedGame(), 'p2', { fired: true }));
    s = run(applyCommand(s, 'p1', { t: 'act', act: 'phone', target: '' }), 0.3);
    const p1 = s.players.p1;
    s = patchPlayer(s, 'p2', { x: p1.x - 1, z: p1.z, yaw: Math.PI / 2 });
    s = applyCommand(s, 'p2', { t: 'act', act: 'catch', target: 'p1' });
    expect(s.players.p1.warnings).toBe(1);
  });
});

describe('face to face and restroom', () => {
  test('a signature is only on offer next to the director himself, not at his desk', () => {
    const base = parkNpcs(patchPlayer(startedGame(), 'p1', { tasks: [{ uid: 'tx', defId: 'print', step: 2, dest: 'bossdesk' }] }));
    const atDesk = at(base, 'p1', 'bossdesk');
    expect(getPrompts(atDesk, atDesk.players.p1).some((q) => q.act === 'work')).toBe(false);

    const boss = base.npcs.find((n) => n.id === 'boss');
    const beside = patchPlayer(base, 'p1', { x: (boss?.x ?? 0) - 1, z: boss?.z ?? 0 });
    const offer = getPrompts(beside, beside.players.p1).find((q) => q.act === 'work');
    expect(offer?.target).toBe('npc:boss');

    const signing = applyCommand(beside, 'p1', { t: 'act', act: 'work', target: 'npc:boss' });
    const signed = applyCommand(run(signing, 2), 'p1', { t: 'mg', ok: true });
    expect(signed.players.p1.tasks[0].step).toBe(3);
  });

  test('hiding in a stall long enough tells one story a day', () => {
    let s = parkNpcs(startedGame());
    s = run(applyCommand(at(s, 'p1', 'stall0'), 'p1', { t: 'act', act: 'stall', target: 'stall0' }), STALL_STORY_SECONDS + 0.5);
    expect(s.players.p1.stallStoryDay).toBe(s.day);
    expect(s.outbox.filter((o) => o.to === 'p1').length).toBeGreaterThan(0);
  });
});

describe('day length', () => {
  test('the day ends as soon as somebody earns the daily KPI target', () => {
    const s = parkNpcs(startedGame());
    const ended = run(patchPlayer(s, 'p1', { kpi: s.players.p1.dayStartKpi + DAY_KPI_TARGET }), 0.2);
    expect(ended.phase).toBe('summary');
  });
});

describe('teamwork', () => {
  const lifting = (): GameState => {
    const s = parkNpcs(withTask(startedGame(), 'p1', 'paper', 'printer'));
    return applyCommand(at(s, 'p1', 'locker'), 'p1', { t: 'act', act: 'work', target: 'locker' });
  };

  test('a two-person lift waits until a colleague lends a hand', () => {
    const alone = run(lifting(), 6);

    expect(alone.players.p1.carrying).toBeNull();
    expect(alone.players.p1.busy?.kind).toBe('hold');
  });

  test('helping finishes the lift and pays the helper', () => {
    let s = run(lifting(), 1);
    s = at(s, 'p2', 'locker');
    expect(getPrompts(s, s.players.p2).some((q) => q.act === 'assist')).toBe(true);

    s = run(applyCommand(s, 'p2', { t: 'act', act: 'assist', target: 'locker' }), 4.4);

    expect(s.players.p1.carrying?.kind).toBe('parcel');
    expect(s.players.p2.busy).toBeNull();
    expect(s.players.p2.kpi).toBe(ASSIST_REWARD);
  });

  test('a helper is let go when the lifter walks away', () => {
    let s = run(applyCommand(at(run(lifting(), 1), 'p2', 'locker'), 'p2', { t: 'act', act: 'assist', target: 'locker' }), 0.5);
    s = run(applyCommand(s, 'p1', { t: 'cancel' }), 0.2);
    expect(s.players.p2.busy).toBeNull();
  });

  test('reaching the department goal pays everyone, missing it docks everyone', () => {
    const base = startedGame();
    const nearly = { ...base, okr: { done: base.okr.goal - 1, goal: base.okr.goal } };
    const reached = countTowardsGoal(nearly);
    expect(reached.players.p1.kpi).toBe(OKR_REWARD);
    expect(reached.players.p2.kpi).toBe(OKR_REWARD);

    const missed = settleGoal(patchPlayer(patchPlayer(nearly, 'p1', { kpi: 20 }), 'p2', { kpi: 20 }));
    expect(missed.players.p1.kpi).toBe(20 - OKR_PENALTY);
  });

  test('new kinds of work unlock as the days go by', () => {
    const day1 = startedGame();
    const offered = new Set(Object.values(day1.players).flatMap((p) => p.tasks.map((t) => t.defId)));
    expect([...offered].some((id) => ['invoice', 'minutes', 'deploy', 'paper'].includes(id))).toBe(false);
  });
});

describe('slacking', () => {
  const facingPlayer = (s: GameState): GameState => {
    const p = s.players.p1;
    // Parked NPCs keep scanning left and right, so stand within close-sight range.
    return parkNpcs(s, { x: p.x, z: p.z + 1.2, yaw: Math.PI });
  };

  test('slacking restores energy when nobody is watching', () => {
    let s = parkNpcs(startedGame());
    const before = s.players.p1.energy;
    s = run(applyCommand(s, 'p1', { t: 'act', act: 'phone', target: '' }), 3);
    expect(s.players.p1.energy).toBeGreaterThan(before + 10);
    expect(s.players.p1.warnings).toBe(0);
  });

  test('slacking in front of the boss earns a warning', () => {
    let s = facingPlayer(startedGame());
    s = run(applyCommand(s, 'p1', { t: 'act', act: 'phone', target: '' }), 1.5);
    expect(s.players.p1.warnings).toBe(1);
    expect(s.players.p1.busy).toBeNull();
  });

  test('a wall between boss and player hides the slacking', () => {
    let s = startedGame();
    s = parkNpcs(s, { x: s.players.p1.x, z: 15.5, yaw: Math.PI });
    s = patchPlayer(s, 'p1', { z: 13 });
    s = run(applyCommand(s, 'p1', { t: 'act', act: 'phone', target: '' }), 1.5);
    expect(s.players.p1.warnings).toBe(0);
  });

  test('a fake screen absorbs one catch at your own desk', () => {
    let s = facingPlayer(patchPlayer(startedGame(), 'p1', { fakeScreens: 1 }));
    s = run(applyCommand(s, 'p1', { t: 'act', act: 'sleep', target: 'desk0' }), 1.5);
    expect(s.players.p1.warnings).toBe(0);
    expect(s.players.p1.fakeScreens).toBe(0);
  });

  test('the third warning fires the player', () => {
    let s = facingPlayer(patchPlayer(startedGame(), 'p1', { warnings: MAX_WARNINGS - 1 }));
    s = run(applyCommand(s, 'p1', { t: 'act', act: 'phone', target: '' }), 1.5);
    expect(s.players.p1.fired).toBe(true);
    expect(getPrompts(s, s.players.p1).some((p) => p.act === 'summon')).toBe(true);
  });

  test('reporting a slacker rewards the reporter; a false report costs KPI', () => {
    let s = parkNpcs(startedGame());
    const target = s.players.p2;
    s = patchPlayer(s, 'p1', { x: target.x - 3, z: target.z, yaw: Math.PI / 2, kpi: 10 });
    const falseReport = applyCommand(s, 'p1', { t: 'act', act: 'report', target: 'p2' });
    expect(falseReport.players.p1.kpi).toBe(4);
    s = applyCommand(s, 'p2', { t: 'act', act: 'phone', target: '' });
    s = applyCommand(s, 'p1', { t: 'act', act: 'report', target: 'p2' });
    expect(s.players.p1.kpi).toBe(16);
    expect(s.players.p2.warnings).toBe(1);
  });
});

describe('events', () => {
  test('skipping the meeting earns a warning, attending pays', () => {
    let s = parkNpcs(startedGame());
    s = { ...s, eventQueue: [{ at: s.time, type: 'meeting' }] };
    s = patchPlayer(s, 'p1', { x: 25, z: 11 });
    s = run(s, EVENT_SECONDS.meeting + 0.5);
    expect(s.event).toBeNull();
    expect(s.players.p1.kpi).toBeGreaterThan(0);
    expect(s.players.p2.warnings).toBe(1);
  });

  test('three repairs end a server outage early', () => {
    let s = parkNpcs(startedGame());
    s = at({ ...s, eventQueue: [{ at: s.time, type: 'serverDown' }] }, 'p1', 'server');
    s = run(s, 0.1);
    for (let i = 0; i < 3; i++) s = run(applyCommand(s, 'p1', { t: 'act', act: 'repair', target: 'server' }), 3.2);
    expect(s.event).toBeNull();
    expect(s.players.p1.kpi).toBeGreaterThan(0);
  });
});

describe('morning rush', () => {
  const morning = (names: string[] = ['甲', '乙']): GameState => {
    const lobby = names.reduce((s, name, i) => addPlayer(s, `p${i + 1}`, name), createGame('1234', 7));
    return { ...applyCommand({ ...lobby, introShown: true }, 'p1', { t: 'start' }), eventQueue: [] };
  };

  test('only one flatmate can use a wash stand at a time', () => {
    let s = at(at(morning(), 'p1', 'wash0'), 'p2', 'wash0');
    s = applyCommand(s, 'p1', { t: 'act', act: 'wash', target: 'wash0' });
    expect(getPrompts(s, s.players.p2).find((p) => p.act === 'wash')?.disabled).toBe(true);
    s = run(s, 3.2);
    expect(s.players.p1.washed).toBe(true);
  });

  test('breakfast runs out', () => {
    let s = at(at(morning(['甲', '乙', '丙']), 'p1', 'fridge'), 'p2', 'fridge');
    s = { ...s, breakfastLeft: 1 };
    s = run(applyCommand(s, 'p1', { t: 'act', act: 'breakfast', target: 'fridge' }), 2.2);
    expect(s.players.p1.ate).toBe(true);
    expect(getPrompts(s, s.players.p2).find((p) => p.act === 'breakfast')?.disabled).toBe(true);
  });

  test('leaving home, the street and the platform lead to work; pajamas cost KPI', () => {
    let s = applyCommand(at(morning(), 'p1', 'homedoor'), 'p1', { t: 'act', act: 'exit', target: 'homedoor' });
    expect(s.players.p1.stage).toBe('street');
    s = applyCommand(at(s, 'p1', 'gate'), 'p1', { t: 'act', act: 'enter', target: 'gate' });
    expect(s.players.p1.stage).toBe('subway');
    s = at({ ...s, time: 16 * 100 + 4 }, 'p1', 'traindoor0');
    s = applyCommand(patchPlayer(s, 'p1', { kpi: 20 }), 'p1', { t: 'act', act: 'board', target: 'traindoor0' });
    expect(s.players.p1.stage).toBe('train');
    s = arrive(s, 'p1');
    expect(s.players.p1.stage).toBe('work');
    expect(s.players.p1.tasks).toHaveLength(TASK_SLOTS);
    expect(s.players.p1.kpi).toBeLessThan(20);
  });

  test('boarding does not shut the doors on the next intern', () => {
    let s = at(at({ ...morning(), time: 16 * 100 + 4 }, 'p1', 'traindoor0'), 'p2', 'traindoor0');
    s = applyCommand(s, 'p1', { t: 'act', act: 'board', target: 'traindoor0' });
    expect(getPrompts(s, s.players.p2).find((p) => p.act === 'board')?.disabled).toBe(false);
  });

  test('standing in traffic knocks you back to the kerb', () => {
    let s = patchPlayer(morning(), 'p1', { stage: 'street', x: 116, z: 611.5 });
    s = run(s, 4);
    expect(s.players.p1.z).toBeLessThan(610);
    expect(s.outbox.some((o) => o.text.includes('撞飞'))).toBe(true);
  });
});

describe('being chased', () => {
  test('a spotted slacker is chased; outrunning the boss pays, standing still does not', () => {
    let s = parkNpcs(startedGame());
    const p = s.players.p1;
    s = { ...s, npcs: s.npcs.map((n) => (n.id === 'boss' ? { ...n, x: p.x + 7, z: p.z + 0.6, yaw: -Math.PI / 2, path: [{ x: p.x + 0.5, z: p.z + 0.6 }] } : n)) };
    s = applyCommand(s, 'p1', { t: 'act', act: 'phone', target: '' });
    // The boss is walking straight at the intern, so he keeps them in view.
    s = run(s, 1.2);
    expect(s.npcs.find((n) => n.id === 'boss')?.chase?.targetId).toBe('p1');
    expect(s.players.p1.warnings).toBe(0);
    const caught = run(s, 6);
    expect(caught.players.p1.warnings).toBe(1);
    const fled = run(patchPlayer(s, 'p1', { x: 45, z: 16 }), 9);
    expect(fled.players.p1.warnings).toBe(0);
    expect(fled.players.p1.kpi).toBeGreaterThan(0);
  });
});

describe('intern versus intern', () => {
  const sideBySide = (): GameState => {
    const s = parkNpcs(startedGame());
    return patchPlayer(patchPlayer(s, 'p1', { x: 8.8, z: 13, yaw: Math.PI / 2 }), 'p2', { x: 10, z: 13 });
  };

  test('a shove sends the other intern flying, interrupts them and goes on cooldown', () => {
    let s = applyCommand(sideBySide(), 'p2', { t: 'act', act: 'phone', target: '' });
    s = applyCommand(s, 'p1', { t: 'act', act: 'shove', target: 'p2' });
    expect(s.players.p2.x).toBeGreaterThan(11.5);
    expect(s.players.p2.busy?.kind === 'hold' && s.players.p2.busy.act).toBe('stun');
    expect(getPrompts(s, s.players.p1).find((p) => p.act === 'shove')?.disabled ?? true).toBe(true);
  });

  test('a shove never pushes someone through a wall', () => {
    let s = parkNpcs(startedGame());
    s = patchPlayer(patchPlayer(s, 'p1', { x: 10, z: 12.6, yaw: 0 }), 'p2', { x: 10, z: 13.4 });
    s = applyCommand(s, 'p1', { t: 'act', act: 'shove', target: 'p2' });
    expect(s.players.p2.z).toBeLessThan(14);
  });

  test('a banana peel trips the next intern, not its owner, and makes them drop their parcel', () => {
    let s = patchPlayer(sideBySide(), 'p1', { bananas: 1 });
    s = run(applyCommand(s, 'p1', { t: 'act', act: 'banana', target: '' }), 0.3);
    expect(s.traps).toHaveLength(1);
    s = patchPlayer(s, 'p2', { x: 8.8, z: 13, carrying: { kind: 'parcel', dest: 'bossdesk', kpi: 11, taskUid: null } });
    s = run(s, 0.2);
    expect(s.traps).toHaveLength(0);
    expect(s.players.p2.carrying).toBeNull();
    expect(s.players.p2.busy?.kind).toBe('hold');
  });

  test('jumping carries an intern over a banana peel', () => {
    let s = patchPlayer(sideBySide(), 'p1', { bananas: 1 });
    s = run(applyCommand(s, 'p1', { t: 'act', act: 'banana', target: '' }), 0.3);
    const peel = s.traps[0];

    s = run(applyCommand(s, 'p2', { t: 'move', x: peel.x, z: peel.z, yaw: 0, air: true }), 0.2);

    expect(s.traps).toHaveLength(1);
    expect(s.players.p2.busy).toBeNull();
  });

  test('the street no longer offers shared bikes', () => {
    expect(STATIONS.some((st) => st.id === 'bikes')).toBe(false);
  });

  test('the day ends with a bonus for the top earner and a warning for the last', () => {
    const s = settleRanking(patchPlayer(patchPlayer(startedGame(), 'p1', { kpi: 40 }), 'p2', { kpi: 10 }));
    expect(s.players.p1.kpi).toBeGreaterThan(40);
    expect(s.players.p2.warnings).toBe(1);
  });
});
