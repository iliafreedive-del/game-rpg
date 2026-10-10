// Small shared helpers. Pure functions only.
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
export const TAU = Math.PI * 2;
export const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

let seed = (Date.now() ^ 0x5bd1e995) >>> 0;
export function rand() { // mulberry32
  seed = (seed + 0x6D2B79F5) >>> 0; let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const setSeed = s => { seed = s >>> 0; };
export const rrange = (a, b) => a + rand() * (b - a);
export const rint = (a, b) => Math.floor(a + rand() * (b - a + 1));
export const pick = arr => arr[Math.floor(rand() * arr.length)];
export function weighted(entries) { // [[value, weight], ...]
  let tot = 0; for (const e of entries) tot += e[1];
  let r = rand() * tot; for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
  return entries[entries.length - 1][0];
}
let uidc = 0; export const uid = p => `${p || 'id'}${Date.now().toString(36)}${(uidc++).toString(36)}${Math.floor(rand() * 1e4).toString(36)}`;
export const fmt = n => Math.round(n).toLocaleString('ru-RU');
export const pct = n => `${Math.round(n * 100)}%`;
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many; if (b > 1 && b < 5) return few; if (b === 1) return one; return many;
}
export const $ = id => document.getElementById(id);
// П44 (правки 2): валюты картинками (ассеты GPT, assets/art/gpt/ui). Осколок Бездны вместо текстового «◆»: любая строка, вставленная
// через el(), получает иконку при выводе — сами строки (и их переводы в tools/i18n) остаются с «◆». alt — «♦», не «◆», чтобы не заменялся повторно
const UI = 'assets/art/gpt/ui/';
export const ICO = {
  shard: `<img class="ico ico-shard" src="${UI}shard_64.png" alt="♦" draggable="false">`,
  gold: `<img class="ico ico-gold" src="${UI}gold_64.png" alt="$" draggable="false">`,
  energy: `<img class="ico ico-en" src="${UI}energy_64.png" alt="⚡" draggable="false">`,
  pile: `<img class="ico-pile" src="${UI}shard_pile.png" alt="" draggable="false">`,
  big: `<img class="ico-big" src="${UI}shard_big.png" alt="" draggable="false">`,
};
export const shardify = h => typeof h === 'string' && h.includes('◆') ? h.replace(/◆/g, ICO.shard) : h;
export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = shardify(html); return e; }
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
