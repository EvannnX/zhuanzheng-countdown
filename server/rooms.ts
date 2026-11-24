import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { MAX_PLAYERS, RECONNECT_GRACE_MS, SNAPSHOT_EVERY_TICKS, TICK_MS } from '../shared/constants.ts';
import type { ClientMsg, Command, ServerMsg } from '../shared/protocol.ts';
import { buildSnapshots } from './sim/snapshot.ts';
import { addPlayer, createGame, removePlayer } from './sim/state.ts';
import type { GameState } from './sim/state.ts';
import { applyCommand, onJoin, step } from './sim/step.ts';

const MAX_ROOMS = 200;
const CODE_ATTEMPTS = 50;
const MAX_DT_SECONDS = 0.25;

interface Room {
  readonly state: GameState;
  readonly sockets: ReadonlyMap<string, WebSocket>;
  readonly ticks: number;
  readonly lastTickAt: number;
  /** Secret per player, needed to take the seat back after a dropped connection. */
  readonly keys: ReadonlyMap<string, string>;
  /** Players whose socket dropped, and when. */
  readonly gone: ReadonlyMap<string, number>;
}

export interface Session {
  readonly playerId: string;
  readonly code: string;
}

function send(socket: WebSocket, msg: ServerMsg): void {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(msg), (err) => {
    if (err) console.error('[ws] send failed:', err.message);
  });
}

export function createRoomManager() {
  // The registry is the one mutable cell; every room value inside it is replaced, never edited.
  const rooms = new Map<string, Room>();
  let nextPlayer = 1;

  const newCode = (): string | null => {
    for (let i = 0; i < CODE_ATTEMPTS; i++) {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      if (!rooms.has(code)) return code;
    }
    return null;
  };

  const flush = (room: Room): Room => {
    for (const out of room.state.outbox) {
      const targets = out.to === 'all' ? [...room.sockets.values()] : [room.sockets.get(out.to)];
      for (const socket of targets) if (socket) send(socket, { t: 'toast', text: out.text, tone: out.tone });
    }
    return room.state.outbox.length > 0 ? { ...room, state: { ...room.state, outbox: [] } } : room;
  };

  const broadcast = (room: Room): void => {
    for (const [id, snapshot] of buildSnapshots(room.state)) {
      const socket = room.sockets.get(id);
      if (socket) send(socket, snapshot);
    }
  };

  const tick = (): void => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      try {
        const dt = Math.min(MAX_DT_SECONDS, (now - room.lastTickAt) / 1000);
        const ticks = room.ticks + 1;
        const alive = expire(code, room, now);
        if (!alive) {
          rooms.delete(code);
          continue;
        }
        const next = flush({ ...alive, state: step(alive.state, dt), ticks, lastTickAt: now });
        rooms.set(code, next);
        if (ticks % SNAPSHOT_EVERY_TICKS === 0) broadcast(next);
      } catch (err) {
        console.error(`[room ${code}] tick failed:`, err);
      }
    }
  };
  const timer = setInterval(tick, TICK_MS);

  /** Drop players whose grace period ran out; close rooms nobody is coming back to. */
  const expire = (code: string, room: Room, now: number): Room | null => {
    const lost = [...room.gone].filter(([, at]) => now - at > RECONNECT_GRACE_MS).map(([id]) => id);
    if (lost.length === 0) return room;
    const gone = new Map([...room.gone].filter(([id]) => !lost.includes(id)));
    const state = lost.reduce((s, id) => removePlayer(s, id), room.state);
    if (room.sockets.size === 0 && gone.size === 0) {
      console.log(`[room ${code}] closed`);
      return null;
    }
    return { ...room, gone, state };
  };

  const rejoin = (socket: WebSocket, msg: Extract<ClientMsg, { t: 'rejoin' }>): Session | null => {
    const room = rooms.get(msg.code);
    if (!room || room.keys.get(msg.id) !== msg.key || !room.state.players[msg.id]) {
      send(socket, { t: 'error', text: '这一局已经结束或你的位置已被收回，请重新加入' });
      return null;
    }
    room.sockets.get(msg.id)?.close();
    const gone = new Map([...room.gone].filter(([id]) => id !== msg.id));
    rooms.set(msg.code, { ...room, gone, sockets: new Map([...room.sockets, [msg.id, socket]]) });
    send(socket, { t: 'joined', id: msg.id, code: msg.code, key: msg.key });
    console.log(`[room ${msg.code}] ${msg.id} reconnected`);
    return { playerId: msg.id, code: msg.code };
  };

  const enter = (socket: WebSocket, msg: Extract<ClientMsg, { t: 'create' | 'join' | 'rejoin' }>): Session | null => {
    if (msg.t === 'rejoin') return rejoin(socket, msg);
    const code = msg.t === 'join' ? msg.code : newCode();
    if (msg.t === 'create' && (code === null || rooms.size >= MAX_ROOMS)) {
      send(socket, { t: 'error', text: '服务器房间已满，请稍后再试' });
      return null;
    }
    const existing = code ? rooms.get(code) : undefined;
    if (msg.t === 'join' && !existing) {
      send(socket, { t: 'error', text: '没有这个房间号' });
      return null;
    }
    if (existing && Object.keys(existing.state.players).length >= MAX_PLAYERS) {
      send(socket, { t: 'error', text: `房间已满（最多 ${MAX_PLAYERS} 人）` });
      return null;
    }
    const roomCode = code as string;
    const room: Room = existing ?? {
      state: createGame(roomCode, (Math.random() * 2 ** 31) | 0),
      sockets: new Map(),
      ticks: 0,
      lastTickAt: Date.now(),
      keys: new Map(),
      gone: new Map(),
    };
    const playerId = `p${nextPlayer++}`;
    const state = onJoin(addPlayer(room.state, playerId, msg.name), playerId);
    const key = randomUUID();
    rooms.set(roomCode, { ...room, state, sockets: new Map([...room.sockets, [playerId, socket]]), keys: new Map([...room.keys, [playerId, key]]) });
    send(socket, { t: 'joined', id: playerId, code: roomCode, key });
    console.log(`[room ${roomCode}] ${msg.name} joined as ${playerId}`);
    return { playerId, code: roomCode };
  };

  const command = (session: Session, cmd: Command): void => {
    const room = rooms.get(session.code);
    if (!room) return;
    try {
      rooms.set(session.code, flush({ ...room, state: applyCommand(room.state, session.playerId, cmd) }));
    } catch (err) {
      console.error(`[room ${session.code}] command ${cmd.t} failed:`, err);
    }
  };

  /** A closed socket only vacates the seat; the player is removed when the grace period runs out. */
  const leave = (session: Session, socket: WebSocket): void => {
    const room = rooms.get(session.code);
    // A newer socket may already have taken the seat back.
    if (!room || room.sockets.get(session.playerId) !== socket) return;
    const sockets = new Map([...room.sockets].filter(([id]) => id !== session.playerId));
    rooms.set(session.code, { ...room, sockets, gone: new Map([...room.gone, [session.playerId, Date.now()]]) });
    console.log(`[room ${session.code}] ${session.playerId} dropped, holding the seat`);
  };

  return { enter, command, leave, stop: () => clearInterval(timer), roomCount: () => rooms.size };
}
