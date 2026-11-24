import * as THREE from 'three';
import { FONT, paintTexture } from './kit.ts';
import { seeded, speckle, tiling } from './textures.ts';
import type { Ctx } from './textures.ts';

const BRICK_COURSES = 12;
const BRICKS_PER_ROW = 4;
const MORTAR_PX = 5;

/** Running-bond brickwork with uneven firing. One repeat = 1 m x 1 m (4 bricks x 12 courses). */
export const brick = (base: string, mortar: string, seed = 5): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const rnd = seeded(seed);
    const rowH = size / BRICK_COURSES;
    const brickW = size / BRICKS_PER_ROW;
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, size, size);
    for (let row = 0; row < BRICK_COURSES; row++) {
      const shift = row % 2 === 0 ? 0 : brickW / 2;
      for (let i = -1; i < BRICKS_PER_ROW; i++) {
        const x = i * brickW + shift;
        const tone = rnd();
        ctx.fillStyle = base;
        ctx.fillRect(x + MORTAR_PX / 2, row * rowH + MORTAR_PX / 2, brickW - MORTAR_PX, rowH - MORTAR_PX);
        ctx.fillStyle = tone < 0.5 ? `rgba(0,0,0,${tone * 0.36})` : `rgba(255,214,170,${(tone - 0.5) * 0.3})`;
        ctx.fillRect(x + MORTAR_PX / 2, row * rowH + MORTAR_PX / 2, brickW - MORTAR_PX, rowH - MORTAR_PX);
      }
    }
    speckle(ctx, size, 2600, ['rgba(0,0,0,0.1)', 'rgba(255,255,255,0.07)'], 3, seed + 3);
  });

/** Poured concrete: cloudy patches, hairline cracks and saw-cut joints. One repeat = 2 x 2 slabs. */
export const concrete = (base: string, seed = 9): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const rnd = seeded(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 70; i++) {
      const r = 20 + rnd() * 70;
      const x = rnd() * size;
      const y = rnd() * size;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rnd() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    speckle(ctx, size, 3200, ['rgba(0,0,0,0.07)', 'rgba(255,255,255,0.06)'], 2, seed + 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      let x = rnd() * size;
      let y = rnd() * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += rnd() * 36 - 12;
        y += rnd() * 36 - 12;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size / 2, size / 2);
    ctx.strokeRect(size / 2, size / 2, size / 2, size / 2);
  });

/** Old narrow-strip oak: uneven stain, dark gaps, scuffs and the odd patched board. One repeat = 12 strips. */
export const wornWood = (base: string, dark: string): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const rnd = seeded(61);
    const strips = 12;
    const strip = size / strips;
    for (let row = 0; row < strips; row++) {
      const y = row * strip;
      let x = -rnd() * size * 0.4;
      while (x < size) {
        const length = size * (0.45 + rnd() * 0.5);
        ctx.fillStyle = base;
        ctx.fillRect(x, y, length, strip);
        ctx.fillStyle = rnd() < 0.1 ? 'rgba(255,225,170,0.12)' : `rgba(40,20,5,${rnd() * 0.15})`;
        ctx.fillRect(x, y, length, strip);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, y, 2, strip);
        x += length;
      }
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        ctx.globalAlpha = 0.18 + rnd() * 0.25;
        const gy = y + 4 + rnd() * (strip - 8);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.3, gy + rnd() * 5 - 2.5, size * 0.7, gy + rnd() * 5 - 2.5, size, gy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, y, size, 2);
    }
    // Pale traffic wear where the varnish has gone.
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(235,215,180,${0.04 + rnd() * 0.07})`;
      ctx.beginPath();
      ctx.ellipse(rnd() * size, rnd() * size, 20 + rnd() * 60, 8 + rnd() * 16, rnd() * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

/** Two-tone checkerboard floor tiles, deli style. One repeat = 4 x 4 tiles. */
export const checkerTile = (a: string, b: string): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const rnd = seeded(13);
    const cell = size / 4;
    for (let i = 0; i < 16; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      ctx.fillStyle = (col + row) % 2 === 0 ? a : b;
      ctx.fillRect(col * cell, row * cell, cell, cell);
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.1})`;
      ctx.fillRect(col * cell, row * cell, cell, cell);
      ctx.strokeStyle = 'rgba(120,120,120,0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(col * cell, row * cell, cell, cell);
    }
    speckle(ctx, size, 700, ['rgba(0,0,0,0.06)', 'rgba(255,255,255,0.05)'], 3, 19);
  });

/** Row-house facade: tall sash windows with stone lintels and sills. One repeat = 4 windows x 4 floors. */
export const rowHouse = (wall: string, stone: string, seed: number): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const rnd = seeded(seed);
    const cell = size / 4;
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 8) {
      ctx.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.06})`;
      ctx.fillRect(0, y, size, 2);
    }
    for (let i = 0; i < 16; i++) {
      const x = (i % 4) * cell + cell * 0.26;
      const y = Math.floor(i / 4) * cell + cell * 0.2;
      const w = cell * 0.48;
      const h = cell * 0.62;
      ctx.fillStyle = stone;
      ctx.fillRect(x - 6, y - 12, w + 12, 12);
      ctx.fillRect(x - 8, y + h, w + 16, 8);
      const lit = rnd() < 0.1;
      ctx.fillStyle = lit ? '#f3d38a' : '#26323d';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = `rgba(190,220,240,${lit ? 0 : 0.1 + rnd() * 0.25})`;
      ctx.fillRect(x, y, w, h * 0.5);
      ctx.fillStyle = '#e9e4d8';
      ctx.fillRect(x, y + h * 0.5 - 2, w, 4);
      ctx.fillRect(x + w / 2 - 1.5, y, 3, h);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let f = 0; f < 4; f++) ctx.fillRect(0, f * cell, size, 3);
  });

/** Horizontal slats of a steel roll-up door. */
export const rollerSlats = (base: string): THREE.CanvasTexture =>
  tiling((ctx, size) => {
    const slats = 8;
    const h = size / slats;
    for (let i = 0; i < slats; i++) {
      const g = ctx.createLinearGradient(0, i * h, 0, (i + 1) * h);
      g.addColorStop(0, 'rgba(255,255,255,0.28)');
      g.addColorStop(0.45, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = base;
      ctx.fillRect(0, i * h, size, h);
      ctx.fillStyle = g;
      ctx.fillRect(0, i * h, size, h);
    }
    speckle(ctx, size, 500, ['rgba(120,60,20,0.18)', 'rgba(0,0,0,0.1)'], 4, 17);
  });

const LINES = ['#ee352e', '#00933c', '#0039a6', '#ff6319', '#fccc0a', '#b933ad', '#6cbe45', '#996633'];

/** A made-up transit diagram: islands, a river and coloured lines with station dots. */
export function subwayMap(): THREE.CanvasTexture {
  return paintTexture(512, 640, (ctx, w, h) => {
    const rnd = seeded(404);
    ctx.fillStyle = '#b9d9ea';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4efe1';
    const land = (points: readonly (readonly [number, number])[]): void => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)));
      ctx.closePath();
      ctx.fill();
    };
    land([[0.3, 0.1], [0.44, 0.08], [0.5, 0.4], [0.46, 0.74], [0.36, 0.8], [0.28, 0.5]]);
    land([[0.56, 0.3], [1, 0.22], [1, 1], [0.5, 1], [0.54, 0.7]]);
    land([[0, 0.08], [0.2, 0.08], [0.18, 0.62], [0, 0.7]]);
    land([[0.5, 0.08], [1, 0.08], [1, 0.16], [0.56, 0.24]]);
    ctx.fillStyle = '#cfe3b8';
    ctx.fillRect(w * 0.35, h * 0.24, w * 0.06, h * 0.16);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    LINES.forEach((color, i) => {
      const x0 = w * (0.31 + i * 0.022);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x0, h * 0.12);
      ctx.lineTo(x0 + w * 0.02, h * (0.45 + i * 0.02));
      const endX = i % 2 === 0 ? w * (0.6 + rnd() * 0.36) : w * (0.04 + rnd() * 0.2);
      const endY = h * (0.5 + rnd() * 0.45);
      ctx.lineTo((x0 + endX) / 2, h * (0.6 + i * 0.02));
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 6; s++) {
        ctx.beginPath();
        ctx.arc(x0 + (w * 0.02 * s) / 6, h * (0.14 + s * 0.055), 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, w, h * 0.075);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 26px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('SUBWAY MAP 地铁线路图', 14, h * 0.04);
    ctx.fillStyle = '#374151';
    ctx.font = `700 15px ${FONT}`;
    ctx.fillText('MANHATTAN', w * 0.3, h * 0.84);
    ctx.fillText('BROOKLYN', w * 0.68, h * 0.9);
    ctx.fillText('QUEENS', w * 0.76, h * 0.2);
  });
}

function drawCab(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.fillStyle = '#f7c600';
  ctx.beginPath();
  ctx.roundRect(x, y, 300 * s, 62 * s, 14 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 62 * s, y + 4 * s);
  ctx.lineTo(x + 96 * s, y - 44 * s);
  ctx.lineTo(x + 208 * s, y - 44 * s);
  ctx.lineTo(x + 244 * s, y + 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x + 104 * s, y - 36 * s, 44 * s, 34 * s);
  ctx.fillRect(x + 156 * s, y - 36 * s, 48 * s, 34 * s);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#111111' : '#ffffff';
    ctx.fillRect(x + (40 + i * 16) * s, y + 22 * s, 16 * s, 8 * s);
  }
  ctx.fillStyle = '#111111';
  [58, 240].forEach((wx) => {
    ctx.beginPath();
    ctx.arc(x + wx * s, y + 62 * s, 26 * s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#d1d5db';
  [58, 240].forEach((wx) => {
    ctx.beginPath();
    ctx.arc(x + wx * s, y + 62 * s, 11 * s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 132 * s, y - 60 * s, 40 * s, 16 * s);
  ctx.fillStyle = '#111111';
  ctx.font = `800 ${12 * s}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('TAXI', x + 152 * s, y - 48 * s);
  ctx.textAlign = 'left';
}

/** Pop-art print of a yellow cab against a block-colour skyline. */
export function cabArt(): THREE.CanvasTexture {
  return paintTexture(512, 360, (ctx, w, h) => {
    const rnd = seeded(88);
    ctx.fillStyle = '#17a2a8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0f5f73';
    for (let x = 0; x < w; x += 44) {
      const bh = 80 + rnd() * 130;
      ctx.fillRect(x, h * 0.7 - bh, 36, bh);
      if (rnd() < 0.3) ctx.fillRect(x + 15, h * 0.7 - bh - 36, 6, 36);
    }
    ctx.fillStyle = '#ef476f';
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.22, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2d42';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    ctx.fillStyle = '#f8f4e3';
    for (let x = 10; x < w; x += 70) ctx.fillRect(x, h * 0.9, 40, 6);
    drawCab(ctx, 96, h * 0.56, 1.05);
  });
}

/** Faded hand-painted lettering straight on the brick ("ghost sign"), on a transparent ground. */
export function ghostSign(lines: readonly string[], w: number, h: number, color = '#f1ead8'): THREE.CanvasTexture {
  const px = 96;
  return paintTexture(Math.round(w * px), Math.round(h * px), (ctx, cw, ch) => {
    const rnd = seeded(lines.join('').length * 31 + 7);
    const longest = Math.max(...lines.map((l) => l.length));
    const size = Math.min((ch * 0.86) / lines.length, (cw * 1.5) / Math.max(1, longest));
    ctx.font = `900 ${size}px "Arial Narrow", "Helvetica Neue", ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    lines.forEach((line, i) => ctx.fillText(line, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * size * 1.08, cw * 0.96));
    // Weathering: knock tiny holes out of the paint, more along the mortar courses.
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < cw * ch * 0.004; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.6})`;
      ctx.fillRect(rnd() * cw, rnd() * ch, 1 + rnd() * 5, 1 + rnd() * 3);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let y = 0; y < ch; y += px / 12) ctx.fillRect(0, y, cw, 1.5);
  });
}

/** Glowing tube lettering on a transparent ground. */
export function neonText(text: string, color: string, w: number, h: number): THREE.CanvasTexture {
  const px = 160;
  return paintTexture(Math.round(w * px), Math.round(h * px), (ctx, cw, ch) => {
    const lines = text.split('\n');
    const longest = Math.max(...lines.map((l) => l.length));
    const size = Math.min((ch * 0.7) / lines.length, (cw * 1.5) / Math.max(1, longest));
    ctx.font = `700 ${size}px "Brush Script MT", "Snell Roundhand", ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    lines.forEach((line, i) => {
      const y = ch / 2 + (i - (lines.length - 1) / 2) * size * 1.1;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.35;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 0.09;
      ctx.strokeText(line, cw / 2, y, cw * 0.92);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = size * 0.03;
      ctx.strokeText(line, cw / 2, y, cw * 0.92);
    });
  });
}

/** Black-and-white skyline photograph: stepped towers, water tanks and a bridge over the river. */
export function skylinePrint(): THREE.CanvasTexture {
  return paintTexture(640, 320, (ctx, w, h) => {
    const rnd = seeded(1931);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#8d9299');
    sky.addColorStop(1, '#e9e7e1');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ['#b9bbbd', '#7b7f85', '#3b3e44'].forEach((tone, layer) => {
      ctx.fillStyle = tone;
      for (let x = -10; x < w; x += 18 + rnd() * 22) {
        const bw = 16 + rnd() * 26;
        const bh = h * (0.2 + rnd() * (0.5 - layer * 0.1));
        const top = h * (0.78 + layer * 0.04) - bh;
        ctx.fillRect(x, top, bw, bh + h);
        if (rnd() < 0.3) {
          ctx.fillRect(x + bw * 0.2, top - bh * 0.18, bw * 0.6, bh * 0.2);
          ctx.fillRect(x + bw * 0.42, top - bh * 0.42, bw * 0.16, bh * 0.3);
        } else if (rnd() < 0.3) {
          ctx.fillRect(x + bw * 0.3, top - 9, bw * 0.4, 7);
          ctx.fillRect(x + bw * 0.34, top - 3, 2, 4);
          ctx.fillRect(x + bw * 0.62, top - 3, 2, 4);
        }
      }
    });
    ctx.fillStyle = '#2a2c31';
    ctx.fillRect(0, h * 0.88, w, h * 0.12);
    ctx.strokeStyle = '#2a2c31';
    ctx.lineWidth = 3;
    ctx.fillRect(w * 0.6, h * 0.62, 12, h * 0.3);
    ctx.fillRect(w * 0.86, h * 0.62, 12, h * 0.3);
    ctx.fillRect(w * 0.48, h * 0.82, w * 0.52, 5);
    ctx.beginPath();
    ctx.moveTo(w * 0.48, h * 0.82);
    ctx.quadraticCurveTo(w * 0.55, h * 0.8, w * 0.61, h * 0.63);
    ctx.quadraticCurveTo(w * 0.74, h * 0.9, w * 0.87, h * 0.63);
    ctx.quadraticCurveTo(w * 0.94, h * 0.8, w, h * 0.78);
    ctx.stroke();
  });
}
