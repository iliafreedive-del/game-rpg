// HUD: bars, tracker, gold, buffs, boss bar, toasts, touch controls, minimap.
import { G, bus, inCombat } from '../game/ctx.js';
import { $, el, esc, fmt } from '../core/util.js';
import { input, resetBase, mouse } from '../core/input.js';
import { xpToNext } from '../game/stats.js';
import { SKILLS } from '../data/skills.js';
import { WEAPONS, RARITY } from '../data/items.js';
import { CHAPTER, STORY, chapterOf } from '../data/quests.js';
import * as Q from '../game/quests.js';
import * as C from '../game/combat.js';
import { interact, usePotion, useScroll } from '../game/game.js';
import { drawIcon, skillIcon, iconURL } from './icons.js';
import { iconOf } from '../game/items.js';
import { dailyStatus, chestStatus, blessLeft, blessTick } from '../platform/monetize.js';
import { seasonClaimable, nextGoalLine } from '../game/season.js';
import { dailyReady } from '../game/daily.js';
import { BOONS } from '../data/boons.js';
import { openWindow, pumpRewards } from './windows.js';
import * as CS from '../game/castle.js';
import { hwReady } from './herospath.js';
import { skillCanvas } from './icons.js';
const skillCanvasInto = (cv, id) => { const s = skillCanvas(id, cv.width, false); const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(s, 0, 0, cv.width, cv.height); };
import * as SV from '../game/survival.js';
import * as HU from '../game/hunts.js';

let lastHud = 0, trackOpenUntil = 0;
export function initHUD() {
  $('ui').classList.remove('hidden'); requestAnimationFrame(resetBase);
  // menu
  for (const b of document.querySelectorAll('[data-open]')) b.onclick = () => { bus.emit('sfx', 'click'); openWindow(b.dataset.open); };
  $('btnMenu').onclick = () => { bus.emit('sfx', 'click'); openWindow('menu'); };
  $('portrait').onclick = () => openWindow('character');
  $('huntBox').onclick = () => { bus.emit('sfx', 'click'); openWindow('journal', { tab: 'hunt' }); };
  bus.on('huntNew', () => { const b = $('huntBox'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); });
  $('tracker').onclick = () => { trackOpenUntil = $('tracker').classList.contains('open') ? 0 : G.time + 8; lastHud = 0; };
  // combat buttons (pointer events → instant response, supports multi-touch with joystick)
  const hold = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('on'); on(); }); const up = () => { b.classList.remove('on'); off && off(); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); };
  // the big button: basic attack, or the skill the player put on it (falls back to attack while on cooldown)
  hold('btnAtk', () => { const bs = G.profile.bigSkill; if (bs && G.profile.skills[bs] && C.skillUsable(bs).ok) C.castSkill(bs); input.attackHeld = true; }, () => { input.attackHeld = false; });
  for (let i = 0; i < 4; i++) hold('sk' + i, () => { const id = G.profile.slots[i]; if (id) C.castSkill(id); else openWindow('skills'); });
  hold('btnDodge', () => G.player.dodge(input.wx, input.wy));
  hold('potHP', () => usePotion('hp')); hold('potMP', () => usePotion('mp'));
  hold('btnAct', () => { if (G.focus) interact(G.focus); });
  $('btnScroll').onclick = () => useScroll();
  const ab = $('btnAuto'); ab.removeAttribute('data-open'); ab.onclick = null; ab.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); G.auto = !G.auto; ab.classList.toggle('on', G.auto); toast({ text: G.auto ? 'Автобой включён' : 'Автобой выключен', sub: G.auto ? 'Герой сам сражается, пьёт зелья и идёт к цели' : '', kind: 'info' }); };
  // keyboard shortcuts
  input.onKey = (code) => {
    if (G.modalOpen) { if (code === 'Escape') bus.emit('closeModal'); return; }
    const map = { KeyI: 'inventory', KeyB: 'inventory', KeyC: 'character', KeyK: 'skills', KeyJ: 'journal', KeyM: 'map', Escape: 'settings' };
    if (map[code]) return openWindow(map[code]);
    if (code.startsWith('Digit')) { const i = +code.slice(5) - 1; if (i >= 0 && i < 4 && G.profile.slots[i]) { const recent = performance.now() - mouse.t < 4000; C.castSkill(G.profile.slots[i], recent ? (([x, y]) => ({ x, y }))(G.cam.toWorld(mouse.x, mouse.y + 20)) : undefined); } }
    if (code === 'KeyQ') usePotion('hp'); if (code === 'KeyE') usePotion('mp');
    if (code === 'ShiftLeft' || code === 'ShiftRight') G.player.dodge(input.wx, input.wy);
    if (code === 'KeyF' || code === 'Enter') { if (G.focus) interact(G.focus); }
    if (code === 'KeyT') useScroll();
  };
  drawIcon($('potHP').querySelector('canvas'), 'potion_hp'); drawIcon($('potMP').querySelector('canvas'), 'potion_mp');
  const cl = G.profile.cls || 'warrior'; $('portrait').style.backgroundImage = `url(assets/sprites/${cl === 'warrior' ? 'portrait' : 'portrait_' + cl}.png)`;
  bus.on('hud', () => { lastHud = 0; });
  bus.on('skillsChanged', refreshSkills);
  bus.on('skillSlotted', ({ id, i }) => { toast({ text: `Новый навык: ${SKILLS[id].name}`, sub: `Кнопка ${i + 1} справа внизу`, kind: 'good' }); const b = $('sk' + i); b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 4000); }); bus.on('equipChanged', refreshWeapon); bus.on('statsChanged', refreshSkills);
  bus.on('focus', it => { const b = $('btnAct'); if (it) { b.textContent = it.label; b.classList.remove('hidden'); } else b.classList.add('hidden'); });
  bus.on('toast', toast);
  bus.on('bagFull', () => toast({ text: 'Сумка полна!', sub: 'Продайте лишнее или купите расширение сумки — нажмите, чтобы открыть сумку', kind: 'bad', onClick: () => openWindow('inventory') }));   // сборка 38
  bus.on('itemPicked', it => toast({ text: 'Найдено: ' + it.name, sub: RARITY[it.rarity].name + ' · нажмите, чтобы сравнить', kind: 'item', color: RARITY[it.rarity].color, onClick: () => openWindow('inventory', { select: it.id }) }));
  bus.on('questNew', q => { toast({ text: 'Новое задание', sub: q.title, kind: 'quest' }); trackOpenUntil = G.time + 7; });
  bus.on('zoneEntered', () => { trackOpenUntil = G.time + 6; });
  bus.on('levelUp', l => { const e = $('levelUp'); e.textContent = `Уровень ${l}!`; e.classList.remove('show'); void e.offsetWidth; e.classList.add('show'); toast({ text: 'Новый уровень ' + l, sub: '+5 характеристик · +1 навык — распределите у наставника Элвина в деревне', kind: 'good' }); });
  bus.on('bossStart', e => { G.boss = e; });
  refreshSkills(); refreshWeapon();
}
function refreshWeapon() {
  const w = G.profile.gear.weapon, bs = G.profile.bigSkill; if (bs && G.profile.skills[bs]) skillCanvasInto($('btnAtk').querySelector('canvas'), bs); else drawIcon($('btnAtk').querySelector('canvas'), w ? iconOf(w) : 'sword');
}
function refreshSkills() {
  for (let i = 0; i < 4; i++) {
    const b = $('sk' + i), id = G.profile.slots[i]; b.innerHTML = '';
    if (!id || !G.profile.skills[id]) { b.classList.add('empty'); b.innerHTML = '<span style="font:bold 20px serif;color:#8a7a5a">+</span>'; b.title = 'Пустая ячейка — откройте навыки'; continue; }
    b.classList.remove('empty'); b.title = SKILLS[id].name;
    const c = document.createElement('canvas'); c.width = c.height = 72; skillIcon(c, id); b.appendChild(c);
    b.appendChild(el('div', 'cd')); b.appendChild(el('span', 'mana', SKILLS[id].mana));
  }
}

// ---------------------------------------------------------------- toasts (bounded, auto-removed)
export function toast(t) {
  const box = $('toasts'); while (box.children.length >= 4) box.firstChild.remove();
  const d = el('div', 'toast ' + (t.kind || ''), `<div class="a" ${t.color ? `style="color:${t.color}"` : ''}>${esc(t.text)}</div>${t.sub ? `<div class="b">${esc(t.sub)}</div>` : ''}`);
  if (t.onClick) d.onclick = () => { t.onClick(); d.remove(); };
  box.appendChild(d);
  setTimeout(() => d.classList.add('out'), t.kind === 'quest' ? 3600 : 2600); setTimeout(() => d.remove(), t.kind === 'quest' ? 4100 : 3100);
}

// ---------------------------------------------------------------- per-frame HUD update (throttled DOM writes)
let tick = 0;
export function updateHUD(dt) {
  const P = G.profile, pl = G.player, S = G.stats; if (!pl || !S) return;
  tick += dt; pumpRewards();
  setBar('hpBar', pl.hp / S.maxHP, `${Math.ceil(pl.hp)} / ${S.maxHP}`);
  setBar('mpBar', pl.mp / S.maxMP, `${Math.floor(pl.mp)} / ${S.maxMP}`);
  // skill cooldowns / availability
  for (let i = 0; i < 4; i++) {
    const id = P.slots[i]; if (!id) continue; const b = $('sk' + i); const cd = b.querySelector('.cd'); if (!cd) continue;
    const sk = SKILLS[id]; const left = pl.cds[id] || 0; cd.style.setProperty('--p', (left > 0 ? left / sk.cd * 100 : 0) + '%');
    const u = C.skillUsable(id); b.classList.toggle('off', !u.ok && u.why !== 'Перезарядка');
  }
  const ui = $('ui');
  ui.classList.toggle('lowhp', G.player && !G.player.dead && G.player.hp < G.stats.maxHP * 0.3);
  ui.classList.toggle('surv', !!G.surv);
  if (G.surv) { const S = G.surv; let sh = $('survHud'); if (!sh) { sh = el('div', '', ''); sh.id = 'survHud'; ui.appendChild(sh); sh.innerHTML = '<div class="sv-time"></div><div class="sv-xp"><i></i></div><div class="sv-info"></div><button class="sv-quit">Сдаться</button>'; sh.querySelector('.sv-quit').onclick = () => { if (confirm('Завершить забег? Награда будет начислена.')) SV.endRun(false); }; }
    sh.querySelector('.sv-time').textContent = `${Math.floor(S.t / 60)}:${String(Math.floor(S.t % 60)).padStart(2, '0')} / 20:00`; sh.querySelector('.sv-xp i').style.width = (S.xp / S.next * 100) + '%'; sh.querySelector('.sv-info').textContent = `ур. ${S.lvl} · убито ${S.kills}`; }
  else { const sh = $('survHud'); if (sh) sh.remove(); }
  ui.classList.toggle('fight', inCombat());
  ui.classList.toggle('dungeon', G.zoneId !== 'town');
  $('tracker').classList.toggle('open', G.time < trackOpenUntil && !inCombat());
  const boss = G.enemies.find(e => (e.D.boss || e.D.elite) && e.aggro && !e.dead) || null;
  ui.classList.toggle('boss', !!boss);
  if (boss && !boss.dead && G.enemies.includes(boss)) {
    const bb = $('bossBar'); bb.classList.remove('hidden'); bb.querySelector('.n').textContent = boss.name + (boss.phase > 1 ? ` — фаза ${boss.phase}` : '');
    bb.querySelector('i').style.width = (boss.hp / boss.maxHP * 100) + '%'; bb.querySelector('b').textContent = `${Math.ceil(boss.hp)} / ${boss.maxHP}`;
  } else { $('bossBar').classList.add('hidden'); if (boss && (boss.dead || !G.enemies.includes(boss))) G.boss = null; }
  if (lastHud > 0 && tick < 0.25) { lastHud -= dt; return; }
  tick = 0; lastHud = 0.25;
  $('lvl').textContent = P.level; $('lvl').classList.toggle('up', P.attrPts > 0 || P.skillPts > 0);
  setBar('xpBar', P.xp / xpToNext(P.level));
  $('gold').textContent = fmt(P.gold) + ' зол.'; $('shards').textContent = (P.shards || 0) + '◆'; $('torchN').textContent = '🔥' + (P.torch ? CS.torches().n : 10);
  $('btnAuto').classList.toggle('on', !!G.auto); dot('dotHW', G.zoneId === 'town' && hwReady() ? 1 : 0);
  $('hpCount').textContent = P.potions.hp; $('mpCount').textContent = P.potions.mp; $('scrollCount').textContent = P.scrolls;
  $('btnScroll').classList.toggle('hidden', G.zoneId !== 'catacombs');
  const newItems = P.bag.filter(x => x.isNew).length; dot('dotInv', newItems);
  dot('dotChar', G.zoneId === 'town' ? P.attrPts : 0); dot('dotSkill', G.zoneId === 'town' ? P.skillPts : 0);
  const ds = dailyStatus(), cs = chestStatus(), gifts = (ds.claimable ? 1 : 0) + (cs.ready ? 1 : 0) + (dailyReady() ? 1 : 0); dot('dotGift', gifts);
  const sh = G.zone && G.zone.inter.find(i => i.id === 'shrine'); if (sh) { sh.plate = 'Алтарь богини' + (gifts ? ` 🎁${gifts}` : blessLeft() > 0 ? '' : ' ✦'); sh.marker = gifts ? '!' : null; }   // значок над алтарём
  blessTick(); dot('dotSeason', seasonClaimable());
  { let gl = $('goalLine'); if (!gl) { gl = el('div', '', ''); gl.id = 'goalLine'; $('buffs').after(gl); } const t = G.zoneId === 'town' || !inCombat() ? nextGoalLine() : ''; if (gl.textContent !== t) gl.textContent = t; }   // «до цели» (сборка 21)
  // buffs
  const now = Date.now(); const bf = [];
  if (blessLeft() > 0) bf.push(`<b class="bless">✦ Благословение ${mmss(blessLeft())}</b>`);
  if (P.boosts.xpUntil > now) bf.push(`Опыт +50% ${mmss(P.boosts.xpUntil - now)}`);
  if (P.boosts.goldUntil > now) bf.push(`Золото +50% ${mmss(P.boosts.goldUntil - now)}`);
  if (pl.shield > 1) bf.push(`Щит ${Math.round(pl.shield)}`);
  if (G.run && G.run.boons) for (const id of G.run.boons) bf.push(`${BOONS[id].glyph} ${BOONS[id].name}`);
  $('buffs').innerHTML = bf.map(b => `<span class="buff">${b}</span>`).join('');
  tracker(); huntBox(); minimap();
}
// «Охота»: always-visible timer to the next alarm, or the active beast and where it lurks
let lastHunt = '';
function huntBox() {
  let h = '', on = false;
  if (HU.unlocked() && !G.surv) {
    const cur = HU.current();
    if (cur && cur.slain) { on = true; h = `<div class="hb-t ok">✔ Охота: ${esc(HU.bossOf(cur).name)}</div><div class="hb-d">Сдайте охоту старосте Эдрику</div>`; }
    else if (cur) { on = true; h = `<div class="hb-t">⚠ Охота: ${esc(HU.bossOf(cur).name)}</div><div class="hb-d">${esc(HU.whereText(cur))}</div>`; }
    else h = `<span class="hb-ico">🎯</span> Охота через <b>${mmss(HU.msLeft())}</b>`;
  }
  const b = $('huntBox'); b.classList.toggle('hidden', !h); b.classList.toggle('on', on); b.classList.toggle('ready', HU.readyToTurnIn());
  if (h !== lastHunt) { b.innerHTML = h; lastHunt = h; }
}
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const BADGES = {};
function dot(id, n) { BADGES[id] = n || 0; const d = $(id); if (!d) { const m = $('dotMenu'); const tot = ['dotChar', 'dotSkill', 'dotGift', 'dotHW', 'dotSeason'].reduce((a, k) => a + (BADGES[k] || 0), 0); if (m) { m.classList.toggle('hidden', !tot); m.textContent = tot > 9 ? '9+' : tot; } return; } d.classList.toggle('hidden', !n); d.textContent = n > 9 ? '9+' : n; }
function setBar(id, f, txt) { const b = $(id); b.firstElementChild.style.width = Math.max(0, Math.min(1, f)) * 100 + '%'; if (txt != null) b.querySelector('b').textContent = txt; }
let lastTrack = '';
function tracker() {
  const q = Q.current(); let h;
  if (G.run) {
    const r = G.run, t = Math.floor(G.time - r.t0); const boss = G.enemies.find(e => e.story === 'floorboss' && !e.dead);
    h = `<div class="t">${r.floor === 0 ? 'Пролог · Склеп пробуждения' : esc(G.zone.name)}</div><div class="d" style="display:block">Враги ${r.kills}/${r.total} · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}${r.kills >= r.total ? ' · портал открыт' : ' · убейте всех — откроется портал'}</div>`;
    if (h !== lastTrack) { $('tracker').innerHTML = h; lastTrack = h; } return;
  }
  if (!q) h = `<div class="ch">${chapterOf(STORY[STORY.length - 1])}</div><div class="t">Глава пройдена!</div><div class="d">Рекорды Глубин, Жатва Бездны, форты и контракты доски — Глава III в следующем обновлении</div>`;
  else {
    const pr = Q.progressOf(q), ch = q.chapter || 1, inCh = STORY.filter(x => (x.chapter || 1) === ch), done = inCh.indexOf(q);
    let txt = q.text; const Wd = G.profile.world;
    if (q.id === 'medallion') txt = !Wd.hasKey ? 'Шаг 1/3: найдите ключ — светящийся саркофаг в оссуарии (север).' : !Wd.opened.door_altar ? 'Шаг 2/3: ключ у вас. Подойдите к запертой двери на востоке.' : 'Шаг 3/3: победите Хранителя в зале за дверью и возьмите амулет с алтаря.';
    if (Q.isReady()) txt = G.zoneId === 'town' ? '✔ Выполнено! Подойдите к старосте Эдрику (над ним «?») — за наградой.' : '✔ Выполнено! Вернитесь в деревню к старосте Эдрику за наградой.';
    else if (q.where && q.where !== G.zoneId) txt = (q.where === 'catacombs' ? 'Спуститесь в катакомбы через портал. ' : 'Вернитесь в деревню через портал. ') + txt;
    h = `<div class="ch">${chapterOf(q)} · ${done}/${inCh.length}</div><div class="t">${esc(q.title)}${pr ? ` <span class="muted">${pr.cur}/${pr.max}</span>` : ''}</div><div class="d">${esc(txt)}</div>` + (pr ? `<div class="pb"><i style="width:${pr.cur / pr.max * 100}%"></i></div>` : '');
  }
  if (h !== lastTrack) { $('tracker').innerHTML = h; lastTrack = h; }
}
// minimap: explored-radius reveal in dungeon, quest target marker
const seen = new Map();
function minimap() {
  const cv = $('minimap'); if (!cv || cv.offsetParent === null) return;
  const Z = G.zone, m = Z.map, x = cv.getContext('2d'), P = G.player;
  const key = seenKey(Z); let S = seen.get(key); if (!S) { S = new Uint8Array(m.w * m.h); seen.set(key, S); }
  const R = 7; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const tx = Math.floor(P.x) + dx, ty = Math.floor(P.y) + dy; if (tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && dx * dx + dy * dy <= R * R) S[ty * m.w + tx] = 1; }
  drawMap(x, cv.width, Z, S, P, 13);
}
export function drawMap(x, size, Z, S, P, span) {
  const m = Z.map; x.clearRect(0, 0, size, size);
  const cell = span ? size / (span * 2) : size / ((m.w + m.h) * 0.74);
  // rotate 45° to match isometric view
  x.save(); x.translate(size / 2, size / 2); x.scale(1, 0.62); x.rotate(Math.PI / 4);
  const cx = span ? P.x : m.w / 2, cy = span ? P.y : m.h / 2;
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    if (Z.dark && S && !S[ty * m.w + tx]) continue;
    if (span && (Math.abs(tx - cx) > span * 1.5 || Math.abs(ty - cy) > span * 1.5)) continue;
    const c = m.ch(tx, ty); if (c === 'x') continue;
    x.fillStyle = m.blocked(tx, ty) ? (c === '~' ? '#23406a' : Z.dark ? '#5a4a3a' : '#2a3a1a') : Z.dark ? '#2a221c' : (c === '#' ? '#6a6258' : c === ',' ? '#5a4630' : '#34502a');
    x.fillRect((tx - cx) * cell, (ty - cy) * cell, cell + 0.4, cell + 0.4);
  }
  const dotAt = (wx, wy, col, r) => { x.fillStyle = col; x.beginPath(); x.arc((wx - cx) * cell, (wy - cy) * cell, r, 0, 7); x.fill(); };
  for (const it of Z.inter) if (!it.hidden) { if (Z.dark && S && !S[Math.floor(it.y) * m.w + Math.floor(it.x)]) continue; dotAt(it.x, it.y, it.type === 'portal' ? '#b48cff' : it.type === 'npc' ? '#ffd24a' : it.done ? '#666' : '#e8c26a', Math.max(2, cell * 0.6)); }
  const q = Q.current(); if (q && q.target) { const t = Z.inter.find(i => i.id === q.target) || (q.target === 'elite' || q.target === 'boss' ? G.enemies.find(e => e.story === q.target) : null); if (t) { x.strokeStyle = '#ffd24a'; x.lineWidth = 2; x.beginPath(); x.arc((t.x - cx) * cell, (t.y - cy) * cell, Math.max(4, cell * 1.2), 0, 7); x.stroke(); } }
  const hg = G.huntGuide; if (hg && (!Z.dark || !S || S[Math.floor(hg.y) * m.w + Math.floor(hg.x)] || hg.D)) { x.strokeStyle = '#ff4030'; x.lineWidth = 2; x.beginPath(); x.arc((hg.x - cx) * cell, (hg.y - cy) * cell, Math.max(5, cell * 1.4), 0, 7); x.stroke(); }
  for (const e of G.enemies) if (!e.dead && e.aggro) dotAt(e.x, e.y, e.D.boss || e.D.elite ? '#ff8030' : '#d33', Math.max(1.5, cell * 0.4));
  dotAt(P.x, P.y, '#fff', Math.max(2.5, cell * 0.7));
  x.restore();
}
export { seen };
export const seenKey = Z => `${Z.id}:${Z.json.floorN ?? ''}:${Z.map.w}x${Z.map.h}`;
