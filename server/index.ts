import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { HEARTBEAT_MS, SERVER_PORT } from '../shared/constants.ts';
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
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.md': 'text/markdown; charset=utf-8',
};
const COMPRESSIBLE = ['.html', '.js', '.css', '.json', '.svg'];
/** Hashed build files never change; everything else is revalidated. */
const CACHE_FOREVER = 'public, max-age=31536000, immutable';
const CACHE_SHORT = 'public, max-age=300';

interface Served {
  readonly body: Buffer;
  readonly gzipped: Buffer | null;
  readonly mtimeMs: number;
}
/** Files are read and compressed once, then served from memory. */
const served = new Map<string, Served>();

function load(file: string): Served {
  const mtimeMs = statSync(file).mtimeMs;
  const hit = served.get(file);
  if (hit && hit.mtimeMs === mtimeMs) return hit;
  const body = readFileSync(file);
  const entry = { body, gzipped: COMPRESSIBLE.includes(extname(file)) ? gzipSync(body) : null, mtimeMs };
  served.set(file, entry);
  return entry;
}

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const file = normalize(join(DIST, urlPath === '/' ? 'index.html' : urlPath));
  // Refuse anything that escapes the build folder.
  if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(existsSync(DIST) ? 'Not found' : '开发模式请访问 Vite 地址；生产模式先运行 npm run build');
    return;
  }
  const entry = load(file);
  const useGzip = entry.gzipped !== null && String(req.headers['accept-encoding'] ?? '').includes('gzip');
  const payload = useGzip && entry.gzipped ? entry.gzipped : entry.body;
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'content-length': payload.length,
    'cache-control': file.includes(`${DIST}/assets/`) ? CACHE_FOREVER : extname(file) === '.html' ? 'no-cache' : CACHE_SHORT,
    ...(useGzip ? { 'content-encoding': 'gzip' } : {}),
  });
  res.end(payload);
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
    if (msg.t === 'create' || msg.t === 'join' || msg.t === 'rejoin') {
      if (!session) session = manager.enter(socket, msg);
      return;
    }
    if (session) manager.command(session, msg);
  });

  socket.on('close', () => {
    if (session) manager.leave(session, socket);
    session = null;
  });
  socket.on('error', (err) => console.error('[ws] socket error:', err.message));
});

// Heartbeat: a socket that did not answer the last ping is dead (laptop lid, Wi-Fi drop) and is closed,
// which frees the seat for a reconnect instead of leaving a frozen player in the room.
const answered = new WeakSet<WebSocket>();
wss.on('connection', (socket) => {
  answered.add(socket);
  socket.on('pong', () => answered.add(socket));
});
setInterval(() => {
  for (const socket of wss.clients) {
    if (!answered.has(socket)) {
      socket.terminate();
      continue;
    }
    answered.delete(socket);
    socket.ping();
  }
}, HEARTBEAT_MS);

// One bad request or room must never take every room down with it.
process.on('uncaughtException', (err) => console.error('[server] uncaught exception:', err));
process.on('unhandledRejection', (err) => console.error('[server] unhandled rejection:', err));

http.listen(PORT, () => console.log(`转正倒计时 server listening on http://localhost:${PORT}`));
