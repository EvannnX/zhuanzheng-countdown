import type * as THREE from 'three';
import { ball, box, cyl, glass, glow, group, pick, rbox, shiny, textPlane, turn } from '../kit.ts';
import { BRAND, DARK, STEEL, WHITE, WOOD, at, exitSign, keyboardSet, monitor, officeChair, pictureFrame, plant, rug, screen } from '../parts.ts';
import { hang, poster } from '../shell.ts';
import type { Builder, RoomArt } from './types.ts';

const NAVY = '#1e3a8a';

const reception: Builder = (w, d) => {
  const logo = textPlane('鲸跃科技', 1.5, 0.3, { bg: '#ffffff', fg: NAVY });
  logo.position.set(0, 0.62, d / 2 + 0.032);
  return [
    rbox(w, 1.06, 0.34, WHITE, 0, 0.53, d / 2 - 0.17, 0.03),
    rbox(w + 0.06, 0.05, 0.42, WOOD, 0, 1.085, d / 2 - 0.17, 0.015),
    rbox(w - 0.1, 0.04, d - 0.3, WOOD, 0, 0.76, -0.13, 0.012),
    box(0.06, 0.74, d - 0.34, WHITE, -w / 2 + 0.06, 0.37, -0.15),
    box(0.06, 0.74, d - 0.34, WHITE, w / 2 - 0.06, 0.37, -0.15),
    box(w, 0.04, 0.02, glow(BRAND), 0, 0.2, d / 2 + 0.012),
    box(w, 0.03, 0.02, glow('#fff3c4'), 0, 0.98, d / 2 + 0.012),
    logo,
    turn(group(-0.9, 0, -0.2, monitor('lock', 0.78, 0.56)), Math.PI),
    turn(group(-0.9, 0, -0.02, keyboardSet(0.78)), Math.PI),
    group(0.5, 0.78, -0.15, rbox(0.2, 0.05, 0.22, shiny(DARK), 0, 0.03, 0, 0.012), turn(rbox(0.06, 0.04, 0.2, shiny(DARK), -0.06, 0.07, 0, 0.012), 0, 0, 0.1)),
    group(1.5, 1.11, d / 2 - 0.17, cyl(0.06, 0.04, 0.2, glass('#bfe3f5', 0.5), 0, 0.1, 0, 12), ...[0, 1, 2, 3, 4].map((i) => group(0, 0.2, 0, turn(cyl(0.004, 0.004, 0.24, '#16a34a', 0, 0.1, 0, 4), i * 1.2, 0.25), ball(0.04, pick(['#f472b6', '#facc15', '#fb923c'], i), Math.sin(i * 1.2) * 0.06, 0.24, Math.cos(i * 1.2) * 0.06)))),
    group(-1.5, 1.11, d / 2 - 0.17, turn(rbox(0.24, 0.02, 0.18, shiny(DARK), 0, 0.06, 0, 0.006), 0, -0.6), box(0.2, 0.12, 0.02, '#374151', 0, 0.03, -0.05)),
    group(0.8, 1.11, d / 2 - 0.17, cyl(0.07, 0.07, 0.03, shiny(BRAND), 0, 0.015, 0, 14), ball(0.02, shiny(STEEL), 0, 0.04, 0)),
    turn(group(-0.9, 0, -d / 2 - 0.45, officeChair('#f97316')), Math.PI),
  ];
};

const locker: Builder = (w, d) => {
  const cols = 6;
  const rows = 5;
  const cw = (w - 0.1) / cols;
  const front = d / 2 - 0.3;
  const doors = Array.from({ length: cols * rows }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    if (col === 2 && (row === 2 || row === 3)) return null;
    const tone = pick(['#f5c542', '#f5c542', '#fbbf24', '#f59e0b'], i * 5 + row);
    return group(-w / 2 + 0.05 + cw * (col + 0.5), 0.2 + row * 0.36, front, box(cw - 0.03, 0.33, 0.02, tone, 0, 0.165, 0), box(0.05, 0.02, 0.012, shiny(DARK), cw / 2 - 0.08, 0.165, 0.014));
  }).filter((o): o is THREE.Group => o !== null);
  const sign = textPlane('外卖 · 快递 自取柜', w - 0.3, 0.2, { bg: '#111827', fg: '#fde047' });
  sign.position.set(0, 2.1, front + 0.012);
  const touch = screen(cw - 0.08, 0.5, 'lock');
  touch.position.set(-w / 2 + 0.05 + cw * 2.5, 1.2, front + 0.014);
  return [
    rbox(w, 2.22, d - 0.3, '#d97706', 0, 1.11, -0.15, 0.02),
    box(w, 0.2, d - 0.34, '#374151', 0, 0.1, -0.15),
    ...doors,
    box(cw - 0.03, 0.69, 0.02, shiny(DARK), -w / 2 + 0.05 + cw * 2.5, 1.265, front),
    touch,
    box(w, 0.24, 0.03, '#111827', 0, 2.1, front - 0.006),
    sign,
    group(w / 2 - 0.5, 0, front + 0.3, rbox(0.3, 0.22, 0.26, '#c99657', 0, 0.11, 0, 0.01)),
    group(-w / 2 + 0.6, 0, front + 0.28, cyl(0.07, 0.06, 0.22, '#fef3c7', 0, 0.11, 0, 12), rbox(0.26, 0.2, 0.16, '#fde68a', 0.3, 0.1, 0, 0.02)),
  ];
};

function elevator(): THREE.Group {
  const indicator = textPlane('12F ▲', 0.5, 0.16, { bg: '#111827', fg: '#f97316' });
  indicator.position.set(0, 2.42, 0.03);
  return group(
    0, 0, 0,
    box(1.5, 2.3, 0.04, shiny('#9ca3af'), 0, 1.15, 0),
    box(0.7, 2.14, 0.02, shiny('#cbd5e1'), -0.355, 1.09, 0.03),
    box(0.7, 2.14, 0.02, shiny('#cbd5e1'), 0.355, 1.09, 0.03),
    box(0.012, 2.14, 0.024, DARK, 0, 1.09, 0.03),
    indicator,
    rbox(0.1, 0.24, 0.03, shiny(STEEL), 0.95, 1.15, 0.02, 0.012),
    ball(0.022, glow('#f97316'), 0.95, 1.2, 0.04),
    ball(0.022, glow('#e5e7eb'), 0.95, 1.1, 0.04),
  );
}

function decor(): THREE.Object3D[] {
  const logoWall = [
    hang(rbox(4.6, 2.5, 0.08, NAVY, 0, 0, 0.04, 0.02), 'n', 17, 34.5, 1.5, 0.1),
    hang(textPlane('鲸跃科技\nWHALE JUMP', 3.6, 1.3, { bg: NAVY, fg: '#ffffff' }), 'n', 17, 34.5, 1.75, 0.185),
    hang(box(4.2, 0.04, 0.02, glow('#93c5fd')), 'n', 17, 34.5, 0.72, 0.19),
    hang(textPlane('把公司当成家', 2, 0.24, { bg: NAVY, fg: '#fbbf24' }), 'n', 17, 34.5, 0.95, 0.185),
    ...[-1.6, 0, 1.6].map((x) => group(34.5 + x, 0, 17.8, cyl(0.06, 0.09, 0.14, shiny(DARK), 0, 2.92, 0, 10), cyl(0.05, 0.05, 0.01, glow('#fff7d6'), 0, 2.845, 0, 10))),
  ];
  const stars = [18.9, 19.7, 20.5, 21.3].map((z, i) => hang(pictureFrame(0.5, 0.64, pick(['#bfdbfe', '#fde68a', '#fecaca', '#bbf7d0'], i), '#8a5a36'), 'w', 26, z, 1.55, 0.1));
  const lamps = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return turn(box(0.4, 0.06, 0.08, glow('#fff7e0'), Math.cos(a), 0, Math.sin(a)), -a + Math.PI / 2);
  });
  const ring = group(34.5, 2.55, 23.5, ...lamps, ...[0, 1, 2].map((i) => cyl(0.006, 0.006, 0.45, DARK, Math.cos(i * 2.1), 0.22, Math.sin(i * 2.1), 4)));
  const mat = textPlane('欢迎回家（公司）', 2.2, 0.8, { bg: '#7f1d1d', fg: '#fde68a', lit: false });
  mat.rotation.set(-Math.PI / 2, 0, Math.PI);
  mat.position.set(29, 0.012, 18.3);
  const clockIn = hang(group(0, 0, 0, rbox(0.3, 0.4, 0.08, shiny(DARK), 0, 0, 0.04, 0.02), box(0.22, 0.14, 0.004, glow('#86efac'), 0, 0.08, 0.082), ...[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => box(0.05, 0.035, 0.006, '#4b5563', -0.07 + c * 0.07, -0.04 - r * 0.05, 0.082)))), 'w', 26, 17.9, 1.3, 0.1);
  return [
    ...logoWall,
    ...stars,
    hang(textPlane('本月之星（空缺）', 1.6, 0.2, { bg: '#fff7e6', fg: '#92400e' }), 'w', 26, 20.1, 2.1),
    ...poster('今日转正名额\n僧多粥少', 1.7, 0.75, { bg: '#dc2626', fg: '#fff7d6' }, 'e', 40, 25, 1.9),
    // Lifts open straight onto the reception desk across the lobby.
    hang(elevator(), 's', 28, 33.4, 0, 0.1),
    hang(elevator(), 's', 28, 35.6, 0, 0.1),
    hang(textPlane('12F  鲸跃科技', 2.2, 0.26, { bg: '#111827', fg: '#ffffff' }), 's', 28, 34.5, 2.72),
    at(34.5, 26.9, 0, rug(4.6, 1.6, '#374151', '#111827')),
    hang(exitSign(), 'n', 17, 29, 2.75, 0.1),
    ring,
    mat,
    clockIn,
    at(27.5, 24, 0, rug(3.2, 3.6, '#cbd5e1', '#64748b')),
    at(26.6, 26.8, 0, plant('leafy', 1.1, '#1f2937')),
    at(31.2, 27.5, 0, cyl(0.14, 0.12, 0.5, shiny(DARK), 0, 0.25, 0, 12), turn(cyl(0.012, 0.012, 0.8, '#1d4ed8', 0.03, 0.55, 0, 6), 0, 0, 0.12), turn(cyl(0.012, 0.012, 0.8, '#dc2626', -0.03, 0.55, 0.02, 6), 0, 0.1, -0.1)),
  ];
}

export const lobby: RoomArt = { builders: { reception, locker }, decor };
