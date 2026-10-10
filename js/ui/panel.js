// Proximity panels: walk into an NPC/room circle → the panel opens by itself; walk away → it closes.
// The game keeps running (no pause). Everything shows the price and the effect up front.
import { G, bus } from '../game/ctx.js';
import { $, el, esc, fmt } from '../core/util.js';
import { UPGRADES, upgCost, upgHave, ROOMS, DECOR } from '../data/upgrades.js';
import { REPEATABLE } from '../data/quests.js';
import { REALMS } from '../data/wild.js';
import * as CH from '../game/character.js';
import * as EC from '../game/economy.js';
import * as Q from '../game/quests.js';
import * as CS from '../game/castle.js';
import * as DQ from '../game/daily.js';
import { upgradeCost, MAX_UPG, iconOf } from '../game/items.js';
import { iconURL } from './icons.js';
import { openWindow, W } from './windows.js';
import { watchRewarded, offerToken } from '../platform/monetize.js';
import { startTrial } from '../game/game.js';
import { adButton } from './adbtn.js';
import { stats } from '../game/stats.js';
import { earlyLock } from '../game/progress.js';
import { PETS, TIERS, PET_MAX, GIFT_PET, TRAIN, TRAIN_MAX, TRAIN_STEP } from '../data/pets.js';
import * as PT from '../game/pets.js';

let target = null, box = null, lastSig = '', dismissed = null;
export function initPanel() {
  box = el('div', 'npc-panel hidden'); box.id = 'npcPanel'; $('ui').appendChild(box); box.addEventListener('scroll', moreDn, { passive: true });
  // правки мамы (М30): выполненное задание сдаётся сразу, как подошли к жителю (кузнец, Мира, Элвин, Кофи) — раньше только после второго подхода
  // или открытия его окна, и стрелка всё вела к нему
  bus.on('panel', t => { if (!t) dismissed = null; target = t; lastSig = ''; if (t && t.id && Q.isReady() && Q.turnNpc(Q.current()) === t.id) Q.talked(t.id); render(true); });
  // tap anywhere on the game field outside the panel → close it until you walk away and come back
  const hide = e => { if (!target || box.classList.contains('hidden') || box.contains(e.target)) return; dismissed = target; render(true); };
  for (const id of ['game', 'joyZone']) { const n = $(id); if (n) n.addEventListener('pointerdown', hide, true); }
  for (const ev of ['hud', 'statsChanged', 'roomUnlocked', 'save']) bus.on(ev, () => render());
  setInterval(() => render(), 1000);   // live timers (altar, seals)
}
const coin = n => `<span class="c-gold">${fmt(n)}</span>`;
const shard = n => `<span class="c-shard">${n}◆</span>`;
function row(icon, title, sub, btnText, ok, onClick, extraCls = '') {
  const r = el('div', 'pn-row ' + extraCls, `<div class="pn-ic">${icon}</div><div class="pn-tx"><b>${title}</b><small>${sub}</small></div>`);
  if (btnText != null) { const b = el('button', 'pn-btn' + (ok ? ' ok' : ''), btnText); b.disabled = !ok; b.onpointerdown = e => { e.stopPropagation(); onClick(); bus.emit('sfx', 'click'); render(true); }; r.appendChild(b);
    // правки мамы (М6): нажатие на саму строку («Зелье здоровья») тоже покупает — раньше срабатывала только зелёная кнопка справа.
    // Строку жмём коротким касанием (click), чтобы прокрутка списка пальцем ничего не покупала
    if (ok) { r.classList.add('tap'); r.onclick = e => { if (e.target.closest('button')) return; onClick(); bus.emit('sfx', 'click'); render(true); }; } }
  return r;
}
// правки мамы (М2): внизу панели «▼ ещё ниже», пока список не долистан
const moreDn = () => box && box.classList.toggle('more-dn', box.scrollHeight - box.clientHeight - box.scrollTop > 8);
function render(force) {
  if (!box) return;
  const showing = !(!target || target === dismissed || G.modalOpen || G.player.dead); $('ui').classList.toggle('panel-open', showing);
  if (!showing) { box.classList.add('hidden'); return; }
  const P = G.profile; const sig = [target.id, P.gold, P.shards, P.level, P.attrPts, P.skillPts, JSON.stringify(P.upg), JSON.stringify(P.castle), JSON.stringify(P.pets), P.potions.hp, Math.floor(Date.now() / 1000)].join('|');
  if (!force && sig === lastSig) return; lastSig = sig;
  const st = box.scrollTop; box.innerHTML = ''; box.classList.remove('hidden'); setTimeout(moreDn, 0);
  const head = (t, s) => { const h = el('div', 'pn-head', `<b>${t}</b>${s ? `<small>${s}</small>` : ''}`); const x = el('button', 'pn-x', '✕'); x.onpointerdown = e => { e.stopPropagation(); dismissed = target; render(true); }; h.appendChild(x); box.appendChild(h); };
  const bal = () => box.appendChild(el('div', 'pn-bal', `${coin(P.gold)} зол. · ${shard(P.shards || 0)}`));
  const T = target;
  if (T.id === 'trainer') {
    head('Наставник Элвин', 'Здесь изучают умения. Ниже — усиления за золото (Меткость — за осколки Бездны ◆).'); bal();
    const b2 = el('div', 'pn-tabs');
    const sk = el('button', 'pn-tab' + (P.skillPts ? ' hot' : ''), `<span>✦</span><b>Навыки</b>${P.skillPts ? `<i>+${P.skillPts}</i>` : ''}`); sk.id = 'tBtnSkills'; sk.onclick = () => W.skills({ npc: true });
    b2.append(sk); box.appendChild(b2);
    if (P.skillPts && !Object.values(P.skills || {}).some(Boolean)) box.appendChild(el('div', 'pn-tip', '💡 Сначала изучите <b>активное умение</b> — оно появится кнопкой справа внизу и сильно упростит бои.'));
    box.appendChild(el('div', 'pn-sub', 'Усиления'));
    const upLock = earlyLock('upg');   // сборка 47: усиления — после первой Летописи битв
    if (upLock) box.appendChild(el('div', 'pn-tip', '🔒 Усиления откроются, когда испытаете себя в <b>Летописи битв</b> и вернётесь с золотом.'));
    // правки мамы (М8): было непонятно, что значит «усилить героя» — умение или усиления. Засчитывается любое из двух — так и пишем,
    // и то, на что хватает золота, пульсирует
    const elvStep = !upLock && Q.current() && (Q.current().id === 'hw_elvin' || Q.current().id === 'surv_elvin');
    const rankOk = elvStep && P.skillPts > 0 && Object.keys(P.skills || {}).some(id => P.skills[id] && CH.canLearn(id).ok && P.gold >= CH.skillCost(id));
    if (elvStep) box.appendChild(el('div', 'pn-tip', `💡 Потратьте золото на любое из двух: ${P.skillPts > 0 ? '<b>✦ Навыки</b> — повысить ранг умения (есть очко навыка) или ' : ''}усиление ниже — <b>Сила удара</b> или <b>Крепость</b>. Задание засчитается сразу после покупки.`));
    if (rankOk) sk.classList.add('nudge');
    let nudged = rankOk;
    for (const [id, U] of Object.entries(UPGRADES)) {
      const l = (P.upg && P.upg[id]) || 0, max = l >= U.max, cost = upgCost(id, l), can = !upLock && !max && upgHave(P, id) >= cost;
      const r = row(U.icon, `${U.name} <span class="lv">ур. ${l}</span>`, max ? U.fmt(l) + ' · максимум' : `${U.fmt(l)} → <span class="good">${U.fmt(l + 1)}</span>`, max ? '—' : upLock ? '🔒' : U.shards ? `${cost}◆` : `${fmt(cost)}`, can, () => buyUpg(id));
      if (elvStep && can && !nudged && !U.shards) { r.querySelector('.pn-btn').classList.add('nudge'); r.classList.add('hot'); nudged = true; }
      box.appendChild(r);
    }
  } else if (T.id === 'smith') {
    head('Кузнец Горан', 'Слияние: три вещи → одна лучше. Закалка: +10% за уровень.'); bal();
    { const ready = EC.mergeGroups().reduce((a, g) => a + g.can, 0);   // сборка 38: слияние на виду, первой кнопкой
      const m = el('button', 'btn pn-merge ' + (ready ? 'gold' : ''), `⚒ Слияние 3 → 1${ready ? ` · готово ${ready}` : ''}`); m.onclick = () => W.npc_smith('merge'); box.appendChild(m);
      if (!ready) box.appendChild(el('div', 'pn-tip', '💡 <b>Слияние</b> — три одинаковые вещи (один вид и один цвет, например три зелёных шлема) кузнец переплавит в одну сильнее. Пока сливать нечего: вещи падают с врагов и из сундуков.')); }   // М30: «что такое слияние — непонятно»
    box.appendChild(el('div', 'pn-sub', 'Закалка надетого'));
    for (const slot of ['weapon', 'head', 'chest', 'amulet']) {
      const it = P.gear[slot]; if (!it) continue; const u = it.upg || 0, c = upgradeCost(it);
      box.appendChild(row(`<img src="${iconURL(iconOf(it))}">`, `${esc(it.name)} <span class="lv">+${u}</span>`, it.dmg ? 'урон' : 'защита', u >= MAX_UPG ? 'макс.' : `+${u + 1} · ${fmt(c)}`, u < MAX_UPG && P.gold >= c, () => EC.upgrade(it.id)));
    }
    const b = el('button', 'btn sm', 'Закалка вещей из сумки'); b.onclick = () => W.npc_smith('upg'); box.appendChild(b);
  } else if (T.id === 'merchant') {
    head('Торговка Мира'); bal();
    const potStep = Q.current() && Q.current().id === 'meet_merchant';
    if (potStep) box.appendChild(el('div', 'pn-tip', '💡 Купите <b>Зелье здоровья</b>: нажмите зелёную кнопку «Купить» в его строке. В бою нажмите красную кнопку зелья — оно лечит. Кнопка <b>Q</b> на ПК.'));
    for (const [k, n, ic] of [['hp', 'Зелье здоровья', 'potion_hp'], ['mp', 'Зелье маны', 'potion_mp'], ['scroll', 'Свиток возврата', 'scroll']]) {
      const pr = EC.potionPrice(k), r = row(`<img src="${iconURL(ic)}">`, n, `есть: ${k === 'scroll' ? P.scrolls : P.potions[k]}`, `Купить<br>${fmt(pr)}`, P.gold >= pr, () => EC.buyConsumable(k), potStep && k === 'hp' ? 'hot' : '');
      box.appendChild(r);
      // М6: на шаге «Купить зелье» кнопка покупки пульсирует (панель перерисовывается раз в секунду — палец бы пропадал)
      if (potStep && k === 'hp' && P.gold >= pr) r.querySelector('.pn-btn').classList.add('nudge');
    }
    const b = el('button', 'btn sm', 'Товары дня для класса'); b.onclick = () => W.npc_merchant(); box.appendChild(b);
  } else if (T.id === 'caravan') {
    // сборка 58: Караванщик Кофи — питомцы за осколки Бездны (js/data/pets.js, js/game/pets.js)
    const S = PT.petsOf(P);
    head('Караванщик Кофи', 'Зверьки из Пустошей. С вами ходит один: бьёт слабо, зато у каждого свой дар.'); bal();
    if (!S.met) {
      box.appendChild(el('div', 'pn-tip', `🎁 Подарок от Кофи: <b>${PETS[GIFT_PET].name}</b>. ${PETS[GIFT_PET].desc}`));
      const g = el('button', 'btn gold', 'Принять подарок'); g.onpointerdown = e => { e.stopPropagation(); PT.meetCaravan(); bus.emit('sfx', 'rareDrop'); render(true); }; box.appendChild(g);
    }
    const btn = (r, text, ok, fn, cls = '') => { const b = el('button', 'pn-btn' + (ok ? ' ok' : '') + cls, text); b.disabled = !ok; b.onpointerdown = e => { e.stopPropagation(); fn(); render(true); }; r.appendChild(b); };
    for (const [id, D] of Object.entries(PETS)) {
      const lvl = S.own[id] || 0, c = PT.petCan(id), T0 = TIERS[D.tier], on = S.active === id;
      const sub = `<span style="color:${T0.color}">${T0.name}</span> · ⚔ ${PT.petInfo(id, lvl || 1).dps}/с · ${D.desc}`;
      const r = row(D.icon, `${esc(D.name)}${lvl ? ` <span class="lv">ур. ${lvl}</span>` : ''}`, sub, null, false, null, on ? 'hot' : '');
      { const ib = el('button', 'pn-btn ok pn-info', 'ℹ'); ib.title = 'Урон и дар питомца'; ib.onpointerdown = e => { e.stopPropagation(); W.petInfo(id); }; r.appendChild(ib); }   // П61
      if (!lvl) btn(r, c.why ? '🔒 ' + c.why : `${c.cost}◆`, c.ok, () => PT.buyPet(id));
      else {
        btn(r, on ? '✔ С вами' : 'Взять', !on, () => PT.choosePet(id));
        if (lvl < PET_MAX) btn(r, `▲ ${c.cost}◆`, c.ok, () => PT.upgradePet(id), ' up');
      }
      box.appendChild(r);
    }
    // П29 (правки 2): дрессировка за золото — физический и магический урон всех питомцев; короткое обучение при первом заходе
    if (S.met) {
      box.appendChild(el('div', 'pn-sub', 'Дрессировка (для всех питомцев)'));
      if (!S.tut) {
        const tip = el('div', 'pn-tip', '<b>Как растёт питомец</b><br>1. <b>Уровень</b> зверька (▲ за осколки ◆) — +15% ко всей его силе, до 5-го.<br>2. <b>Дрессировка</b> за золото — у всех питомцев сразу: 🗡 физический урон (укус, когти, иглы) и ✦ магический (огонь, яд, искры, лечение, щит). +10% за ступень.<br>3. Смените зверька — выучка останется.');
        const ok = el('button', 'btn gold', 'Понятно'); ok.onpointerdown = e => { e.stopPropagation(); S.tut = 1; bus.emit('save'); render(true); }; tip.appendChild(ok); box.appendChild(tip);
      }
      for (const [k, T] of Object.entries(TRAIN)) {
        const c = PT.trainCan(k), r = row(T.icon, `${esc(T.name)} <span class="lv">${c.lvl}/${TRAIN_MAX}</span>`, `+${Math.round(c.lvl * TRAIN_STEP * 100)}% · ${esc(T.txt)}`, null, false, null, '');
        if (!c.max) btn(r, `▲ ${fmt(c.cost)} зол.`, c.ok, () => PT.trainPet(k), ' up'); box.appendChild(r);
      }
    }
    box.appendChild(el('p', 'muted', '<small>Осколки Бездны ◆ дают стражи, боссы, чемпионы, сундуки, Жатва и недельные задания. Улучшение: +15% силы питомца за уровень.</small>'));
  } else if (T.id === 'board') {
    head('Доска заданий', 'Ежедневные · недельные · долгие контракты');
    box.appendChild(el('div', 'pn-sub', 'Ежедневные'));
    for (const q of DQ.dailyQuests()) box.appendChild(row('☀', esc(q.title), q.claimed ? 'получено' : `${q.cur}/${q.n}`, q.done && !q.claimed ? 'Забрать' : null, q.done && !q.claimed, () => DQ.claimDaily(q.id), q.done && !q.claimed ? 'hot' : ''));
    box.appendChild(el('div', 'pn-sub', 'Недельные (крупнее)'));
    for (const q of DQ.weeklyQuests()) box.appendChild(row('☾', esc(q.title), q.claimed ? 'получено' : `${q.cur}/${q.n}`, q.done && !q.claimed ? 'Забрать' : null, q.done && !q.claimed, () => DQ.claimWeekly(q.id), q.done && !q.claimed ? 'hot' : ''));
    box.appendChild(el('div', 'pn-sub', 'Долгие контракты (трудные)'));
    for (const r of REPEATABLE) { const s = Q.repState(r); box.appendChild(row(s.done ? '✔' : '•', esc(r.title), `${s.cur}/${r.n}`, s.done ? 'Забрать' : null, s.done, () => Q.claimRep(r.id), s.done ? 'hot' : '')); }
  } else if (T.type === 'roomgate') {
    const R = ROOMS[T.room]; const c = CS.canUnlock(T.room);
    head(R.name, R.desc); bal();
    box.appendChild(el('div', 'pn-req', `<span class="${P.level >= R.lvl ? 'good' : 'bad'}">Уровень ${R.lvl}+</span> · <span class="${P.gold >= R.gold ? 'good' : 'bad'}">${fmt(R.gold)} зол.</span>${R.shards ? ` · <span class="${(P.shards || 0) >= R.shards ? 'good' : 'bad'}">${R.shards} осколков</span>` : ''}`));
    const b = el('button', 'btn ' + (c.ok ? 'gold' : ''), c.ok ? 'Открыть комнату' : c.why); b.disabled = !c.ok; b.onclick = () => CS.unlock(T.room); box.appendChild(b);
    box.appendChild(el('p', 'muted', '<small>Осколки Бездны выпадают случайно: с элиты, чемпионов, стражей, боссов и из сундуков.</small>'));
  } else if (T.type === 'castleguide') {
    head('Карта цитадели', 'Нажмите «Перейти» — окажетесь у входа в комнату.'); bal();
    const rooms = G.zone.json.rooms;
    for (const [id, R] of Object.entries(ROOMS)) {
      const open = P.castle[id]; const gate = G.zone.inter.find(i => i.type === 'roomgate' && i.room === id);
      box.appendChild(row(open ? '✔' : '🔒', esc(R.name), open ? 'открыто' : `ур. ${R.lvl} · ${fmt(R.gold)} зол.${R.shards ? ` · ${R.shards}◆` : ''}`, 'Перейти', true, () => {
        const rr = rooms[id]; const tx = open ? rr[0] + rr[2] / 2 : gate.x, ty = open ? rr[1] + rr[3] / 2 + 1 : gate.y;
        const [x, y] = G.zone.map.nearestFree(open ? tx : (gate.x + (id === 'altar' ? 1.6 : id === 'trial' ? -1.6 : 0)), open ? ty : (gate.y + (id === 'treasury' || id === 'trophy' ? 1.6 : 0)), 0.35);
        G.player.x = x; G.player.y = y; G.cam.x = x; G.cam.y = y; bus.emit('sfx', 'portal');
      }));
    }
  } else if (T.type === 'nemwall') {
    const S = P.nemesis || { list: [], trophies: [] }, foes = S.list.filter(n => n.alive && (n.rank > 0 || n.defeats || n.fled));
    head('Стена врагов', 'Убитые немезисы висят трофеями (+урон и золото навсегда). Живые ждут мести.');
    box.appendChild(el('div', 'pn-big', `Трофеи: <b>${S.trophies.length}</b> · бонус +${S.trophies.reduce((a, t) => a + t.bonus, 0).toFixed(1)}% урона и золота`));
    for (const t of S.trophies) box.appendChild(row('☠', esc(t.name), `${(REALMS[t.realm] || REALMS.forest).short} · ранг ${t.rank} · +${t.bonus.toFixed(1)}%`, null, false, null));
    for (const n of foes) box.appendChild(row('⚔', esc(n.name + (n.title ? ', ' + n.title : '')), `жив · ранг ${n.rank}${n.stash ? ` · хранит ${n.stash} зол.` : ''}`, null, false, null, 'hot'));
    if (!S.trophies.length && !foes.length) box.appendChild(el('p', 'muted', '<small>Пока пусто. Отбейте форт в Фьордах или Старом Лесу — его командир станет вашим немезисом.</small>'));
  } else if (T.type === 'socket') {
    const cur = P.castle.decor && P.castle.decor[T.sid];
    head(cur ? DECOR[cur].name : 'Место для украшения', cur ? `Бонус: ${DECOR[cur].txt}. Можно заменить (старое вернёт половину цены).` : 'Обставьте цитадель: каждое украшение даёт постоянный бонус.'); bal();
    for (const [id, D] of Object.entries(DECOR)) { if (id === cur) continue; box.appendChild(row('✦', esc(D.name), D.txt, `${fmt(D.gold)}${D.shards ? ` · ${D.shards}◆` : ''}`, P.gold >= D.gold && (P.shards || 0) >= D.shards, () => CS.placeDecor(T.sid, id))); }
  } else if (T.room === 'altar') {
    const l = P.castle.altar, stored = CS.altarStored(), rate = CS.altarRate(), uc = CS.altarUpgCost();
    head(`Алтарь золота · ур. ${l}`, `${fmt(rate)} зол./час, копится до 8 часов — даже когда вы не в игре.`); bal();
    box.appendChild(el('div', 'pn-big', `Накоплено: ${coin(stored)}`));
    const r1 = el('div', 'pn-row2');
    const a = el('button', 'btn gold', 'Забрать'); a.disabled = !stored; a.onclick = () => { CS.altarCollect(1); render(true); };
    const ad = el('button', 'btn ad', 'Забрать ×2'); ad.disabled = !stored; ad.onclick = () => watchRewarded('altar_x2', offerToken('altar_x2', String(P.castle.altarAt)), () => CS.altarCollect(2)).then(() => render(true));
    r1.append(a, ad); box.appendChild(r1);
    if (l < 10) box.appendChild(row('▲', `Улучшить алтарь до ур. ${l + 1}`, `доход → ${fmt(Math.round((35 + 25 * (l + 1)) * (1 + P.level * 0.08)))}/час`, `${fmt(uc.gold)} · ${uc.shards}◆`, P.gold >= uc.gold && P.shards >= uc.shards, () => CS.altarUpgrade()));
  } else if (T.room === 'trial') {
    const s = CS.seals(); const left = CS.nextIn(s, CS.SEAL_MS);
    head('Зал испытаний', 'Бой со стражем прямо в цитадели. Включите АВТО — герой сразится сам.'); bal();
    box.appendChild(el('div', 'pn-big', `Печати: <b>${s.n}/${CS.SEAL_MAX}</b>${left ? ` <small>· +1 через ${Math.ceil(left / 60000)} мин</small>` : ''}`));
    const F = P.story.flags, seen = t => t.type === 'boss' ? !!F.bossKilled : !!(F.eliteKilled || F.bossKilled);   // испытания только против тех, кого герой уже победил в сюжете
    for (const t of CS.TRIALS) if (!seen(t)) { box.appendChild(row('?', 'Неизвестный противник', t.type === 'boss' ? 'Откроется после победы над Палачом Бездны' : 'Откроется после победы над Стражем Медальона', null, false, () => { })); }
    else box.appendChild(row('⚔', esc(t.name), `ур. врага ${P.level + t.lvl} · нужен ур. ${t.req}`, P.level < t.req ? `ур. ${t.req}` : 'Сразиться', P.level >= t.req && s.n > 0 && !G.trial, () => startTrial(t)));
    box.appendChild(el('p', 'muted', `<small>Печати — вход на испытание. Восстанавливаются сами: +1 каждые 3 часа (максимум ${CS.SEAL_MAX}). Ещё печать можно получить за рекламу раз в час.</small>`));
    box.appendChild(adButton('+1 печать', 'seal', 60 * 60e3, () => { s.n++; bus.emit('save'); }, () => render(true)));
  } else if (T.room === 'treasury') {
    head('Сокровищница Бездны', 'Сундук: редкая вещь вашего класса, 7% — эпическая.'); bal();
    box.appendChild(row('▣', 'Сундук Бездны', `${CS.CHEST_SHARDS} осколков`, 'Открыть', (P.shards || 0) >= CS.CHEST_SHARDS, () => CS.openTreasury()));
  } else if (T.room === 'trophy') {
    const l = P.castle.trophy || 0, c = CS.trophyCost();
    head(`Зал трофеев · ур. ${l}`, `Сейчас: +${l * 3}% урона, +${l * 5}% золота.`); bal();
    if (l < 15) box.appendChild(row('♛', `Трофей ур. ${l + 1}`, `+3% урона, +5% золота`, `${fmt(c.gold)} · ${c.shards}◆`, P.gold >= c.gold && (P.shards || 0) >= c.shards, () => CS.trophyUpgrade()));
  }
  box.scrollTop = st;
}
function buyUpg(id) {
  const P = G.profile; P.upg = P.upg || {}; const l = P.upg[id] || 0, cost = upgCost(id, l);
  if (earlyLock('upg')) { bus.emit('sfx', 'deny'); return; }
  if (l >= UPGRADES[id].max || upgHave(P, id) < cost) { bus.emit('sfx', 'deny'); if (UPGRADES[id].shards && l < UPGRADES[id].max) bus.emit('toast', { text: `Нужно ${cost}◆ осколков Бездны`, sub: 'Осколки дают боссы Летописи, Жатва, недельные задания и Путь сезона', kind: 'warn' }); return; }
  { const q = Q.current(); if (q && q.id === 'hw_elvin') P.story.flags.upgBought = true; if (q && q.id === 'surv_elvin') P.story.flags.upgBought2 = true; }   // шаги обучения «Усилить героя у Элвина»
  if (UPGRADES[id].shards) P.shards -= cost; else P.gold -= cost; P.upg[id] = l + 1; G.stats = stats(P); bus.emit('statsChanged'); bus.emit('sfx', 'anvil'); bus.emit('save');
  bus.emit('float', { x: G.player.x, y: G.player.y, text: `${UPGRADES[id].name} ↑`, color: '#9fe38e', z: 2.4 });
}
