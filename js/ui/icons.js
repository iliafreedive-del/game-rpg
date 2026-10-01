// Icon helpers: atlas item icons → cached data URLs; procedural skill icons in the same palette.
import { getAtlas } from '../core/assets.js';
import { SKILLS, BRANCHES } from '../data/skills.js';

const cache = new Map();
export function iconURL(name, size = 96) {
  const k = name + '@' + size; if (cache.has(k)) return cache.get(k);
  const A = getAtlas('icons'); if (!A || !A.frames[name]) return '';
  const [si, sx, sy, w, h] = A.frames[name];
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const s = Math.min(size / w, size / h) * 0.95; x.drawImage(A.sheets[si], sx, sy, w, h, (size - w * s) / 2, (size - h * s) / 2, w * s, h * s);
  const url = c.toDataURL(); cache.set(k, url); return url;
}
export function drawIcon(canvas, name) {
  const A = getAtlas('icons'); const x = canvas.getContext('2d'); x.clearRect(0, 0, canvas.width, canvas.height);
  if (!A || !A.frames[name]) return;
  const [si, sx, sy, w, h] = A.frames[name]; const S = canvas.width; const s = Math.min(S / w, S / h) * 0.95;
  x.drawImage(A.sheets[si], sx, sy, w, h, (S - w * s) / 2, (S - h * s) / 2, w * s, h * s);
}
const COL = { sword: ['#f1d9a2', '#6a4a1a'], bow: ['#c6ef9a', '#2e5a1a'], fire: ['#ffd08a', '#a0280a'], ice: ['#dff6ff', '#1a5a8a'], light: ['#efe6ff', '#4a2a9a'] };
const GLYPH = {
  blade_mastery: 'blade', whirlwind: 'whirl', cleave: 'arc', bloodletting: 'drop', crush: 'hammer',
  marksman: 'eye', volley: 'fan', pierce: 'arrow', quickstring: 'arrows2', explosive: 'burst',
  heat: 'flame', fireball: 'ball', ignite_plus: 'flame2', fire_spread: 'spread', burn_explode: 'burst',
  cold: 'flake', ice_shard: 'shard', deep_cold: 'flake2', ice_armor: 'shield', shatter: 'crack',
  static: 'spark', chain: 'chain', conduct: 'ring', overload: 'spark2', thunder: 'bolt',
  leap: 'hammer', warcry: 'burst', pierce_shot: 'arrow', arrow_rain: 'fan', meteor: 'ball', frost_nova: 'flake2',
};
export function skillIcon(canvas, id, dim) {
  const x = canvas.getContext('2d'); const S = canvas.width; x.clearRect(0, 0, S, S);
  const sk = SKILLS[id]; if (!sk) return; const [c1, c2] = COL[sk.b];
  const g = x.createRadialGradient(S * 0.45, S * 0.38, S * 0.05, S / 2, S / 2, S * 0.7); g.addColorStop(0, c2); g.addColorStop(1, '#0a0608');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.strokeStyle = c1; x.fillStyle = c1; x.lineWidth = S * 0.07; x.lineCap = 'round'; x.lineJoin = 'round';
  x.shadowColor = c1; x.shadowBlur = S * 0.15;
  const c = S / 2, r = S * 0.3; const P = (...pts) => { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.stroke(); };
  switch (GLYPH[id]) {
    case 'blade': P(S * .25, S * .75, S * .72, S * .28); P(S * .3, S * .58, S * .42, S * .7); break;
    case 'whirl': x.beginPath(); x.arc(c, c, r, 0.3, 5.5); x.stroke(); P(c + r, c - 4, c + r, c + r * .4, c + r * .6, c); break;
    case 'arc': x.beginPath(); x.arc(c, c * 1.3, r * 1.2, 3.6, 5.8); x.stroke(); break;
    case 'drop': x.beginPath(); x.moveTo(c, S * .2); x.quadraticCurveTo(S * .78, S * .62, c, S * .8); x.quadraticCurveTo(S * .22, S * .62, c, S * .2); x.fill(); break;
    case 'hammer': x.fillRect(S * .3, S * .22, S * .4, S * .2); P(c, S * .42, c, S * .8); break;
    case 'eye': x.beginPath(); x.ellipse(c, c, r, r * .55, 0, 0, 7); x.stroke(); x.beginPath(); x.arc(c, c, r * .3, 0, 7); x.fill(); break;
    case 'fan': for (const a of [-.5, 0, .5]) P(S * .25, S * .75, S * .25 + Math.cos(-0.8 + a) * r * 1.8, S * .75 + Math.sin(-0.8 + a) * r * 1.8); break;
    case 'arrow': P(S * .2, S * .8, S * .8, S * .2); P(S * .6, S * .2, S * .8, S * .2, S * .8, S * .4); break;
    case 'arrows2': P(S * .2, S * .7, S * .7, S * .2); P(S * .3, S * .8, S * .8, S * .3); break;
    case 'burst': for (let i = 0; i < 8; i++) { const a = i * .785; P(c + Math.cos(a) * r * .4, c + Math.sin(a) * r * .4, c + Math.cos(a) * r * 1.2, c + Math.sin(a) * r * 1.2); } break;
    case 'flame': case 'flame2': x.beginPath(); x.moveTo(c, S * .15); x.quadraticCurveTo(S * .85, S * .55, c, S * .85); x.quadraticCurveTo(S * .15, S * .55, c, S * .15); x.fill(); if (GLYPH[id] === 'flame2') { x.fillStyle = '#fff'; x.beginPath(); x.arc(c, S * .6, S * .1, 0, 7); x.fill(); } break;
    case 'ball': x.beginPath(); x.arc(c * 1.1, c * .9, r * .75, 0, 7); x.fill(); P(S * .2, S * .8, S * .45, S * .55); P(S * .15, S * .6, S * .35, S * .5); break;
    case 'spread': for (const [dx, dy] of [[0, 0], [-.22, .2], [.22, .2]]) { x.beginPath(); x.arc(c + dx * S, c + dy * S - S * .05, S * .1, 0, 7); x.fill(); } break;
    case 'flake': case 'flake2': for (let i = 0; i < 3; i++) { const a = i * 1.047; P(c - Math.cos(a) * r, c - Math.sin(a) * r, c + Math.cos(a) * r, c + Math.sin(a) * r); } if (GLYPH[id] === 'flake2') { x.beginPath(); x.arc(c, c, r * .35, 0, 7); x.stroke(); } break;
    case 'shard': x.beginPath(); x.moveTo(S * .8, S * .2); x.lineTo(S * .45, S * .4); x.lineTo(S * .2, S * .8); x.lineTo(S * .6, S * .55); x.closePath(); x.fill(); break;
    case 'shield': x.beginPath(); x.moveTo(c, S * .15); x.lineTo(S * .8, S * .28); x.quadraticCurveTo(S * .78, S * .7, c, S * .86); x.quadraticCurveTo(S * .22, S * .7, S * .2, S * .28); x.closePath(); x.stroke(); break;
    case 'crack': P(S * .3, S * .15, S * .5, S * .45, S * .35, S * .6, S * .6, S * .85); P(S * .5, S * .45, S * .75, S * .4); break;
    case 'spark': case 'spark2': P(S * .55, S * .12, S * .35, S * .52, S * .6, S * .5, S * .42, S * .88); if (GLYPH[id] === 'spark2') { x.beginPath(); x.arc(S * .72, S * .25, S * .06, 0, 7); x.fill(); } break;
    case 'chain': for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(S * (.28 + i * .22), S * (.7 - i * .2), S * .12, S * .07, -.8, 0, 7); x.stroke(); } break;
    case 'ring': x.beginPath(); x.arc(c, c, r, 0, 7); x.stroke(); x.beginPath(); x.arc(c, c, r * .45, 0, 7); x.stroke(); break;
    case 'bolt': P(S * .6, S * .1, S * .3, S * .5, S * .55, S * .5, S * .35, S * .9); P(S * .75, S * .35, S * .65, S * .55); break;
  }
  x.shadowBlur = 0; x.strokeStyle = '#000a'; x.lineWidth = 2; x.strokeRect(1, 1, S - 2, S - 2);
  if (dim) { x.fillStyle = '#0009'; x.fillRect(0, 0, S, S); }
}
export function skillCanvas(id, size = 72, dim) { const c = document.createElement('canvas'); c.width = c.height = size; skillIcon(c, id, dim); return c; }
export { BRANCHES };
