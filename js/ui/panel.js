// Proximity panels: walk into an NPC/room circle → the panel opens by itself; walk away → it closes.
// The game keeps running (no pause). Everything shows the price and the effect up front.
import { G, bus } from '../game/ctx.js';
import { $, el, esc, fmt } from '../core/util.js';
import { UPGRADES, upgCost, ROOMS, DECOR } from '../data/upgrades.js';
import { REPEATABLE } from '../data/quests.js';
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

let target = null, box = null, lastSig = '', dismissed = null;
export function initPanel() {
  box = el('div', 'npc-panel hidden'); box.id = 'npcPanel'; $('ui').appendChild(box);
  bus.on('panel', t => { if (!t) dismissed = null; target = t; lastSig = ''; render(true); });
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
  if (btnText != null) { const b = el('button', 'pn-btn' + (ok ? ' ok' : ''), btnText); b.disabled = !ok; b.onpointerdown = e => { e.stopPropagation(); onClick(); bus.emit('sfx', 'click'); render(true); }; r.appendChild(b); }
  return r;
}
function render(force) {
  if (!box) return;
  const showing = !(!target || target === dismissed || G.modalOpen || G.player.dead); $('ui').classList.toggle('panel-open', showing);
  if (!showing) { box.classList.add('hidden'); return; }
  const P = G.profile; const sig = [target.id, P.gold, P.shards, P.level, P.attrPts, P.skillPts, JSON.stringify(P.upg), JSON.stringify(P.castle), P.potions.hp, Math.floor(Date.now() / 1000)].join('|');
  if (!force && sig === lastSig) return; lastSig = sig;
  const st = box.scrollTop; box.innerHTML = ''; box.classList.remove('hidden');
  const head = (t, s) => { const h = el('div', 'pn-head', `<b>${t}</b>${s ? `<small>${s}</small>` : ''}`); const x = el('button', 'pn-x', '✕'); x.onpointerdown = e => { e.stopPropagation(); dismissed = target; render(true); }; h.appendChild(x); box.appendChild(h); };
  const bal = () => box.appendChild(el('div', 'pn-bal', `${coin(P.gold)} зол. · ${shard(P.shards || 0)}`));
  const T = target;
  if (T.id === 'trainer') {
    head('Наставник Элвин', 'Здесь изучают умения и тратят очки. Ниже — усиления за золото.'); bal();
    const b2 = el('div', 'pn-tabs');
    const sk = el('button', 'pn-tab' + (P.skillPts ? ' hot' : ''), `<span>✦</span><b>Навыки</b>${P.skillPts ? `<i>+${P.skillPts}</i>` : ''}`); sk.id = 'tBtnSkills'; sk.onclick = () => W.skills({ npc: true });
    const at = el('button', 'pn-tab' + (P.attrPts ? ' hot' : ''), `<span>🛡</span><b>Характеристики</b>${P.attrPts ? `<i>+${P.attrPts}</i>` : ''}`); at.onclick = () => W.character({ npc: true });
    b2.append(sk, at); box.appendChild(b2);
    if (P.skillPts && !Object.values(P.skills || {}).some(Boolean)) box.appendChild(el('div', 'pn-tip', '💡 Сначала изучите <b>активное умение</b> — оно появится кнопкой справа внизу и сильно упростит бои.'));
    box.appendChild(el('div', 'pn-sub', 'Усиления за золото'));
    for (const [id, U] of Object.entries(UPGRADES)) {
      const l = (P.upg && P.upg[id]) || 0, max = l >= U.max, cost = upgCost(id, l);
      box.appendChild(row(U.icon, `${U.name} <span class="lv">ур. ${l}</span>`, max ? U.fmt(l) + ' · максимум' : `${U.fmt(l)} → <span class="good">${U.fmt(l + 1)}</span>`, max ? '—' : `${fmt(cost)}`, !max && P.gold >= cost, () => buyUpg(id)));
    }
  } else if (T.id === 'smith') {
    head('Кузнец Горан', 'Закалка: +10% к урону или защите за уровень.'); bal();
    for (const slot of ['weapon', 'head', 'chest', 'amulet']) {
      const it = P.gear[slot]; if (!it) continue; const u = it.upg || 0, c = upgradeCost(it);
      box.appendChild(row(`<img src="${iconURL(iconOf(it))}">`, `${esc(it.name)} <span class="lv">+${u}</span>`, it.dmg ? 'урон' : 'защита', u >= MAX_UPG ? 'макс.' : `+${u + 1} · ${fmt(c)}`, u < MAX_UPG && P.gold >= c, () => EC.upgrade(it.id)));
    }
    const b = el('button', 'btn sm', 'Перековка свойств'); b.onclick = () => W.npc_smith(); box.appendChild(b);
  } else if (T.id === 'merchant') {
    head('Торговка Мира'); bal();
    for (const [k, n, ic] of [['hp', 'Зелье здоровья', 'potion_hp'], ['mp', 'Зелье маны', 'potion_mp'], ['scroll', 'Свиток возврата', 'scroll']]) {
      const pr = EC.potionPrice(k); box.appendChild(row(`<img src="${iconURL(ic)}">`, n, `есть: ${k === 'scroll' ? P.scrolls : P.potions[k]}`, fmt(pr), P.gold >= pr, () => EC.buyConsumable(k)));
    }
    const b = el('button', 'btn sm', 'Товары дня для класса'); b.onclick = () => W.npc_merchant(); box.appendChild(b);
  } else if (T.id === 'board') {
    head('Доска заданий', 'Контракты идут всегда — награду забирайте здесь.');
    for (const r of REPEATABLE) { const s = Q.repState(r); box.appendChild(row(s.done ? '✔' : '•', esc(r.title), `${s.cur}/${r.n}`, s.done ? 'Забрать' : null, s.done, () => Q.claimRep(r.id), s.done ? 'hot' : '')); }
    for (const q of DQ.dailyQuests()) box.appendChild(row('☀', esc(q.title), q.claimed ? 'получено' : `${q.cur}/${q.n}`, q.done && !q.claimed ? 'Забрать' : null, q.done && !q.claimed, () => DQ.claimDaily(q.id), q.done && !q.claimed ? 'hot' : ''));
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
    for (const t of CS.TRIALS) box.appendChild(row('⚔', esc(t.name), `ур. врага ${P.level + t.lvl} · нужен ур. ${t.req}`, P.level < t.req ? `ур. ${t.req}` : 'Сразиться', P.level >= t.req && s.n > 0 && !G.trial, () => startTrial(t)));
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
  if (l >= UPGRADES[id].max || P.gold < cost) { bus.emit('sfx', 'deny'); return; }
  P.gold -= cost; P.upg[id] = l + 1; G.stats = stats(P); bus.emit('statsChanged'); bus.emit('sfx', 'anvil'); bus.emit('save');
  bus.emit('float', { x: G.player.x, y: G.player.y, text: `${UPGRADES[id].name} ↑`, color: '#9fe38e', z: 2.4 });
}
