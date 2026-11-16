import { TASK_SLOTS } from '../../shared/constants.ts';
import { ITEM_NAMES, TASKS, taskDef } from '../../shared/tasks.ts';
import type { StepDef, TaskDef } from '../../shared/tasks.ts';
import { stationById, stationOfType } from '../../shared/world.ts';
import type { Station } from '../../shared/world.ts';
import { ownDeskId, patchPlayer, roll } from './state.ts';
import type { GameState, Player, TaskInstance } from './state.ts';

export const currentStep = (task: TaskInstance): StepDef | null => taskDef(task.defId)?.steps[task.step] ?? null;

/** The concrete station the task currently points at. */
export function taskTarget(p: Player, task: TaskInstance): string | null {
  const step = currentStep(task);
  if (!step) return task.dest;
  if (step.station === 'desk') return ownDeskId(p);
  return stationOfType(step.station)?.id ?? null;
}

export function taskText(task: TaskInstance): string {
  const def = taskDef(task.defId);
  const step = currentStep(task);
  if (step) return step.text;
  const item = def?.steps.find((s) => s.gives)?.gives;
  const dest = task.dest ? stationById(task.dest)?.label : '';
  return `把${item ? ITEM_NAMES[item] : '东西'}送到${dest}`;
}

/** The task (if any) whose current step can be done at this station. */
export function workAt(p: Player, station: Station): { task: TaskInstance; def: TaskDef; step: StepDef } | null {
  for (const task of p.tasks) {
    const def = taskDef(task.defId);
    const step = currentStep(task);
    if (def && step && taskTarget(p, task) === station.id) return { task, def, step };
  }
  return null;
}

export function addTask(s: GameState, playerId: string): GameState {
  const p = s.players[playerId];
  if (!p || p.fired || p.tasks.length >= TASK_SLOTS) return s;
  const fresh = TASKS.filter((d) => (d.site ?? 'office') === s.site && !p.tasks.some((t) => t.defId === d.id));
  if (fresh.length === 0) return s;
  const [pick, s1] = roll(s);
  const def = fresh[Math.floor(pick * fresh.length)];
  const [destPick, s2] = roll(s1);
  const dest = def.dests ? def.dests[Math.floor(destPick * def.dests.length)] : null;
  const task: TaskInstance = { uid: `t${s2.nextUid}`, defId: def.id, step: 0, dest };
  return patchPlayer({ ...s2, nextUid: s2.nextUid + 1 }, playerId, { tasks: [...p.tasks, task] });
}

export function fillTasks(s: GameState, playerId: string): GameState {
  let next = s;
  for (let i = 0; i < TASK_SLOTS; i++) next = addTask(next, playerId);
  return next;
}

export function replaceTask(s: GameState, playerId: string, uid: string): GameState {
  const p = s.players[playerId];
  if (!p) return s;
  return addTask(patchPlayer(s, playerId, { tasks: p.tasks.filter((t) => t.uid !== uid) }), playerId);
}
