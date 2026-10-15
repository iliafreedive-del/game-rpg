// Icon helpers: atlas item icons → cached data URLs; drawn skill icons (assets/art/gpt).
import { getAtlas } from '../core/assets.js';
import { SKILLS, BRANCHES } from '../data/skills.js';
import { ART, ITEM_ART, GOLD_ICO, artImg, withArt, gearArt } from './art.js';
import { iconOf } from '../game/items.js';

const cache = new Map();
export function iconURL(name, size = 96) {
  if (name === 'gold') return GOLD_ICO;
  if (ITEM_ART[name]) return ART.item(ITEM_ART[name]);   // нарисованные зелья и свиток; значок из атласа не показываем и пока они грузятся (15 октября)
  const k = name + '@' + size; if (cache.has(k)) return cache.get(k);
  const A = getAtlas('icons'); if (!A || !A.frames[name]) return '';
  const [si, sx, sy, w, h] = A.frames[name];
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const s = Math.min(size / w, size / h) * 0.95; x.drawImage(A.sheets[si], sx, sy, w, h, (size - w * s) / 2, (size - h * s) / 2, w * s, h * s);
  const url = c.toDataURL(); cache.set(k, url); return url;
}
// значок вещи: нарисованный рисунок по виду и редкости, иначе прежний из атласа
export const itemURL = it => gearArt(it) || iconURL(iconOf(it));
export function drawIcon(canvas, name) {
  const A = getAtlas('icons'); const x = canvas.getContext('2d'); x.clearRect(0, 0, canvas.width, canvas.height);
  canvas.dataset.ic = name;
  if (name === 'gold') { const r = artImg(GOLD_ICO); if (r.ok) { const S = canvas.width; x.drawImage(r.im, S * 0.1, S * 0.1, S * 0.8, S * 0.8); } else withArt(GOLD_ICO, () => { if (canvas.dataset.ic === name) drawIcon(canvas, name); }); return; }
  if (ITEM_ART[name]) { const r = artImg(ART.item(ITEM_ART[name])); if (r.ok) { const S = canvas.width; x.drawImage(r.im, S * 0.02, S * 0.02, S * 0.96, S * 0.96); return; } withArt(ART.item(ITEM_ART[name]), () => { if (canvas.dataset.ic === name) drawIcon(canvas, name); }); return; }
  if (!A || !A.frames[name]) return;
  const [si, sx, sy, w, h] = A.frames[name]; const S = canvas.width; const s = Math.min(S / w, S / h) * 0.95;
  x.drawImage(A.sheets[si], sx, sy, w, h, (S - w * s) / 2, (S - h * s) / 2, w * s, h * s);
}
const COL = { sword: ['#f1d9a2', '#6a4a1a'], bow: ['#c6ef9a', '#2e5a1a'], fire: ['#ffd08a', '#a0280a'], ice: ['#dff6ff', '#1a5a8a'], light: ['#efe6ff', '#4a2a9a'] };
export function skillIcon(canvas, id, dim) {
  const x = canvas.getContext('2d'); const S = canvas.width; x.clearRect(0, 0, S, S);
  const sk = SKILLS[id]; if (!sk) return; const c2 = COL[sk.b][1];
  // сборка 58: нарисованная иконка навыка (assets/art/gpt/skills)
  canvas.dataset.sk = id + (dim ? ':d' : '');
  const art = artImg(ART.skill(id));
  if (art.ok) { x.drawImage(art.im, 0, 0, S, S); x.strokeStyle = '#000a'; x.lineWidth = 2; x.strokeRect(1, 1, S - 2, S - 2); if (dim) { x.fillStyle = '#0009'; x.fillRect(0, 0, S, S); } return; }
  withArt(ART.skill(id), () => { if (canvas.dataset.sk === id + (dim ? ':d' : '')) skillIcon(canvas, id, dim); });
  // 15 октября: пока картинка грузится — тёмная плашка цвета ветки, без прежнего процедурного значка (мелькал старый «C» вихря)
  const g = x.createRadialGradient(S * 0.45, S * 0.38, S * 0.05, S / 2, S / 2, S * 0.7); g.addColorStop(0, c2); g.addColorStop(1, '#0a0608');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.strokeStyle = '#000a'; x.lineWidth = 2; x.strokeRect(1, 1, S - 2, S - 2);
  if (dim) { x.fillStyle = '#0009'; x.fillRect(0, 0, S, S); }
}
export function skillCanvas(id, size = 72, dim) { const c = document.createElement('canvas'); c.width = c.height = size; skillIcon(c, id, dim); return c; }
// значок ветки (Меч, Лук, Огонь, Лёд, Молния) — маленькая картинка рядом с названием ветки
export const branchImg = (b, size = 18) => `<img class="br-ic" src="${ART.branch(b)}" alt="" width="${size}" height="${size}" onerror="this.remove()">`;
export { BRANCHES };
