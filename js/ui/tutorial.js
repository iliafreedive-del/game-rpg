// Обучение (сборка 45): без окон на паузе. Над нужной кнопкой появляется «палец» и одна строка текста,
// игра при этом идёт. Кнопки боя появляются тогда, когда они впервые нужны (profile.tutorial.un).
// Окна на паузе остались только там, где без них нельзя (вопрос про обучение на первом запуске).
import { G, bus } from '../game/ctx.js';
import { $, el, esc } from '../core/util.js';
import { STORY } from '../data/quests.js';

const touch = () => matchMedia('(pointer:coarse)').matches;
const T = () => { const P = G.profile; P.tutorial = P.tutorial || {}; P.tutorial.tips = P.tutorial.tips || {}; P.tutorial.un = P.tutorial.un || {}; return P.tutorial; };
// какие кнопки боя уже открыты: пустая ячейка навыка, зелье маны, рывок, «АВТО» и свиток мешают в первые минуты
export const unlocked = k => { const t = T(); return !!(t.un[k] || t.off || !t.on); };
export function unlock0(k) { const t = T(); if (t.un[k]) return false; t.un[k] = 1; bus.emit('save'); bus.emit('uiUnlock', k); return true; }
export const unlock = unlock0;
export function unlockAll() { const t = T(); for (const k of ['dodge', 'pot', 'potMP', 'sk', 'auto', 'scroll']) t.un[k] = 1; }

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
  if (key) { t.tips[key] = 1; bus.emit('save'); }
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
  if (performance.now() > handUntil || G.modalOpen) hideHand();
}

// ---------------------------------------------------------------- что и когда открывать
let revealAt = 0;   // не больше одной новой кнопки раз в 3 с: иначе подсказки перебивают друг друга
function revealTick() {
  const P = G.profile, pl = G.player, S = G.stats, t = T(); if (!P || !pl || !S || t.off) return;
  if (performance.now() < revealAt) return;
  const unlock = k => { revealAt = performance.now() + 3000; return unlock0(k); };
  const dz = G.zoneId !== 'town' && G.zoneId !== 'castle';
  // рывок: первый сильный замах врага (красный круг) или третий бой
  if (!t.un.dodge && dz && (G.enemies || []).some(e => !e.dead && e.aggro && e.teleg)) { unlock('dodge'); pointSoon('btnDodge', touch() ? 'Рывок! Нажмите, чтобы отпрыгнуть от удара' : 'Рывок: Shift — отпрыгнуть от удара'); return; }
  if (!t.un.dodge && (P.stats.kills || 0) >= 3) { unlock('dodge'); pointSoon('btnDodge', 'Это рывок — уклонение от удара'); return; }
  // зелье здоровья: когда стало мало жизни
  if (!t.un.pot && pl.hp < S.maxHP * 0.6 && P.potions.hp > 0) { unlock('pot'); pointSoon('potHP', 'Мало здоровья! Нажмите красное зелье'); return; }
  // навыки и мана: как только выучен первый навык
  if (!t.un.sk && P.slots.some(Boolean)) { unlock('sk'); unlock('potMP'); pointSoon('sk0', 'Ваше умение! Нажмите в бою'); return; }
  // «АВТО»: после 10 побед в подземелье
  if (!t.un.auto && dz && (P.stats.kills || 0) >= 10) { unlock('auto'); pointSoon('btnAuto', 'АВТО: герой будет сражаться сам'); return; }
  // свиток возврата
  if (!t.un.scroll && dz && P.scrolls > 0) { unlock('scroll'); pointSoon('btnScroll', 'Свиток возврата — мгновенно домой'); return; }
}
// подсказки по месту: кнопка действия, староста, наставник, портрет, торговка, слияние
let zoneTicks = 0, zoomWait = 0;   // сборка 47: пока игрок не попробовал зум, следующая подсказка не идёт
function placeTick() {
  const P = G.profile, t = T(); zoneTicks = G.zoneId === 'town' ? 0 : zoneTicks + 1;
  // зум камеры (поток «Зум камеры»): один раз при первом выходе из деревни — и тем, кто играет без подсказок
  if (G.zoneId !== 'town' && !t.zoomSeen && zoneTicks > 14 && !G.modalOpen) { t.zoomSeen = 1; bus.emit('save');
    const txt = touch() ? 'Попробуйте: разведите два пальца на свободной части экрана — камера приблизится' : 'Попробуйте: покрутите колесо мыши — камера приблизится и отдалится';
    if (t.off || !t.on) bus.emit('toast', { text: 'Камеру можно приблизить или отдалить', sub: txt, kind: 'info' }); else { pointAt(null, txt, { time: 25 }); zoomWait = performance.now() + 25000; return; } }
  if (t.off || !t.on || G.modalOpen) return;
  const q = G.profile.story && STORY[G.profile.story.stage];
  // сборка 47: саркофаг с ключом — многие пробегали мимо
  if (q && q.id === 'medallion' && !P.world.hasKey && G.focus && G.focus.loot === 'key' && once('sarc', 'btnAct', 'Светящийся саркофаг! Откройте его — внутри ключ от двери к амулету')) return;
  if (q && q.id === 'medallion' && !P.world.hasKey && G.zoneId === 'catacombs' && once('sarc0', null, 'Ищите светящийся саркофаг — жёлтая стрелка ведёт к нему')) return;
  if (!$('btnLead').classList.contains('hidden') && once('lead', 'btnLead', 'Не знаете, куда идти? Нажмите «Веди меня» — герой сам побежит к цели')) return;
  if ((P.shards || 0) > 0 && once('shards', 'goldBox', 'Фиолетовые ◆ — осколки Бездны. Падают с сильных врагов и боссов, на них строят комнаты Цитадели')) return;
  const once = (key, sel, text) => !t.tips[key] && pointAt(sel, text, { key });
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
  pointAt('joyZone', touch() ? 'Ведите палец по левой половине экрана' : 'Идите: WASD или зажмите правую кнопку мыши', { time: 10 });
}

export function initTutorial() {
  bus.on('tutorialRestart', () => { const t = T(); t.on = true; t.off = false; t.introDone = false; t.tips = {}; t.un = {}; intro(); });
  bus.on('tutHand', o => pointAt(o.sel, o.text, o));
  bus.on('camZoom', () => { if (G.profile) { T().zoomSeen = 1; bus.emit('save'); } });   // уже нашёл зум сам — подсказка не нужна
  // нажал подсказанную кнопку — палец убираем сразу
  for (const id of ['btnDodge', 'potHP', 'potMP', 'btnAuto', 'btnScroll', 'btnAct', 'portrait', 'sk0']) { const e = $(id); if (e) e.addEventListener('pointerdown', hideHand); }
  setInterval(() => { if (!G.profile || !G.zoneReady) return; handTick(); if (performance.now() < zoomWait) return; revealTick(); placeTick(); }, 400);
  bus.on('camZoom', () => { if (!zoomWait) return; zoomWait = 0; pointAt(null, 'Отлично! Так камера и работает', { time: 2.5 }); });
  // сборка 47: первая вещь из добычи — где её надеть и сравнить
  bus.on('itemPicked', () => setTimeout(() => pointAt('portrait', 'Новая вещь в сумке! Нажмите портрет → «Сумка»: там вещь можно надеть и сравнить с надетой', { key: 'bag1', time: 10 }), 600));
  // первое зелье в награду — откуда они берутся
  bus.on('reward', r => { if (r.potions) setTimeout(() => pointAt(null, 'Зелья здоровья даются в награду за задания и продаются у торговки Миры', { key: 'potgot', time: 7 }), 1500); });
  bus.on('questComplete', q => {
    if (q.id !== 'meet_merchant') return;   // Мира: научить зелью и рывку
    unlock0('pot'); unlock0('dodge');
    pointSoon('potHP', touch() ? 'Красная кнопка — зелье здоровья. Нажмите в бою, когда мало жизни' : 'Зелье здоровья: кнопка Q или красная кнопка. Пейте в бою, когда мало жизни', { time: 7 });
    setTimeout(() => pointAt('btnDodge', touch() ? 'Рывок! Нажмите, чтобы отпрыгнуть от удара врага (красный круг)' : 'Рывок: Shift — отпрыгнуть от удара врага (красный круг)', { key: 'dodge2', time: 8 }), 8000);
  });
  bus.on('questNew', q => { if (G.zoneId === 'town' && (q.chapter || 1) === 1) setTimeout(() => pointAt(null, 'Новое задание: ' + q.title + ' — идите по жёлтой стрелке', { time: 6 }), 1200); });
  bus.on('panel', it => { if (!it || it.id !== 'trainer') return; setTimeout(() => { if (G.profile.skillPts > 0) pointAt('tBtnSkills', 'Нажмите «Навыки» — там изучают умения', { key: 'tbtn' }); }, 400); });
  bus.on('skillsOpened', () => setTimeout(() => { const b = document.querySelector('.tal-learn.ok'); if (b) pointAt(b, 'Нажмите «Изучить»', { key: 'learn' }); }, 350));
  bus.on('mergeReady', () => pointAt(null, 'Три одинаковых вещи! Кузнец Горан сольёт их в одну лучшую', { key: 'merge', time: 8 }));
}
// first launch: ask whether to show the tutorial
export function askTutorial() {
  return new Promise(res => {
    const ov = el('div', 'tut'); const box = el('div', 'tut-ask', `<div class="rw-t">Добро пожаловать в DARK ASCENT!</div><p>Показать подсказки? Будем подсвечивать кнопки и вести стрелками к цели.</p>`);
    const yes = el('button', 'btn gold', 'Да, покажи'); const no = el('button', 'btn', 'Я опытный игрок');
    const row = el('div', 'row'); row.style.justifyContent = 'center'; row.append(yes, no); box.appendChild(row); ov.appendChild(box); document.body.appendChild(ov);
    G.paused = true;
    yes.onclick = () => { ov.remove(); T().on = true; G.paused = false; res(true); };
    no.onclick = () => { ov.remove(); T().on = false; unlockAll(); G.paused = false; res(false); };
  });
}
