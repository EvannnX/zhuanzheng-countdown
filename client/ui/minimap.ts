import { LANES, ROADS, vehiclesAt } from '../../shared/hazards.ts';
import type { Snapshot } from '../../shared/protocol.ts';
import { AREAS, DOORS, ROOMS, areaAt, areaById, stationById } from '../../shared/world.ts';
import type { Area } from '../../shared/world.ts';
import { byId } from './dom.ts';

const WIDTH = 286;
const HEIGHT = 168;
const PAD = 6;
const NPC_COLORS: Record<string, string> = { boss: '#ef4444', hr: '#a855f7' };
const SHORT_NAMES: Partial<Record<string, string>> = { office: '工位区', director: '总监室' };

export interface Minimap {
  /** `time` is the shared room clock, so traffic dots match the 3D view. */
  draw(snap: Snapshot, self: { x: number; z: number; yaw: number }, time: number): void;
}

const inside = (a: Area, x: number, z: number): boolean => x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1;

export function createMinimap(): Minimap {
  const canvas = byId<HTMLCanvasElement>('minimap');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');

  return {
    draw(snap, self, time) {
      // Only the place you are standing in is drawn, scaled to fill the map.
      const area = areaById(areaAt(self) ?? 'office');
      const scale = Math.min((WIDTH - PAD * 2) / (area.x1 - area.x0), (HEIGHT - PAD * 2) / (area.z1 - area.z0));
      const ox = (WIDTH - (area.x1 - area.x0) * scale) / 2;
      const oz = (HEIGHT - (area.z1 - area.z0) * scale) / 2;
      const px = (x: number): number => ox + (x - area.x0) * scale;
      const pz = (z: number): number => oz + (z - area.z0) * scale;
      const dot = (x: number, z: number, radius: number, color: string): void => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px(x), pz(z), radius, 0, Math.PI * 2);
        ctx.fill();
      };

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.font = '700 10px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const room of ROOMS) {
        if (!inside(area, (room.x0 + room.x1) / 2, (room.z0 + room.z1) / 2)) continue;
        ctx.fillStyle = room.floor;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(px(room.x0), pz(room.z0), (room.x1 - room.x0) * scale, (room.z1 - room.z0) * scale);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px(room.x0), pz(room.z0), (room.x1 - room.x0) * scale, (room.z1 - room.z0) * scale);
        ctx.fillStyle = 'rgba(17,24,39,0.7)';
        if (room.id !== 'corridor') ctx.fillText(SHORT_NAMES[room.id] ?? room.name, px((room.x0 + room.x1) / 2), pz((room.z0 + room.z1) / 2));
      }
      if (area.id === 'street') {
        ctx.fillStyle = '#4b5563';
        for (const road of ROADS) ctx.fillRect(px(area.x0), pz(road.z0), (area.x1 - area.x0) * scale, (road.z1 - road.z0) * scale);
      }
      ctx.fillStyle = '#dc2626';
      for (const lane of LANES) {
        if (lane.area !== area.id) continue;
        for (const x of vehiclesAt(lane, time)) {
          if (x > area.x0 && x < area.x1) ctx.fillRect(px(x - lane.length / 2), pz(lane.z) - 2, lane.length * scale, 4);
        }
      }
      ctx.strokeStyle = '#ff7a2f';
      ctx.lineWidth = 3;
      for (const door of DOORS) {
        if (area.id !== 'office') break;
        ctx.beginPath();
        if (door.axis === 'z') {
          ctx.moveTo(px(door.from), pz(door.at));
          ctx.lineTo(px(door.to), pz(door.at));
        } else {
          ctx.moveTo(px(door.at), pz(door.from));
          ctx.lineTo(px(door.at), pz(door.to));
        }
        ctx.stroke();
      }
      const zhang = stationById('zhang');
      if (area.id === 'office' && zhang) {
        dot(zhang.ax, zhang.az, 4, '#b45309');
        ctx.fillStyle = '#7c2d12';
        ctx.fillText('老张', px(zhang.ax), pz(zhang.az) - 9);
      }

      const pulse = 4 + Math.sin(time * 5) * 1.5;
      for (const task of snap.you.tasks) {
        const st = task.target ? stationById(task.target) : undefined;
        if (st && inside(area, st.x, st.z)) dot(st.x, st.z, pulse, '#facc15');
      }
      for (const p of snap.players) {
        if (p.id !== snap.you.id && inside(area, p.x, p.z)) dot(p.x, p.z, 3, p.fired ? '#94a3b8' : '#2563eb');
      }
      for (const n of snap.npcs) {
        const hunting = snap.you.chased && NPC_COLORS[n.id];
        if ((snap.you.hasIntel || hunting) && NPC_COLORS[n.id] && inside(area, n.x, n.z)) dot(n.x, n.z, 4.5, NPC_COLORS[n.id]);
      }

      ctx.save();
      ctx.translate(px(self.x), pz(self.z));
      ctx.rotate(-self.yaw);
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.lineTo(4.5, -5);
      ctx.lineTo(-4.5, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = 'rgba(17,24,39,0.85)';
      ctx.textAlign = 'left';
      ctx.fillText(AREAS.find((a) => a.id === area.id)?.name ?? '', 6, HEIGHT - 8);
    },
  };
}
