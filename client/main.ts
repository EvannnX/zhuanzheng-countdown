import * as THREE from 'three';
import { EYE_HEIGHT, GRAVITY, JUMP_SPEED, PLAYER_RADIUS, PLAYER_SPEED } from '../shared/constants.ts';
import { resolveCircle } from '../shared/geometry.ts';
import type { PromptKey, ServerMsg, Snapshot } from '../shared/protocol.ts';
import { SHOP } from '../shared/tasks.ts';
import { COLLIDERS, areaAt } from '../shared/world.ts';
import { chime } from './audio.ts';
import { createInput } from './input.ts';
import { createLighting } from './lighting.ts';
import { connect } from './net.ts';
import type { Net } from './net.ts';
import { makeEntities } from './scene/entities.ts';
import { buildExterior, buildSky } from './scene/exterior.ts';
import { makeHands } from './scene/hands.ts';
import { group, mergeStatic } from './scene/kit.ts';
import { buildProps } from './scene/props.ts';
import { buildShell } from './scene/shell.ts';
import { makeTraffic } from './scene/traffic.ts';
import { byId } from './ui/dom.ts';
import { createHud } from './ui/hud.ts';
import { createMinigames } from './ui/minigames.ts';
import { createMinimap } from './ui/minimap.ts';

const SEND_INTERVAL = 1 / 15;
const CANCEL_INTERVAL = 0.3;
const MAX_FRAME_SECONDS = 0.05;
const SEATED_DROP = 0.45;
const MENU_VIEW = { x: 30.5, z: 24.5, yaw: -Math.PI / 4 };
const EXPOSURE = 0.95;

const KEY_TO_PROMPT: Record<string, PromptKey> = { KeyE: 'E', KeyF: 'F', KeyR: 'R', KeyQ: 'Q', KeyG: 'G', KeyX: 'X', KeyC: 'C', KeyV: 'V' };
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

// ---------- scene ----------
const canvas = byId<HTMLCanvasElement>('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = EXPOSURE;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe0f5');
scene.fog = new THREE.Fog('#cfe3ee', 140, 520);
const camera = new THREE.PerspectiveCamera(75, 1, 0.08, 1200);
camera.rotation.order = 'YXZ';

const lighting = createLighting();
const sky = buildSky();
const traffic = makeTraffic();
const props = buildProps();
const entities = makeEntities();
const hands = makeHands();
camera.add(hands.root);
const world = mergeStatic(group(0, 0, 0, ...buildShell(), ...buildExterior(), ...props.statics));
scene.add(camera, ...lighting.objects, world, sky, traffic.root, props.dynamic, entities.root);

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- session state (the client's single mutable cell) ----------
const session = {
  net: null as Net | null,
  snap: null as Snapshot | null,
  pos: { x: MENU_VIEW.x, z: MENU_VIEW.z },
  spawnSeq: -1,
  minigameToken: -1,
  shopOpen: false,
  sendClock: 0,
  cancelClock: 0,
  walking: false,
  /** Height above the floor and vertical speed of the current jump. */
  jump: { y: 0, speed: 0 },
  eye: EYE_HEIGHT,
  /** Offset between the server's room clock and this browser's clock. */
  clockOffset: 0,
};

const roomTime = (): number => performance.now() / 1000 + session.clockOffset;

const hud = createHud();
const minimap = createMinimap();
const minigames = createMinigames();
const input = createInput(canvas, onKey);
input.look.yaw = MENU_VIEW.yaw;

// ---------- input ----------
function startJump(snap: Snapshot): void {
  if (session.jump.y > 0 || snap.you.busy || snap.phase === 'summary' || snap.phase === 'final') return;
  session.jump = { y: 0, speed: JUMP_SPEED };
}

/** Ballistic hop; returns the state for the next frame. */
function stepJump(jump: { y: number; speed: number }, dt: number): { y: number; speed: number } {
  if (jump.y <= 0 && jump.speed <= 0) return jump;
  const y = jump.y + jump.speed * dt;
  return y <= 0 ? { y: 0, speed: 0 } : { y, speed: jump.speed - GRAVITY * dt };
}

function onKey(code: string): void {
  const { snap, net } = session;
  if (!snap || !net) return;
  if (minigames.isOpen()) return minigames.key(code);

  const isHost = snap.hostId === snap.you.id;
  if (code === 'Enter' && isHost && snap.phase === 'lobby') return net.send({ t: 'start' });
  if (code === 'Enter' && isHost && snap.phase === 'final') return net.send({ t: 'restart' });

  if (code === 'Space') return startJump(snap);

  if (session.shopOpen) {
    const item = SHOP[Number(code.replace(/^(Digit|Numpad)/, '')) - 1];
    if (item) return net.send({ t: 'buy', item: item.id });
  }
  if (snap.you.busy) {
    if (MOVE_KEYS.includes(code)) net.send({ t: 'cancel' });
    return;
  }
  const key = KEY_TO_PROMPT[code];
  const prompt = key ? snap.you.prompts.find((p) => p.key === key) : undefined;
  if (!prompt || prompt.disabled) return;
  if (prompt.act === 'shop') {
    session.shopOpen = !session.shopOpen;
    return;
  }
  net.send({ t: 'act', act: prompt.act, target: prompt.target });
}

// ---------- network ----------
function onSnapshot(snap: Snapshot): void {
  session.snap = snap;
  session.clockOffset = snap.time - performance.now() / 1000;
  const { spawn, busy, prompts } = snap.you;
  if (spawn.seq !== session.spawnSeq) {
    session.spawnSeq = spawn.seq;
    session.pos = { x: spawn.x, z: spawn.z };
    input.look.yaw = spawn.yaw - Math.PI;
    input.look.pitch = 0;
  }
  if (busy?.kind === 'minigame' && busy.token !== session.minigameToken) {
    session.minigameToken = busy.token;
    minigames.open(busy.game, (ok) => session.net?.send({ t: 'mg', ok }));
  }
  if (busy?.kind !== 'minigame' && minigames.isOpen()) minigames.abort();
  if (!prompts.some((p) => p.act === 'shop')) session.shopOpen = false;
  entities.sync(snap);
}

function onMessage(msg: ServerMsg): void {
  switch (msg.t) {
    case 'snap':
      return onSnapshot(msg);
    case 'joined':
      byId('menu').hidden = true;
      hud.show();
      history.replaceState(null, '', `?room=${msg.code}`);
      return;
    case 'toast':
      hud.toast(msg.text, msg.tone);
      chime(msg.tone);
      return;
    case 'error':
      return showMenuError(msg.text);
    default:
      return;
  }
}

// ---------- menu ----------
const menu = byId<HTMLFormElement>('menu');
const nameInput = byId<HTMLInputElement>('name');
const codeInput = byId<HTMLInputElement>('code');
const buttons = [byId<HTMLButtonElement>('create'), byId<HTMLButtonElement>('join')];

function showMenuError(text: string): void {
  byId('menu-error').textContent = text;
  for (const b of buttons) b.disabled = false;
  menu.hidden = false;
}

async function enter(mode: 'create' | 'join'): Promise<void> {
  const code = codeInput.value.trim();
  if (mode === 'join' && !/^\d{4}$/.test(code)) return showMenuError('房间号是 4 位数字');
  byId('menu-error').textContent = '';
  for (const b of buttons) b.disabled = true;
  try {
    session.net ??= await connect(onMessage, (reason) => {
      session.net = null;
      session.snap = null;
      showMenuError(reason);
    });
    const name = nameInput.value;
    session.net.send(mode === 'create' ? { t: 'create', name } : { t: 'join', name, code });
  } catch (err) {
    showMenuError(err instanceof Error ? err.message : '连接失败');
  }
}

menu.addEventListener('submit', (event) => {
  event.preventDefault();
  void enter(codeInput.value.trim() ? 'join' : 'create');
});
byId('join').addEventListener('click', () => void enter('join'));
const invited = new URLSearchParams(location.search).get('room');
if (invited && /^\d{4}$/.test(invited)) codeInput.value = invited;

/** `?view=x,z,yawDegrees,pitchDegrees` parks the camera for art review without joining a room. */
function parseView(): { x: number; z: number; yaw: number; pitch: number } | null {
  const raw = new URLSearchParams(location.search).get('view');
  const [x, z, yaw = 0, pitch = 0] = (raw ?? '').split(',').map(Number);
  if (!raw || !Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { x, z, yaw: THREE.MathUtils.degToRad(yaw), pitch: THREE.MathUtils.degToRad(pitch) };
}
const parkedView = parseView();
if (parkedView) menu.hidden = true;

// ---------- frame loop ----------
function moveSelf(snap: Snapshot, dt: number): void {
  const { forward, right } = input.axes();
  const wants = forward !== 0 || right !== 0;
  session.walking = false;
  if (snap.you.busy || minigames.isOpen()) {
    // Any movement key drops what you are doing (the fastest way to look busy).
    session.cancelClock -= dt;
    if (wants && snap.you.busy?.kind !== 'minigame' && session.cancelClock <= 0) {
      session.cancelClock = CANCEL_INTERVAL;
      session.net?.send({ t: 'cancel' });
    }
    return;
  }
  if (!wants) return;
  const length = Math.hypot(forward, right);
  const sin = Math.sin(input.look.yaw);
  const cos = Math.cos(input.look.yaw);
  const stride = (PLAYER_SPEED * snap.you.speedFactor * dt) / length;
  const next = {
    x: session.pos.x + (-sin * forward + cos * right) * stride,
    z: session.pos.z + (-cos * forward - sin * right) * stride,
  };
  session.pos = resolveCircle(next, PLAYER_RADIUS, COLLIDERS);
  session.walking = true;
}

/** The sky travels with the camera and the lighting re-aims at whichever place we are in. */
function followPlace(): void {
  sky.position.set(camera.position.x, 0, camera.position.z);
  lighting.follow(areaAt(session.pos) ?? 'office');
}

function frame(dt: number, time: number): void {
  const snap = session.snap;
  if (!snap && parkedView) {
    session.pos = { x: parkedView.x, z: parkedView.z };
    input.look.yaw = parkedView.yaw;
    input.look.pitch = parkedView.pitch;
  } else if (!snap) {
    input.look.yaw = MENU_VIEW.yaw + Math.sin(time * 0.15) * 0.5;
  } else {
    moveSelf(snap, dt);
    session.jump = stepJump(session.jump, dt);
    session.sendClock -= dt;
    if (session.sendClock <= 0) {
      session.sendClock = SEND_INTERVAL;
      session.net?.send({ t: 'move', x: session.pos.x, z: session.pos.z, yaw: input.look.yaw + Math.PI, air: session.jump.y > 0 });
    }
    const me = snap.players.find((p) => p.id === snap.you.id);
    const busy = snap.you.busy;
    hands.update(dt, session.walking, me?.carrying ?? null, busy);
    props.setServerDown(snap.event?.type === 'serverDown', time);
    hud.update(snap, { showScores: input.isDown('Tab'), shopOpen: session.shopOpen, locked: input.isLocked() });
    minimap.draw(snap, { ...session.pos, yaw: input.look.yaw + Math.PI }, roomTime());
    const seated = busy?.kind === 'slack' && busy.mode !== 'phone';
    const eye = seated ? EYE_HEIGHT - SEATED_DROP : EYE_HEIGHT;
    session.eye += (eye - session.eye) * Math.min(1, dt * 8);
    camera.position.y = session.eye + session.jump.y;
  }
  if (!snap) camera.position.y = EYE_HEIGHT;
  camera.position.x = session.pos.x;
  camera.position.z = session.pos.z;
  camera.rotation.y = input.look.yaw;
  camera.rotation.x = input.look.pitch;
  hands.root.visible = hands.root.visible && snap !== null;
  entities.update(dt, time);
  traffic.update(roomTime());
  followPlace();
  renderer.render(scene, camera);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(MAX_FRAME_SECONDS, clock.getDelta());
  frame(dt, clock.elapsedTime);
});
