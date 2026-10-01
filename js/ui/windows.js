// Modal windows. All fit the viewport with internal scrolling; the game pauses while one is open.
import { G, bus, inCombat } from '../game/ctx.js';
import { $, el, esc, fmt } from '../core/util.js';
import { SLOTS, SLOT_NAMES, RARITY, WEAPONS, BASE, CLASSES } from '../data/items.js';
import { SKILLS, BRANCHES } from '../data/skills.js';
import { STORY, REPEATABLE, DIALOG, CHAPTER } from '../data/quests.js';
import { stats, compare, usefulness, meetsReq, xpToNext, effRank } from '../game/stats.js';
import { iconOf, affixText, epicOf, sellValue, upgradeCost, reforgeCost, MAX_UPG } from '../game/items.js';
import * as CH from '../game/character.js';
import * as EC from '../game/economy.js';
import * as Q from '../game/quests.js';
import { iconURL, skillCanvas } from './icons.js';
import { drawMap, seen, seenKey } from './hud.js';
import { offers, buy, restorePurchases, dailyStatus, claimDaily, chestStatus, chestSkip, openOrderChest, DAILY, watchRewarded, offerToken } from '../platform/monetize.js';
import { PRODUCTS, platform } from '../platform/platform.js';
import { revive, saveNow, loadZone, depthsUnlocked } from '../game/game.js';
import { generateFloor, isBossFloor, floorLevel } from '../world/floorgen.js';
import { REALMS, WILD_QUESTS, wildLevel, isWildBoss } from '../data/wild.js';
import { wildState, questProgress, claimQuest } from '../game/wild.js';
import { nemState, displayName, TRAITS, WEAK } from '../game/nemesis.js';
import * as DQ from '../game/daily.js';
import * as CS from '../game/castle.js';
import { openHeroPath } from './herospath.js';
import { adButton } from './adbtn.js';
import { openWheel, wheelReady } from './wheel.js';
import * as SV from '../game/survival.js';
import { BOONS, BOON_IDS } from '../data/boons.js';
import { stats as calcStats } from '../game/stats.js';
import { maybeInterstitial } from '../platform/monetize.js';
import { platform as PF } from '../platform/platform.js';
import { wipeLocal } from '../game/save.js';
import { setVolumes } from '../core/audio.js';
import { resize } from '../render/renderer.js';

let cur = null;   // {name, bg, render}
export function closeModal() { if (!cur) return; cur.bg.remove(); cur = null; G.atMerchant = false; G.modalOpen = false; G.paused = false; bus.emit('sfx', 'click'); bus.emit('hud'); }
bus.on('closeModal', closeModal);
function modal(title, size, render, opts = {}) {
  if (cur) { cur.bg.remove(); } G.atMerchant = false;
  const bg = el('div', 'modal-bg'); const m = el('div', 'modal ' + (size || ''));
  const h = el('div', 'mh', `<h2>${esc(title)}</h2>`); const x = el('button', 'mx', '✕'); x.onclick = closeModal; h.appendChild(x);
  const b = el('div', 'mb'); m.append(h, b); bg.appendChild(m);
  bg.addEventListener('pointerdown', e => { if (e.target === bg && !opts.sticky) closeModal(); });
  document.body.appendChild(bg);
  cur = { bg, body: b, render: () => { const st = b.scrollTop; b.innerHTML = ''; render(b); b.scrollTop = st; }, title: h.querySelector('h2') };
  G.modalOpen = true; G.paused = true; cur.render(); return cur;
}
const rerender = () => cur && cur.render();
bus.on('statsChanged', () => { if (cur && cur.live) rerender(); });

const TOWN_ONLY = { character: 1, skills: 1, shrine: 1, herospath: 1 };
import { BADGES } from './hud.js';
export function openWindow(name, arg) {
  bus.emit('sfx', 'click');
  if (TOWN_ONLY[name] && G.zoneId !== 'town') { bus.emit('toast', { text: 'Доступно в деревне', sub: 'Развитие героя — у наставника Элвина', kind: 'warn' }); return; }
  if (name === 'herospath') { openHeroPath(); return; }
  const f = W[name]; if (f) f(arg);
}
bus.on('openNPC', id => W['npc_' + id]());
bus.on('openBoard', () => W.board()); bus.on('openWheel', () => openWheel(modal, closeModal)); bus.on('openHeroPath', () => openHeroPath()); bus.on('openDepths', () => W.depths()); bus.on('openWild', r => W.wild(r));
bus.on('floorResult', r => floorResult(r));
bus.on('boonChoice', () => boonChoice());
bus.on('openSurvival', () => W.survival()); bus.on('survLevel', () => survLevel()); bus.on('survEnd', r => survEnd(r)); bus.on('openShrine', () => W.shrine());
bus.on('showDeath', () => showDeath());
bus.on('bossDefeated', k => bossReward(k));
bus.on('chapterDone', () => chapterDone());
const rewardQ = [];
bus.on('reward', r => { rewardQ.push(r); });
export function pumpRewards() {
  if (!rewardQ.length || cur || G.player.dead || inCombat() || !G.zoneReady) return;
  showReward(rewardQ.shift());
}
function showReward(r) {
  bus.emit('sfx', r.items.some(i => i.item.rarity >= 3) ? 'epicDrop' : 'levelup');
  const m = modal(r.sub || 'Награда', 'sm reward', b => {
    const top = r.items.reduce((a, i) => Math.max(a, i.item.rarity), 0);
    const head = el('div', 'rw-head', `<div class="rw-rays r${top}"></div><div class="rw-t">${esc(r.title)}</div>`);
    b.appendChild(head);
    const box = el('div', 'rw-items');
    for (const en of r.items) {
      const it = en.item;
      const c = el('div', 'rw-card r' + it.rarity, `<div class="slot r${it.rarity}"><img src="${iconURL(iconOf(it))}"></div><div><div class="it-name" style="color:${RARITY[it.rarity].color}">${esc(it.name)}</div><div class="it-type">${RARITY[it.rarity].name} · ${it.wt ? WEAPONS[it.wt].name : SLOT_NAMES[it.slot]}</div>${it.dmg ? `<div class="it-stat">Урон ${it.dmg[0]}–${it.dmg[1]}</div>` : it.armor ? `<div class="it-stat">Защита ${it.armor}</div>` : ''}${it.affixes.slice(0, 3).map(a => `<div class="it-aff">${esc(affixText(a))}</div>`).join('')}${epicOf(it) ? `<div class="it-epic">★ ${esc(epicOf(it).desc)}</div>` : ''}</div>`);
      c.appendChild(el('div', en.equipped ? 'rw-eq good' : 'rw-eq muted', en.equipped ? `✔ Надето сразу${en.old ? ` · «${esc(en.old)}» продано за ${en.sold} зол.` : ''}` : `Ваше снаряжение лучше — продано за ${en.sold} зол.`));
      box.appendChild(c);
    }
    if (r.items.length) b.appendChild(box);
    const loot = [r.gold && `<span class="goldc">+${fmt(r.gold)} золота</span>`, r.xp && `<span style="color:#b8e3ff">+${r.xp} опыта</span>`, r.potions && `<span style="color:#ff9a9a">+${r.potions} зелья</span>`, r.scrolls && `<span>+${r.scrolls} свитка возврата</span>`, r.skillPts && `<span class="good">+${r.skillPts} очко навыка</span>`].filter(Boolean);
    if (loot.length) b.appendChild(el('div', 'rw-loot', loot.join(' · ')));
    const q = Q.current(); if (q) b.appendChild(el('p', 'muted', `Следующее задание: <b class="goldc">${esc(q.title)}</b>`));
    const row = el('div', 'row'); row.style.justifyContent = 'center'; const ok = el('button', 'btn gold', 'Забрать'); ok.onclick = closeModal; row.appendChild(ok); b.appendChild(row);
  });
  m.bg.classList.add('rw-bg');
}

// ---------------------------------------------------------------- item rendering helpers
function slotEl(it, ph, cls = '') {
  const d = el('div', 'slot ' + cls + (it ? ' r' + it.rarity : ''));
  if (it) {
    d.innerHTML = `<img alt="" src="${iconURL(iconOf(it))}">${it.upg ? `<span class="up">+${it.upg}</span>` : ''}${it.isNew ? '<span class="new"></span>' : ''}`;
    if (!meetsReq(G.profile, it, G.stats)) d.classList.add('req');
  } else d.innerHTML = `<span class="ph">${esc(ph || '')}</span>`;
  return d;
}
function itemHTML(it, S) {
  const b = BASE[it.base], r = RARITY[it.rarity];
  let h = `<div class="it-name" style="color:${r.color}">${esc(it.name)}${it.upg ? ` <span class="good">+${it.upg}</span>` : ''}</div>`;
  h += `<div class="it-type">${r.name} · ${it.wt ? WEAPONS[it.wt].name : SLOT_NAMES[it.slot === 'ring' ? 'ring1' : it.slot]} · ур. предмета ${it.ilvl}</div>`;
  const um = 1 + (it.upg || 0) * 0.1;
  if (it.dmg) h += `<div class="it-stat">Урон: <b>${Math.round(it.dmg[0] * um)}–${Math.round(it.dmg[1] * um)}</b> · Скорость: ${WEAPONS[it.wt].aps} уд/с · Дальность: ${WEAPONS[it.wt].range} м</div><div class="it-stat muted" style="font-size:12px">${WEAPONS[it.wt].note}</div>`;
  if (it.armor) h += `<div class="it-stat">Защита: <b>${Math.round(it.armor * um)}</b></div>`;
  if (it.block) h += `<div class="it-stat">Шанс блока: ${Math.round(it.block * 100)}%</div>`;
  for (const a of it.affixes) h += `<div class="it-aff">${esc(affixText(a))}</div>`;
  const ep = epicOf(it); if (ep) h += `<div class="it-epic">★ ${esc(ep.desc)}</div>`;
  if (it.req) { const ok = meetsReq(G.profile, it, S); h += `<div class="it-stat ${ok ? 'muted' : 'bad'}">Требуется: ${Object.entries(it.req).map(([k, v]) => `${CH.ATTR_NAMES[k]} ${v}`).join(', ')}</div>`; }
  h += `<div class="it-stat muted" style="font-size:12px">Цена продажи: ${sellValue(it)} зол.</div>`;
  return h;
}
function cmpTable(it, slot) {
  const rows = compare(G.profile, it, slot);
  return `<table class="cmpt"><tr><td class="muted">Показатель</td><td class="muted">Сейчас</td><td class="muted">С этим</td><td></td></tr>` + rows.map(r => {
    const cls = typeof r.delta === 'number' && r.delta !== 0 ? (r.delta > 0 ? 'good' : 'bad') : '';
    const dv = typeof r.delta === 'number' && r.delta !== 0 ? (r.delta > 0 ? '+' : '') + (Math.round(r.delta * 100) / 100) + r.suf : '';
    return `<tr><td>${r.label}</td><td>${r.before}${r.suf}</td><td>${r.after}${r.suf}</td><td class="d ${cls}">${dv}</td></tr>`;
  }).join('') + '</table>';
}
const SORTS = { type: (a, b) => a.slot.localeCompare(b.slot) || b.ilvl - a.ilvl, level: (a, b) => b.ilvl - a.ilvl, rarity: (a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl, use: (a, b) => usefulness(G.profile, b) - usefulness(G.profile, a) };

// ---------------------------------------------------------------- windows
const W = {};
W.inventory = (arg = {}) => {
  const P = G.profile;
  const m = modal('Герой', 'md', b => {
    const S = G.stats, C = CLASSES[P.cls || 'warrior'];
    const card = (it, slot) => {
      const d = el('button', 'iv-slot r' + (it ? it.rarity : 'x'), it ? `<img src="${iconURL(iconOf(it))}"><span class="iv-lv">ур.${it.ilvl}</span>${it.upg ? `<span class="iv-up">+${it.upg}</span>` : ''}${it.isNew ? '<span class="iv-new">NEW</span>' : ''}` : `<span class="ph">${esc(SLOT_NAMES[slot] || '')}</span>`);
      if (it) d.onclick = () => itemCard(it, slot); return d;
    };
    const top = el('div', 'iv-top');
    const L = el('div', 'iv-col'), R = el('div', 'iv-col');
    L.append(card(P.gear.weapon, 'weapon'), card(P.gear.head, 'head')); R.append(card(P.gear.chest, 'chest'), card(P.gear.amulet, 'amulet'));
    const hero = el('div', 'iv-hero', `<div class="iv-pt" style="background-image:url(assets/sprites/${(P.cls || 'warrior') === 'warrior' ? 'portrait' : 'portrait_' + P.cls}.png)"></div><b>${esc(C.name)}</b><small>Уровень ${P.level}</small>`);
    top.append(L, hero, R); b.appendChild(top);
    b.appendChild(el('div', 'iv-stats', `<span class="st-atk">⚔ Атака <b>${S.dmgMin}–${S.dmgMax}</b></span><span class="st-hp">♥ Здоровье <b>${S.maxHP}</b></span><span class="st-def">🛡 Защита <b>${S.armor}</b></span>`));
    b.appendChild(el('p', 'muted iv-hint', 'Нажмите на вещь — откроется карточка: что она даёт и что с ней сделать.'));
    if (P.bag.length) {
      b.appendChild(el('h3', '', 'Сумка'));
      const g = el('div', 'iv-grid'); for (const it of P.bag) g.appendChild(card(it, null)); b.appendChild(g);
    }
    if (arg.select) { const it = P.bag.find(x => x.id === arg.select); arg.select = null; if (it) setTimeout(() => itemCard(it, null), 50); }
  });
  m.live = true;
  function itemCard(it, slot) {
    const S = G.stats, inBag = !slot, tslot = CH.slotFor(it), eq = P.gear[tslot];
    const ov = el('div', 'ic-ov'); const box = el('div', 'ic-box r' + it.rarity);
    const rows = inBag ? compare(P, it, tslot).filter(r => typeof r.delta === 'number' && r.delta !== 0).slice(0, 6) : [];
    box.innerHTML = `<button class="ic-x">✕</button><div class="ic-name" style="color:${RARITY[it.rarity].color}">${esc(it.name)}</div><div class="ic-rar">${RARITY[it.rarity].name}</div>
      <div class="ic-main"><div class="iv-slot big r${it.rarity}"><img src="${iconURL(iconOf(it))}"></div><div class="ic-desc">${it.wt ? WEAPONS[it.wt].name : SLOT_NAMES[it.slot]}<br><small>ур. предмета ${it.ilvl}${it.upg ? ` · закалка +${it.upg}` : ''}</small>${epicOf(it) ? `<div class="it-epic">★ ${esc(epicOf(it).desc)}</div>` : ''}</div></div>
      <div class="ic-stats">${it.dmg ? `<div>Урон <b>${Math.round(it.dmg[0] * (1 + (it.upg || 0) * 0.1))}–${Math.round(it.dmg[1] * (1 + (it.upg || 0) * 0.1))}</b></div>` : ''}${it.armor ? `<div>Защита <b>${Math.round(it.armor * (1 + (it.upg || 0) * 0.1))}</b></div>` : ''}${it.affixes.map(a => `<div class="it-aff">${esc(affixText(a))}</div>`).join('')}</div>
      ${rows.length ? `<div class="ic-cmp"><b>Если надеть:</b>${rows.map(r => `<span class="${r.delta > 0 ? 'good' : 'bad'}">${r.label} ${r.delta > 0 ? '+' : ''}${Math.round(r.delta * 100) / 100}${r.suf}</span>`).join('')}</div>` : ''}`;
    const btns = el('div', 'ic-btns');
    if (G.zoneId === 'town') { const c = upgradeCost(it); const up = el('button', 'btn ad-green', `Закалить +${(it.upg || 0) + 1}<small>${fmt(c)} зол.</small>`); up.disabled = P.gold < c || (it.upg || 0) >= MAX_UPG; up.onclick = () => { EC.upgrade(it.id); ov.remove(); rerender(); }; btns.appendChild(up); }
    if (inBag) { const c2 = CH.canEquip(it); const eqb = el('button', 'btn gold', c2.ok ? 'Надеть' : c2.why); eqb.disabled = !c2.ok; eqb.onclick = () => { CH.equip(it.id); ov.remove(); rerender(); }; btns.appendChild(eqb);
      const sell = el('button', 'btn', 'Убрать'); sell.onclick = () => { EC.sellItem(it.id); ov.remove(); rerender(); }; btns.appendChild(sell); }
    box.appendChild(btns);
    box.querySelector('.ic-x').onclick = () => ov.remove(); ov.onclick = e => { if (e.target === ov) ov.remove(); };
    ov.appendChild(box); cur.bg.appendChild(ov);
  }
};

W.character = (arg = {}) => {
  const edit = !!arg.npc;
  const m = modal(edit ? 'Наставник: характеристики' : 'Персонаж', 'md', b => {
    const P = G.profile, S = G.stats;
    b.appendChild(el('div', 'row', `<b class="goldc" style="font:600 17px Georgia">${CLASSES[P.cls || 'warrior'].name} · уровень ${P.level}</b><span class="muted">Опыт ${fmt(P.xp)} / ${fmt(xpToNext(P.level))}</span>`));
    b.appendChild(el('h3', '', `Характеристики ${P.attrPts ? `<span class="good">(свободно: ${P.attrPts})</span>` : ''} <span class="c-gold" style="float:right">💰 ${fmt(P.gold)} зол.</span>`));
    if (!edit && P.attrPts) b.appendChild(el('p', 'muted', 'Вложить очки можно у наставника Элвина в деревне.'));
    if (edit && P.attrPts) b.appendChild(el('p', 'goldc', `Каждое очко — ${CH.attrCost()} зол. · у вас ${fmt(P.gold)} зол.`));
    const hints = { str: '+2% урона ближнего боя за очко', dex: '+2% урона луком, +0,15% крита, защита', int: '+2,5% силы заклинаний, +3 маны', vit: '+5 здоровья, регенерация' };
    for (const k of ['str', 'dex', 'int', 'vit']) {
      const r = el('div', 'attr', `<b>${CH.ATTR_NAMES[k]}<br><span class="muted" style="font:12px sans-serif">${hints[k]}</span></b><span class="v">${S[k]}</span>`);
      if (edit && P.attrPts > 0) { const p = el('button', 'plus', '+'); p.title = CH.attrCost() + ' зол.'; p.onclick = () => CH.addAttr(k, 1, true); r.appendChild(p); if (P.attrPts >= 5) { const p5 = el('button', 'plus', '5'); p5.style.fontSize = '13px'; p5.onclick = () => CH.addAttr(k, 5, true); r.appendChild(p5); } }
      b.appendChild(r);
    }
    b.appendChild(el('h3', '', 'Боевые показатели'));
    const st = [['Физический урон', `${S.dmgMin}–${S.dmgMax}`], ['Урон в секунду', S.dps], ['Скорость атаки', S.aps + ' уд/с'], ['Шанс крит. удара', Math.round(S.critChance * 100) + '%'], ['Крит. урон', Math.round(S.critMult * 100) + '%'],
      ['Сила заклинаний', Math.round(S.spellPower * 100) + '%'], ['Урон огнём / льдом / молнией', `${Math.round(S.elem.fire * 100)}% / ${Math.round(S.elem.cold * 100)}% / ${Math.round(S.elem.light * 100)}%`],
      ['Защита', `${S.armor} (−${Math.round(S.armor / (S.armor + 50 + 10 * P.level) * 100)}% урона)`], ['Шанс блока', Math.round(S.block * 100) + '%'], ['Сопротивления', `${S.res.fire}% / ${S.res.cold}% / ${S.res.light}%`],
      ['Здоровье', S.maxHP], ['Мана', S.maxMP], ['Восст. маны', S.mpRegen.toFixed(1) + '/с'], ['Здоровье за удар', S.leech], ['Находка золота', '+' + S.goldFind + '%']];
    b.appendChild(el('div', 'stats', st.map(([a, v]) => `<div><span>${a}</span><b>${v}</b></div>`).join('')));
    const s = P.stats;
    b.appendChild(el('h3', '', 'Летопись'));
    b.appendChild(el('div', 'stats', [['Убито монстров', s.kills], ['Элитных', s.elites], ['Боссов', s.bossKills], ['Сундуков', s.chests], ['Пройдено', Math.round(s.meters) + ' м'], ['Собрано золота', fmt(s.gold)], ['Смертей', s.deaths], ['Время в игре', Math.round(s.playTime / 60) + ' мин']].map(([a, v]) => `<div><span>${a}</span><b>${v}</b></div>`).join('')));
  });
  m.live = true;
};

W.skills = (arg = {}) => {
  const edit = !!arg.npc; if (edit) setTimeout(() => bus.emit('skillsOpened'), 50); const P0 = G.profile; const myBr = CLASSES[P0.cls || 'warrior'].branches;
  let tab = W._skillTab && myBr.includes(W._skillTab) ? W._skillTab : myBr[0];
  const m = modal(edit ? 'Наставник: навыки' : 'Навыки', 'md', b => {
    const P = G.profile;
    b.appendChild(el('div', 'sp-row', `<b class="${P.skillPts ? 'good' : 'muted'}">Очки навыков: ${P.skillPts}</b><b class="c-gold">💰 ${fmt(P.gold)} зол.</b>${edit ? '' : '<span class="muted">Изучать — у наставника Элвина в деревне.</span>'}`));
    const firstPick = edit && !Object.entries(P.skills || {}).some(([k, v]) => v && SKILLS[k] && SKILLS[k].kind === 'active');
    if (firstPick) b.appendChild(el('div', 'first-pick', '⚔ <b>Выберите первое умение!</b> Это приём, который появится кнопкой в бою. Пассивные усиления откроются после него.'));
    // branch tabs — one tap
    const tabs = el('div', 'tabs big-tabs');
    for (const br of BRANCHES.filter(x => myBr.includes(x.id))) {
      const t = el('button', 'tab' + (tab === br.id ? ' on' : ''), `<span style="color:${br.color}">${br.name}</span> ${CH.branchPoints(br.id)}`);
      t.onclick = () => { tab = W._skillTab = br.id; rerender(); }; tabs.appendChild(t);
    }
    b.appendChild(tabs);
    const list = el('div'); list.style.marginTop = '8px';
    const order = Object.entries(SKILLS).filter(([, s]) => s.b === tab && (!firstPick || s.kind === 'active')).sort((a, b) => (a[1].kind === 'active' ? 0 : 1) - (b[1].kind === 'active' ? 0 : 1) || (a[1].row || 0) - (b[1].row || 0));
    for (const [id, sk] of order) {
      const r = P.skills[id] || 0, er = effRank(P, id), can = firstPick && sk.kind === 'active' ? { ok: P.skillPts > 0, why: 'Нет очков навыков' } : CH.canLearn(id);
      const n = el('div', 'node wide' + (r ? ' have' : '') + (!r && !can.ok ? ' locked' : ''));
      n.appendChild(skillCanvas(id, 72, !r));
      const t = el('div', 'nbody', `<div class="nn">${esc(sk.name)} <span class="nr">${r}/${sk.max}${er > r ? ` <span class="good">(+${er - r})</span>` : ''} · <span class="kind">${sk.kind === 'active' ? 'активный' : 'пассивный'}</span></span></div><div class="nd">${esc(sk.desc(Math.max(1, er)))}</div>${!can.ok && r < sk.max && edit ? `<div class="bad"><small>${esc(can.why)}</small></div>` : ''}`);
      n.appendChild(t);
      if (edit && r < sk.max) {   // one tap to learn / upgrade
        const cost = CH.skillCost(id); const plus = el('button', 'learn' + (can.ok ? ' ok' : ''), `${r ? '+' : 'Изучить'}<small>${cost} з.</small>`); plus.disabled = !can.ok;
        plus.onclick = e => { e.stopPropagation(); if (CH.learn(id, true, firstPick && sk.kind === 'active')) rerender(); }; n.appendChild(plus);
      }
      if (r && sk.kind === 'active') {
        const sr = el('div', 'slots4');
        { const bb = el('button', 'btn sm' + (P.bigSkill === id ? ' gold' : ''), '★'); bb.title = 'На большую кнопку'; bb.onclick = e => { e.stopPropagation(); P.bigSkill = P.bigSkill === id ? null : id; bus.emit('toast', { text: P.bigSkill ? `«${sk.name}» — на большой кнопке` : 'Большая кнопка: обычная атака', kind: 'good' }); bus.emit('statsChanged'); rerender(); }; sr.appendChild(bb); }
        for (let i = 0; i < 4; i++) { const sb = el('button', 'btn sm' + (P.slots[i] === id ? ' gold' : ''), String(i + 1)); sb.title = 'Кнопка ' + (i + 1); sb.onclick = e => { e.stopPropagation(); CH.setSlot(i, id); bus.emit('toast', { text: `«${sk.name}» — кнопка ${i + 1}`, kind: 'good' }); rerender(); }; sr.appendChild(sb); }
        t.appendChild(sr);
      }
      list.appendChild(n);
    }
    b.appendChild(list);
  });
  m.live = true;
};

// Quests: tabs like mobile hits — Story / Daily / Weekly / Contracts, with reward chips and clear buttons
W.journal = (arg = {}) => {
  let tab = W._qtab || 'story';
  const m = modal('Задания', 'md', b => {
    const P = G.profile, st = P.story.stage;
    const dq = DQ.dailyQuests(), wq = DQ.weeklyQuests();
    const cnt = { daily: dq.filter(q => q.done && !q.claimed).length, weekly: wq.filter(q => q.done && !q.claimed).length, contracts: REPEATABLE.filter(r => Q.repState(r).done).length };
    const tabs = el('div', 'q-tabs');
    for (const [id, name] of [['story', 'Сюжет'], ['daily', 'Ежедневные'], ['weekly', 'Недельные'], ['contracts', 'Контракты']]) {
      const t = el('button', 'q-tab' + (tab === id ? ' on' : ''), `${name}${cnt[id] ? `<i>${cnt[id]}</i>` : ''}`); t.onclick = () => { tab = W._qtab = id; rerender(); }; tabs.appendChild(t);
    }
    b.appendChild(tabs);
    const chips = r => `<div class="q-rw">${r.gold ? `<span class="chip g">💰 ${fmt(r.gold)}</span>` : ''}${r.shards ? `<span class="chip s">◆ ${r.shards}</span>` : ''}${r.potions ? `<span class="chip p">❤ ${r.potions}</span>` : ''}${r.xp ? `<span class="chip x">✦ ${r.xp} опыта</span>` : ''}${r.item ? `<span class="chip i">★ вещь</span>` : ''}${r.skillPts ? `<span class="chip k">+${r.skillPts} навык</span>` : ''}</div>`;
    const card = (title, cur, max, rw, state, onClaim) => {
      const d = el('div', 'q-card' + (state === 'done' ? ' hot' : state === 'claimed' ? ' claimed' : ''), `<div class="q-t">${esc(title)}</div><div class="q-prog"><div class="pbar"><i style="width:${Math.min(100, cur / max * 100)}%"></i></div><span>${cur}/${max}</span></div>${chips(rw)}`);
      const btn = el('button', 'btn sm ' + (state === 'done' ? 'gold' : ''), state === 'done' ? 'Забрать' : state === 'claimed' ? '✔ Получено' : 'Перейти');
      btn.disabled = state === 'claimed'; btn.onclick = () => { if (state === 'done') { onClaim(); rerender(); } else closeModal(); };
      d.appendChild(btn); return d;
    };
    if (tab === 'story') {
      b.appendChild(el('div', 'q-ch', esc(CHAPTER) + `<div class="pbar"><i style="width:${st / STORY.length * 100}%"></i></div>`));
      const q = STORY[st];
      if (q) { const pr = Q.progressOf(q); const it = el('div', 'q-card cur', `<div class="q-t">➤ ${esc(q.title)}</div><div class="muted">${esc(q.text)}</div>${pr ? `<div class="q-prog"><div class="pbar"><i style="width:${pr.cur / pr.max * 100}%"></i></div><span>${pr.cur}/${pr.max}</span></div>` : ''}${chips({ gold: q.reward && q.reward.gold, xp: q.reward && q.reward.xp, item: q.reward && q.reward.items && q.reward.items.length, skillPts: q.reward && q.reward.skillPts, potions: q.reward && q.reward.potions })}`);
        const go = el('button', 'btn sm gold', 'Показать путь'); go.onclick = () => { closeModal(); bus.emit('toast', { text: 'Идите за золотыми стрелками', kind: 'quest' }); }; it.appendChild(go); b.appendChild(it); }
      for (let i = st - 1; i >= Math.max(0, st - 3); i--) b.appendChild(el('div', 'q-card claimed', `<div class="q-t">✔ ${esc(STORY[i].title)}</div>`));
    } else if (tab === 'daily') {
      const r = DQ.dqReward(); for (const q of dq) b.appendChild(card(q.title, q.cur, q.n, { gold: r.gold, potions: r.potions }, q.claimed ? 'claimed' : q.done ? 'done' : 'go', () => DQ.claimDaily(q.id)));
      b.appendChild(el('p', 'muted', '<small>Все три — «Сундук дня» с редкой вещью. Новые задания каждый день.</small>'));
    } else if (tab === 'weekly') {
      const r = DQ.wqReward(); for (const q of wq) b.appendChild(card(q.title, q.cur, q.n, { gold: r.gold, shards: r.shards }, q.claimed ? 'claimed' : q.done ? 'done' : 'go', () => DQ.claimWeekly(q.id)));
      b.appendChild(el('p', 'muted', '<small>Обновляются каждую неделю. Дают осколки Бездны для Цитадели.</small>'));
    } else {
      for (const rr of REPEATABLE) { const s = Q.repState(rr); b.appendChild(card(rr.title, s.cur, rr.n, rr.reward || { gold: rr.gold }, s.done ? 'done' : 'go', () => Q.claimRep(rr.id))); }
      b.appendChild(el('p', 'muted', '<small>Контракты повторяются бесконечно — прогресс идёт сам.</small>'));
    }
  });
  m.live = true;
};

W.map = () => modal(G.zone.name, 'md', b => {
  const c = document.createElement('canvas'); const size = Math.min(640, innerWidth - 40, (innerHeight - 110) * 1.4); c.width = c.height = Math.round(size * 1.5); c.style.width = c.style.height = size + 'px'; c.style.maxWidth = '100%'; c.style.display = 'block'; c.style.margin = '0 auto';
  b.appendChild(c); drawMap(c.getContext('2d'), c.width, G.zone, seen.get(seenKey(G.zone)), G.player, 0);
  b.appendChild(el('p', 'muted', 'Белая точка — вы. Золотой круг — цель задания. Фиолетовые — порталы. В катакомбах карта открывается по мере исследования.'));
});

W.settings = () => modal('Настройки', 'sm', b => {
  const P = G.profile, s = P.settings;
  const range = (lab, key) => { const r = el('div', 'attr', `<b>${lab}</b>`); const i = document.createElement('input'); i.type = 'range'; i.min = 0; i.max = 1; i.step = 0.05; i.value = s[key]; i.oninput = () => { s[key] = +i.value; setVolumes(s.sfx, s.music); }; i.onchange = () => bus.emit('save'); r.appendChild(i); b.appendChild(r); };
  range('Звуки', 'sfx'); range('Музыка', 'music');
  const q = el('div', 'attr', '<b>Качество графики</b>'); for (const [k, n] of [['low', 'Низкое'], ['auto', 'Авто'], ['high', 'Высокое']]) { const bt = el('button', 'btn sm' + (s.quality === k ? ' gold' : ''), n); bt.onclick = () => { s.quality = k; resize(); bus.emit('save'); rerender(); }; q.appendChild(bt); } b.appendChild(q);
  const sh = el('div', 'attr', '<b>Тряска камеры</b>'); const bs = el('button', 'btn sm', s.shake ? 'Вкл' : 'Выкл'); bs.onclick = () => { s.shake = !s.shake; rerender(); }; sh.appendChild(bs); b.appendChild(sh);
  b.appendChild(el('h3', '', 'Управление'));
  b.appendChild(el('p', 'muted', 'Телефон/планшет: джойстик слева, атака и навыки справа, удерживайте атаку — герой сам подойдёт к врагу. ПК: WASD/стрелки — движение, Пробел — атака, 1–4 — навыки, Shift — уклонение, Q/E — зелья, F — действие, I/C/K/J/M — окна, T — свиток.'));
  const row = el('div', 'row'); row.style.marginTop = '10px';
  const sv = el('button', 'btn', 'Сохранить'); sv.onclick = () => { saveNow(); bus.emit('toast', { text: 'Игра сохранена', kind: 'good' }); }; row.appendChild(sv);
  const rp = el('button', 'btn', 'Восстановить покупки'); rp.onclick = () => restorePurchases(); row.appendChild(rp);
  const wp = el('button', 'btn', 'Начать заново'); wp.onclick = () => { if (confirm('Удалить сохранение и начать заново? Это нельзя отменить.')) { wipeLocal(); location.reload(); } }; row.appendChild(wp);
  b.appendChild(row);
  b.appendChild(el('p', 'muted', `<small>Версия 2.0 · платформа: ${platform.name}</small>`));
});

// ---------------------------------------------------------------- NPCs
function dialog(b, id, name, lines, img) {
  const d = el('div', 'dlg'); d.appendChild(el('div', 'npcface', ''));
  const t = el('div', ''); t.appendChild(el('div', 'who', esc(name)));
  const tx = el('div', 'txt'); t.appendChild(tx); d.appendChild(t); b.appendChild(d);
  let i = 0; const show = () => { tx.textContent = lines[i]; };
  show(); return { next: () => { if (i < lines.length - 1) { i++; show(); return true; } return false; }, last: () => i >= lines.length - 1 };
}
W.npc_elder = () => {
  const P = G.profile; const q = Q.current(); let lines, fin = false;
  if (q && q.id === 'talk_elder') lines = DIALOG.elder[0];
  else if (q && q.id === 'finish') { lines = DIALOG.elder.finish; fin = true; }
  else if (P.chapterDone) lines = DIALOG.elder.done;
  else if (P.world.hasMedallion && !P.story.flags.bossKilled) lines = DIALOG.elder.after_medallion;
  else lines = DIALOG.elder.mid;
  modal('Староста Эдрик', 'sm', b => {
    const dl = dialog(b, 'elder', 'Староста Эдрик', lines);
    const row = el('div', 'row'); row.style.marginTop = '12px';
    const nx = el('button', 'btn gold', lines.length > 1 ? 'Далее' : 'Понятно');
    nx.onclick = () => { if (dl.next()) { if (dl.last()) nx.textContent = fin ? 'Принять награду' : 'Понятно'; return; } Q.talked('elder'); closeModal(); };
    if (lines.length === 1) nx.textContent = fin ? 'Принять награду' : 'Понятно';
    row.appendChild(nx); b.appendChild(row);
  }, { sticky: true });
};
W.npc_smith = () => {
  let sel = null;
  modal('Кузнец Горан', 'md', b => {
    const P = G.profile;
    b.appendChild(el('p', '', `<i>«${esc(DIALOG.smith.hello[1])}»</i>`));
    b.appendChild(el('p', 'muted', 'Закалка: +10% к урону или защите за уровень (до +10), без риска поломки. Перековка: заменяет одно свойство на случайное новое.'));
    const list = [...Object.entries(P.gear).filter(([, i]) => i).map(([s, i]) => i), ...P.bag.filter(i => i.rarity >= 1 || i.dmg || i.armor)];
    const shop = el('div', 'bag');
    for (const it of list) { const d = slotEl(it, '', sel === it.id ? 'sel' : ''); if (Object.values(P.gear).includes(it)) d.appendChild(el('span', 'up2', 'Надето')); d.onclick = () => { sel = it.id; rerender(); }; shop.appendChild(d); }
    b.appendChild(shop);
    const it = sel && EC.findItem(sel);
    if (it) {
      const det = el('div', 'detail'); det.innerHTML = itemHTML(it, G.stats);
      const row = el('div', 'row'); row.style.marginTop = '8px';
      const up = el('button', 'btn gold', (it.upg || 0) >= MAX_UPG ? 'Максимум' : `Закалить до +${(it.upg || 0) + 1} — ${upgradeCost(it)} зол.`); up.disabled = (it.upg || 0) >= MAX_UPG || P.gold < upgradeCost(it); up.onclick = () => { EC.upgrade(it.id); rerender(); }; row.appendChild(up);
      det.appendChild(row);
      if (it.affixes.length) {
        det.appendChild(el('h3', '', `Перековка — ${reforgeCost(it)} зол.`));
        it.affixes.forEach((a, i) => { const r = el('div', 'row'); r.appendChild(el('span', 'it-aff', esc(affixText(a)))); const bt = el('button', 'btn sm', 'Перековать'); bt.disabled = P.gold < reforgeCost(it) || (it.epic && i < 2); bt.onclick = () => { EC.reforge(it.id, i); rerender(); }; r.appendChild(bt); det.appendChild(r); });
      }
      b.appendChild(det);
    } else b.appendChild(el('p', 'muted', 'Выберите предмет.'));
    b.appendChild(el('p', 'goldc', `Ваше золото: ${fmt(P.gold)}`));
  }).live = true;
  Q.talked('smith');
};
W.npc_merchant = () => {
  let tab = 'buy', sel = null; EC.ensureStock();
  modal('Торговка Мира', 'md', b => {
    const P = G.profile;
    const tabs = el('div', 'tabs big-tabs'); for (const [k, n] of [['buy', 'Купить'], ['sell', 'Продать']]) { const t = el('button', 'tab' + (tab === k ? ' on' : ''), n); t.onclick = () => { tab = k; sel = null; rerender(); }; tabs.appendChild(t); } b.appendChild(tabs);
    b.appendChild(el('p', 'goldc', `Золото: ${fmt(P.gold)}`));
    if (tab === 'buy') {
      const sh = el('div', 'shop');
      for (const [k, name, ic, have] of [['hp', 'Зелье здоровья', 'potion_hp', P.potions.hp], ['mp', 'Зелье маны', 'potion_mp', P.potions.mp], ['scroll', 'Свиток возврата', 'scroll', P.scrolls]]) {
        const c = el('div', 'card', `<div class="top"><div class="slot"><img src="${iconURL(ic)}"></div><div><b>${name}</b><div class="muted">есть: ${have}</div></div></div>`);
        const bt = el('button', 'btn gold sm', `Купить — ${EC.potionPrice(k)} зол.`); bt.disabled = P.gold < EC.potionPrice(k); bt.onclick = () => { EC.buyConsumable(k); rerender(); }; c.appendChild(bt); sh.appendChild(c);
      }
      b.appendChild(sh);
      b.appendChild(el('h3', '', `Товары дня для класса «${CLASSES[P.cls || 'warrior'].name}»`));
      const st = el('div', 'bag');
      P.shop.stock.forEach((it, i) => { const d = slotEl(it, '', sel === i ? 'sel' : ''); const u = usefulness(P, it); if (u > 0.5) d.appendChild(el('span', 'arr good', '▲')); d.onclick = () => { sel = i; rerender(); }; st.appendChild(d); });
      b.appendChild(st);
      const it = sel != null && P.shop.stock[sel];
      if (it) { const det = el('div', 'detail'); det.innerHTML = itemHTML(it, G.stats) + '<h3>Сравнение</h3>' + cmpTable(it, CH.slotFor(it)); const bt = el('button', 'btn gold', `Купить и надеть — ${EC.buyPrice(it)} зол.`); bt.disabled = P.gold < EC.buyPrice(it); bt.onclick = () => { EC.buyItem(sel); sel = null; rerender(); }; det.appendChild(bt); b.appendChild(det); }
      const row = el('div', 'row'); row.style.marginTop = '10px';
      const rf = el('button', 'btn', `Обновить товары — ${EC.stockRefreshPrice()} зол.`); rf.onclick = () => { EC.refreshStock(false); sel = null; rerender(); }; row.appendChild(rf);
      const ra = el('button', 'btn ad', 'Обновить бесплатно'); ra.onclick = () => offers.shopRefresh(() => { EC.refreshStock(true); sel = null; rerender(); }); row.appendChild(ra);
      b.appendChild(row);
    } else {
      const row = el('div', 'row'); const sa = el('button', 'btn', 'Продать все обычные (белые)'); sa.onclick = () => { EC.sellAllCommon(); rerender(); }; row.appendChild(sa); b.appendChild(row);
      const bag = el('div', 'bag'); bag.style.marginTop = '8px';
      for (const it of P.bag) { const d = slotEl(it, '', sel === it.id ? 'sel' : ''); d.onclick = () => { sel = it.id; rerender(); }; bag.appendChild(d); }
      b.appendChild(bag);
      const it = P.bag.find(x => x.id === sel);
      if (it) { const det = el('div', 'detail'); det.innerHTML = itemHTML(it, G.stats); const bt = el('button', 'btn gold', `Продать за ${sellValue(it)} зол.`); bt.onclick = () => { EC.sellItem(it.id); sel = null; rerender(); }; det.appendChild(bt); b.appendChild(det); }
      if (!P.bag.length) b.appendChild(el('p', 'muted', 'Сумка пуста.'));
    }
  });
  G.atMerchant = true; Q.talked('merchant');
};
W.npc_trainer = () => {
  modal('Наставник Элвин', 'sm', b => {
    const P = G.profile;
    b.appendChild(el('p', '', `<i>«${esc(DIALOG.trainer.hello[P.tutorial.trainerGift ? 1 : 0])}»</i>`));
    if (!P.tutorial.trainerGift) {
      const C = CLASSES[P.cls || 'warrior'];
      const opts = P.cls === 'mage' ? [['fireball', 'Огненный шар'], ['ice_shard', 'Ледяной снаряд'], ['chain', 'Цепная молния']] : P.cls === 'archer' ? [['volley', 'Залп'], ['ice_shard', 'Ледяной снаряд']] : [['whirlwind', 'Вихрь'], ['fireball', 'Огненный шар']];
      b.appendChild(el('p', 'good', 'Первый урок бесплатно: выберите приём — наставник обучит ему сразу.'));
      const row = el('div', 'row');
      for (const [id, n] of opts) { const bt = el('button', 'btn gold', n); bt.onclick = () => { P.tutorial.trainerGift = id; CH.grantSkill(id); bus.emit('toast', { text: 'Изучено: ' + n, kind: 'good' }); rerender(); }; row.appendChild(bt); }
      b.appendChild(row);
    }
    b.appendChild(el('h3', '', 'Услуги'));
    const r1 = el('div', 'row');
    const at = el('button', 'btn ' + (P.attrPts ? 'gold' : ''), `Характеристики${P.attrPts ? ` (+${P.attrPts})` : ''}`); at.onclick = () => W.character({ npc: true }); r1.appendChild(at);
    const sk = el('button', 'btn ' + (P.skillPts ? 'gold' : ''), `Навыки${P.skillPts ? ` (+${P.skillPts})` : ''}`); sk.onclick = () => W.skills({ npc: true }); r1.appendChild(sk); b.appendChild(r1);
    const r2 = el('div', 'row'); r2.style.marginTop = '8px';
    const rs = el('button', 'btn', `Сбросить навыки — ${EC.respecSkillPrice()} зол.`); rs.disabled = P.gold < EC.respecSkillPrice(); rs.onclick = () => { if (confirm('Сбросить все навыки и вернуть очки?')) { EC.respecSkills(); rerender(); } }; r2.appendChild(rs);
    const ra = el('button', 'btn', `Сбросить характеристики — ${EC.respecAttrPrice()} зол.`); ra.disabled = P.gold < EC.respecAttrPrice(); ra.onclick = () => { if (confirm('Сбросить характеристики?')) { EC.respecAttrs(); rerender(); } }; r2.appendChild(ra);
    b.appendChild(r2);
  });
  Q.talked('trainer');
};
W.board = () => modal('Доска объявлений', 'md', b => {
  b.appendChild(el('p', 'muted', 'Контракты действуют всегда: прогресс идёт сам, награду забирайте здесь. После награды контракт начинается заново.'));
  for (const r of REPEATABLE) {
    const s = Q.repState(r); const rw = [r.reward.gold && `${r.reward.gold}+ зол.`, r.reward.xp && `${r.reward.xp}+ опыта`, r.reward.potions && `${r.reward.potions} зелья`, r.reward.item && (r.reward.item === 'rare' ? 'редкий предмет' : 'магический предмет')].filter(Boolean).join(', ');
    const d = el('div', 'q' + (s.accepted ? ' cur' : ''), `<div class="qt">${esc(r.title)}</div><div class="muted">Награда: ${rw}${s.completions ? ` · выполнено раз: ${s.completions}` : ''}</div>${s.accepted ? `<div class="pbar"><i style="width:${s.cur / r.n * 100}%"></i></div><div class="muted">${s.cur}/${r.n}</div>` : ''}`);
    if (s.done) { const bt = el('button', 'btn sm gold', 'Забрать награду'); bt.style.marginTop = '6px'; bt.onclick = () => { Q.claimRep(r.id); rerender(); }; d.appendChild(bt); }
    b.appendChild(d);
  }
});

// ---------------------------------------------------------------- rewards / shop (monetization hub)
W.shrine = () => modal('Святилище наград', 'md', b => {
  const P = G.profile, now = Date.now();
  dailyBlock(b);
  // daily
  const ds = dailyStatus();
  b.appendChild(el('h3', '', `Ежедневная награда · серия ${ds.streak} дн.`));
  const days = el('div', 'row'); DAILY.forEach((r, i) => { const on = i === ds.streak % 7 && ds.claimable; const got = i < ds.streak % 7 || (!ds.claimable && i === (ds.streak - 1) % 7); days.appendChild(el('div', 'buff', `${i + 1}: ${r.gold ? r.gold * P.level + ' зол.' : r.potions ? r.potions + ' зел.' : r.item === 2 ? 'редкий' : 'магич.'}${got ? ' ✔' : on ? ' ◀' : ''}`)); }); b.appendChild(days);
  const dr = el('div', 'row'); dr.style.marginTop = '6px';
  if (ds.claimable) { const a = el('button', 'btn gold', 'Забрать'); a.onclick = () => { claimDaily(false); rerender(); }; const x2 = el('button', 'btn ad', 'Забрать ×2'); x2.onclick = () => watchRewarded('daily_double', offerToken('daily_double', 'd' + new Date().toDateString()), () => claimDaily(true)).then(rerender); dr.append(a, x2); }
  else dr.appendChild(el('span', 'muted', 'Следующая награда — завтра. Не прерывайте серию!'));
  b.appendChild(dr);
  // order chest
  const cs = chestStatus(); b.appendChild(el('h3', '', 'Сундук Ордена'));
  const cr = el('div', 'offer', `<div class="ic">▣</div><div class="tx"><b>Редкий + магический предмет и золото</b><div class="muted">${cs.ready ? 'Готов к открытию!' : 'Откроется через ' + Math.ceil(cs.left / 60000) + ' мин'}</div></div>`);
  const cb = el('button', 'btn ' + (cs.ready ? 'gold' : 'ad'), cs.ready ? 'Открыть' : 'Открыть сейчас'); cb.onclick = () => { (cs.ready ? Promise.resolve(openOrderChest()) : chestSkip()).then(rerender); }; cr.appendChild(cb); b.appendChild(cr);
  // blessings
  b.appendChild(el('h3', '', 'Благословения'));
  for (const [k, t, until, fn] of [['xp', '+50% опыта на 15 минут', P.boosts.xpUntil, offers.xpBoost], ['gold', '+50% золота на 15 минут', P.boosts.goldUntil, offers.goldBoost]]) {
    const o = el('div', 'offer', `<div class="ic">${k === 'xp' ? '✦' : '⛁'}</div><div class="tx"><b>${t}</b><div class="muted">${until > now ? 'Активно ещё ' + Math.ceil((until - now) / 60000) + ' мин (можно продлить)' : 'Складывается с другими бонусами'}</div></div>`);
    const bt = el('button', 'btn ad', 'Смотреть'); bt.disabled = inCombat(); bt.onclick = () => fn().then(rerender); o.appendChild(bt); b.appendChild(o);
  }
  // IAP
  b.appendChild(el('h3', '', 'Лавка Ордена'));
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const owned = (p.once && P.iap.tx['once_' + id]) || (!p.consumable && P.iap[{ gold_perk: 'goldPerk', no_ads: 'noAds' }[id]]);
    const o = el('div', 'offer', `<div class="ic">${id === 'starter_pack' ? '★' : id === 'potion_pack' ? '✚' : id === 'no_ads' ? '⊘' : '⛁'}</div><div class="tx"><b>${esc(p.title)}</b><div class="muted">${esc(p.desc)}</div></div>`);
    const bt = el('button', 'btn gold', owned ? 'Куплено' : (platform.p.catalogPrice(id) || p.price)); bt.disabled = !!owned; bt.onclick = () => buy(id).then(rerender); o.appendChild(bt); b.appendChild(o);
  }
  if (platform.name === 'demo') b.appendChild(el('p', 'muted', '<small>Демо-режим: реклама и покупки имитируются, деньги не списываются. На Яндекс Играх подключается SDK площадки.</small>'));
});

// ---------------------------------------------------------------- death / boss reward / chapter end
function showDeath() {
  const d = $('death'); d.classList.remove('hidden'); G.paused = true;
  d.innerHTML = `<h2>Вы погибли</h2><p class="muted">${G.zoneId === 'wild' ? 'Ноша потеряна. Враг запомнил вас — вернитесь и отомстите.' : G.run ? `Этаж ${G.run.floor} не пройден. Собранное золото остаётся у вас.` : 'Нежить торжествует… но Орден даёт второй шанс.'}</p>`;
  const row = el('div', 'row'); row.style.justifyContent = 'center';
  const ad = el('button', 'btn ad', 'Воскреснуть на месте');
  ad.onclick = async () => { const tok = offerToken('revive'); const ok = await watchRewarded('revive', tok, () => { }); if (ok) { d.classList.add('hidden'); G.paused = false; revive(true); } };
  const loss = Math.floor(G.profile.gold * 0.1);
  const town = el('button', 'btn gold', `В деревню (−${loss} зол.)`); town.onclick = () => { G.profile.gold -= loss; d.classList.add('hidden'); G.paused = false; revive(false); };
  row.append(ad, town); d.appendChild(row);
  d.appendChild(el('p', 'muted', '<small>Возвращение стоит 10% золота. Подземелье заселится заново, в том числе элита и босс, если они не побеждены.</small>'));
}
function bossReward(k) {
  if (G.player.dead) return;
  modal('Палач Бездны повержен!', 'sm', b => {
    b.appendChild(el('p', '', 'Золото рассыпано по арене — соберите его. Главная награда ждёт вас в окне задания.'));
    b.appendChild(el('p', 'good', 'Портал домой открылся в центре арены.'));
    const row = el('div', 'row');
    const ad = el('button', 'btn ad', 'Дополнительный редкий предмет'); ad.onclick = () => offers.bossExtra(k.id, k.x, k.y).then(ok => { if (ok) closeModal(); });
    const ok = el('button', 'btn gold', 'Собрать добычу'); ok.onclick = closeModal; row.append(ad, ok); b.appendChild(row);
  });
}
function chapterDone() {
  G.profile.chapterDone = true; bus.emit('save');
  setTimeout(() => modal('Глава I пройдена!', 'sm', b => {
    b.appendChild(el('p', '', 'Тихий Брод спасён. Но в глубинах ещё шевелится тьма.'));
    b.appendChild(el('p', 'muted', 'Что дальше: катакомбы теперь растут вместе с вами (монстры вашего уровня и чемпионы), Палача можно побеждать снова ради эпических вещей, а доска объявлений даёт бесконечные контракты. Глава II — в следующем обновлении.'));
    const r = el('div', 'row'); const ok = el('button', 'btn gold', 'Продолжить'); ok.onclick = closeModal; r.appendChild(ok); b.appendChild(r);
  }), 1200);
}
export { W };

// ---------------------------------------------------------------- Depths: floor select, results, dozor, daily
W.depths = () => modal('Глубины катакомб', 'sm', b => {
  const P = G.profile; P.depths = P.depths || { best: 0, stars: {} };
  const tq = CS.torches(); const tl = CS.nextIn(tq, CS.TORCH_MS);
  const trow = el('div', 'row', `<b class="goldc">🔥 Факелы: ${tq.n}/${CS.TORCH_MAX}</b>${tl ? `<span class="muted">+1 через ${Math.ceil(tl / 60000)} мин</span>` : ''}`);
  trow.appendChild(adButton('+5 факелов', 'torch5', 30 * 60e3, () => CS.addTorches(5), rerender, 'btn ad sm')); b.appendChild(trow);
  const enter = f => { if (!CS.spendTorch()) { bus.emit('toast', { text: 'Нет факелов', sub: 'Они восстанавливаются сами: 1 за 20 минут', kind: 'warn' }); return; } closeModal(); loadZone('depths', { floor: f }); };
  b.appendChild(el('p', 'muted', 'Короткие забеги на 5–8 минут. Каждый 5-й этаж — страж. Звёзды: ★ пройти, ★★ убить 90% врагов, ★★★ быстро и без смертей.'));
  const next = P.depths.best + 1;
  const go = el('button', 'btn gold', `▶ Этаж ${next}${isBossFloor(next) ? ' · страж' : ''} (ур. врагов ${floorLevel(next)})`);
  go.style.width = '100%'; go.disabled = P.level < floorLevel(next) - 1; if (go.disabled) go.textContent = `Этаж ${next}: нужен уровень ${floorLevel(next) - 1}`; go.onclick = () => enter(next);
  b.appendChild(go);
  if (P.depths.best) {
    b.appendChild(el('h3', '', 'Пройденные этажи'));
    const grid = el('div', 'row');
    for (let f = Math.max(1, P.depths.best - 11); f <= P.depths.best; f++) {
      const s = P.depths.stars[f] || 0; const bt = el('button', 'btn sm', `${f}${isBossFloor(f) ? '♛' : ''} ${'★'.repeat(s)}${'☆'.repeat(3 - s)}`);
      bt.onclick = () => enter(f); grid.appendChild(bt);
    }
    b.appendChild(grid);
  }
}, { });

// ---------------------------------------------------------------- Походы: Фьорды Скъёльда / Старый Лес
W.wild = realm => modal(REALMS[realm].name, 'sm', b => {
  const RL = REALMS[realm], WS = wildState(realm), P = G.profile, next = WS.best + 1;
  b.appendChild(el('p', 'muted', RL.blurb));
  b.appendChild(el('p', 'muted', `Открытое поле с лагерями, сундуками и захваченным фортом. Отбейте форт — откроется путь вглубь; каждая глубина сложнее, каждая ${5}-я — босс. Лучшая глубина: <b class="goldc">${WS.best}</b>.`));
  const enter = d => { closeModal(); loadZone('wild', { realm, depth: d }); };
  const need = wildLevel(realm, next) - 2;
  const go = el('button', 'btn gold', `▶ Глубина ${next}${isWildBoss(next) ? ' · босс' : ''} (ур. врагов ${wildLevel(realm, next)})`);
  go.style.width = '100%'; if (P.level < need) { go.disabled = true; go.textContent = `Глубина ${next}: нужен уровень ${need}`; } go.onclick = () => enter(next); b.appendChild(go);
  if (WS.best) {
    b.appendChild(el('h3', '', 'Пройденные глубины')); const grid = el('div', 'row');
    for (let d = Math.max(1, WS.best - 11); d <= WS.best; d++) { const bt = el('button', 'btn sm', `${d}${isWildBoss(d) ? '♛' : ''}`); bt.onclick = () => enter(d); grid.appendChild(bt); }
    b.appendChild(grid);
  }
  const NS = nemState(), foes = NS.list.filter(n => n.alive && n.realm === realm && (n.rank > 0 || n.defeats || n.fled)), tro = NS.trophies.filter(t => t.realm === realm);
  if (foes.length || tro.length) {
    b.appendChild(el('h3', '', 'Охота: личные враги'));
    for (const n of foes) b.appendChild(el('div', 'q cur', `<div class="qt">☠ ${esc(displayName(n))} · ранг ${n.rank}</div><div class="muted">Силён: ${n.traits.map(t => TRAITS[t].name + ' (' + TRAITS[t].txt + ')').join('; ')}</div><div class="muted">Слаб к ${WEAK[n.weak]} (+35% урона) · хранит добычу: ${n.stash} зол.</div>`));
    for (const t of tro) b.appendChild(el('div', 'q', `<div class="qt">🏆 ${esc(t.name)}</div><div class="muted">Трофей: +${t.bonus.toFixed(1)}% урона и золота навсегда</div>`));
  }
  b.appendChild(el('h3', '', 'Задания похода'));
  for (const q of WILD_QUESTS[realm]) {
    const pr = questProgress(realm, q), rw = [q.reward.gold && `${q.reward.gold} зол.`, q.reward.xp && `${q.reward.xp} опыта`, q.reward.potions && `${q.reward.potions} зелья`, q.reward.skillPts && `${q.reward.skillPts} очко навыка`, q.reward.items && q.reward.items.map(i => i.epic ? 'эпическое оружие' : 'вещь').join(', ')].filter(Boolean).join(' · ');
    const d = el('div', 'q' + (pr.claimed ? '' : ' cur'), `<div class="qt">${pr.claimed ? '✔ ' : ''}${esc(q.title)}</div><div class="muted">${esc(q.text)}</div><div class="muted">Награда: ${rw}</div>${pr.claimed ? '' : `<div class="pbar"><i style="width:${pr.cur / pr.max * 100}%"></i></div><div class="muted">${pr.cur} / ${pr.max}</div>`}`);
    if (pr.done && !pr.claimed) { const bt = el('button', 'btn sm gold', 'Забрать награду'); bt.style.marginTop = '6px'; bt.onclick = () => { claimQuest(realm, q.id); rerender(); }; d.appendChild(bt); }
    b.appendChild(d);
  }
}, {});
function floorResult(r) {
  setTimeout(() => {
    const m = modal(r.first ? 'Новый рекорд глубины!' : 'Этаж пройден', 'sm reward', b => {
      b.appendChild(el('div', 'rw-head', `<div class="rw-rays r${r.stars >= 3 ? 3 : r.stars >= 2 ? 2 : 1}"></div><div class="rw-t">Этаж ${r.floor}</div><div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.35}s">★</span>`).join('')}</div>`));
      const mm = Math.floor(r.time / 60), ss = String(Math.floor(r.time % 60)).padStart(2, '0');
      b.appendChild(el('div', 'stats', `<div><span>Время</span><b>${mm}:${ss}</b></div><div><span>Враги</span><b>${r.kills}/${r.total}</b></div><div><span>Собрано золота</span><b>${r.runGold}</b></div>`));
      b.appendChild(el('div', 'rw-loot', `<span class="goldc">+${r.gold} золота</span> · <span style="color:#b8e3ff">+${r.xp} опыта</span>${r.first ? ' · <span style="color:#ff9a9a">+1 зелье</span>' : ''}`));
      const row = el('div', 'row'); row.style.justifyContent = 'center';
      const ad = el('button', 'btn ad', `×2 золото (+${r.gold})`);
      ad.onclick = () => watchRewarded('floor_x2', offerToken('floor_x2', r.token), () => { G.profile.gold += r.gold; bus.emit('toast', { text: `+${r.gold} золота`, kind: 'good' }); }).then(ok => { if (ok) { ad.disabled = true; ad.textContent = '✔ Удвоено'; } });
      const nx = el('button', 'btn gold', `Этаж ${r.floor + (r.first ? 1 : 0) + (r.first ? 0 : 1)} ▶`);
      const next = Math.max(r.floor + 1, 1);
      nx.textContent = `Этаж ${next} ▶`;
      nx.onclick = async () => { const keepBoons = true; if (G.profile.level < floorLevel(next) - 1) { bus.emit('toast', { text: `Этаж ${next} — с ${floorLevel(next) - 1} уровня`, sub: 'Фармите опыт на пройденных этажах', kind: 'warn' }); return; } if (!CS.spendTorch()) { bus.emit('toast', { text: 'Нет факелов', sub: '+1 за 20 минут или +5 за рекламу в меню Глубин', kind: 'warn' }); return; } closeModal(); await maybeInterstitial('floor'); loadZone('depths', { floor: next, keepBoons }); };
      const home = el('button', 'btn', 'В деревню');
      home.onclick = async () => { closeModal(); await maybeInterstitial('floor'); loadZone('town', { from: 'catacombs' }); };
      row.append(ad, nx, home); b.appendChild(row);
      const P = G.profile; if (G.run && G.run.boons.length) b.appendChild(el('p', 'muted', `Дары Бездны (${G.run.boons.length}) сохранятся, если идти глубже без возвращения в деревню.`)); if (P.attrPts || P.skillPts) b.appendChild(el('p', 'muted', 'Есть неизрасходованные очки — наставник Элвин ждёт в деревне.'));
    }, { sticky: true });
    maybeReview(r);
  }, 600);
}
let reviewAsked = false;
async function maybeReview(r) {
  const P = G.profile;
  if (reviewAsked || P.reviewDone || P.stats.playTime < 900 || !(r.stars === 3 || r.boss)) return;
  reviewAsked = true; try { const ok = await PF.p.requestReview(); if (ok) P.reviewDone = true; } catch { }
}
bus.on('bossDefeated', () => { const P = G.profile; if (!reviewAsked && !P.reviewDone && P.stats.playTime > 900) { reviewAsked = true; setTimeout(async () => { try { if (await PF.p.requestReview()) P.reviewDone = true; } catch { } }, 6000); } });
export function showDozor(d) {
  const h = Math.floor(d.ms / 3600e3), mi = Math.floor(d.ms / 60e3) % 60;
  modal('Дозор Ордена', 'sm reward', b => {
    b.appendChild(el('div', 'rw-head', `<div class="rw-rays r2"></div><div class="rw-t">Пока вас не было…</div>`));
    b.appendChild(el('p', '', `Ваш отряд ${h ? h + ' ч ' : ''}${mi} мин патрулировал Глубины (до этажа ${G.profile.depths.best}).`));
    b.appendChild(el('div', 'rw-loot', `<span class="goldc">+${d.gold} золота</span> · <span style="color:#b8e3ff">+${d.xp} опыта</span>`));
    const row = el('div', 'row'); row.style.justifyContent = 'center';
    const ad = el('button', 'btn ad', 'Забрать ×2'); ad.onclick = async () => { const ok = await watchRewarded('dozor_x2', offerToken('dozor_x2', String(G.profile.dozorAt)), () => DQ.claimDozor(2)); if (ok) { G.dozorChecked = true; closeModal(); } };
    const ok = el('button', 'btn gold', 'Забрать'); ok.onclick = () => { DQ.claimDozor(1); G.dozorChecked = true; closeModal(); };
    row.append(ad, ok); b.appendChild(row);
    b.appendChild(el('p', 'muted', '<small>Дозор копит награду до 8 часов. Чем глубже вы прошли — тем больше добыча.</small>'));
  }, { sticky: true });
}
function dailyBlock(b) {
  b.appendChild(el('h3', '', 'Ежедневные задания'));
  const list = DQ.dailyQuests(); const r = DQ.dqReward();
  for (const q of list) {
    const d = el('div', 'q' + (q.done && !q.claimed ? ' cur' : '') + (q.claimed ? ' done' : ''), `<div class="qt">${q.claimed ? '✔ ' : ''}${esc(q.title)} — ${q.cur}/${q.n}</div><div class="pbar"><i style="width:${q.cur / q.n * 100}%"></i></div>`);
    if (q.done && !q.claimed) { const bt = el('button', 'btn sm gold', `Забрать: ${r.gold} зол. + зелье`); bt.style.marginTop = '6px'; bt.onclick = () => { DQ.claimDaily(q.id); rerender(); }; d.appendChild(bt); }
    b.appendChild(d);
  }
  b.appendChild(el('p', 'muted', `<small>Все три — «Сундук дня» с редкой вещью для вашего класса. Новые задания — завтра.</small>`));
}
export { dailyBlock };

function boonChoice() {
  const r = G.run; if (!r || r.done || G.player.dead) return;
  if (cur) { setTimeout(boonChoice, 600); return; }
  const pool = BOON_IDS.filter(id => !r.boons.includes(id)).sort(() => Math.random() - 0.5).slice(0, 3);
  if (!pool.length) return;
  bus.emit('sfx', 'rareDrop');
  modal('Дар Бездны', 'md reward', b => {
    b.appendChild(el('p', 'muted', 'Выберите один дар — он действует до конца этажа.'));
    const row = el('div', 'boons');
    for (const id of pool) {
      const B = BOONS[id];
      const c = el('button', 'boon', `<div class="bg" style="color:${B.color};text-shadow:0 0 18px ${B.color}">${B.glyph}</div><b>${esc(B.name)}</b><span>${esc(B.desc)}</span>`);
      c.onclick = () => { r.boons.push(id); G.stats = calcStats(G.profile); bus.emit('statsChanged'); bus.emit('toast', { text: 'Дар: ' + B.name, kind: 'good' }); bus.emit('sfx', 'learn'); closeModal(); };
      row.appendChild(c);
    }
    b.appendChild(row);
  }, { sticky: true });
  cur.bg.querySelector('.mx').style.display = 'none';
  if (G.auto) setTimeout(() => { const bs = document.querySelectorAll('.boons .boon'); if (bs.length) bs[Math.floor(Math.random() * bs.length)].click(); }, 2500);
}

// ---------------------------------------------------------------- «Кровавая жатва»
const mmssT = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
W.survival = () => modal('Кровавая жатва', 'md', b => {
  const P = G.profile; P.surv = P.surv || { best: 0, ach: {}, runs: 0 };
  b.appendChild(el('p', '', 'Бескрайняя арена Бездны и бесконечные волны. <b>Нужно только бегать</b> — герой атакует сам. Собирайте кристаллы душ, растите в уровне, выбирайте перки и пробуждайте оружие. Цель — продержаться 20 минут.'));
  b.appendChild(el('div', 'stats', `<div><span>Рекорд</span><b>${mmssT(P.surv.best)}</b></div><div><span>Забегов</span><b>${P.surv.runs}</b></div>`));
  b.appendChild(el('h3', '', 'Достижения'));
  for (const a of SV.ACH) b.appendChild(el('div', 'q' + (P.surv.ach[a.id] ? ' done' : ''), `<div class="qt">${P.surv.ach[a.id] ? '🏆 ' : '○ '}${esc(a.name)}</div><div class="muted">+${a.gold} зол. · +${a.shards}◆</div>`));
  b.appendChild(el('h3', '', 'Пробуждения оружия'));
  b.appendChild(el('div', 'muted', SV.EVOS.map(e => `<b>${esc(e.name)}</b>: ${esc(SV.PERKS[e.from].name)} 5 ур. + ${esc(SV.PERKS[e.need].name)}`).join('<br>')));
  const row = el('div', 'row'); row.style.cssText = 'justify-content:center;margin-top:12px';
  const go = el('button', 'btn gold', '▶ В бой'); go.onclick = () => { closeModal(); loadZone('survival'); }; row.appendChild(go); b.appendChild(row);
});
function survLevel() {
  const S = G.surv; if (!S || S.over) return;
  if (cur) { setTimeout(survLevel, 500); return; }
  const cs = SV.choices(); bus.emit('sfx', 'levelup');
  modal(`Уровень ${S.lvl}!`, 'md reward', b => {
    b.appendChild(el('p', 'muted', 'Выберите усиление:'));
    const row = el('div', 'boons');
    for (const c of cs) {
      const title = c.evo ? '⚡ ' + c.evo.name : c.gold ? 'Золото' : c.P.name, desc = c.evo ? c.evo.desc : c.gold ? '+50 золота' : c.P.desc(c.lvl), lv = c.evo ? 'ПРОБУЖДЕНИЕ' : c.gold ? '' : c.lvl ? `ур. ${c.lvl} → ${c.lvl + 1}` : 'новое';
      const card = el('button', 'boon' + (c.evo ? ' evo' : ''), `<div class="bg">${c.evo ? '✹' : c.gold ? '⛁' : (c.P.icon || '⚔')}</div><b>${esc(title)}</b><small class="lv">${lv}</small><span>${esc(desc)}</span>`);
      card.onclick = () => { SV.take(c); closeModal(); };
      row.appendChild(card);
    }
    b.appendChild(row);
  }, { sticky: true });
  cur.bg.querySelector('.mx').style.display = 'none';
}
function survEnd(r) {
  setTimeout(() => modal(r.win ? 'Вы выжили!' : 'Жатва окончена', 'sm reward', b => {
    b.appendChild(el('div', 'rw-head', `<div class="rw-rays r${r.win ? 3 : 1}"></div><div class="rw-t">${mmssT(r.t)}${r.record ? ' · рекорд!' : ''}</div>`));
    b.appendChild(el('div', 'stats', `<div><span>Убито</span><b>${r.kills}</b></div><div><span>Уровень забега</span><b>${r.lvl}</b></div>`));
    b.appendChild(el('div', 'rw-loot', `<span class="goldc">+${r.gold} золота</span>${r.shards ? ` · <span class="c-shard">+${r.shards}◆</span>` : ''}`));
    if (r.newAch.length) b.appendChild(el('p', 'goldc', '🏆 ' + r.newAch.map(esc).join(' · ')));
    const row = el('div', 'row'); row.style.justifyContent = 'center';
    const again = el('button', 'btn gold', 'Ещё раз'); again.onclick = () => { closeModal(); loadZone('survival'); };
    const home = el('button', 'btn', 'В деревню'); home.onclick = () => { closeModal(); loadZone('town', { from: 'catacombs' }); };
    row.append(again, home); b.appendChild(row);
  }, { sticky: true }), 700);
}

// ---------------------------------------------------------------- lore intros (first visit)
const LORE = {
  depths: ['Глубины катакомб', 'Под катакомбами Ордена нет дна. Каждый пятый этаж охраняет страж, а за стражами — всё более древняя тьма: затопленные склепы, пепельные шахты и, говорят, само Сердце Бездны. Дары Бездны помогут — но только пока вы не повернёте назад.'],
  survival: ['Кровавая жатва', 'Раз в поколение Бездна распахивается, и мёртвые идут бесконечной рекой. Орден посылает на арену лишь одного — чтобы выстоял до рассвета. Не останавливайтесь: собирайте кристаллы душ, и оружие само запоёт в ваших руках.'],
  castle: ['Цитадель Ордена', 'Когда-то здесь жили магистры Ордена. Теперь это ваш дом. Откройте залы: алтарь будет копить золото, пока вы спите, а в Зале испытаний стражи прошлого проверят вашу силу.'],
};
bus.on('zoneEntered', id => { const P = G.profile; P.lore = P.lore || {}; const L = LORE[id]; if (!L || P.lore[id] || (id === 'depths' && !(G.run && G.run.floor > 0))) return; P.lore[id] = 1; bus.emit('save');
  const show = () => { if (cur) { setTimeout(show, 800); return; } modal(L[0], 'sm reward', b => { b.appendChild(el('p', 'lore', esc(L[1]))); const r = el('div', 'row'); r.style.justifyContent = 'center'; const ok = el('button', 'btn gold', 'Вперёд'); ok.onclick = closeModal; r.appendChild(ok); b.appendChild(r); }); cur.bg.classList.add('rw-bg'); }; setTimeout(show, 600); });

// ---------------------------------------------------------------- main menu: big labelled tiles instead of a row of tiny icons
W.menu = () => modal('Меню', 'md', b => {
  const tiles = [
    ['character', '🛡', 'Персонаж', 'характеристики', 'dotChar'], ['skills', '✦', 'Навыки', 'умения и кнопки', 'dotSkill'],
    ['journal', '📜', 'Задания', 'сюжет и ежедневные'], ['map', '🗺', 'Карта', 'текущая локация'],
    ['herospath', '⚔', 'Путь героя', 'автобои', 'dotHW'], ['shrine', '🎁', 'Награды', 'ежедневно и магазин', 'dotGift'],
    ['tutorial', '❓', 'Обучение', 'показать подсказки снова'], ['settings', '⚙', 'Настройки', 'звук, графика'],
  ];
  const g = el('div', 'menu-grid');
  for (const [id, ic, name, sub, badge] of tiles) {
    const locked = TOWN_ONLY[id] && G.zoneId !== 'town';
    const n = badge ? BADGES[badge] || 0 : 0;
    const t = el('button', 'menu-tile' + (locked ? ' locked' : ''), `<span class="mt-ic">${ic}</span><b>${name}</b><small>${locked ? 'в деревне' : sub}</small>${n ? `<span class="mt-dot">${n}</span>` : ''}`);
    t.onclick = () => { if (id === 'tutorial') { closeModal(); G.profile.tutorial.tips = {}; bus.emit('tutorialRestart'); return; } closeModal(); openWindow(id); };
    g.appendChild(t);
  }
  b.appendChild(g);
});
