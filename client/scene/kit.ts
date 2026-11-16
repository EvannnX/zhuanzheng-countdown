import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ItemKind } from '../../shared/tasks.ts';

export const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
export type Paint = string | THREE.Material;

const paints = new Map<string, THREE.Material>();
const geometries = new Map<string, THREE.BufferGeometry>();

/** Cached materials are shared, so static meshes using them can be merged into one draw call. */
function cached<T extends THREE.Material>(key: string, make: () => T, noShadow = false): T {
  const hit = paints.get(key);
  if (hit) return hit as T;
  const made = make();
  made.userData = { merge: true, noShadow };
  paints.set(key, made);
  return made;
}

export const mat = (color: string): THREE.MeshLambertMaterial =>
  cached(`matte:${color}`, () => new THREE.MeshLambertMaterial({ color }));

/** Glossy plastic / metal. */
export const shiny = (color: string): THREE.MeshPhongMaterial =>
  cached(`shiny:${color}`, () => new THREE.MeshPhongMaterial({ color, shininess: 70, specular: '#777777' }));

/** Unlit, self-illuminated (screens, lamps, LEDs). */
export const glow = (color: string): THREE.MeshBasicMaterial =>
  cached(`glow:${color}`, () => new THREE.MeshBasicMaterial({ color }), true);

export const glass = (color = '#cfe9f6', opacity = 0.22): THREE.MeshPhongMaterial =>
  cached(
    `glass:${color}:${opacity}`,
    () => new THREE.MeshPhongMaterial({ color, transparent: true, opacity, shininess: 120, depthWrite: false }),
    true,
  );

const paint = (p: Paint): THREE.Material => (typeof p === 'string' ? mat(p) : p);

function geo(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const hit = geometries.get(key);
  if (hit) return hit;
  const made = make();
  geometries.set(key, made);
  return made;
}

function mesh(geometry: THREE.BufferGeometry, p: Paint, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geometry, paint(p));
  m.position.set(x, y, z);
  return m;
}

export const box = (w: number, h: number, d: number, p: Paint, x = 0, y = 0, z = 0): THREE.Mesh =>
  mesh(geo(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)), p, x, y, z);

/** Box with softened edges: the main trick that stops furniture looking like raw cubes. */
export function rbox(w: number, h: number, d: number, p: Paint, x = 0, y = 0, z = 0, radius = 0.03): THREE.Mesh {
  const r = Math.min(radius, w / 2.01, h / 2.01, d / 2.01);
  return mesh(geo(`rbox:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r)), p, x, y, z);
}

export const cyl = (rTop: number, rBottom: number, h: number, p: Paint, x = 0, y = 0, z = 0, sides = 18): THREE.Mesh =>
  mesh(geo(`cyl:${rTop}:${rBottom}:${h}:${sides}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, sides)), p, x, y, z);

export const ball = (r: number, p: Paint, x = 0, y = 0, z = 0): THREE.Mesh =>
  mesh(geo(`ball:${r}`, () => new THREE.SphereGeometry(r, 14, 10)), p, x, y, z);

/** Flat horizontal disc facing up. */
export function disc(r: number, p: Paint, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = mesh(geo(`disc:${r}`, () => new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2)), p, x, y, z);
  return m;
}

export function group(x: number, y: number, z: number, ...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (children.length > 0) g.add(...children);
  return g;
}

/** Rotate in place and return the same object (handy inside array literals). */
export function turn<T extends THREE.Object3D>(o: T, ry: number, rx = 0, rz = 0): T {
  o.rotation.set(rx, ry, rz);
  return o;
}

/** Deterministic pick so "random" clutter is identical for every player. */
export const pick = <T,>(items: readonly T[], seed: number): T => items[Math.abs(Math.floor(seed)) % items.length];

/**
 * Bake a static tree into one mesh per shared material. Everything that is not
 * mergeable (textured planes, sprites) is carried over untouched.
 */
export function mergeStatic(root: THREE.Object3D): THREE.Group {
  root.updateMatrixWorld(true);
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const loose: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (node instanceof THREE.Mesh && !Array.isArray(node.material) && node.material.userData.merge) {
      const flat = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
      flat.applyMatrix4(node.matrixWorld);
      buckets.set(node.material, [...(buckets.get(node.material) ?? []), flat]);
    } else if (node instanceof THREE.Mesh || node instanceof THREE.Sprite) {
      loose.push(node);
    }
  });
  const out = new THREE.Group();
  for (const [material, parts] of buckets) {
    const merged = new THREE.Mesh(mergeGeometries(parts), material);
    merged.castShadow = !material.userData.noShadow;
    merged.receiveShadow = !material.userData.noShadow;
    out.add(merged);
    for (const part of parts) part.dispose();
  }
  for (const node of loose) out.attach(node);
  return out;
}

function canvas2d(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

export function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Draw onto a fresh canvas and wrap it as a texture. */
export function paintTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(w, h);
  draw(ctx, w, h);
  return toTexture(canvas);
}

export interface TextStyle {
  readonly bg?: string;
  readonly fg?: string;
  readonly border?: string;
  readonly weight?: number;
  /** Self-lit (signs, screens) instead of reacting to room light. */
  readonly lit?: boolean;
}

const PX_PER_METER = 180;

/** A flat sign with (multi-line) text, facing +z. */
export function textPlane(text: string, w: number, h: number, style: TextStyle = {}): THREE.Mesh {
  const texture = paintTexture(Math.round(w * PX_PER_METER), Math.round(h * PX_PER_METER), (ctx, cw, ch) => {
    ctx.fillStyle = style.bg ?? '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    if (style.border) {
      ctx.strokeStyle = style.border;
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, cw, ch);
    }
    const lines = text.split('\n');
    const longest = Math.max(...lines.map((l) => l.length));
    const size = Math.min((ch * 0.72) / lines.length, (cw * 0.86) / Math.max(1, longest));
    ctx.font = `${style.weight ?? 800} ${size}px ${FONT}`;
    ctx.fillStyle = style.fg ?? '#222222';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, i) => ctx.fillText(line, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * size * 1.2));
  });
  const material = style.lit === false ? new THREE.MeshLambertMaterial({ map: texture }) : new THREE.MeshBasicMaterial({ map: texture });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
}

/** A camera-facing label (names, emoji icons). */
export function labelSprite(text: string, height: number, style: TextStyle = {}): THREE.Sprite {
  const size = 64;
  const probe = canvas2d(4, 4).ctx;
  probe.font = `800 ${size}px ${FONT}`;
  const pad = style.bg ? 28 : 6;
  const width = Math.ceil(probe.measureText(text).width) + pad * 2;
  const texture = paintTexture(width, size + pad * 2, (ctx, cw, ch) => {
    if (style.bg) {
      ctx.fillStyle = style.bg;
      ctx.beginPath();
      ctx.roundRect(0, 0, cw, ch, 26);
      ctx.fill();
    }
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (!style.bg) {
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(text, cw / 2, ch / 2 + 4);
    }
    ctx.fillStyle = style.fg ?? '#ffffff';
    ctx.fillText(text, cw / 2, ch / 2 + 4);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set((height * width) / (size + pad * 2), height, 1);
  return sprite;
}

/** Small prop shown in a hand or on a colleague's chest. */
export function makeItem(kind: ItemKind): THREE.Group {
  switch (kind) {
    case 'doc':
      return group(0, 0, 0, box(0.22, 0.012, 0.3, '#ffffff'), box(0.23, 0.01, 0.31, '#3b82f6', 0, -0.012, 0), box(0.14, 0.004, 0.02, '#94a3b8', 0, 0.008, -0.08), box(0.16, 0.004, 0.012, '#cbd5e1', 0, 0.008, -0.02), box(0.16, 0.004, 0.012, '#cbd5e1', 0, 0.008, 0.02));
    case 'coffee':
      return group(0, 0, 0, cyl(0.055, 0.042, 0.14, '#fafafa'), cyl(0.057, 0.057, 0.014, '#1f2937', 0, 0.075, 0), cyl(0.056, 0.05, 0.05, '#b45309', 0, -0.01, 0), cyl(0.05, 0.05, 0.004, '#5b3a22', 0, 0.066, 0));
    case 'parcel':
      return group(0, 0, 0, rbox(0.28, 0.2, 0.22, '#c99657', 0, 0, 0, 0.012), box(0.285, 0.202, 0.05, '#e9d7a8'), box(0.1, 0.07, 0.002, '#ffffff', 0.05, 0.02, 0.112));
    case 'milktea':
      return group(0, 0, 0, cyl(0.06, 0.045, 0.17, glass('#f1dcc0', 0.75)), cyl(0.05, 0.043, 0.06, '#3f2a1d', 0, -0.05, 0), cyl(0.062, 0.062, 0.012, '#fde68a', 0, 0.09, 0), cyl(0.008, 0.008, 0.2, '#e11d48', 0.015, 0.1, 0));
    default:
      return group(0, 0, 0, rbox(0.2, 0.26, 0.06, '#ef4444', 0, 0, 0, 0.02), box(0.14, 0.1, 0.062, '#fde047', 0, 0.02, 0), box(0.2, 0.02, 0.02, '#b91c1c', 0, 0.13, 0));
  }
}
