// Обучение (сборка 45): без окон на паузе. Над нужной кнопкой появляется «палец» и одна строка текста,
// игра при этом идёт. Кнопки боя появляются тогда, когда они впервые нужны (profile.tutorial.un).
// Сборка 49 (карусель «8 приёмов обучения»): вопроса «Показать подсказки?» больше нет — подсказки включены всегда
// и выключаются в «Справке» (меню); рывок учит медленный скелет-учитель в склепе; зелье — после боя; каждая подсказка
// попадает в журнал «Справки», а ключевые моменты первых минут — в метки времени (profile.tutorial.ms).
import { G, bus } from '../game/ctx.js';
import { $, el, esc } from '../core/util.js';
import { STORY } from '../data/quests.js';
import { once as anOnce } from '../platform/analytics.js';
import { UPGRADES, upgCost } from '../data/upgrades.js';
import { skillCost, canLearn } from '../game/character.js';
import { earlyLock } from '../game/progress.js';

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
let hand = null, line = null, handKey = null, handUntil = 0, handWin = null, zoomLine = false;   // handWin — подсказка внутри окна (живёт, пока элемент на экране)
const rectOf = id => { const e = typeof id === 'string' ? $(id) : id; if (!e || e.offsetParent === null) return null; const r = e.getBoundingClientRect(); return r.width ? r : null; };
export function hideHand() { if (hand) { hand.remove(); hand = null; } if (line) { line.remove(); line = null; } handKey = null; handWin = null; zoomLine = false; }
// показать палец над элементом (или просто строку, если элемента нет)
// кнопка только что открылась: подождать кадр, пока HUD её покажет, иначе «палец» не найдёт место
export const pointSoon = (sel, text, o) => setTimeout(() => pointAt(sel, text, o), 150);
export function pointAt(sel, text, { key = null, time = 9, mid = false, force = false, win = false } = {}) {
  const t = T(); if (t.off && !force) return false;
  if (force && (hand || line)) return false;   // напоминание не перебивает подсказку обучения
  if (key && t.tips[key]) return false;
  const r = sel ? rectOf(sel) : null;
  if (sel && !r) return false;
  if (key) { t.tips[key] = 1; bus.emit('save'); anOnce('hint_' + key); }
  logHint(text);
  hideHand();
  if (r) { hand = el('div', 'hand'); hand._sel = sel; placeHand(r); document.body.appendChild(hand); }
  line = el('div', 'hint-line ' + (mid || !r ? 'mid' : 'bot'), text); document.body.appendChild(line);
  handKey = key || sel || text; handUntil = performance.now() + time * 1000; handWin = win && sel ? (typeof sel === 'string' ? $(sel) : sel) : null;
  bus.emit('sfx', 'quest');
  return true;
}
// правки мамы (М16): палец ставился один раз и оставался на месте, когда кнопка уезжала (поворот телефона, вырез Android, появился трекер) —
// и показывал на золото с кристаллами. Теперь палец следует за своей кнопкой
function placeHand(r) { hand.style.left = (r.left + r.width / 2) + 'px'; hand.style.top = (r.top + r.height / 2) + 'px'; }
function followHand() { if (!hand || !hand._sel) return; const r = rectOf(hand._sel); if (r) placeHand(r); }
addEventListener('resize', () => setTimeout(followHand, 120));
// подсказка исчезает сама: по времени, по нажатию нужной кнопки или по событию
function handTick() {
  if (!hand && !line) return;
  followHand();
  // сборка 60: подсказка внутри окна (win) не гаснет от самого окна — гаснет, когда её кнопка исчезла; строка о зуме гаснет, как только открыто окно или панель NPC (П7)
  if (performance.now() > handUntil || G.cinema || (handWin ? !handWin.isConnected : G.modalOpen) || (zoomLine && G.panelTarget)) hideHand();
}

// ---------------------------------------------------------------- что и когда открывать
let revealAt = 0;   // не больше одной новой кнопки раз в 3 с: иначе подсказки перебивают друг друга
function revealTick() {
  const P = G.profile, pl = G.player, S = G.stats, t = T(); if (!P || !pl || !S || t.off || pl.dead || G.modalOpen) return;   // сборка 59: мёртвому подсказки не нужны; сборка 60: и пока открыто окно (подарок старосты — умение — показываем после окна награды)
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
  // сборка 60 (П7): сначала в первом подземелье (катакомбы), потом один раз в деревне; не поверх окна и не поверх панели NPC (Элвин)
  { const zk = { town: 'town', catacombs: 'cata' }[G.zoneId], zs = (t.zoomAt = t.zoomAt || {});
    zoomTicks = zk && !G.modalOpen && !G.panelTarget && !G.hwOpen && !hand && !line ? zoomTicks + 1 : 0;
    const calm = !(G.enemies || []).some(e => !e.dead && e.aggro);
    if (zk && !zs[zk] && !t.zoomSeen && zoomTicks > 14 && calm && (G.zoneId !== 'town' || zs.cata)) { zs[zk] = 1; bus.emit('save');
      // своя фраза в каждом месте — не повтор одной и той же строки
      const how = touch() ? { in: 'разведите два пальца на экране', out: 'сведите два пальца' } : { in: 'колесо мыши от себя', out: 'колесо мыши на себя' };
      const txt = { town: `Помните: камеру можно приблизить (${how.in}) или отдалить (${how.out}) — издалека видно больше`, cata: `Камеру можно приблизить (${how.in}) или отдалить (${how.out}) — отдалите, чтобы видеть больше вокруг` }[zk];   // М3
      if (t.off || !t.on) bus.emit('toast', { text: txt, kind: 'info' }); else { if (pointAt(null, txt, { time: 9 })) zoomLine = true; return; } } }
  if (t.off || !t.on || G.modalOpen) return;
  const once = (key, sel, text) => !t.tips[key] && pointAt(sel, text, { key });   // сборка 49: объявлено до первого использования (раньше — ошибка в консоли каждые 0,4 с)
  const q = G.profile.story && STORY[G.profile.story.stage];
  // сборка 47: саркофаг с ключом — многие пробегали мимо
  if (q && q.id === 'medallion' && !P.world.hasKey && G.focus && G.focus.type === 'sarc' && once('sarc', 'btnAct', 'Саркофаг! Откройте его — в одном из них ключ от двери к амулету')) return;
  if (q && q.id === 'medallion' && !P.world.hasKey && G.zoneId === 'catacombs' && once('sarc0', null, 'Ключ спрятан в одном из саркофагов — открывайте их')) return;
  // правки мамы (М11): стрелку и магу в первом подземелье — как воевать: выстрел, отход, выстрел (кайт), а не стоять лицом к лицу
  if (G.stats && G.stats.ranged && (G.zoneId === 'catacombs' || G.zoneId === 'depths') && (G.enemies || []).some(e => !e.dead && e.aggro) &&
    once('kite', null, G.profile.cls === 'mage' ? 'Вы маг: бейте издалека. Враг подошёл — отбегите и остановитесь, герой ударит сам. Отошёл — ударил — отошёл' : 'Вы лучник: стреляйте издалека. Враг подошёл — отбегите и остановитесь, герой выстрелит сам. Отошёл — выстрелил — отошёл')) return;
  if (!$('btnLead').classList.contains('hidden') && once('lead', 'btnLead', 'Не знаете, куда идти? Нажмите «Веди меня» — герой сам побежит к цели')) return;
  if ((P.shards || 0) > 0 && once('shards', 'goldBox', 'Фиолетовые ◆ — осколки Бездны, редкая валюта. Тратьте с умом: питомцы у Кофи, «Меткость» у Элвина')) return;
  if (!$('btnAct').classList.contains('hidden')) {
    const f = G.focus;
    if (once('act', 'btnAct', f && f.type === 'portal' ? 'Нажмите, чтобы войти в портал' : 'Нажмите, чтобы поговорить или открыть')) return;
  }
  if (G.zoneId === 'town' && P.story.stage >= 1 && once('hero', 'portrait', 'Нажмите портрет — снаряжение, навыки и задания')) return;
  if (P.bag && P.bagSize && P.bag.length >= P.bagSize - 2 && G.zoneId === 'town' && once('sell', null, 'Сумка почти полна: у торговки Миры есть кнопка «Продать серое»')) return;
}

// ---------------------------------------------------------------- напоминания первых уровней (правки мамы)
// М15 — мало здоровья: зелье (и что вне боя здоровье восстанавливается само); М17 — умение готово, а герой бьёт только автоатакой;
// М19 — золота хватает на покупку у Элвина. Каждое — не чаще своего интервала, только до 8 уровня и если подсказки не выключены
const nagT = {}; let lastSkillT = 0, goldNoted = 0;
const nag = (k, gap) => { const now = performance.now(); if (now - (nagT[k] || -1e9) < gap * 1000) return false; nagT[k] = now; return true; };
export function elvinBuy() {   // самая дешёвая покупка у Элвина, на которую хватает золота: { text, cost } или null
  const P = G.profile; if (!P || earlyLock('upg')) return null; let best = null;
  if (P.skillPts > 0) for (const id of Object.keys(P.skills || {})) if (P.skills[id] && canLearn(id).ok) { const c = skillCost(id); if (P.gold >= c && (!best || c < best.cost)) best = { text: 'повысить умение', cost: c }; }
  for (const [id, U] of Object.entries(UPGRADES)) { if (U.shards) continue; const l = (P.upg && P.upg[id]) || 0; if (l >= U.max) continue; const c = upgCost(id, l); if (P.gold >= c && (!best || c < best.cost)) best = { text: `«${U.name}»`, cost: c }; }
  return best;
}
function remindTick() {
  const P = G.profile, pl = G.player, S = G.stats; if (!P || !pl || pl.dead || !S || !hintsOn() || P.level >= 8 || G.modalOpen || G.cinema || G.surv) return;
  const fight = (G.enemies || []).some(e => !e.dead && e.aggro), dz = G.zoneId !== 'town' && G.zoneId !== 'castle';
  if (P.slots.some(id => id && (pl.cds[id] || 0) > 0)) lastSkillT = performance.now();
  if (dz && unlocked('pot') && pl.hp < S.maxHP * 0.4 && P.potions.hp > 0 && (pl.cds.pot_hp || 0) <= 0 && nag('pot', 40)) {
    pointAt('potHP', fight ? 'Мало здоровья! Нажмите красное зелье' : 'Мало здоровья. Выпейте зелье или постойте без боя — здоровье восстанавливается само', { time: 5, force: true }); return; }
  if (dz && S.ranged && P.level < 6 && T().tips.kite && (G.enemies || []).some(e => !e.dead && e.aggro && !e.D.proj && Math.hypot(e.x - pl.x, e.y - pl.y) < 1.6 + e.r) && pl.hp < S.maxHP * 0.7 && nag('kite', 90)) {
    pointAt(null, 'Враг вплотную — отбегите на пару шагов и остановитесь: издалека вы бьёте без ответа', { time: 4, force: true }); return; }   // М11
  const id = P.slots.find(Boolean), b = $('sk0');
  if (dz && fight && id && unlocked('sk') && (pl.cds[id] || 0) <= 0 && pl.mp >= 20 && performance.now() - lastSkillT > 45000 && b && b.offsetParent && nag('skill', 70)) {
    pointAt('sk0', 'Умение готово! Нажмите его — оно бьёт намного сильнее обычной атаки', { time: 5, force: true }); return; }
  if (G.zoneId === 'town' && !fight) { const e = elvinBuy();
    if (e && P.gold >= goldNoted + 100 && nag('elvin', 120)) { goldNoted = P.gold; bus.emit('toast', { text: `Хватает золота у Элвина: ${e.text} — ${e.cost} зол.`, sub: 'Сильнее герой — легче бои. Наставник у тренировочных чучел (значок «+»)', kind: 'quest' }); }
    if (!e) goldNoted = Math.min(goldNoted, P.gold); }
}

export async function intro() {
  const t = T(); if (t.introDone) return; t.introDone = true; bus.emit('save');
  // первые секунды в склепе: только движение. Остальному учим по ходу.
  if (G.run && G.run.floor === 0) return;   // сборка 49: в склепе это говорит пролог (tutorialTick в game.js) — без повтора
  pointAt('joyZone', touch() ? 'Ведите пальцем по экрану — герой пойдёт. Коснитесь места — побежит туда' : 'Идите: WASD или зажмите правую кнопку мыши', { time: 10 });
}

export function initTutorial() {
  bus.on('tutorialRestart', () => { const t = T(); t.on = true; t.off = false; t.introDone = false; t.tips = {}; t.un = {}; intro(); });
  bus.on('tutHand', o => pointAt(o.sel, o.text, o));
  bus.on('zoneEntered', () => { zoomTicks = 0; });   // сборка 59: подсказку о зуме считать заново в каждой локации
  bus.on('camZoom', () => { if (G.profile) { T().zoomSeen = 1; bus.emit('save'); } });   // уже нашёл зум сам — подсказка не нужна
  // нажал подсказанную кнопку — палец убираем сразу
  for (const id of ['btnDodge', 'potHP', 'potMP', 'btnAuto', 'btnScroll', 'btnAct', 'portrait', 'sk0']) { const e = $(id); if (e) e.addEventListener('pointerdown', hideHand); }
  setInterval(() => { if (!G.profile || !G.zoneReady) return; handTick(); if (G.cinema) return; revealTick(); placeTick(); remindTick(); }, 400);   // во время облёта камеры подсказок нет
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
  // сборка 60 (П32): окно героя — портрет → «Герой» → сумка и сравнение. Учим на шаге «Осмотреть снаряжение»
  const gearStep = () => { const q = G.profile && STORY[G.profile.story.stage]; return q && q.id === 'hero_gear'; };
  const portraitHint = () => { if (gearStep() && !G.modalOpen) pointAt('portrait', 'Нажмите на портрет — это окно героя', { time: 12 }); };
  bus.on('questNew', q => { if (q && q.id === 'hero_gear') setTimeout(function again(n = 0) { if (G.modalOpen && n < 30) return setTimeout(() => again(n + 1), 700); portraitHint(); }, 900); });
  bus.on('menuOpened', () => { T().tips.hero = 1; if (gearStep()) pointAt(document.querySelector('.menu-tile[data-w="inventory"]'), '«Герой» — надетые вещи и сумка', { time: 12, win: true }); });
  bus.on('invOpened', () => {
    if (!hintsOn()) return; const t = T(); if (t.tips.inv1) return; t.tips.inv1 = 1; bus.emit('save');
    const g = document.querySelector('.eq-grid .eq-slot') || document.querySelector('.eq-doll .eq-slot');
    pointAt(g, 'Слева — что надето, справа — сумка. Нажмите на вещь: ▲ — лучше надетой, ▼ — хуже. Там же «Надеть» и «Продать»', { time: 12, win: true });
  });
  bus.on('skillsOpened', () => setTimeout(() => { const b = document.querySelector('.tal-learn.ok'); if (b) pointAt(b, 'Нажмите «Изучить»', { key: 'learn', win: true }); }, 350));
  // метки времени «первых минут» (видно в «Справке»: тестер присылает скриншот)
  bus.on('kill', () => mark('kill1'));
  bus.on('questComplete', () => mark('quest1'));
  bus.on('levelUp', () => { const L = G.profile.level; if (L >= 2) mark('lvl2'); if (L >= 5) mark('lvl5'); });
  bus.on('skillsChanged', () => { if (Object.values(G.profile.skills || {}).some(Boolean)) mark('skill1'); });
  bus.on('zoneEntered', id => { if (id === 'town' && G.profile.tutorial.prologue) mark('crypt'); if (id === 'catacombs') mark('cata'); });
  bus.on('playerDeath', () => { mark('death1'); hideHand(); });
  bus.on('bossDefeated', () => mark('boss'));
  // сборка 60 (П13): первая синяя душа в Жатве — короткая пауза и стрелка над ней (стрелку рисует survival.js)
  bus.on('survGemTip', () => { const t = T(); t.tips.survGem = 1; bus.emit('save'); if (!hintsOn()) return;
    G.paused = true; pointAt(null, '💎 Синяя душа! Подберите её — души качают ваши умения в этой Жатве', { time: 5, mid: true });
    setTimeout(() => { if (!G.modalOpen && G.surv) G.paused = false; }, 1800); });
  bus.on('mergeReady', () => pointAt(null, 'Три одинаковых вещи! Кузнец Горан сольёт их в одну лучшую', { key: 'merge', time: 8 }));
}
