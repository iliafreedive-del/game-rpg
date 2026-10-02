// Походы, раунд 2: «Схрон» (вынос ноши за плату), «Эхо» (могилы павших героев) и «Поле помнит» (поле подстраивается под стиль игры).
// Состояние — profile.wild[realm].mem / .echo / .echoDone (создаётся лениво).
import { G, bus } from './ctx.js';
import { NPC } from './entities.js';
import { Atlas, getAtlas, loadGroup, putAtlas } from '../core/assets.js';
import { wildState } from './wild.js';
import { bankCarry } from './nemesis.js';
import { hint } from './wildhints.js';
import * as L from './loot.js';
import * as C from './combat.js';
import { rint, rand } from '../core/util.js';
import { REALMS, WILD_MOBS } from '../data/wild.js';

export const CACHE_FEE = 0.15, CACHE_FEE_GREEDY = 0.25;

// ------------------------------------------------------------------ Поле помнит
export const memOf = realm => { const S = wildState(realm); return S.mem = S.mem || { melee: 0, ranged: 0, deaths: 0, greedy: 0 }; };
export function fieldTraits(realm) {
  const m = memOf(realm), t = [], n = m.melee + m.ranged;
  if (n >= 10 && m.ranged / n >= 0.6) t.push({ id: 'ranged', line: 'Поле помнит: вы бьёте издалека — в лагерях больше быстрых тварей' });
  else if (n >= 10 && m.melee / n >= 0.6) t.push({ id: 'melee', line: 'Поле помнит: вы любите ближний бой — в лагерях больше стрелков и колдунов' });
  if (m.greedy >= 2) t.push({ id: 'greedy', line: `Поле помнит вашу жадность: схрон берёт ${CACHE_FEE_GREEDY * 100}%` });
  if (m.deaths >= 2) t.push({ id: 'pity', line: 'Поле смилостивилось: на один лагерь меньше, в тайниках больше зелий' });
  return t;
}
export const cacheFee = () => (G.wild && G.wild.mem && G.wild.mem.some(t => t.id === 'greedy')) ? CACHE_FEE_GREEDY : CACHE_FEE;

// Правит список спавнов до создания мобов; возвращает применённые черты.
export function applyFieldMemory(json) {
  const { realm, depth } = json.wild, tr = fieldTraits(realm), RL = REALMS[realm];
  const camps = json.spawns.filter(s => !s[6]);
  const types = ai => RL.pool.filter(([t, d]) => d <= depth && ai.includes(WILD_MOBS[t].ai)).map(([t]) => t);
  const extra = list => { if (!list.length) return; camps.slice(0, 4).forEach((s, i) => json.spawns.push([list[i % list.length], s[1], s[2], 1, 2.5, s[5]])); };
  for (const t of tr) {
    if (t.id === 'ranged') extra(types(['pack', 'charge']));
    if (t.id === 'melee') extra(types(['archer', 'caster', 'root']));
    if (t.id === 'pity' && camps.length > 4) { const k = camps[(depth * 3) % camps.length]; json.spawns.splice(json.spawns.indexOf(k), 1); json.wild.pity = true; }
  }
  json.wild.memTraits = tr; return tr;
}
bus.on('kill', e => {
  if (G.zoneId !== 'wild' || !G.wild || e.summoned) return;
  const m = memOf(G.wild.realm); if (e.lastSrc === 'melee') m.melee++; else m.ranged++;
  if (e.story === 'wildkeep' || e.story === 'wildboss') { m.deaths = 0; m.greedy = Math.max(0, m.greedy - 1); }
});
bus.on('wildLeave', ({ carry, cap }) => { if (G.wild && carry / cap >= 0.6) memOf(G.wild.realm).greedy++; });
bus.on('wildDied', ({ lost, x, y }) => {
  const W = G.wild; if (!W) return; memOf(W.realm).deaths++;
  wildState(W.realm).echo = { depth: W.depth, x, y, lost, at: Date.now() };
});
bus.on('zoneEntered', id => {
  if (id !== 'wild' || !G.wild) return;
  G.wild.mem = G.zone.json.wild.memTraits || [];
  const lines = G.wild.mem.map(t => t.line); if (!lines.length) return;
  setTimeout(() => { if (G.zoneId === 'wild') bus.emit('toast', { text: lines[0], sub: lines.slice(1).join(' · '), kind: 'quest' }); }, 3200);
  updateCacheLabels();
});

// ------------------------------------------------------------------ Схрон
function updateCacheLabels() {
  if (!G.zone) return; const p = Math.round(cacheFee() * 100);
  for (const it of G.zone.inter) if (it.type === 'cache') it.label = `Схрон: вынести ношу (−${p}%)`;
}
export function useCache(it) {
  const W = G.wild; if (!W) return; const c = W.carry || 0;
  if (c < 10) { bus.emit('toast', { text: 'Схрон ждёт', sub: 'Соберите золото — схрон безопасно вынесет ношу, даже посреди поля', kind: 'warn' }); bus.emit('sfx', 'deny'); return; }
  const fee = Math.max(1, Math.round(c * cacheFee()));
  W.carry = c - fee; W.cached = (W.cached || 0) + (c - fee); wildState(W.realm).stat.cached = (wildState(W.realm).stat.cached || 0) + 1;
  C.particles(it.x, it.y, 14, { c: [255, 210, 120], sp: 2, size: 3 });
  bankCarry(`Схрон взял ${fee} зол. за вынос`);
}
bus.on('wildCarry', () => {
  const W = G.wild; if (!W || G.zoneId !== 'wild') return;
  if (W.greed >= 0.25) hint('cache');
});
// Ближайший схрон — для строки цели
export function nearestCache() {
  if (!G.zone || !G.player) return null; let b = null, bd = 1e9;
  for (const it of G.zone.inter) if (it.type === 'cache') { const d = Math.hypot(it.x - G.player.x, it.y - G.player.y); if (d < bd) { bd = d; b = it; } }
  return b ? { it: b, d: bd } : null;
}

// ------------------------------------------------------------------ Эхо
// Эхо — полупрозрачные силуэты «других игроков» (воин / лучник / маг) с придуманным ником. Настоящих игроков нет:
// ник и класс выводятся из глубины поля, поэтому одно и то же поле показывает тех же «игроков». Своё Эхо — силуэт вашего класса.
const NICK_A = ['Dark', 'Ледо', 'Тень', 'Frost', 'Волк', 'Killer', 'Мрак', 'Rage', 'Сокол', 'Nord', 'Берс', 'Ghost', 'Лютый', 'Кроно', 'Mega', 'Тихий', 'Iron', 'Дракон'];
const NICK_B = ['Slayer', 'рубака', 'Hunter', 'стрел', 'Mage', 'хан', 'Lord', 'боец', 'Wolf', 'ёж', 'Blade', 'Вася', 'Master', 'ник', 'Boss', 'Лис', 'Rider', 'Макс'];
export function nickname(seed) {
  const h = k => { let x = (seed * 2654435761 + k * 40503) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; return (x ^ (x >>> 13)) >>> 0; };
  const a = NICK_A[h(1) % NICK_A.length], b = NICK_B[h(2) % NICK_B.length], d = 10 + h(3) % 90;
  switch (h(4) % 6) { case 0: return a + b; case 1: return `${a}_${b}`; case 2: return `${a}${b}${d}`; case 3: return `xX_${a}_Xx`; case 4: return `${a.toLowerCase()}${d}`; default: return `${b}${h(5) % 2 ? '_' : ''}${a}`; }
}
const ECHO_CLS = ['warrior', 'archer', 'mage'], ECHO_ATLAS = { warrior: 'hero_body', archer: 'hero_archer_body', mage: 'hero_mage_body' };
const DIRS = ['на востоке', 'на юго-востоке', 'на юге', 'на юго-западе', 'на западе', 'на северо-западе', 'на севере', 'на северо-востоке'];
export const dirWord = (dx, dy) => DIRS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
// Добавляет в json поля могилы: своё Эхо (если здесь пали) и до двух Эхо «странников»; первое стоит у самого опасного лагеря.
export function addEchoes(json) {
  const { realm, depth } = json.wild, S = wildState(realm), solid = (x, y) => (json.rows[Math.floor(y)] || '')[Math.floor(x)] !== '.';
  const mine = S.echo;
  if (mine && mine.depth === depth && !solid(mine.x, mine.y)) json.objects.push({ t: 'echo', id: 'echo_me', x: mine.x, y: mine.y, mine: true, lost: mine.lost, cls: G.profile.cls || 'warrior' });
  const camps = json.spawns.filter(s => !s[6]).sort((a, b) => (WILD_MOBS[b[0]].ai === 'giant') - (WILD_MOBS[a[0]].ai === 'giant') || (WILD_MOBS[b[0]].charge ? 1 : 0) - (WILD_MOBS[a[0]].charge ? 1 : 0));
  const base = depth * 31 + (realm === 'fjord' ? 7 : 3);
  for (let n = 0; n < 2 && n < camps.length; n++) {
    const id = 'echo_' + n, key = realm + depth + ':' + n; if ((S.echoDone || {})[key]) continue;
    const c = camps[n], seed = base + n * 977;
    for (let k = 0; k < 24; k++) {
      const a = ((seed + k * 5) % 16) * Math.PI / 8, r = 7 + (k % 3), x = c[1] + Math.cos(a) * r, y = c[2] + Math.sin(a) * r;
      if (json.objects.some(o => (o.t === 'cache' || o.t === 'echo') && Math.hypot(o.x - x, o.y - y) < 5) || solid(x, y) || solid(x + 0.7, y) || solid(x, y + 0.7) || Math.hypot(x - json.start[0], y - json.start[1]) < 8) continue;
      json.objects.push({ t: 'echo', id, key, x, y, name: nickname(seed), cls: ECHO_CLS[seed % 3], lvl: json.level + (seed % 3), mob: WILD_MOBS[c[0]].name, dir: dirWord(c[1] - x, c[2] - y), tip: n === 0 }); break;
    }
  }
}
// Силуэт: тело героя нужного класса × «призрачный» фильтр (без оружия). Регистрируется как атлас npc_echo_<класс>, рисуется как NPC.
const GHOST = 'grayscale(1) brightness(1.7) sepia(1) hue-rotate(165deg) saturate(2.2) opacity(.6)';
async function ghostAtlas(cls) {
  const name = 'npc_echo_' + cls; if (getAtlas(name)) return name;
  await loadGroup([ECHO_ATLAS[cls]]); const B = getAtlas(ECHO_ATLAS[cls]); if (!B) return null;
  const sheets = B.sheets.map(im => { const c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height; const x = c.getContext('2d'); x.filter = GHOST; x.drawImage(im, 0, 0); return c; });
  putAtlas(name, new Atlas(name, B.meta, sheets)); return name;
}
bus.on('zoneEntered', async id => {
  if (id !== 'wild' || !G.zone) return;
  for (const it of G.zone.inter.filter(i => i.type === 'echo')) {
    const at = await ghostAtlas(it.cls || 'warrior'); if (!at || G.zoneId !== 'wild') continue;
    it.draw.hidden = true;   // вместо костей — силуэт игрока
    const n = new NPC({ id: 'echo_' + it.cls, name: it.mine ? 'Ваше эхо' : `${it.name} · ур. ${it.lvl}`, x: it.x, y: it.y - 0.2, marker: '✦', echoFor: it });
    n.anim.play('idle', 4, 5, true); G.npcs.push(n); it.npc = n;
    const upd = n.update.bind(n); n.update = (dt, P) => { upd(dt, P); if (Math.hypot(P.x - n.x, P.y - n.y) < 7) hint('echo'); };
  }
});
export function useEcho(it) {
  const W = G.wild; if (!W || it.done) return;
  it.done = true; it.draw.hidden = true; if (it.light) it.light.on = false; bus.emit('sfx', 'rareDrop');
  if (it.npc) G.npcs = G.npcs.filter(n => n !== it.npc);
  C.particles(it.x, it.y, 16, { c: [150, 210, 255], sp: 2, size: 3 });
  const lvl = G.zone.json.level, S = wildState(W.realm);
  if (it.mine) {
    const back = Math.round(it.lost * 0.25) || rint(5, 12); delete S.echo;
    for (let i = 0; i < 3; i++) L.dropGold(it.x, it.y + 0.6, back / 3 / (G.stats.goldFind ? 1 + G.stats.goldFind / 100 : 1));
    bus.emit('toast', { text: 'Эхо вашего падения', sub: `Часть потерянного вернулась: ~${back} зол. (четверть ноши)`, kind: 'good' });
  } else {
    (S.echoDone = S.echoDone || {})[it.key] = 1;
    for (let i = 0; i < 3; i++) L.dropGold(it.x, it.y + 0.6, rint(4, 8) * (1 + 0.15 * (lvl - 1)));
    if (rand() < 0.5) L.dropPotion(it.x, it.y + 0.6, 'hp');
    bus.emit('toast', { text: `Эхо игрока ${it.name}, ур. ${it.lvl}`, sub: it.tip ? `«Меня сгубил ${it.mob.toLowerCase()} — он ${it.dir}. Берегись!» Рядом осталось немного золота` : 'Игрок прошёл здесь раньше и оставил немного золота', kind: 'quest' });
  }
  hint('echo'); bus.emit('save');
}
