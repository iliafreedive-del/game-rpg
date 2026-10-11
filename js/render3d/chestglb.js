// Открытый сундук из модели (правки 4, П4-9/П4-13): у сундука пустошей (chest_hide) есть только закрытая модель — открытый
// выглядел закрытым. Крышка (треугольники выше шва seam) отрезается и откидывается на петлях у задней кромки (back — z петель),
// стенки ниже шва обрезаются по шву; проём — тёмная полость с монетами и самоцветами (chestInside из _chest.js), так что срез
// не выглядит дырой. inside({ w, d, cx, cz, y0, y1 }) — только полость (у храмового открытого сундука крышка уже откинута).
import * as THREE from '../vendor/three.module.min.js';
import { part, merge } from './geo.js';
import { toon } from './toon.js';
import { shared } from './dispose.js';
import { chestInside } from './models/prop/_chest.js';

let MAT = null;
const mat = () => MAT || (MAT = toon(0xffffff, { vc: true, rim: 0.2, rimColor: 0xffd8a8, ao: 0.7, aoH: 1.2, tex: true }));

const GEO = new Map();
export function insideMesh(o) {
  const key = JSON.stringify(o);
  if (!GEO.has(key)) { const g = merge(chestInside(THREE, part, { trim: false, ...o })); g.translate(o.cx || 0, 0, o.cz || 0); GEO.set(key, shared(g)); }
  return new THREE.Mesh(GEO.get(key), mat());
}

// треугольник внутри полости (свои внутренние грани модели — светлые пятна поверх тёмного дна): убрать
const inside = (p, t, o) => { const x = (p.getX(t) + p.getX(t + 1) + p.getX(t + 2)) / 3 - (o.cx || 0), y = (p.getY(t) + p.getY(t + 1) + p.getY(t + 2)) / 3, z = (p.getZ(t) + p.getZ(t + 1) + p.getZ(t + 2)) / 3 - (o.cz || 0);
  return Math.abs(x) < o.w / 2 - 0.01 && Math.abs(z) < o.d / 2 - 0.01 && y > o.y0 && y < o.y1; };
// geometry — закрытая модель; seam — высота шва крышки; back — z петель; ang — угол откидывания; inner — полость (как в insideMesh)
export function openGeometry(geometry, { seam, back, ang = 1.9, inner = null }) {
  const src = geometry.index ? geometry.toNonIndexed() : geometry, pos = src.attributes.position, n = pos.count;
  const body = [], lid = [];
  // крышке — треугольники выше шва; и те, у которых выше шва две вершины, а третья чуть ниже (иначе их сплющит в «заплатку» на проёме)
  for (let t = 0; t < n; t += 3) { const y = [pos.getY(t), pos.getY(t + 1), pos.getY(t + 2)], up = y.filter(v => v > seam).length; if (up === 3 || (up === 2 && Math.min(...y) > seam - 0.08)) lid.push(t); else if (!(inner && inside(pos, t, inner))) body.push(t); }
  const pick = (list, f) => {
    const g = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(src.attributes)) {
      const out = new a.array.constructor(list.length * 3 * a.itemSize);
      list.forEach((t, i) => { for (let v = 0; v < 3; v++) for (let c = 0; c < a.itemSize; c++) out[(i * 3 + v) * a.itemSize + c] = a.array[(t + v) * a.itemSize + c]; });
      g.setAttribute(k, new THREE.BufferAttribute(out, a.itemSize, a.normalized));
    }
    f(g); return g;
  };
  const B = pick(body, g => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > seam) p.setY(i, seam); });
  const L = pick(lid, g => { g.translate(0, -seam, -back); g.rotateX(back < 0 ? -ang : ang); g.translate(0, seam, back); });
  return { body: B, lid: L };
}
