import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { WebSocketServer } from 'ws';
import { SERVER_PORT } from '../shared/constants.ts';
import { parseClientMsg } from '../shared/protocol.ts';
import { createRoomManager } from './rooms.ts';
import type { Session } from './rooms.ts';

const PORT = Number(process.env.PORT) || SERVER_PORT;
const DIST = resolve(import.meta.dirname, '../dist');
const MAX_PAYLOAD_BYTES = 2048;
const MAX_MESSAGES_PER_SECOND = 80;
const RATE_WINDOW_MS = 1000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const file = normalize(join(DIST, urlPath === '/' ? 'index.html' : urlPath));
  // Refuse anything that escapes the build folder.
  if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(existsSync(DIST) ? 'Not found' : '开发模式请访问 Vite 地址；生产模式先运行 npm run build');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file)
    .on('error', (err) => {
      console.error('[http] read failed:', err.message);
      res.destroy();
    })
    .pipe(res);
}

const http = createServer((req, res) => {
  try {
    serveStatic(req, res);
  } catch (err) {
    console.error('[http] request failed:', err);
    res.writeHead(400).end();
  }
});

const manager = createRoomManager();
const wss = new WebSocketServer({ server: http, maxPayload: MAX_PAYLOAD_BYTES });

wss.on('connection', (socket) => {
  let session: Session | null = null;
  let windowStart = Date.now();
  let count = 0;

  socket.on('message', (raw) => {
    const now = Date.now();
    if (now - windowStart > RATE_WINDOW_MS) {
      windowStart = now;
      count = 0;
    }
    count += 1;
    if (count > MAX_MESSAGES_PER_SECOND) return;

    const msg = parseClientMsg(raw.toString());
    if (!msg) return;
    if (msg.t === 'create' || msg.t === 'join') {
      if (!session) session = manager.enter(socket, msg);
      return;
    }
    if (session) manager.command(session, msg);
  });

  socket.on('close', () => {
    if (session) manager.leave(session);
    session = null;
  });
  socket.on('error', (err) => console.error('[ws] socket error:', err.message));
});

http.listen(PORT, () => console.log(`转正倒计时 server listening on http://localhost:${PORT}`));
