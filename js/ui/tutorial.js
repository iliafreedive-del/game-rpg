// Обучение (сборка 45): без окон на паузе. Над нужной кнопкой появляется «палец» и одна строка текста,
// игра при этом идёт. Кнопки боя появляются тогда, когда они впервые нужны (profile.tutorial.un).
// Сборка 49 (карусель «8 приёмов обучения»): вопроса «Показать подсказки?» больше нет — подсказки включены всегда
// и выключаются в «Справке» (меню); рывок учит медленный скелет-учитель в склепе; зелье — после боя; каждая подсказка
// попадает в журнал «Справки», а ключевые моменты первых минут — в метки времени (profile.tutorial.ms).
import { G, bus } from '../game/ctx.js';
import { $, el, esc } from '../core/util.js';
import { STORY } from '../data/quests.js';
import { once as anOnce } from '../platform/analytics.js';

const touch = () => matchMedia('(pointer:coarse)').matches;
const T = () => { const P = G.profile; P.tutorial = P.tutorial || {}; P.tutorial.tips = P.tutorial.tips || {}; P.tutorial.un = P.tutorial.un || {}; return P.tutorial; };
// какие кнопки боя уже открыты: пустая ячейка навыка, зелье маны, рывок, «АВТО» и свиток мешают в первые минуты
export const unlocked = k => { const t = T(); return !!(t.un[k] || t.off || !t.on); };
export function unlock0(k) { const t = T(); if (t.un[k]) return false; t.un[k] = 1; bus.emit('save'); bus.emit('uiUnlock', k); return true; }
export const unlock = unlock0;
export function unlockAll() { const t = T(); for (const k of ['dodge', 'pot', 'potMP', 'sk', 'auto', 'scroll']) t.un[k] = 1; }

// ---------------------------------------------------------------- журнал подсказок и метки времени (сборка 49)
// журнал: что игроку уже объясняли — «Справка» в меню показывает его, чтобы перечитать одно, не перезапуская обучение
function logHint(text) { const t = T(), L = (t.log = t.log || []); if (L.includes(text)) return; L.push(text); if (L.length > 60) L.shift(); }
export const hintLog = () => (T().log || []).slice();
// «Считайте минуты»: минута игры, на которой игрок впервые дошёл до ключевого момента
export const MILESTONES = [['kill1', 'Первый убитый враг'], ['crypt', 'Выбрался из склепа'], ['quest1', 'Первое задание сдано'], ['lvl2', 'Уровень 2'],
  ['skill1', 'Первое умение'], ['cata', 'Вход в катакомбы'], ['death1', 'Первая гибель'], ['lvl5', 'Уровень 5'], ['boss', 'Палач Бездны побеждён']];
export function mark(k) { const P = G.profile; if (!P) return; const t = T(), ms = (t.ms = t.ms || {}); if (ms[k] != null) return; ms[k] = Math.round(P.stats.playTime || 0); anOnce('ms_' + k, { sec: ms[k] }); bus.emit('save'); }
export const milestones = () => T().ms || {};
export const hintsOn = () => { const t = T(); return t.on !== false && !t.off; };
export function setHints(on) { const t = T(); t.on = !!on; t.off = !on; if (!on) { hideHand(); unlockAll(); } bus.emit('save'); bus.emit('hud'); }

// ---------------------------------------------------------------- палец + строка подсказки
let hand = null, line = null, handKey = null, handUntil = 0;
const rectOf = id => { const e = typeof id === 'string' ? $(id) : id; if (!e || e.offsetParent === null) return null; const r = e.getBoundingClientRect(); return r.width ? r : null; };
export function hideHand() { if (hand) { hand.remove(); hand = null; } if (line) { line.remove(); line = null; } handKey = null; }
// показать палец над элементом (или просто строку, если элемента нет)
// кнопка только что открылась: подождать кадр, пока HUD её покажет, иначе «палец» не найдёт место
export const pointSoon = (sel, text, o) => setTimeout(() => pointAt(sel, text, o), 150);
export function pointAt(sel, text, { key = null, time = 9, mid = false, force = false } = {}) {
  const t = T(); if (t.off && !force) return false;
  if (force && (hand || line)) return false;   // напоминание не перебивает подсказку обучения
  if (key && t.tips[key]) return false;
  const r = sel ? rectOf(sel) : null;
  if (sel && !r) return false;
  if (key) { t.tips[key] = 1; bus.emit('save'); anOnce('hint_' + key); }
  logHint(text);
  hideHand();
  if (r) { hand = el('div', 'hand'); hand.style.left = (r.left + r.width / 2) + 'px'; hand.style.top = (r.top + r.height / 2) + 'px'; document.body.appendChild(hand); }
  line = el('div', 'hint-line ' + (mid || !r ? 'mid' : 'bot'), text); document.body.appendChild(line);
  handKey = key || sel || text; handUntil = performance.now() + time * 1000;
  bus.emit('sfx', 'quest');
  return true;
}
// подсказка исчезает сама: по времени, по нажатию нужной кнопки или по событию
function handTick() {
  if (!hand && !line) return;
  if (performance.now() > handUntil || G.modalOpen || G.cinema) hideHand();
}

// ---------------------------------------------------------------- что и когда открывать
let revealAt = 0;   // не больше одной новой кнопки раз в 3 с: иначе подсказки перебивают друг друга
function revealTick() {
  const P = G.profile, pl = G.player, S = G.stats, t = T(); if (!P || !pl || !S || t.off || pl.dead) return;   // сборка 59: мёртвому подсказки не нужны
  if (performance.now() < revealAt) return;
  const unlock = k => { revealAt = performance.now() + 3000; return unlock0(k); };
  const dz = G.zoneId !== 'town' && G.zoneId !== 'castle';
  // рывок: первый сильный замах врага (красный круг) или третий бой
  if (!t.un.dodge && dz && (G.enemies || []).some(e => !e.dead && e.aggro && e.teleg)) { unlock('dodge'); pointSoon('btnDodge', touch() ? 'Рывок! Нажмите, чтобы отпрыгнуть от удара' : 'Рывок: Shift — отпрыгнуть от удара'); return; }
  if (!t.un.dodge && (P.stats.kills || 0) >= 3) { unlock('dodge'); pointSoon('btnDodge', 'Это рывок — уклонение от удара'); return; }
  // зелье здоровья: когда стало мало жизни
  // зелье здоровья: «новое — без угрозы» — учим после боя, когда рядом никого; посреди драки — только если совсем плохо
  const fight = (G.enemies || []).some(e => !e.dead && e.aggro);
  if (!t.un.pot && P.potions.hp > 0 && (pl.hp < S.maxHP * 0.6 && !fight || pl.hp < S.maxHP * 0.3)) { unlock('pot'); pointSoon('potHP', fight ? 'Мало здоровья! Нажмите красное зелье' : 'Красное зелье лечит. Нажмите — бой окончен, время подлечиться'); return; }
  // навыки и мана: как только выучен первый навык
  if (!t.un.sk && P.slots.some(Boolean)) { unlock('sk'); unlock('potMP'); pointSoon('sk0', 'Ваше умение! Нажмите в бою'); return; }
  // «АВТО»: после 10 побед в подземелье
  if (!t.un.auto && dz && (P.stats.kills || 0) >= 10) { unlock('auto'); pointSoon('btnAuto', 'АВТО: герой будет сражаться сам'); return; }
  // свиток возврата
  if (!t.un.scroll && (G.zoneId === 'catacombs' || G.zoneId === 'wild' || G.zoneId === 'depths') && P.scrolls > 0) { unlock('scroll'); pointSoon('btnScroll', 'Свиток возврата — мгновенно домой'); return; }
}
// подсказки по месту: кнопка действия, староста, наставник, портрет, торговка, слияние
let zoneTicks = 0, zoomTicks = 0;
function placeTick() {
  const P = G.profile, t = T(); zoneTicks = G.zoneId === 'town' ? 0 : zoneTicks + 1;
  // зум камеры: сборка 59 — подсказка в деревне, в катакомбах и в Жатве (по разу в каждой), а не через 15 минут где-то в подземелье.
  // В деревне — когда пролог позади и герой постоял ~6 с без окон; в катакомбах и Жатве — через ~6 с после входа, если рядом нет боя
  { const zk = { town: 'town', catacombs: 'cata', survival: 'surv' }[G.zoneId], zs = (t.zoomAt = t.zoomAt || {});
    zoomTicks = zk && !G.modalOpen && !hand && !line ? zoomTicks + 1 : 0;
    const calm = G.zoneId === 'survival' || !(G.enemies || []).some(e => !e.dead && e.aggro);
    if (zk && !zs[zk] && !t.zoomSeen && zoomTicks > 14 && calm && (G.zoneId !== 'town' || P.story.stage >= 1)) { zs[zk] = 1; bus.emit('save');
      // своя фраза в каждом месте — не повтор одной и той же строки
      const how = touch() ? { in: 'разведите два пальца на экране', out: 'сведите два пальца' } : { in: 'колесо мыши от себя', out: 'колесо мыши на себя' };
      const txt = { town: `Камеру можно приблизить (${how.in}) или отдалить (${how.out})`, cata: `В тесных залах удобнее ближе: ${how.in} — камера приблизится`, surv: `В Жатве отдалите камеру (${how.out}) — заметите врагов раньше` }[zk];
      if (t.off || !t.on) bus.emit('toast', { text: txt, kind: 'info' }); else { pointAt(null, txt, { time: 9 }); return; } } }
  if (t.off || !t.on || G.modalOpen) return;
  const once = (key, sel, text) => !t.tips[key] && pointAt(sel, text, { key });   // сборка 49: объявлено до первого использования (раньше — ошибка в консоли каждые 0,4 с)
  const q = G.profile.story && STORY[G.profile.story.stage];
  // сборка 47: саркофаг с ключом — многие пробегали мимо
  if (q && q.id === 'medallion' && !P.world.hasKey && G.focus && G.focus.loot === 'key' && once('sarc', 'btnAct', 'Светящийся саркофаг! Откройте его — внутри ключ от двери к амулету')) return;
  if (q && q.id === 'medallion' && !P.world.hasKey && G.zoneId === 'catacombs' && once('sarc0', null, 'Ищите светящийся саркофаг — жёлтая стрелка ведёт к нему')) return;
  if (!$('btnLead').classList.contains('hidden') && once('lead', 'btnLead', 'Не знаете, куда идти? Нажмите «Веди меня» — герой сам побежит к цели')) return;
  if ((P.shards || 0) > 0 && once('shards', 'goldBox', 'Фиолетовые ◆ — осколки Бездны. Копите их: они пригодятся позже')) return;
  if (!$('btnAct').classList.contains('hidden')) {
    const f = G.focus;
    if (once('act', 'btnAct', f && f.type === 'portal' ? 'Нажмите, чтобы войти в портал' : 'Нажмите, чтобы поговорить или открыть')) return;
  }
  if (G.zoneId === 'town' && P.story.stage >= 1 && once('hero', 'portrait', 'Нажмите портрет — снаряжение, навыки и задания')) return;
  if (P.bag && P.bagSize && P.bag.length >= P.bagSize - 2 && G.zoneId === 'town' && once('sell', null, 'Сумка почти полна: у торговки Миры есть кнопка «Продать серое»')) return;
}

export async function intro() {
  const t = T(); if (t.introDone) return; t.introDone = true; bus.emit('save');
  // первые секунды в склепе: только движение. Остальному учим по ходу.
  if (G.run && G.run.floor === 0) return;   // сборка 49: в склепе это говорит пролог (tutorialTick в game.js) — без повтора
  pointAt('joyZone', touch() ? 'Ведите палец по левой половине экрана' : 'Идите: WASD или зажмите правую кнопку мыши', { time: 10 });
}

export function initTutorial() {
  bus.on('tutorialRestart', () => { const t = T(); t.on = true; t.off = false; t.introDone = false; t.tips = {}; t.un = {}; intro(); });
  bus.on('tutHand', o => pointAt(o.sel, o.text, o));
  bus.on('zoneEntered', () => { zoomTicks = 0; });   // сборка 59: подсказку о зуме считать заново в каждой локации
  bus.on('camZoom', () => { if (G.profile) { T().zoomSeen = 1; bus.emit('save'); } });   // уже нашёл зум сам — подсказка не нужна
  // нажал подсказанную кнопку — палец убираем сразу
  for (const id of ['btnDodge', 'potHP', 'potMP', 'btnAuto', 'btnScroll', 'btnAct', 'portrait', 'sk0']) { const e = $(id); if (e) e.addEventListener('pointerdown', hideHand); }
  setInterval(() => { if (!G.profile || !G.zoneReady) return; handTick(); if (G.cinema) return; revealTick(); placeTick(); }, 400);   // во время облёта камеры подсказок нет
  // сборка 47: первая вещь из добычи — где её надеть и сравнить
  bus.on('itemPicked', () => setTimeout(() => pointAt('portrait', 'Новая вещь в сумке! Нажмите портрет → «Сумка»: там вещь можно надеть и сравнить с надетой', { key: 'bag1', time: 10 }), 600));
  // первое зелье в награду — откуда они берутся
  bus.on('reward', r => { if (r.potions) setTimeout(() => pointAt(null, 'Зелья здоровья даются в награду за задания и продаются у торговки Миры', { key: 'potgot', time: 7 }), 1500); });
  bus.on('questComplete', q => {
    if (q.id !== 'meet_merchant') return;   // Мира: научить зелью и рывку
    // сборка 49: «одно новое за раз» — объясняем только то, чего игрок ещё не видел (обычно оба уже открыты в склепе)
    const newPot = unlock0('pot'), newDodge = unlock0('dodge');
    if (newPot) pointSoon('potHP', touch() ? 'Красная кнопка — зелье здоровья. Нажмите в бою, когда мало жизни' : 'Зелье здоровья: кнопка Q или красная кнопка. Пейте в бою, когда мало жизни', { time: 7 });
    if (newDodge) setTimeout(() => pointAt('btnDodge', touch() ? 'Рывок! Нажмите, чтобы отпрыгнуть от удара врага (красный круг)' : 'Рывок: Shift — отпрыгнуть от удара врага (красный круг)', { key: 'dodge2', time: 8 }), newPot ? 8000 : 300);
  });
  bus.on('panel', it => { if (!it || it.id !== 'trainer') return; setTimeout(() => { if (G.profile.skillPts > 0) pointAt('tBtnSkills', 'Нажмите «Навыки» — там изучают умения', { key: 'tbtn' }); }, 400); });
  bus.on('skillsOpened', () => setTimeout(() => { const b = document.querySelector('.tal-learn.ok'); if (b) pointAt(b, 'Нажмите «Изучить»', { key: 'learn' }); }, 350));
  // метки времени «первых минут» (видно в «Справке»: тестер присылает скриншот)
  bus.on('kill', () => mark('kill1'));
  bus.on('questComplete', () => mark('quest1'));
  bus.on('levelUp', () => { const L = G.profile.level; if (L >= 2) mark('lvl2'); if (L >= 5) mark('lvl5'); });
  bus.on('skillsChanged', () => { if (Object.values(G.profile.skills || {}).some(Boolean)) mark('skill1'); });
  bus.on('zoneEntered', id => { if (id === 'town' && G.profile.tutorial.prologue) mark('crypt'); if (id === 'catacombs') mark('cata'); });
  bus.on('playerDeath', () => { mark('death1'); hideHand(); });
  bus.on('bossDefeated', () => mark('boss'));
  bus.on('mergeReady', () => pointAt(null, 'Три одинаковых вещи! Кузнец Горан сольёт их в одну лучшую', { key: 'merge', time: 8 }));
}
