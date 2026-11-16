import { SERVER_PORT } from '../shared/constants.ts';
import type { ClientMsg, ServerMsg } from '../shared/protocol.ts';

export interface Net {
  send(msg: ClientMsg): void;
}

function serverUrl(): string {
  const secure = location.protocol === 'https:';
  // In dev the page comes from Vite, the game server runs on its own port.
  const host = import.meta.env.DEV ? `${location.hostname}:${SERVER_PORT}` : location.host;
  return `${secure ? 'wss' : 'ws'}://${host}`;
}

export function connect(onMessage: (msg: ServerMsg) => void, onClose: (reason: string) => void): Promise<Net> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(serverUrl());
    let opened = false;
    socket.addEventListener('open', () => {
      opened = true;
      resolve({
        send(msg) {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
        },
      });
    });
    socket.addEventListener('message', (event) => {
      try {
        onMessage(JSON.parse(String(event.data)) as ServerMsg);
      } catch (err) {
        console.error('Bad message from server', err);
      }
    });
    socket.addEventListener('close', () => {
      if (opened) onClose('和服务器的连接断开了，请刷新页面重新进入');
      else reject(new Error('连不上游戏服务器，请确认服务器已启动'));
    });
  });
}
