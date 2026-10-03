// Немезис форта + «Ноша».
// Командир форта — личный враг героя: живёт в сохранении (profile.nemesis), помнит поражения и бегство,
// растёт в ранге, копит украденную добычу. Убитый — оставляет трофей с постоянным бонусом.
// «Ноша»: золото в походе копится в рюкзаке и становится вашим, только когда форт отбит или вы вышли через
// портал. Смерть теряет ношу (её забирает немезис). Тяжёлая ноша замедляет и привлекает мобов.
import { G, bus } from './ctx.js';
import * as L from './loot.js';
import { rand, rint, pick } from '../core/util.js';
import { REALMS } from '../data/wild.js';
import { hint, goalText } from './wildhints.js';

const FIRST = { bones: ['Гром', 'Дуркаш', 'Карг', 'Мугар', 'Зарг', 'Торук', 'Ургаш', 'Броск'], fjord: ['Хрольф', 'Бьёрн', 'Ульв', 'Торгрим', 'Рагнар', 'Гуннар', 'Свейн', 'Ивар'], forest: ['Прохор', 'Лука', 'Терентий', 'Гаврила', 'Ермак', 'Кондрат', 'Захар', 'Игнат'] };
const EPI = { bones: ['Кровавый Клык', 'Костогрыз', 'Рваная Шкура', 'Сломанный Бивень', 'Пожиратель Песка', 'Череполом'], fjord: ['Костолом', 'Двухкровный', 'Ледяная Борода', 'Волчий Брат', 'Зубодёр', 'Чёрный Рог'], forest: ['Душегуб', 'Рваное Ухо', 'Чащобник', 'Волчий Пастырь', 'Одноглазый', 'Кривой Нож'] };
export const RANK_TITLE = ['', 'Победитель героя', 'Бич Тихого Брода', 'Грозный', 'Тёмный Владыка'];
export const TRAITS = {
  iron: { name: 'Железная кожа', txt: 'броня +40%', apply: e => { e.armor = Math.round(e.armor * 1.4); } },
  brute: { name: 'Громила', txt: 'урон +25%', apply: e => { e.dmgMul *= 1.25; } },
  swift: { name: 'Скороход', txt: 'скорость +20%', apply: e => { e.spdBonus = 1.2; } },
  vampire: { name: 'Кровопийца', txt: 'лечится от ударов', apply: e => { e.vamp = 0.3; } },
  horn: { name: 'Горнист', txt: 'зовёт подмогу вдвое чаще', apply: e => { e.hornMul = 0.5; } },
};
export const WEAK = { fire: 'огню', cold: 'холоду', light: 'молнии', phys: 'простой стали' };
const WEAK_ELEM = ['fire', 'cold', 'light', 'phys'];

export const nemState = (P = G.profile) => (P.nemesis = P.nemesis || { seq: 0, list: [], trophies: [] });
export const displayName = n => `${n.name}${n.title ? ', ' + n.title : ''}`;
const titleOf = n => RANK_TITLE[Math.min(RANK_TITLE.length - 1, n.rank)] || '';

function create(realm) {
  const S = nemState(), keys = Object.keys(TRAITS), t1 = pick(keys), t2 = pick(keys.filter(k => k !== t1));
  const weak = pick(WEAK_ELEM.filter(w => w !== (realm === 'fjord' ? 'cold' : 'phys')));   // ледяной ярл не слаб к холоду
  const n = { id: ++S.seq, realm, name: `${pick(FIRST[realm])} ${pick(EPI[realm])}`, title: '', rank: 0, traits: [t1, t2], weak, stash: 0, alive: true, defeats: 0, fled: 0 };
  S.list.push(n); return n;
}
// Какой немезис встретит героя в этом форте: охотящийся (с рангом) в приоритете, иначе новый.
export function pickNemesis(realm) {
  const S = nemState(), alive = S.list.filter(n => n.alive && n.realm === realm);
  const hunters = alive.filter(n => n.rank > 0);
  if (hunters.length) return hunters.sort((a, b) => b.rank - a.rank)[0];
  if (alive.length >= 3) return pick(alive);
  return create(realm);
}
export function applyNemesis(e, n) {
  e.nem = n; e.name = displayName(n) + (n.rank ? ' ' + '☠'.repeat(Math.min(n.rank, 4)) : '');
  const r = Math.min(n.rank, 5); e.maxHP = Math.round(e.maxHP * (1 + 0.2 * r)); e.hp = e.maxHP; e.dmgMul *= 1 + 0.1 * r;
  for (const t of n.traits) TRAITS[t].apply(e);
}
function announce(e) {
  const n = e.nem; if (!n) return;
  const line = n.rank ? (n.defeats ? `«Я помню тебя, герой! Ты упал от моей руки.»` : `«Снова ты? В прошлый раз ты бежал!»`) : `«Эта земля — моя.»`;
  bus.emit('toast', { text: `${displayName(n)}`, sub: `${line} Силён: ${n.traits.map(t => TRAITS[t].name).join(', ')}. `, kind: 'quest' });
}
bus.on('aggro', e => { if (e.nem && !e.nemMet) { e.nemMet = true; announce(e); } });

// ---- ноша
export const carryCap = () => 150 + 110 * (G.zone && G.zone.json.level || 1);   // ~40–60% золота полного зачистки поля (см. tools/qa/wild/econ.mjs)
export function refreshCarry() {
  const W = G.wild; if (!W) return;
  if (W.carry > 0) hint('carry');
  const g = Math.min(1, (W.carry || 0) / carryCap()); W.greed = g; W.slow = 1 - 0.18 * g; W.noise = 1 + 0.7 * g;
  bus.emit('wildCarry');
}
export function addCarry(n) { G.wild.carry = (G.wild.carry || 0) + n; refreshCarry(); }
export function bankCarry(reason) {
  const W = G.wild, P = G.profile; if (!W || !W.carry) return 0;
  const n = W.carry; W.carry = 0; P.gold += n; P.stats.gold += n; bus.emit('gold', n); refreshCarry();
  bus.emit('toast', { text: `Ноша в безопасности: +${n} зол.`, sub: reason, kind: 'good' }); bus.emit('hud'); return n;
}
const liveNem = () => G.enemies.find(e => e.nem && !e.dead && e.aggro);

bus.on('playerDeath', () => {
  const W = G.wild; if (G.zoneId !== 'wild' || !W) return; W.died = true;
  const lost = W.carry || 0; W.carry = 0; refreshCarry(); bus.emit('wildDied', { lost, x: G.player.x, y: G.player.y });
  const e = liveNem(), n = e && e.nem;
  if (n) { n.rank++; n.defeats++; n.stash += lost; n.title = titleOf(n); }
  if (lost || n) setTimeout(() => bus.emit('toast', { text: lost ? `Ноша потеряна: ${lost} зол.` : 'Вы пали', sub: n ? `${displayName(n)} забрал добычу и стал сильнее (ранг ${n.rank})` : '', kind: 'warn' }), 1500);
  bus.emit('save');
});
// выход из похода: ноша банкуется, бегство от живого немезиса усиливает его
export function onLeaveWild() {
  const W = G.wild; if (!W) return;
  if (!W.died) {
    bus.emit('wildLeave', { carry: W.carry || 0, cap: carryCap() });
    const e = liveNem(); if (e) { const n = e.nem; n.rank++; n.fled++; n.title = titleOf(n); bus.emit('toast', { text: `${n.name} смеётся вам вслед`, sub: `Он стал сильнее (ранг ${n.rank})`, kind: 'warn' }); }
    bankCarry('Вы вышли из похода');
  }
}
export function onNemesisKilled(e) {
  const n = e.nem, S = nemState(); n.alive = false; n.killedAt = Date.now();
  const bonus = 1 + 0.5 * n.rank; S.trophies.push({ id: n.id, name: displayName(n), realm: n.realm, rank: n.rank, bonus });
  if (n.stash) { for (let i = 0; i < 5; i++) L.dropGold(e.x, e.y, n.stash / 5 / (G.stats.goldFind ? 1 + G.stats.goldFind / 100 : 1)); }
  bus.emit('toast', { text: `Трофей: ${displayName(n)}`, sub: `Постоянно: +${bonus.toFixed(1)}% урона и золота${n.stash ? `. Вернули ${n.stash} зол.` : ''}`, kind: 'good' }); bus.emit('sfx', 'epicDrop');
  n.stash = 0; import('./stats.js').then(m => { G.stats = m.stats(G.profile); bus.emit('statsChanged'); });
}
export const trophyBonus = P => (P.nemesis ? P.nemesis.trophies.reduce((a, t) => a + t.bonus, 0) : 0);
export const hunted = realm => nemState().list.filter(n => n.alive && n.realm === realm && n.rank > 0);

// ---- полоса «Ноша»
let bar = null;
function ensureBar() {
  if (bar) return bar; bar = document.createElement('div'); bar.id = 'carryBar';
  bar.style.cssText = 'position:fixed;left:50%;top:142px;transform:translateX(-50%);z-index:5;pointer-events:none;font:600 13px Georgia,serif;color:#f0dca8;text-shadow:0 1px 2px #000;text-align:center;display:none;min-width:220px;max-width:92vw';
  bar.innerHTML = '<div class="t"></div><div style="height:6px;background:#0009;border-radius:3px;margin-top:3px;overflow:hidden"><i style="display:block;height:100%;width:0;background:linear-gradient(90deg,#d6a548,#e8622a)"></i></div><div class="g" style="font-weight:400;font-size:12px;margin-top:3px;color:#cfe3c0"></div>';
  document.body.appendChild(bar); return bar;
}
// кнопка справа: форт отбит — «Итог / выход» (не выскакивает окном сама)
let exitBtn = null;
function drawExit() {
  const W = G.wild, show = G.zoneId === 'wild' && W && W.done && W.result;
  if (!exitBtn) {
    exitBtn = document.createElement('button'); exitBtn.id = 'wildExit'; exitBtn.className = 'btn gold';
    exitBtn.innerHTML = '<span class="we-ar">▶▶</span><b>Форт отбит</b><small>Итог и выход</small>';
    exitBtn.onclick = () => { if (G.wild && G.wild.result) bus.emit('wildCleared', G.wild.result); };
    document.body.appendChild(exitBtn);
  }
  exitBtn.style.display = show && !G.modalOpen ? 'flex' : 'none';
  // под миникартой (раньше стояла поверх неё); если миникарта скрыта — у правого края под трекером
  if (show) { const mm = document.getElementById('minimap'), r = mm && mm.offsetParent !== null ? mm.getBoundingClientRect() : null; exitBtn.style.top = (r && r.height ? Math.round(r.bottom + 8) : 150) + 'px'; }
}
function drawBar() {
  drawExit();
  const b = ensureBar(), W = G.wild;
  if (G.zoneId !== 'wild' || !W) { b.style.display = 'none'; return; }
  b.style.display = 'block'; const pct = Math.round((W.greed || 0) * 100);
  b.querySelector('.t').textContent = `🎒 Ноша: ${W.carry || 0} зол.${pct > 8 ? ` · жадность ${pct}% (медленнее, мобы чуют)` : ''}`;
  b.querySelector('i').style.width = pct + '%';
  b.querySelector('.g').textContent = goalText();
}
bus.on('wildCarry', drawBar); bus.on('zoneEntered', drawBar); bus.on('hud', drawBar);
