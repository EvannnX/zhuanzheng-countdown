import type { WebSocket } from 'ws';
import { MAX_PLAYERS, SNAPSHOT_EVERY_TICKS, TICK_MS } from '../shared/constants.ts';
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
        const next = flush({ ...room, state: step(room.state, dt), ticks, lastTickAt: now });
        rooms.set(code, next);
        if (ticks % SNAPSHOT_EVERY_TICKS === 0) broadcast(next);
      } catch (err) {
        console.error(`[room ${code}] tick failed:`, err);
      }
    }
  };
  const timer = setInterval(tick, TICK_MS);

  const enter = (socket: WebSocket, msg: Extract<ClientMsg, { t: 'create' | 'join' }>): Session | null => {
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
    };
    const playerId = `p${nextPlayer++}`;
    const state = onJoin(addPlayer(room.state, playerId, msg.name), playerId);
    rooms.set(roomCode, { ...room, state, sockets: new Map([...room.sockets, [playerId, socket]]) });
    send(socket, { t: 'joined', id: playerId, code: roomCode });
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

  const leave = (session: Session): void => {
    const room = rooms.get(session.code);
    if (!room) return;
    const sockets = new Map([...room.sockets].filter(([id]) => id !== session.playerId));
    if (sockets.size === 0) {
      rooms.delete(session.code);
      console.log(`[room ${session.code}] closed`);
      return;
    }
    rooms.set(session.code, { ...room, sockets, state: removePlayer(room.state, session.playerId) });
  };

  return { enter, command, leave, stop: () => clearInterval(timer), roomCount: () => rooms.size };
}
