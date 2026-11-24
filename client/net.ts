import { RECONNECT_GRACE_MS, SERVER_PORT } from '../shared/constants.ts';
import type { ClientMsg, ServerMsg } from '../shared/protocol.ts';

export interface Net {
  send(msg: ClientMsg): void;
}

const RETRY_MS = 1500;

function serverUrl(): string {
  const secure = location.protocol === 'https:';
  // In dev the page comes from Vite, the game server runs on its own port.
  const host = import.meta.env.DEV ? `${location.hostname}:${SERVER_PORT}` : location.host;
  return `${secure ? 'wss' : 'ws'}://${host}`;
}

/**
 * Opens the game socket. If it drops mid-game the client keeps retrying for as
 * long as the server holds the seat, and takes it back with the key it was given.
 * `onStatus` reports "reconnecting" / "back"; `onClose` fires only when it gives up.
 */
export function connect(onMessage: (msg: ServerMsg) => void, onClose: (reason: string) => void, onStatus: (text: string) => void = () => undefined): Promise<Net> {
  let socket: WebSocket | null = null;
  let seat: { code: string; id: string; key: string } | null = null;
  let droppedAt = 0;

  const listen = (ws: WebSocket): void => {
    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as ServerMsg;
        if (msg.t === 'joined') seat = { code: msg.code, id: msg.id, key: msg.key };
        // The seat was given away while we were gone: stop retrying.
        if (msg.t === 'error' && droppedAt > 0) seat = null;
        onMessage(msg);
      } catch (err) {
        console.error('Bad message from server', err);
      }
    });
  };

  const retry = (): void => {
    if (!seat || Date.now() - droppedAt > RECONNECT_GRACE_MS) return onClose('和服务器的连接断开了，请刷新页面重新进入');
    const held = seat;
    const ws = new WebSocket(serverUrl());
    listen(ws);
    ws.addEventListener('open', () => {
      socket = ws;
      droppedAt = 0;
      ws.send(JSON.stringify({ t: 'rejoin', ...held } satisfies ClientMsg));
      onStatus('重新连上了');
      ws.addEventListener('close', dropped);
    });
    ws.addEventListener('error', () => window.setTimeout(retry, RETRY_MS));
  };

  const dropped = (): void => {
    if (droppedAt === 0) droppedAt = Date.now();
    onStatus('连接断开，正在重连…');
    window.setTimeout(retry, RETRY_MS);
  };

  return new Promise((resolve, reject) => {
    const first = new WebSocket(serverUrl());
    let opened = false;
    listen(first);
    first.addEventListener('open', () => {
      opened = true;
      socket = first;
      resolve({
        send(msg) {
          if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
        },
      });
    });
    first.addEventListener('close', () => {
      if (opened) dropped();
      else reject(new Error('连不上游戏服务器，请确认服务器已启动'));
    });
  });
}
