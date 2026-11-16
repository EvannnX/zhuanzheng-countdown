const SENSITIVITY = 0.0022;
const MAX_PITCH = 1.35;

export interface Input {
  /** Camera yaw/pitch in three.js terms (yaw 0 looks down -z). */
  readonly look: { yaw: number; pitch: number };
  isDown(code: string): boolean;
  isLocked(): boolean;
  /** -1..1 on each axis from WASD / arrow keys. */
  axes(): { forward: number; right: number };
}

export function createInput(canvas: HTMLCanvasElement, onKey: (key: string) => void): Input {
  const down = new Set<string>();
  const look = { yaw: 0, pitch: 0 };
  const isLocked = (): boolean => document.pointerLockElement === canvas;

  canvas.addEventListener('click', () => {
    if (isLocked()) return;
    canvas.requestPointerLock()?.catch?.((err: unknown) => console.warn('Pointer lock refused', err));
  });
  document.addEventListener('mousemove', (event) => {
    if (!isLocked()) return;
    look.yaw -= event.movementX * SENSITIVITY;
    look.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, look.pitch - event.movementY * SENSITIVITY));
  });
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.code === 'Tab' || event.code === 'Backspace') event.preventDefault();
    if (!event.repeat) onKey(event.code);
    down.add(event.code);
  });
  window.addEventListener('keyup', (event) => down.delete(event.code));
  window.addEventListener('blur', () => down.clear());

  const axis = (plus: string[], minus: string[]): number =>
    Number(plus.some((c) => down.has(c))) - Number(minus.some((c) => down.has(c)));

  return {
    look,
    isDown: (code) => down.has(code),
    isLocked,
    axes: () => ({
      forward: axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']),
      right: axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']),
    }),
  };
}
