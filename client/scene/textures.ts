import * as THREE from 'three';
import { FONT, paintTexture } from './kit.ts';

export type Ctx = CanvasRenderingContext2D;
const SIZE = 512;

/** Small deterministic generator so every client draws identical textures. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function tiling(draw: (ctx: Ctx, size: number) => void): THREE.CanvasTexture {
  const texture = paintTexture(SIZE, SIZE, (ctx) => draw(ctx, SIZE));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function speckle(ctx: Ctx, size: number, count: number, colors: readonly string[], maxSize: number, seed: number): void {
  const rnd = seeded(seed);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    const s = 1 + rnd() * maxSize;
    ctx.fillRect(rnd() * size, rnd() * size, s, s * (0.6 + rnd() * 0.8));
  }
}

/** Office carpet tiles: two alternating tones with woven noise. One repeat = 2 x 2 tiles. */
export const carpet = (a: string, b: string): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const half = size / 2;
    [a, b, b, a].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect((i % 2) * half, Math.floor(i / 2) * half, half, half);
    });
    speckle(ctx, size, 5000, ['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.09)'], 2, 11);
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, half, half);
    ctx.strokeRect(half, half, half, half);
  });

/** Wood planks with staggered joints. One repeat = 8 planks. */
export const wood = (base: string, grain: string): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const rnd = seeded(23);
    const plank = size / 8;
    for (let row = 0; row < 8; row++) {
      ctx.fillStyle = base;
      ctx.fillRect(0, row * plank, size, plank);
      ctx.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.1})`;
      ctx.fillRect(0, row * plank, size, plank);
      ctx.strokeStyle = grain;
      ctx.lineWidth = 1;
      for (let g = 0; g < 5; g++) {
        const y = row * plank + 4 + rnd() * (plank - 8);
        ctx.globalAlpha = 0.25 + rnd() * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size * 0.3, y + rnd() * 6 - 3, size * 0.7, y + rnd() * 6 - 3, size, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, row * plank, size, 2);
      ctx.fillRect(((row * 197) % size), row * plank, 2, plank);
    }
  });

/** Polished stone slabs with fine chips. One repeat = 2 x 2 slabs. */
export const terrazzo = (base: string): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, 900, ['#8f8a80', '#c9bfae', '#5f6b73', '#b88a6a', '#ffffff'], 5, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size / 2, size / 2);
    ctx.strokeRect(size / 2, size / 2, size / 2, size / 2);
  });

/** Ceramic tiles with grout. One repeat = n x n tiles. */
export const ceramic = (base: string, grout: string, n = 4): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const rnd = seeded(41);
    const cell = size / n;
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < n * n; i++) {
      const x = (i % n) * cell;
      const y = Math.floor(i / n) * cell;
      ctx.fillStyle = base;
      ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.18})`;
      ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
      const shine = ctx.createLinearGradient(x, y, x + cell, y + cell);
      shine.addColorStop(0, 'rgba(255,255,255,0.22)');
      shine.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
    }
  });

/** Outdoor decking boards. */
export const deck = (base: string): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const rnd = seeded(77);
    const board = size / 6;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = base;
      ctx.fillRect(i * board, 0, board, size);
      ctx.fillStyle = `rgba(60,30,10,${rnd() * 0.22})`;
      ctx.fillRect(i * board, 0, board, size);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(i * board, 0, 3, size);
      for (let g = 0; g < 14; g++) {
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        ctx.fillRect(i * board + 6 + rnd() * (board - 12), rnd() * size, 1.5, 40 + rnd() * 120);
      }
    }
  });

/** Suspended ceiling panels. One repeat = one 0.6 m panel. */
export const ceilingGrid = (): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    ctx.fillStyle = '#e4e0d6';
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, 1400, ['rgba(0,0,0,0.05)'], 2, 3);
    ctx.strokeStyle = '#c2bdb0';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, size, size);
  });

/** Curtain-wall facade for distant towers: one repeat = 4 windows x 4 floors. */
export const facade = (wall: string, glassTone: string, seed: number): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const rnd = seeded(seed);
    const cell = size / 4;
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 16; i++) {
      const x = (i % 4) * cell;
      const y = Math.floor(i / 4) * cell;
      ctx.fillStyle = glassTone;
      ctx.fillRect(x + 10, y + 22, cell - 20, cell - 44);
      ctx.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.3})`;
      ctx.fillRect(x + 10, y + 22, cell - 20, (cell - 44) * 0.45);
      if (rnd() < 0.18) {
        ctx.fillStyle = 'rgba(255,236,170,0.75)';
        ctx.fillRect(x + 10, y + 22, cell - 20, cell - 44);
      }
    }
  });

/** City ground far below: blocks, roads and lane markings. */
export const streets = (): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    ctx.fillStyle = '#8c9aa3';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#55606a';
    ctx.fillRect(0, size * 0.42, size, size * 0.16);
    ctx.fillRect(size * 0.42, 0, size * 0.16, size);
    ctx.fillStyle = '#f5f0d8';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(i * (size / 8) + 8, size * 0.5 - 2, size / 16, 4);
      ctx.fillRect(size * 0.5 - 2, i * (size / 8) + 8, 4, size / 16);
    }
    ctx.fillStyle = '#7fae6b';
    ctx.fillRect(size * 0.06, size * 0.06, size * 0.3, size * 0.3);
    ctx.fillRect(size * 0.64, size * 0.64, size * 0.3, size * 0.3);
  });

export function skyTexture(): THREE.CanvasTexture {
  return paintTexture(16, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2f7fd6');
    sky.addColorStop(0.42, '#7cc0f5');
    sky.addColorStop(0.5, '#d8eefb');
    sky.addColorStop(0.56, '#e9f1f4');
    sky.addColorStop(1, '#c8d3d8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Soft dark blob used as a fake contact shadow under furniture. */
export function contactShadow(): THREE.CanvasTexture {
  return paintTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export type ScreenKind = 'code' | 'sheet' | 'chart' | 'kpi' | 'lock' | 'slides';
const screens = new Map<ScreenKind, THREE.CanvasTexture>();

function drawScreen(ctx: Ctx, w: number, h: number, kind: ScreenKind): void {
  const rnd = seeded(kind.length * 97 + kind.charCodeAt(0));
  const bar = (x: number, y: number, bw: number, bh: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, bw, bh);
  };
  if (kind === 'code') {
    bar(0, 0, w, h, '#1e2430');
    bar(0, 0, w, 14, '#111722');
    const tones = ['#7dd3fc', '#fca5a5', '#86efac', '#fde68a', '#c4b5fd', '#e5e7eb'];
    for (let line = 0; line < 13; line++) {
      let x = 12 + Math.floor(rnd() * 3) * 14;
      for (let word = 0; word < 2 + rnd() * 4; word++) {
        const len = 12 + rnd() * 46;
        bar(x, 24 + line * 10, len, 4, tones[Math.floor(rnd() * tones.length)]);
        x += len + 6;
      }
    }
    return;
  }
  if (kind === 'sheet') {
    bar(0, 0, w, h, '#ffffff');
    bar(0, 0, w, 16, '#15803d');
    ctx.strokeStyle = '#d1d5db';
    for (let x = 0; x < w; x += 32) ctx.strokeRect(x, 16, 32, h);
    for (let y = 16; y < h; y += 12) ctx.strokeRect(0, y, w, 12);
    for (let i = 0; i < 40; i++) bar(4 + Math.floor(rnd() * 8) * 32, 20 + Math.floor(rnd() * 11) * 12, 10 + rnd() * 14, 4, rnd() < 0.2 ? '#dc2626' : '#374151');
    return;
  }
  if (kind === 'chart') {
    bar(0, 0, w, h, '#f8fafc');
    bar(0, 0, w, 16, '#1d4ed8');
    for (let i = 0; i < 9; i++) bar(16 + i * 26, h - 14 - (18 + i * 11 + rnd() * 14), 16, 18 + i * 11 + rnd() * 14, i > 6 ? '#f97316' : '#60a5fa');
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, h - 30);
    ctx.lineTo(w - 12, 30);
    ctx.stroke();
    return;
  }
  if (kind === 'kpi') {
    bar(0, 0, w, h, '#0f172a');
    ctx.fillStyle = '#fbbf24';
    ctx.font = `800 20px ${FONT}`;
    ctx.fillText('KPI 实时排行', 12, 24);
    for (let i = 0; i < 6; i++) {
      bar(12, 38 + i * 19, 150 - i * 18 + rnd() * 10, 11, ['#f97316', '#fb923c', '#60a5fa', '#60a5fa', '#94a3b8', '#94a3b8'][i]);
      bar(w - 46, 38 + i * 19, 34, 11, '#1e293b');
    }
    return;
  }
  if (kind === 'slides') {
    bar(0, 0, w, h, '#ffffff');
    bar(0, 0, w, 30, '#ff7a2f');
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 18px ${FONT}`;
    ctx.fillText('赋能 · 抓手 · 闭环', 12, 22);
    for (let i = 0; i < 4; i++) bar(16, 48 + i * 20, 120 + rnd() * 60, 8, '#94a3b8');
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(w - 46, 100, 30, 0, Math.PI * 1.4);
    ctx.lineTo(w - 46, 100);
    ctx.fill();
    return;
  }
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1d4ed8');
  g.addColorStop(1, '#7c3aed');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 34px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('09:00', w / 2, h / 2);
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('鲸跃科技 · 打卡成功', w / 2, h / 2 + 24);
}

/** Fake desktop contents for monitors. Cached: every screen of one kind shares a texture. */
export function screenTexture(kind: ScreenKind): THREE.CanvasTexture {
  const hit = screens.get(kind);
  if (hit) return hit;
  const made = paintTexture(256, 160, (ctx, w, h) => drawScreen(ctx, w, h, kind));
  screens.set(kind, made);
  return made;
}
