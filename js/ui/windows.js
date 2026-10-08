// Modal windows. All fit the viewport with internal scrolling; the game pauses while one is open.
import { runFpsTest } from './fpstest.js';
import { SETS, bonusText } from '../data/sets.js';
import { setCounts } from '../game/stats.js';
import { G, bus, inCombat } from '../game/ctx.js';
import { $, el, esc, fmt } from '../core/util.js';
import { SLOTS, SLOT_NAMES, RARITY, WEAPONS, BASE, CLASSES, RARITY_SHORT } from '../data/items.js';
import { SKILLS, BRANCHES, classSkillOrder, unlockLevel } from '../data/skills.js';
import { STORY, REPEATABLE, DIALOG, CHAPTER, chapterOf } from '../data/quests.js';
import { stats, compare, usefulness, meetsReq, xpToNext, effRank } from '../game/stats.js';
import { iconOf, affixText, epicOf, sellValue, upgradeCost, reforgeCost, MAX_UPG, itemPower, kindPerkText, upgMult, heroPower } from '../game/items.js';
import * as CH from '../game/character.js';
import * as EC from '../game/economy.js';
import * as Q from '../game/quests.js';
import { iconURL, skillCanvas } from './icons.js';
import { drawMap, seen, seenKey } from './hud.js';
import { offers, buy, restorePurchases, dailyStatus, claimDaily, chestStatus, chestSkip, openOrderChest, DAILY, LOGIN_DAYS, watchRewarded, offerToken, blessing, blessLeft, BLESS_MIN, BLESS_CAP, BLESS_DAY, blessToday } from '../platform/monetize.js';
import { PRODUCTS, platform } from '../platform/platform.js';
import { wallOffer, markShown, streakHelp, helpGiven } from '../platform/offers.js';
import { inCinema } from './cinema.js';
import { revive, saveNow, loadZone, depthsUnlocked, MAX_REVIVES } from '../game/game.js';
import { generateFloor, isBossFloor, floorLevel } from '../world/floorgen.js';
import { REALMS, WILD_QUESTS, wildLevel, isWildBoss, isWildFort, locationName, wildReqLevel, FIELDS_PER_FORT } from '../data/wild.js';
import { wildState, questProgress, claimQuest } from '../game/wild.js';
import { nemState, displayName, TRAITS, WEAK } from '../game/nemesis.js';
import { nextGoal } from '../game/wildhints.js';
import * as DQ from '../game/daily.js';
import * as CS from '../game/castle.js';
import { openHeroPath } from './herospath.js';
import { adButton } from './adbtn.js';
import { openWheel, wheelReady } from './wheel.js';
import * as SV from '../game/survival.js';
import * as SE from '../game/season.js';
import * as HU from '../game/hunts.js';
import { huntReward } from '../data/hunts.js';
import { MEMORIES, SEALS } from '../data/story.js';
import { BOONS, BOON_IDS } from '../data/boons.js';
import { FLOOR_MODS, FLOOR_MOD_IDS, modReward } from '../data/floormods.js';
import { stats as calcStats } from '../game/stats.js';
import { particles } from '../game/combat.js';
import { maybeInterstitial } from '../platform/monetize.js';
import { earlyLock } from '../game/progress.js';
import { platform as PF } from '../platform/platform.js';
import { wipeLocal, cloudBundle } from '../game/save.js';
import { setVolumes } from '../core/audio.js';
import { resize } from '../render/index.js';
import { ZOOM, zoomNow, setZoom } from '../core/camzoom.js';
import { hintLog, hintsOn, setHints, MILESTONES, milestones } from './tutorial.js';

let cur = null;   // {name, bg, render}
// сборка 47: окно с lock (первый меч, смерть в Жатве) закрывается только своей кнопкой — closeModal(true).
// Окна от событий (глава, осколок памяти, босс, итог похода) не вышибают открытое окно, а ждут в очереди.
const winQ = [];
export function closeModal(force) { if (!cur || (cur.lock && force !== true)) return; cur.bg.remove(); cur = null; G.atMerchant = false; G.modalOpen = false; G.paused = false; bus.emit('sfx', 'click'); bus.emit('hud'); if (winQ.length) setTimeout(pumpWin, 350); }
function pumpWin() { if (cur || !winQ.length) return; winQ.shift()(); }
const later = fn => (...a) => { if (cur) winQ.push(() => fn(...a)); else fn(...a); };
bus.on('closeModal', () => closeModal());
function modal(title, size, render, opts = {}) {
  if (cur && cur.lock) { winQ.unshift(() => modal(title, size, render, opts)); return { bg: document.createElement('div'), body: null }; }
  if (cur) { cur.bg.remove(); } G.atMerchant = false;
  const bg = el('div', 'modal-bg'); const m = el('div', 'modal ' + (size || ''));
  const h = el('div', 'mh', `<h2>${esc(title)}</h2>`); const x = el('button', 'mx', '✕'); x.onclick = () => closeModal(); if (!opts.lock) h.appendChild(x);
  const b = el('div', 'mb'); m.append(h, b); bg.appendChild(m);
  bg.addEventListener('pointerdown', e => { if (e.target === bg && !opts.sticky && !opts.lock) closeModal(); });
  document.body.appendChild(bg);
  // сборка 47: render сохраняет и прокрутку списков внутри окна (путь сезона не прыгает в начало после «Забрать»)
  cur = { lock: !!opts.lock, bg, body: b, render: () => { const st = b.scrollTop, inner = [...b.querySelectorAll('*')].filter(x => x.scrollTop > 0 && x.className).map(x => [x.className, x.scrollTop]); b.innerHTML = ''; render(b); b.scrollTop = st; for (const [c, t] of inner) { const x = b.getElementsByClassName(c)[0]; if (x) x.scrollTop = t; } }, title: h.querySelector('h2') };
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
bus.on('openNPC', id => { if (id === 'fortune') { openWheel(modal, closeModal); return; } W['npc_' + id](); });
bus.on('openBoard', () => W.board()); bus.on('openWheel', () => openWheel(modal, closeModal)); bus.on('openHeroPath', () => openHeroPath()); bus.on('openDepths', () => W.depths()); bus.on('openWild', r => W.wild(r)); bus.on('wildCleared', later(r => W.wildResult(r)));
bus.on('floorResult', r => floorResult(r));
bus.on('boonChoice', () => boonChoice());
bus.on('openSurvival', () => W.survival()); bus.on('survLevel', () => survLevel()); bus.on('survEnd', r => survEnd(r)); bus.on('openShrine', () => W.shrine());
bus.on('showDeath', () => showDeath());
bus.on('survDeath', () => modal('Вы пали', 'sm', b => {
  b.appendChild(el('p', '', 'Бездна вас одолела. Можно вернуться в бой один раз за забег — или выйти и забрать золото.'));
  const row = el('div', 'row'); row.style.justifyContent = 'center';
  const ad = adButton('▶ Возродиться за рекламу', 'revive', 0, () => { closeModal(true); SV.revive(true); });
  const out = el('button', 'btn', 'Выйти с наградой'); out.onclick = () => { closeModal(true); SV.revive(false); };
  row.append(ad, out); b.appendChild(row);
}, { sticky: true, lock: true }));
bus.on('bossDefeated', later(k => bossReward(k)));
bus.on('chapterDone', later(n => chapterDone(n)));
bus.on('memory', later(id => showMemory(id)));
bus.on('wallOffer', () => showWallOffer());
bus.on('deathAt', where => setTimeout(() => showStreakHelp(where), 300));
const rewardQ = [];
bus.on('reward', r => { rewardQ.push(r); });
export function pumpRewards() {
  if (!rewardQ.length || cur || G.player.dead || inCombat() || !G.zoneReady) return;
  showReward(rewardQ.shift());
}
function showReward(r) {
  bus.emit('sfx', r.items.some(i => i.item.rarity >= 3) ? 'epicDrop' : 'levelup');
  // сборка 47: первый меч от старосты — окно не закрыть, пока не нажато «Надеть»
  const must = r.title === 'Поговорить со старостой' && r.items.some(en => en.bagged && en.item.slot === 'weapon');
  let okBtn = null;
  const m = modal(r.sub || 'Награда', 'sm reward', b => {
    const top = r.items.reduce((a, i) => Math.max(a, i.item.rarity), 0);
    const head = el('div', 'rw-head', `<div class="rw-rays r${top}"></div><div class="rw-t">${esc(r.title)}</div>`);
    b.appendChild(head);
    const box = el('div', 'rw-items');
    for (const en of r.items) {
      const it = en.item;
      const c = el('div', 'rw-card r' + it.rarity, `<div class="slot r${it.rarity}"><img src="${iconURL(iconOf(it))}"></div><div><div class="it-name" style="color:${RARITY[it.rarity].color}">${esc(it.name)}</div><div class="it-type">${RARITY[it.rarity].name} · ${it.wt ? WEAPONS[it.wt].name : SLOT_NAMES[it.slot]}</div>${it.dmg ? `<div class="it-stat">Урон ${it.dmg[0]}–${it.dmg[1]}</div>` : it.armor ? `<div class="it-stat">Защита ${it.armor}</div>` : ''}${it.affixes.slice(0, 3).map(a => `<div class="it-aff">${esc(affixText(a))}</div>`).join('')}${epicOf(it) ? `<div class="it-epic">★ ${esc(epicOf(it).desc)}</div>` : ''}</div>`);
      if (en.equipped) c.appendChild(el('div', 'rw-eq good', '✔ Надето — слот был пуст'));
      else if (en.bagged) {
        const rows = (en.cmp || []).map(r => `<div class="cmp ${r.delta > 0 ? 'up' : r.delta < 0 ? 'dn' : ''}"><span>${esc(r.label)}</span><b>${r.before}${r.suf} → ${r.after}${r.suf} ${r.delta > 0 ? '▲' : r.delta < 0 ? '▼' : ''}</b></div>`).join('');
        c.appendChild(el('div', 'rw-eq', `<div class="muted" style="margin:4px 0">Сейчас надето: «${esc(en.old ? en.old.name : '—')}»</div>${rows}`));
        const br = el('div', 'row'); br.style.cssText = 'justify-content:center;margin-top:6px';
        const wear = el('button', 'btn gold sm', 'Надеть'); wear.onclick = () => { if (CH.equipFromBag(it)) { br.replaceWith(el('div', 'rw-eq good', '✔ Надето · прежняя вещь в сумке')); if (must && okBtn) { okBtn.disabled = false; cur.lock = false; } } };
        const keep = el('button', 'btn sm', 'В сумку'); keep.onclick = () => br.replaceWith(el('div', 'rw-eq muted', 'Лежит в сумке — сравните и продайте, когда понадобится'));
        if (must) { br.append(wear); c.appendChild(el('div', 'rw-eq goldc', '☝ Нажмите «Надеть» — новый меч сильнее')); } else br.append(wear, keep); c.appendChild(br);
      } else c.appendChild(el('div', 'rw-eq muted', `Сумка полна — вещь продана за ${en.sold} зол.`));
      box.appendChild(c);
    }
    if (r.items.length) b.appendChild(box);
    const loot = [r.gold && `<span class="goldc">+${fmt(r.gold)} золота</span>`, r.xp && `<span style="color:#b8e3ff">+${r.xp} опыта</span>`, r.potions && `<span style="color:#ff9a9a">+${r.potions} зелья</span>`, r.scrolls && `<span>+${r.scrolls} свитка возврата</span>`, r.skillPts && `<span class="good">+${r.skillPts} очко навыка</span>`, r.shards && `<span class="c-shard">+${r.shards}◆ осколков</span>`].filter(Boolean);
    if (loot.length) b.appendChild(el('div', 'rw-loot', loot.join(' · ')));
    const q = Q.current(); if (q) b.appendChild(el('p', 'muted', `Следующее задание: <b class="goldc">${esc(q.title)}</b>`));
    const row = el('div', 'row'); row.style.justifyContent = 'center'; const ok = el('button', 'btn gold', 'Забрать'); ok.onclick = () => closeModal(); okBtn = ok; if (must) ok.disabled = true; row.appendChild(ok); b.appendChild(row);
  }, { lock: must });
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
// сет в карточке: название, сколько надето, бонусы (работающие — зелёные)
function setHTML(x) { if (!x || !x.set || !SETS[x.set]) return ''; const S = SETS[x.set], c = setCounts(G.profile.gear)[x.set] || 0;
  return `<div class="it-set" style="color:#7ee0a8">◈ Сет «${esc(S.name)}» · надето ${c}/3</div><div class="${c >= 2 ? 'good' : 'muted'}" style="font-size:12px">2 части: ${esc(bonusText(x.set, S.b2))}</div><div class="${c >= 3 ? 'good' : 'muted'}" style="font-size:12px">3 части: ${esc(bonusText(x.set, S.b3))}</div>`; }
function itemHTML(it, S) {
  const b = BASE[it.base], r = RARITY[it.rarity];
  let h = `<div class="it-name" style="color:${r.color}">${esc(it.name)}${it.upg ? ` <span class="good">+${it.upg}</span>` : ''}<span class="it-pow">⚔ ${itemPower(it)}</span></div>`;
  h += `<div class="it-type">${r.name} · ${it.wt ? WEAPONS[it.wt].name : SLOT_NAMES[it.slot === 'ring' ? 'ring1' : it.slot]} · ур. предмета ${it.ilvl}</div>`;
  const um = upgMult(it);
  if (it.dmg) h += `<div class="it-stat">Урон: <b>${Math.round(it.dmg[0] * um)}–${Math.round(it.dmg[1] * um)}</b> · Урон в сек.: <b>${Math.round((it.dmg[0] + it.dmg[1]) / 2 * um * WEAPONS[it.wt].aps * 10) / 10}</b> · Скорость: ${WEAPONS[it.wt].aps} уд/с · Дальность: ${WEAPONS[it.wt].range} м</div><div class="it-stat muted" style="font-size:12px">${WEAPONS[it.wt].note}</div>`;
  if (it.armor) h += `<div class="it-stat">Защита: <b>${Math.round(it.armor * um)}</b></div>`;
  if (it.block) h += `<div class="it-stat">Шанс блока: ${Math.round(it.block * 100)}%</div>`;
  for (const a of it.affixes) h += a.kp ? `<div class="it-aff kp">◆ ${esc(kindPerkText(it))}: ${esc(affixText(a))}</div>` : `<div class="it-aff">${esc(affixText(a))}</div>`;
  if (it.rarity < 4) h += `<div class="it-stat muted" style="font-size:12px">Слияние у кузнеца: 3 ${RARITY_SHORT[it.rarity]} ${SLOT_NAMES[it.slot] ? SLOT_NAMES[it.slot].toLowerCase() : ''} → 1 ${RARITY_SHORT[it.rarity + 1]}</div>`;
  const ep = epicOf(it); if (ep) h += `<div class="it-epic">★ ${esc(ep.desc)}</div>`;
  h += setHTML(it);
  if (it.req) { const ok = meetsReq(G.profile, it, S); h += `<div class="it-stat ${ok ? 'muted' : 'bad'}">Требуется: ${Object.entries(it.req).map(([k, v]) => `${CH.ATTR_NAMES[k]} ${v}`).join(', ')}</div>`; }
  h += originHTML(it);
  h += `<div class="it-stat muted" style="font-size:12px">Цена продажи: ${sellValue(it)} зол.</div>`;
  return h;
}
// сборка 49: у вещи есть история — откуда она (ценность вещи: польза, вид и происхождение)
export function originHTML(it) {
  const f = it && it.from; if (!f) return '';
  const d = f.t ? new Date(f.t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';
  return `<div class="it-stat origin${f.nem ? ' nem' : ''}">${f.nem ? '☠ Трофей немезиса: ' : 'Добыто: '}${esc(f.who || '')}${f.where ? ' · ' + esc(f.where) : ''}${d ? ' · ' + d : ''}</div>`;
}
function cmpTable(it, slot) {
  const rows = compare(G.profile, it, slot);
  return `<table class="cmpt"><tr><td class="muted">Показатель</td><td class="muted">Сейчас</td><td class="muted">С этим</td><td></td></tr>` + rows.map(r => {
    const cls = typeof r.delta === 'number' && r.delta !== 0 ? (r.delta > 0 ? 'good' : 'bad') : '';
    const dv = typeof r.delta === 'number' && r.delta !== 0 ? (r.inv ? (r.delta > 0 ? '−' : '+') + Math.abs(r.delta) : (r.delta > 0 ? '+' : '') + (Math.round(r.delta * 100) / 100) + r.suf) : '';
    return `<tr><td>${r.label}</td><td>${r.before}${r.suf}</td><td>${r.after}${r.suf}</td><td class="d ${cls}">${dv}</td></tr>`;
  }).join('') + '</table>';
}
const SORTS = { type: (a, b) => a.slot.localeCompare(b.slot) || b.ilvl - a.ilvl, level: (a, b) => b.ilvl - a.ilvl, rarity: (a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl, use: (a, b) => usefulness(G.profile, b) - usefulness(G.profile, a) };

// ---------------------------------------------------------------- windows
const W = {};
W.inventory = (arg = {}) => {
  const P = G.profile; let filter = W._invFilter || 'all';
  const FILTERS = [['all', 'Всё'], ['weapon', 'Оружие'], ['head', 'Шлем'], ['chest', 'Доспех'], ['amulet', 'Амулет']];
  const m = modal('Герой', 'md', b => {
    const S = G.stats, C = CLASSES[P.cls || 'warrior'];
    const cell = (it, slot, arrow) => {
      const d = el('button', 'eq-slot r' + (it ? it.rarity : 'x'), it ? `<img src="${iconURL(iconOf(it))}"><span class="eq-lv">${it.ilvl}</span>${it.upg ? `<span class="eq-up">+${it.upg}</span>` : ''}${arrow ? `<span class="eq-ar ${arrow > 0 ? 'good' : 'bad'}">${arrow > 0 ? '▲' : '▼'}</span>` : ''}${it.isNew ? '<span class="eq-new"></span>' : ''}` : `<span class="ph">${esc(SLOT_NAMES[slot] || '')}</span>`);
      if (it) d.onclick = () => itemCard(it, slot); return d;
    };
    // ---- кукла героя: четыре ячейки вокруг портрета, подписи под ними
    const wrap = el('div', 'eq-wrap'), left = el('div', 'eq-left'), right = el('div', 'eq-right'); wrap.append(left, right); b.appendChild(wrap);
    const doll = el('div', 'eq-doll');
    const side = (slot, cls) => { const w = el('div', 'eq-w ' + cls); w.append(cell(P.gear[slot], slot), el('small', '', SLOT_NAMES[slot])); return w; };
    doll.append(side('weapon', 'a'), side('head', 'b'), el('div', 'eq-pt', `<div class="iv-pt" style="background-image:url(assets/sprites/${(P.cls || 'warrior') === 'warrior' ? 'portrait' : 'portrait_' + P.cls}.png)"></div><b>${esc(C.name)}<br><span class="it-pow" style="float:none">⚔ сила ${heroPower(P)}</span></b><small>Уровень ${P.level}</small>`), side('chest', 'c'), side('amulet', 'd'));
    left.appendChild(doll);
    left.appendChild(el('div', 'iv-stats', `<span class="st-atk">⚔ Урон/с <b>${S.dps}</b></span><span class="st-hp">♥ Здоровье <b>${S.maxHP}</b></span><span class="st-def">🛡 Защита <b>${S.armor}</b></span>`));
    // ---- сумка
    const full = P.bag.length >= P.bagSize;
    const gray = P.bag.filter(it => it.rarity === 0 && !it.locked);
    right.appendChild(el('div', 'eq-bagh', `<b>Сумка</b><span class="${full ? 'bad' : 'muted'}">${P.bag.length} / ${P.bagSize}</span>`));
    const tabs = el('div', 'eq-tabs');
    for (const [id, name] of FILTERS) { const t = el('button', 'eq-tab' + (filter === id ? ' on' : ''), name); t.onclick = () => { filter = W._invFilter = id; rerender(); }; tabs.appendChild(t); }
    right.appendChild(tabs);
    const score = new Map(P.bag.map(it => [it, it.slot === 'weapon' && !CH.canEquip(it).ok ? -999 : usefulness(P, it)]));
    const list = P.bag.filter(it => filter === 'all' || it.slot === filter).sort((x, y) => (score.get(y) > 0.5) - (score.get(x) > 0.5) || y.rarity - x.rarity || score.get(y) - score.get(x));
    if (!list.length) right.appendChild(el('p', 'muted iv-hint', P.bag.length ? 'В этой вкладке пусто.' : 'Сумка пуста. Вещи падают с сильных врагов и из сундуков — каждая что-то да меняет.'));
    else { const g = el('div', 'eq-grid'); for (const it of list) { const sc = score.get(it); g.appendChild(cell(it, null, sc > 0.5 ? 1 : sc < -0.5 ? -1 : 0)); } right.appendChild(g); }
    if (gray.length) { const v = gray.reduce((a, it) => a + sellValue(it), 0); const sb = el('button', 'btn eq-sellgray', `Продать серое: ${gray.length} шт. · +${fmt(v)} зол.`); sb.onclick = () => { EC.sellAllCommon(); rerender(); }; right.appendChild(sb); }
    right.appendChild(el('p', 'muted iv-hint', '▲ — лучше надетого · ▼ — хуже. Нажмите на вещь, чтобы сравнить.'));
    if (arg.select) { const it = P.bag.find(x => x.id === arg.select); arg.select = null; if (it) setTimeout(() => itemCard(it, null), 50); }
  });
  m.live = true;
  function itemCard(it, slot) {
    const inBag = !slot, tslot = CH.slotFor(it), eq = inBag ? P.gear[tslot] : null;
    const ov = el('div', 'ic-ov'); const box = el('div', 'ic-box r' + it.rarity);
    const um = x => 1 + (x.upg || 0) * 0.1;
    const lines = x => !x ? '<div class="muted">— пусто —</div>' : `${x.dmg ? `<div>Урон <b>${Math.round(x.dmg[0] * um(x))}–${Math.round(x.dmg[1] * um(x))}</b></div><div>Урон в сек. <b>${(Math.round((x.dmg[0] + x.dmg[1]) / 2 * um(x) * WEAPONS[x.wt].aps * 10) / 10)}</b></div>` : ''}${x.armor ? `<div>Защита <b>${Math.round(x.armor * um(x))}</b></div>` : ''}${x.block ? `<div>Блок <b>${Math.round(x.block * 100)}%</b></div>` : ''}${x.affixes.map(a => `<div class="it-aff">${esc(affixText(a))}</div>`).join('')}${epicOf(x) ? `<div class="it-epic">★ ${esc(epicOf(x).desc)}</div>` : ''}${setHTML(x)}${originHTML(x)}`;
    const head = (x, tag) => `<div class="cc-h">${tag ? `<small class="muted">${tag}</small>` : ''}<div class="cc-n" style="color:${RARITY[x.rarity].color}">${esc(x.name)}${x.upg ? ` <span class="good">+${x.upg}</span>` : ''}</div><small>${RARITY[x.rarity].name} · ур. ${x.ilvl}</small></div>`;
    const rows = inBag ? compare(P, it, tslot).filter(r => typeof r.delta === 'number' && r.delta !== 0).slice(0, 6) : [];
    const ok = inBag ? CH.canEquip(it) : { ok: true };
    box.innerHTML = `<div class="ic-top"><button class="ic-x" aria-label="Закрыть">✕</button></div><div class="cc ${eq ? 'two' : ''}">
      <div class="cc-col">${head(it, inBag ? 'Эта вещь' : '')}<div class="iv-slot big r${it.rarity}"><img src="${iconURL(iconOf(it))}"></div><div class="ic-stats">${lines(it)}</div></div>
      ${eq ? `<div class="cc-col dim">${head(eq, 'Надето сейчас')}<div class="ic-stats">${lines(eq)}</div></div>` : ''}</div>
      ${rows.length ? `<div class="ic-cmp"><b>Если надеть:</b>${rows.map(r => `<span class="${r.delta > 0 ? 'good' : 'bad'}">${r.delta > 0 ? '▲' : '▼'} ${r.label} ${r.inv ? `${r.before} → ${r.after}` : `${r.delta > 0 ? '+' : ''}${Math.round(r.delta * 100) / 100}${r.suf}`}</span>`).join('')}</div>` : ''}
      ${!ok.ok ? `<div class="bad ic-why">${esc(ok.why)}</div>` : ''}`;
    const btns = el('div', 'ic-btns');
    if (inBag) { const eqb = el('button', 'btn gold', ok.ok ? 'Надеть' : 'Нельзя надеть'); eqb.disabled = !ok.ok; eqb.onclick = () => { CH.equip(it.id); ov.remove(); rerender(); }; btns.appendChild(eqb);
      const sell = el('button', 'btn', `Продать · ${fmt(sellValue(it))} зол.`); sell.onclick = () => { EC.sellItem(it.id); ov.remove(); rerender(); }; btns.appendChild(sell); }
    else { const un = el('button', 'btn', 'Снять'); un.onclick = () => { CH.unequip(slot); ov.remove(); rerender(); }; btns.appendChild(un); }
    box.appendChild(btns);
    const xb = box.querySelector('.ic-x'); const shut = e => { e.preventDefault(); e.stopPropagation(); ov.remove(); };
    xb.addEventListener('pointerup', shut); xb.addEventListener('click', shut); xb.addEventListener('pointerdown', e => e.stopPropagation());
    ov.addEventListener('pointerdown', e => { if (e.target === ov) ov.remove(); });
    ov.appendChild(box); cur.bg.appendChild(ov);
  }
};

W.character = (arg = {}) => {
  const edit = !!arg.npc;
  const m = modal(edit ? 'Наставник: характеристики' : 'Персонаж', 'md', b => {
    const P = G.profile, S = G.stats;
    b.appendChild(el('div', 'row', `<b class="goldc" style="font:600 17px Georgia">${CLASSES[P.cls || 'warrior'].name} · уровень ${P.level} · ⚔ сила ${heroPower(P)}</b><span class="muted">Опыт ${fmt(P.xp)} / ${fmt(xpToNext(P.level))}</span>`));
    b.appendChild(el('h3', '', `Характеристики <span class="c-gold" style="float:right">💰 ${fmt(P.gold)} зол.</span>`));
    b.appendChild(el('p', 'muted', 'Растут сами с каждым уровнем — вкладывать очки не нужно.'));
    const hints = { str: 'урон мечом и топором', dex: 'урон луком, крит, защита', int: 'сила заклинаний, мана', vit: 'здоровье и восстановление' };
    for (const k of ['str', 'dex', 'int', 'vit']) b.appendChild(el('div', 'attr', `<b>${CH.ATTR_NAMES[k]}<br><span class="muted" style="font:12px sans-serif">${hints[k]}</span></b><span class="v">${S[k]}</span>`));
    b.appendChild(el('h3', '', 'Боевые показатели'));
    const st = [['Физический урон', `${S.dmgMin}–${S.dmgMax}`], ['Урон в секунду', S.dps], ['Скорость атаки', S.aps + ' уд/с'], ['Шанс крит. удара', Math.round(S.critChance * 100) + '%'], ['Крит. урон', Math.round(S.critMult * 100) + '%'],
      ['Сила заклинаний', Math.round(S.spellPower * 100) + '%'], ['Урон огнём / льдом / молнией', `${Math.round(S.elem.fire * 100)}% / ${Math.round(S.elem.cold * 100)}% / ${Math.round(S.elem.light * 100)}%`],
      ['Защита', `${S.armor} (−${Math.round(S.armor / (S.armor + 50 + 10 * P.level) * 100)}% урона)`], ['Шанс блока', Math.round(S.block * 100) + '%'],
      ['Здоровье', S.maxHP], ['Запас прочности', S.ehp], ['Мана', S.maxMP], ['Восст. маны', S.mpRegen.toFixed(1) + '/с'], ['Здоровье за удар', S.leech], ['Находка золота', '+' + S.goldFind + '%']];
    const core = ['Урон в секунду', 'Здоровье', 'Защита', 'Запас прочности'], mainRows = st.filter(r => core.includes(r[0])), moreRows = st.filter(r => !core.includes(r[0]));
    b.appendChild(el('div', 'stats', mainRows.map(([a, v]) => `<div><span>${a}</span><b>${v}</b></div>`).join('')));
    b.appendChild(el('details', 'more', `<summary class="muted" style="cursor:pointer;margin:6px 0">Подробные показатели</summary><div class="stats">${moreRows.map(([a, v]) => `<div><span>${a}</span><b>${v}</b></div>`).join('')}</div>`));
    const s = P.stats;
    b.appendChild(el('h3', '', 'Летопись'));
    b.appendChild(el('div', 'stats', [['Убито монстров', s.kills], ['Элитных', s.elites], ['Боссов', s.bossKills], ['Сундуков', s.chests], ['Пройдено', Math.round(s.meters) + ' м'], ['Собрано золота', fmt(s.gold)], ['Смертей', s.deaths], ['Время в игре', Math.round(s.playTime / 60) + ' мин']].map(([a, v]) => `<div><span>${a}</span><b>${v}</b></div>`).join('')));
    if (P.fallen && P.fallen.length) {   // сборка 49: «Зал павших» — смерти не пропадают бесследно, злейший враг виден
      const cnt = {}; for (const f of P.fallen) cnt[f.who] = (cnt[f.who] || 0) + 1; const [foe, fn] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      b.appendChild(el('details', 'more fallen', `<summary class="muted" style="cursor:pointer;margin:6px 0">☠ Зал павших (${P.fallen.length})</summary>${fn > 1 ? `<p class="bad">Злейший враг: <b>${esc(foe)}</b> — ${fn} раз${fn % 10 >= 2 && fn % 10 <= 4 && (fn < 12 || fn > 14) ? 'а' : ''}</p>` : ''}<div class="stats">${P.fallen.slice(0, 10).map(f => `<div><span>${esc(f.where || '—')} · ур. ${f.lvl}</span><b>${esc(f.who)}</b></div>`).join('')}</div>`));
    }
  });
  m.live = true;
};

// Skills: talent tree like WoW — one branch per class: active skill → two passives → next active … (4 actives for 4 buttons).
// Every node needs the previous one and a hero level. Tap an icon → card with description, requirements and «Изучить» (at the trainer).
const TC = 54, TGX = 26, TGY = 22;   // icon size and gaps in the tree grid (px)
W.skills = (arg = {}) => {
  const edit = !!arg.npc; if (edit) setTimeout(() => bus.emit('skillsOpened'), 50); const cls = G.profile.cls || 'warrior'; const ids = classSkillOrder(cls);
  let sel = ids.includes(W._skillSel) ? W._skillSel : null;
  if (!sel || edit) sel = ids.find(id => CH.canLearn(id).ok) || sel || ids[0];
  const m = modal(edit ? 'Наставник: навыки' : 'Навыки', 'lg', b => {
    const P = G.profile;
    b.appendChild(el('div', 'sp-row', `<b class="${P.skillPts ? 'good' : 'muted'}">Очки навыков: ${P.skillPts}</b><span class="muted sp-hint">+1 очко за каждый уровень</span><b class="c-gold">💰 ${fmt(P.gold)} зол.</b>${edit ? '' : '<span class="muted">Изучать — у наставника Элвина в деревне.</span>'}`));
    // сборка 38: без большой подсказки «Начните с верхнего умения» — на доступном узле и так «+»; дерево и карточка — в обёртке
    // (на телефоне горизонтально они встают рядом: дерево слева, карточка справа)
    // сборка 49 («одно новое за раз»): пока не изучено ни одного умения, видно только то, что можно изучить сейчас
    const first = hintsOn() && !Object.values(P.skills || {}).some(Boolean) && ids.some(id => CH.canLearn(id).ok);
    const wrap = el('div', 'tal-wrap' + (first ? ' tal-first' : '')), trees = el('div', 'tal-trees');
    if (first) b.appendChild(el('p', 'muted tal-first-note', 'Изучите первое умение — остальные откроются потом, по одному.'));
    trees.appendChild(talentBranch(cls, ids, P, id => { sel = W._skillSel = id; rerender(); }, sel));
    wrap.appendChild(trees);
    if (sel) wrap.appendChild(talentInfo(sel, P, edit));
    b.appendChild(wrap);
  });
  m.live = true;
};
// snake layout: active in the middle column, the two passives after it side by side in the next row
const talPos = (i, n) => { if (!i) return [1, 0]; const k = Math.floor((i - 1) / 3), g = (i - 1) % 3; return g === 2 ? [1, 2 * k + 2] : i === n - 1 ? [1, 2 * k + 1] : [g * 2, 2 * k + 1]; };
function talentBranch(cls, ids, P, onPick, sel) {
  const cell = {}; ids.forEach((id, i) => cell[id] = talPos(i, ids.length));
  const rows = Math.max(...ids.map(id => cell[id][1])) + 1;
  const W0 = 3 * TC + 2 * TGX, H0 = rows * TC + (rows - 1) * TGY;
  const pos = id => [cell[id][0] * (TC + TGX), cell[id][1] * (TC + TGY)];
  const pts = ids.reduce((a, id) => a + (P.skills[id] || 0), 0);
  const panel = el('div', 'tal-branch tb-' + cls, `<div class="tal-h"><span>${esc(CLASSES[cls].name)}</span> <b>${pts}</b></div>`);
  const grid = el('div', 'tal-grid'); grid.style.width = W0 + 'px'; grid.style.height = H0 + 'px';
  // arrows: from the previous node to the one it opens; gold when the previous node is learned
  let svg = `<svg class="tal-arrows" width="${W0}" height="${H0}" viewBox="0 0 ${W0} ${H0}">`;
  for (let i = 1; i < ids.length; i++) {
    const k = ids[i - 1], [x1, y1] = pos(k), [x2, y2] = pos(ids[i]); const ok = (P.skills[k] || 0) >= 1; const c = ok ? '#ffd24a' : '#6a6460';
    let d, head;
    if (y1 === y2) { const ax = x1 + TC, ay = y1 + TC / 2, bx = x2 - 4; d = `M${ax},${ay} L${bx},${ay}`; head = `M${bx - 7},${ay - 7} L${bx + 2},${ay} L${bx - 7},${ay + 7}`; }
    else { const ax = x1 + TC / 2, ay = y1 + TC, bx = x2 + TC / 2, by = y2 - 4, my = ay + (by - ay) / 2; d = ax === bx ? `M${ax},${ay} L${bx},${by}` : `M${ax},${ay} L${ax},${my} L${bx},${my} L${bx},${by}`; head = `M${bx - 7},${by - 7} L${bx},${by + 2} L${bx + 7},${by - 7}`; }
    svg += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${ok ? 5 : 4}" stroke-linejoin="round"${ok ? ' class="lit"' : ''}/><path d="${head}" fill="${c}"/>`;
  }
  grid.innerHTML = svg + '</svg>';
  for (const id of ids) {
    const sk = SKILLS[id], r = P.skills[id] || 0, can = CH.canLearn(id), open = CH.reqsMet(id), lv = unlockLevel(cls, id);
    const st = r >= sk.max ? 'max' : r ? 'have' : can.ok ? 'can' : open ? 'open' : 'locked';
    const [x, y] = pos(id);
    const n = el('button', `tal tal-${st}${sk.kind === 'active' ? ' act' : ''}${sel === id ? ' sel' : ''}`); n.style.left = x + 'px'; n.style.top = y + 'px';
    n.title = sk.name; n.appendChild(skillCanvas(id, 96, !r && !can.ok));
    n.appendChild(el('span', 'tal-r', `${r}/${sk.max}`));
    if (sk.kind === 'active') n.appendChild(el('span', 'tal-a', '⚔'));
    if (can.ok) n.appendChild(el('span', 'tal-plus', '+'));
    else if (!r && P.level < lv) n.appendChild(el('span', 'tal-lv', `ур. ${lv}`));
    n.onclick = () => { bus.emit('sfx', 'click'); onPick(id); };
    grid.appendChild(n);
  }
  panel.appendChild(grid); return panel;
}
function talentInfo(id, P, edit) {
  const sk = SKILLS[id], r = P.skills[id] || 0, er = effRank(P, id), can = CH.canLearn(id), br = BRANCHES.find(x => x.id === sk.b);
  const box = el('div', 'tal-info node');
  box.appendChild(skillCanvas(id, 96, !r && !can.ok));
  const reqs = CH.skillReqs(id);
  const t = el('div', 'ti-body', `<div class="ti-n">${esc(sk.name)} <span class="ti-k ${sk.kind}">${sk.kind === 'active' ? '⚔ активное умение' : 'пассивное'}</span></div>
    <div class="ti-sub"><span style="color:${br.color}">${esc(br.name)}</span> · ранг ${r}/${sk.max}${er > r ? ` <span class="good">(+${er - r} от вещей)</span>` : ''}</div>
    ${r ? `<div class="ti-d"><b>Сейчас:</b> ${esc(sk.desc(er))}</div>` : ''}
    ${r < sk.max ? `<div class="ti-d ${r ? 'next' : ''}"><b>${r ? 'Следующий ранг:' : 'Ранг 1:'}</b> ${esc(sk.desc(Math.max(1, er + 1)))}</div>` : '<div class="ti-d good">Изучено полностью</div>'}
    ${r < sk.max ? `<ul class="ti-req">${reqs.map(q => `<li class="${q.ok ? 'ok' : 'no'}">${q.ok ? '✔' : '✖'} ${esc(q.text)}</li>`).join('')}</ul>` : ''}`);
  box.appendChild(t);
  if (edit && r < sk.max) {
    const cost = CH.skillCost(id); const bt = el('button', 'learn tal-learn' + (can.ok ? ' ok' : ''), `${r ? 'Повысить ранг' : 'Изучить'}<small>${cost ? fmt(cost) + ' зол.' : 'бесплатно'}</small>`); bt.disabled = !can.ok;
    bt.onclick = e => { e.stopPropagation(); if (CH.learn(id, true)) rerender(); }; t.appendChild(bt);
    if (!can.ok) t.appendChild(el('div', 'bad', `<small>${esc(can.why)}</small>`));
  } else if (!edit && r < sk.max && can.ok) t.appendChild(el('div', 'muted', '<small>Можно изучить у наставника Элвина в деревне.</small>'));
  if (r && sk.kind === 'active') {
    const sr = el('div', 'slots4');
    { const bb = el('button', 'btn sm' + (P.bigSkill === id ? ' gold' : ''), '★'); bb.title = 'На большую кнопку'; bb.onclick = e => { e.stopPropagation(); P.bigSkill = P.bigSkill === id ? null : id; bus.emit('toast', { text: P.bigSkill ? `«${sk.name}» — на большой кнопке` : 'Большая кнопка: обычная атака', kind: 'good' }); bus.emit('statsChanged'); rerender(); }; sr.appendChild(bb); }
    for (let i = 0; i < 4; i++) { const sb = el('button', 'btn sm' + (P.slots[i] === id ? ' gold' : ''), String(i + 1)); sb.title = 'Кнопка ' + (i + 1); sb.onclick = e => { e.stopPropagation(); CH.setSlot(i, id); bus.emit('toast', { text: `«${sk.name}» — кнопка ${i + 1}`, kind: 'good' }); rerender(); }; sr.appendChild(sb); }
    t.appendChild(el('div', 'muted', '<small>Кнопка в бою:</small>')); t.appendChild(sr);
  }
  return box;
}

// Quests: tabs like mobile hits — Story / Daily / Weekly / Contracts, with reward chips and clear buttons
W.journal = (arg = {}) => {
  let tab = arg.tab || W._qtab || 'story'; W._qtab = tab;
  const m = modal('Задания', 'md', b => {
    const P = G.profile, st = P.story.stage;
    const dq = DQ.dailyQuests(), wq = DQ.weeklyQuests();
    const cnt = { hunt: HU.current() ? 1 : 0, daily: dq.filter(q => q.done && !q.claimed).length, weekly: wq.filter(q => q.done && !q.claimed).length, contracts: REPEATABLE.filter(r => Q.repState(r).done).length };
    const tabs = el('div', 'q-tabs');
    for (const [id, name] of [['story', 'Сюжет'], ['hunt', 'Охота'], ['daily', 'Ежедневные'], ['weekly', 'Недельные'], ['contracts', 'Контракты']]) {
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
      { const cq = STORY[Math.min(st, STORY.length - 1)], ch = cq.chapter || 1, inCh = STORY.filter(x => (x.chapter || 1) === ch), k = st >= STORY.length ? inCh.length : inCh.indexOf(cq); b.appendChild(el('div', 'q-ch', esc(chapterOf(cq)) + `<div class="pbar"><i style="width:${k / inCh.length * 100}%"></i></div>`)); }
      const q = STORY[st];
      if (q) { const pr = Q.progressOf(q); const it = el('div', 'q-card cur', `<div class="q-t">➤ ${esc(q.title)}</div><div class="muted">${esc(q.text)}</div>${pr ? `<div class="q-prog"><div class="pbar"><i style="width:${pr.cur / pr.max * 100}%"></i></div><span>${pr.cur}/${pr.max}</span></div>` : ''}${chips({ gold: q.reward && q.reward.gold, xp: q.reward && q.reward.xp, item: q.reward && q.reward.items && q.reward.items.length, skillPts: q.reward && q.reward.skillPts, potions: q.reward && q.reward.potions })}`);
        const go = el('button', 'btn sm gold', 'Показать путь'); go.onclick = () => { closeModal(); bus.emit('toast', { text: 'Идите за золотыми стрелками', kind: 'quest' }); }; it.appendChild(go); b.appendChild(it); }
      for (let i = st - 1; i >= Math.max(0, st - 3); i--) b.appendChild(el('div', 'q-card claimed', `<div class="q-t">✔ ${esc(STORY[i].title)}</div>`));
    } else if (tab === 'hunt') {
      const cur = HU.current(), hs = HU.state();
      if (!HU.unlocked()) b.appendChild(el('div', 'q-card', '<div class="q-t">Охота ещё не началась</div><div class="muted">Спуститесь в катакомбы через портал Ордена — после этого раз в 15 минут будут приходить тревожные слухи о чудовищах.</div>'));
      else if (cur && cur.slain) {
        const H = HU.defOf(cur), B = HU.bossOf(cur), r = huntReward(cur.lvl);
        const c = el('div', 'q-card hot', `<div class="q-t">✔ ${esc(H.title)}</div><div>Чудовище <span style="color:#ff9a84">${esc(B.name)}</span> повержено.</div><ol class="hunt-steps"><li>Вернитесь в деревню (портал или свиток возврата).</li><li>Сдайте охоту старосте Эдрику — он на площади у церкви, над ним горит «?».</li></ol>${chips({ gold: r.gold, xp: r.xp, shards: r.shards, potions: r.potions, item: 1 })}`);
        const go = el('button', 'btn sm gold', 'Показать путь'); go.onclick = () => { closeModal(); bus.emit('toast', { text: 'Идите за красными стрелками к старосте', kind: 'quest' }); }; c.appendChild(go); b.appendChild(c);
        b.appendChild(el('p', 'muted', '<small>Новая тревога придёт через 15 минут после того, как вы сдадите эту охоту.</small>'));
      } else if (cur) {
        const H = HU.defOf(cur), B = HU.bossOf(cur), r = huntReward(cur.lvl);
        const c = el('div', 'q-card hunt', `<div class="q-t">⚠ ${esc(H.title)}</div><div class="muted"><i>«${esc(H.rumor)}»</i></div>
          <div style="margin-top:6px"><b>Чудовище:</b> <span style="color:#ff9a84">${esc(B.name)}</span> · ур. ${cur.lvl}</div><div class="muted"><small>${esc(B.desc)}</small></div>
          <div style="margin-top:6px"><b>Где:</b> ${esc(HU.whereText(cur))}</div><ol class="hunt-steps">${HU.steps(cur).map(t => `<li>${esc(t)}</li>`).join('')}<li>Победите чудовище.</li><li>Вернитесь к старосте Эдрику и сдайте охоту — награда у него.</li></ol>
          ${chips({ gold: r.gold, xp: r.xp, shards: r.shards, potions: r.potions, item: 1 })}`);
        const go = el('button', 'btn sm gold', 'Показать путь'); go.onclick = () => { closeModal(); bus.emit('toast', { text: 'Идите за красными стрелками', sub: HU.whereText(cur), kind: 'quest' }); }; c.appendChild(go); b.appendChild(c);
        const ab = el('button', 'btn sm', 'Отказаться от охоты'); ab.disabled = !HU.canAbandon(); ab.title = ab.disabled ? 'Нельзя, пока чудовище сражается с вами' : 'Новая тревога придёт через 15 минут';
        ab.onclick = () => { if (confirm('Отказаться? Новая охота появится только через 15 минут.')) { HU.abandon(); rerender(); } }; b.appendChild(ab);
        b.appendChild(el('p', 'muted', '<small>Пока эта охота не завершена, новая тревога не придёт — таймер стоит.</small>'));
      } else {
        const t = el('div', 'hunt-timer', ''); const upd = () => { const ms = HU.msLeft(), s = Math.ceil(ms / 1000); t.textContent = `Следующая тревога через ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
        upd(); const iv = setInterval(() => { if (!t.isConnected) clearInterval(iv); else upd(); }, 1000);
        b.appendChild(el('div', 'q-card', '<div class="q-t">Пока всё тихо…</div><div class="muted">Раз в 15 минут где-то объявляется чудовище: в лесу у деревни, на кладбище, в залах катакомб или на этаже Глубин. Такие мини-боссы встречаются <b>только</b> в охотах.</div>'));
        b.appendChild(t);
      }
      if (hs.done) b.appendChild(el('p', 'muted', `<small>Завершено охот: ${hs.done}</small>`));
      b.appendChild(el('p', 'muted', `<small>Таймер — справа вверху под золотом. Награда: золото, опыт, осколки Бездны ◆ и именной трофей.</small>`));
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

// ---------------------------------------------------------------- «Справка» (сборка 49): «дайте пропустить и вернуться»
// подсказки вкл/выкл, всё, что уже объясняли (перечитать), перезапуск обучения, «Ваш путь» — минуты до ключевых моментов
const mmPlay = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
W.help = () => modal('Справка', 'sm', b => {
  const on = hintsOn();
  const r = el('div', 'attr', '<b>Подсказки</b> <small class="muted">палец над кнопками и стрелки</small>');
  const bt = el('button', 'btn sm' + (on ? ' gold' : ''), on ? 'Вкл' : 'Выкл'); bt.onclick = () => { setHints(!on); rerender(); }; r.appendChild(bt); b.appendChild(r);
  const L = hintLog();
  b.appendChild(el('h3', '', 'Что уже объясняли'));
  if (!L.length) b.appendChild(el('p', 'muted', 'Пока ничего. Подсказки появятся в игре, когда понадобятся.'));
  else { const ul = el('ul', 'help-list'); for (const t of L.slice().reverse()) ul.appendChild(el('li', '', esc(t))); b.appendChild(ul); }
  const rs = el('button', 'btn', 'Показать все подсказки заново'); rs.onclick = () => { closeModal(); const t = G.profile.tutorial; t.tips = {}; t.log = []; bus.emit('tutorialRestart'); };
  b.appendChild(rs);
  const ms = milestones(), got = MILESTONES.filter(([k]) => ms[k] != null);
  if (got.length) {   // «считайте минуты»: тестер присылает скриншот этого списка
    b.appendChild(el('h3', '', 'Ваш путь'));
    b.appendChild(el('div', 'stats help-ms', got.map(([k, n]) => `<div><span>${esc(n)}</span><b>${mmPlay(ms[k])}</b></div>`).join('')));
    b.appendChild(el('p', 'muted', '<small>Минуты игры, когда это случилось впервые.</small>'));
  }
});
export function photoMode(on) {
  document.body.classList.toggle('photo', on); let x = document.querySelector('.photo-exit'); if (x) x.remove();
  if (!on) return;
  x = el('button', 'btn sm photo-exit', '✕ съёмка'); x.onclick = () => photoMode(false); document.body.appendChild(x);
}
W.settings = () => modal('Настройки', 'sm', b => {
  const P = G.profile, s = P.settings;
  const range = (lab, key) => { const r = el('div', 'attr', `<b>${lab}</b>`); const i = document.createElement('input'); i.type = 'range'; i.min = 0; i.max = 1; i.step = 0.05; i.value = s[key]; i.oninput = () => { s[key] = +i.value; setVolumes(s.sfx, s.music); }; i.onchange = () => bus.emit('save'); r.appendChild(i); b.appendChild(r); };
  range('Звуки', 'sfx'); range('Музыка', 'music');
  const q = el('div', 'attr', '<b>Качество графики</b>'); for (const [k, n] of [['low', 'Низкое'], ['auto', 'Авто'], ['med', 'Среднее'], ['high', 'Высокое']]) { const bt = el('button', 'btn sm' + (s.quality === k ? ' gold' : ''), n); bt.onclick = () => { s.quality = k; resize(); bus.emit('save'); rerender(); }; q.appendChild(bt); } b.appendChild(q);
  { const ft = el('button', 'btn sm', '⏱ Тест скорости (FPS)'); ft.onclick = () => { closeModal(); runFpsTest(html => modal('Тест скорости', 'sm', bb => { bb.appendChild(el('div', '', html)); })); }; b.appendChild(ft); }   // сборка 47
  { let cur = '3d'; try { cur = localStorage.getItem('da_render') || '3d'; } catch { } if (new URLSearchParams(location.search).get('render')) cur = new URLSearchParams(location.search).get('render');
    const g = el('div', 'attr', '<b>Графика</b>'); for (const [k, n] of [['3d', '3D (по умолчанию)'], ['2d', 'Классика 2D']]) { const bt = el('button', 'btn sm' + (cur === k ? ' gold' : ''), n); bt.onclick = () => { try { localStorage.setItem('da_render', k); } catch { } saveNow(); const u = new URL(location.href); u.searchParams.delete('render'); location.href = u.toString(); }; g.appendChild(bt); } b.appendChild(g); b.appendChild(el('p', 'muted', '<small>Смена графики перезапускает игру (прогресс сохраняется). Лучник и маг пока всегда в 2D.</small>')); }
  { const nm = el('div', 'attr', '<b>Новые модели</b> <small class="muted">(герои)</small>'); const bn = el('button', 'btn sm', s.skins !== false ? 'Вкл' : 'Выкл'); bn.onclick = () => { s.skins = s.skins === false; bus.emit('save'); rerender(); }; nm.appendChild(bn); b.appendChild(nm); }
  { const zr = el('div', 'attr', '<b>Камера</b> <small class="muted">ближе — дальше</small>'); const i = document.createElement('input'); i.type = 'range'; i.min = ZOOM.min; i.max = ZOOM.max; i.step = 0.05; i.value = zoomNow(); i.oninput = () => setZoom(+i.value);
    const rs = el('button', 'btn sm', 'Как было'); rs.onclick = () => { setZoom(1); i.value = 1; }; zr.append(i, rs); b.appendChild(zr);
    b.appendChild(el('p', 'muted', `<small>${matchMedia('(pointer: coarse)').matches ? 'В игре: разведите или сведите два пальца на свободной части экрана.' : 'В игре: колесо мыши или щипок на тачпаде.'}</small>`)); }
  { // сборка 49: режим съёмки — интерфейс прячется, для скриншотов и роликов (план продвижения). Джойстик работает, «АВТО» — как было.
    const ph = el('div', 'attr', '<b>Режим съёмки</b> <small class="muted">без кнопок, для скриншотов и роликов. Включите АВТО заранее — герой будет сражаться сам</small>'); const bp = el('button', 'btn sm', 'Включить');
    bp.onclick = () => { closeModal(); photoMode(true); }; ph.appendChild(bp); b.appendChild(ph); }
  const sh = el('div', 'attr', '<b>Тряска камеры</b>'); const bs = el('button', 'btn sm', s.shake ? 'Вкл' : 'Выкл'); bs.onclick = () => { s.shake = !s.shake; rerender(); }; sh.appendChild(bs); b.appendChild(sh);
  b.appendChild(el('p', 'muted', `<small>Версия сборки: ${window.__BUILD || ''}</small>`));
  b.appendChild(el('h3', '', 'Управление'));
  b.appendChild(el('p', 'muted', 'Телефон/планшет: джойстик слева, атака и навыки справа, удерживайте атаку — герой сам подойдёт к врагу. Щипок двумя пальцами — камера ближе/дальше. ПК: WASD/стрелки — движение, колесо мыши — камера ближе/дальше, Пробел — атака, 1–4 — навыки, Shift — уклонение, Q/E — зелья, F — действие, I/C/K/J/M — окна, T — свиток.'));
  const row = el('div', 'row'); row.style.marginTop = '10px';
  const sv = el('button', 'btn', 'Сохранить'); sv.onclick = () => { saveNow(true); bus.emit('toast', { text: 'Игра сохранена', kind: 'good' }); }; row.appendChild(sv);
  const rp = el('button', 'btn', 'Восстановить покупки'); rp.onclick = () => restorePurchases(); row.appendChild(rp);
  const wp = el('button', 'btn', 'Начать заново'); wp.onclick = () => { if (confirm('Удалить сохранение этого героя и начать заново? Это нельзя отменить. Сохранения других героев останутся.')) { wipeLocal(G.profile.cls); G.profile = null; const go = () => location.reload(); if (platform.name !== 'demo' && platform.p && platform.p.cloudSave) platform.p.cloudSave(cloudBundle(null)).finally(go); else go(); } }; row.appendChild(wp);
  b.appendChild(row);
  b.appendChild(el('p', 'muted', `<small>Версия 2.0 · платформа: ${platform.name}</small>`));
});

// ---------------------------------------------------------------- NPCs
const FACES = ['elder', 'smith', 'merchant', 'trainer', 'fortune'];   // сборка 47: портреты из 3D-моделей NPC (tools/qa/scenarios/npc_faces.js)
function dialog(b, id, name, lines, img) {
  const d = el('div', 'dlg');
  if (img || FACES.includes(id)) { const f = el('div', 'npcface', ''); f.style.backgroundImage = `url(${img || `assets/sprites/face_${id}.jpg`})`; d.appendChild(f); }
  const t = el('div', ''); t.appendChild(el('div', 'who', esc(name)));
  const tx = el('div', 'txt'); t.appendChild(tx); d.appendChild(t); b.appendChild(d);
  let i = 0; const show = () => { tx.textContent = lines[i]; };
  show(); return { next: () => { if (i < lines.length - 1) { i++; show(); return true; } return false; }, last: () => i >= lines.length - 1 };
}
W.npc_elder = () => {
  if (HU.readyToTurnIn()) return huntReport();
  const P = G.profile; const q = Q.current(); let lines, fin = false;
  if (q && q.id === 'talk_elder') lines = DIALOG.elder[0];
  else if (q && q.id === 'elder_task') lines = DIALOG.elder.task;
  else if (q && q.id === 'learn_skill') lines = DIALOG.elder.skill;
  else if (q && q.id === 'hw_try') lines = DIALOG.elder.hw;
  else if (Q.isReady() && Q.turnNpc(q) !== 'elder') lines = ['Золото собрано? Отнеси его кузнецу Горану — он ждёт у горна.'];
  else if (Q.isReady()) { lines = DIALOG.elder.turnin[q.id] || ['Ты справился. Вот твоя награда.']; fin = true; }
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
// hunt report: the slain beast's trophy is handed in to the elder → reward
function huntReport() {
  const cur = HU.current(), H = HU.defOf(cur), B = HU.bossOf(cur), r = huntReward(cur.lvl);
  modal('Староста Эдрик', 'sm', b => {
    dialog(b, 'elder', 'Староста Эдрик', [H.elder || `${B.name} повержен? Тихий Брод в долгу перед тобой. Вот твоя награда.`]);
    b.appendChild(el('div', 'q-card hunt', `<div class="q-t">✔ Охота: ${esc(H.title)}</div><div class="muted">Чудовище: ${esc(B.name)}</div><div class="q-rw"><span class="chip g">💰 ${fmt(r.gold)}</span><span class="chip s">◆ ${r.shards}</span><span class="chip p">❤ ${r.potions}</span><span class="chip x">✦ ${r.xp} опыта</span><span class="chip i">★ ${esc(typeof H.trophy.name === 'string' ? H.trophy.name : H.trophy.name[G.profile.cls || 'warrior'])}</span></div>`));
    const row = el('div', 'row'); row.style.marginTop = '12px';
    const ok = el('button', 'btn gold', 'Сдать охоту и получить награду'); ok.onclick = () => { closeModal(); HU.turnIn(); };
    row.appendChild(ok); b.appendChild(row);
  }, { sticky: true });
}
W.npc_smith = (tab0) => {
  { const q = Q.current(); if (q && Q.isReady() && Q.turnNpc(q) === 'smith') bus.emit('toast', { text: 'Горан: «' + (DIALOG.smith.turnin[q.id] || 'Спасибо!') + '»', kind: 'quest' }); }
  let sel = null, tab = tab0 || 'merge';   // сборка 38: окно кузнеца всегда открывается на слиянии
  modal('Кузнец Горан', 'md', b => {
    const P = G.profile;
    const tabs = el('div', 'tabs big-tabs'); for (const [k, n] of [['merge', 'Слияние 3→1'], ['upg', 'Закалка']]) { const t = el('button', 'tab' + (tab === k ? ' on' : ''), n); t.onclick = () => { tab = k; sel = null; rerender(); }; tabs.appendChild(t); } b.appendChild(tabs);
    if (tab === 'merge') { mergeTab(b); b.appendChild(el('p', 'goldc', `Ваше золото: ${fmt(P.gold)}`)); return; }
    b.appendChild(el('p', '', `<i>«${esc(DIALOG.smith.hello[1])}»</i>`));
    b.appendChild(el('p', 'muted', 'Закалка: +10% к урону или защите за уровень (до +10), без риска поломки. Закалять вещи можно только здесь, у кузнеца.'));
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
      b.appendChild(det);
    } else b.appendChild(el('p', 'muted', 'Выберите предмет.'));
    b.appendChild(el('p', 'goldc', `Ваше золото: ${fmt(P.gold)}`));
  }).live = true;
  Q.talked('smith');
};
// Слияние (сборка 38, как в референсе): сверху — три вещи «+» и что получится, кнопка «Слияние»; ниже — вещи сумки.
// Нажатие на вещь выбирает её группу (слот + редкость); в слияние идут три самые сильные из группы (они с галочкой).
let lastMerged = null, mergeSel = null;
function mergeTab(b) {
  const P = G.profile, groups = EC.mergeGroups(), key = g => g.slot + ':' + g.rarity;
  if (mergeSel && !groups.some(g => key(g) === mergeSel && g.can)) mergeSel = null;
  if (!mergeSel) { const g0 = groups.find(g => g.can); if (g0) mergeSel = key(g0); }
  const G3 = mergeSel && groups.find(g => key(g) === mergeSel), three = G3 ? G3.list.slice(0, 3) : [];
  const top = el('div', 'mrg-top');
  if (G3) {
    const res = el('div', 'mrg-res'); const r1 = slotEl({ ...three[0], rarity: G3.rarity + 1, upg: 0, isNew: false }, '', 'big'); res.append(r1, el('div', 'mrg-up', '▲'));
    const inp = el('div', 'mrg-in'); inp.append(slotEl(three[0]), el('span', 'mrg-plus', '+'), slotEl(three[1]), slotEl(three[2]));
    top.append(el('div', 'mrg-t', `<b style="color:${RARITY[G3.rarity + 1].color}">${RARITY[G3.rarity + 1].name}</b> ${SLOT_NAMES[G3.slot].toLowerCase()}`), res, inp);
    const cost = EC.mergeCost(G3.rarity), go = el('button', 'btn gold mrg-go', `Слияние · ${fmt(cost)} зол.`); go.disabled = P.gold < cost;
    go.onclick = () => { lastMerged = EC.mergeOnce(G3.slot, G3.rarity); mergeSel = null; rerender(); }; top.appendChild(go);
  } else top.appendChild(el('div', 'mrg-empty', 'Нужны <b>три вещи</b> одного слота и одной редкости. Серое → зелёное → синее → золотое → мифическое.<br><small class="muted">Надетые и 🔒 не участвуют.</small>'));
  b.appendChild(top);
  if (lastMerged) { const det = el('div', 'detail'); det.innerHTML = '<div class="muted">Получено:</div>' + itemHTML(lastMerged, G.stats); const eq = el('button', 'btn', 'Надеть'); eq.onclick = () => { CH.equip(lastMerged.id); lastMerged = null; rerender(); }; det.appendChild(eq); b.appendChild(det); }
  const ready = groups.filter(g => g.can).reduce((a, g) => a + g.can, 0);
  const row = el('div', 'row'); row.appendChild(el('span', 'muted', ready ? `Готово к слиянию: <b class="goldc">${ready}</b>` : 'Пока нечего сливать'));
  const all = el('button', 'btn sm', 'Слить всё'); all.disabled = !ready; all.onclick = () => { const m = EC.mergeAll(); lastMerged = m.length ? m[m.length - 1] : null; mergeSel = null; rerender(); }; row.appendChild(all); b.appendChild(row);
  // вещи: сначала те, что можно слить, потом остальные (с замком)
  const order = [...groups].sort((a, b) => (b.can ? 1 : 0) - (a.can ? 1 : 0) || a.rarity - b.rarity);
  const bag = el('div', 'bag mrg-bag');
  for (const g of order) for (const it of g.list) {
    const on = key(g) === mergeSel && three.includes(it), d = slotEl(it, '', (on ? 'mrg-on' : '') + (g.can ? '' : ' mrg-lock'));
    if (on) d.appendChild(el('span', 'mrg-ck', '✔')); else if (!g.can) d.appendChild(el('span', 'mrg-lk', g.capLvl && g.n >= 3 ? `ур.${g.capLvl}` : `${g.n}/3`));
    d.onclick = () => { if (g.can) { mergeSel = key(g); rerender(); } else if (g.capLvl && g.n >= 3) bus.emit('toast', { text: `Слить в ${RARITY_SHORT[g.rarity + 1]} — с ${g.capLvl} уровня героя`, kind: 'info' }); else bus.emit('toast', { text: `Нужно ещё ${3 - g.n % 3}: ${RARITY_SHORT[g.rarity]} ${SLOT_NAMES[g.slot].toLowerCase()}`, kind: 'info' }); };
    bag.appendChild(d);
  }
  if (!bag.children.length) bag.appendChild(el('p', 'muted', 'В сумке нет вещей для слияния.'));
  b.appendChild(bag);
}
// ---------------------------------------------------------------- путь сезона и коллекция (сборка 21)
W.season = () => modal('Путь сезона · ' + SE.seasonName(), 'md', b => {
  const S = SE.season(), L = SE.seasonLevel(), P = G.profile;
  b.appendChild(el('div', 'row', `<b class="goldc" style="font:600 17px Georgia">Ступень ${L.lvl} из ${SE.SEASON_LEVELS}</b><span class="muted">${L.need ? `${L.into}/${L.need} очков до следующей` : 'Путь пройден!'}</span>`));
  b.appendChild(el('div', 'pb season-pb', `<i style="width:${L.need ? L.into / L.need * 100 : 100}%"></i>`));
  b.appendChild(el('p', 'muted', 'Очки сезона дают только задания: задание дня — 100, все три за день — ещё 50, отметка входа — 10, недельное задание — 150. Выполняя 70% заданий дня, путь проходится примерно за 3 недели. Новый месяц — новый сезон.'));
  const list = el('div', 'season-list');
  for (let l = 1; l <= SE.SEASON_LEVELS; l++) { const r = SE.seasonReward(l), got = !!S.claimed[l], open = L.lvl >= l;
    const row = el('div', 'sl' + (r.big ? ' big' : r.mid ? ' mid' : '') + (got ? ' got' : open ? ' open' : ''), `<i>${l}</i><span>${r.label}${r.gold ? ` · ${r.gold * P.level} зол.` : ''}</span>`);
    if (open && !got) { const bt = el('button', 'btn sm gold', 'Забрать'); bt.onclick = () => { SE.claimSeason(l); rerender(); }; row.appendChild(bt); } else row.appendChild(el('em', '', got ? '✔' : '🔒'));
    list.appendChild(row); }
  b.appendChild(list);
});
W.codex = () => modal('Коллекция', 'md', b => {
  const P = G.profile; SE.codexScan(); const n = SE.codexCount(P), bases = SE.codexBases(P.cls);
  b.appendChild(el('p', '', `<b class="goldc">Записей: ${n}</b> · бонус навсегда: <b>+${(n * SE.CODEX_PCT).toFixed(1)}%</b> к урону и здоровью`));
  b.appendChild(el('p', 'muted', 'Каждая вещь нового вида или новой редкости (от зелёной) заносится сюда сама. Слияние у кузнеца — быстрый путь к новым записям.'));
  const g = el('div', 'merge-grid codex-grid'); g.appendChild(el('div', 'mg-h', ''));
  for (let r = 1; r <= 4; r++) g.appendChild(el('div', 'mg-h', `<span style="color:${RARITY[r].color}">${RARITY_SHORT[r]}</span>`));
  for (const B of bases) { g.appendChild(el('div', 'mg-s', esc(B.name))); for (let r = 1; r <= 4; r++) { const has = P.codex && P.codex[B.k + ':' + r]; g.appendChild(el('div', 'mg-c' + (has ? ' ok' : ''), has ? '✔' : '·')); } }
  b.appendChild(g);
});
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
  // Глава III: герой вспомнил всё — Элвин объясняется (одной сценой, потом обычное окно наставника)
  { const q = Q.current(), scene = q && { c3_elvin: DIALOG.trainer.confess, c2_stone: DIALOG.trainer.stone }[q.id]; if (scene) { const lines = scene;
    return modal('Наставник Элвин', 'sm', b => {
      const dl = dialog(b, 'trainer', 'Наставник Элвин', lines);
      const row = el('div', 'row'); row.style.marginTop = '12px';
      const nx = el('button', 'btn gold', 'Далее');
      nx.onclick = () => { if (dl.next()) { if (dl.last()) nx.textContent = 'Понятно'; return; } Q.talked('trainer'); closeModal(); };
      row.appendChild(nx); b.appendChild(row);
    }, { sticky: true }); } }
  modal('Наставник Элвин', 'sm', b => {
    const P = G.profile;
    b.appendChild(el('p', '', `<i>«${esc(DIALOG.trainer.hello[P.tutorial.trainerGift ? 1 : 0])}»</i>`));
    if (!P.tutorial.trainerGift) {
      const C = CLASSES[P.cls || 'warrior'];
      const first = classSkillOrder(P.cls || 'warrior')[0], opts = [[first, SKILLS[first].name]];
      b.appendChild(el('p', 'good', 'Первый урок бесплатно: выберите приём — наставник обучит ему сразу.'));
      const row = el('div', 'row');
      for (const [id, n] of opts) { const bt = el('button', 'btn gold', n); bt.onclick = () => { P.tutorial.trainerGift = id; CH.grantSkill(id); bus.emit('toast', { text: 'Изучено: ' + n, kind: 'good' }); rerender(); }; row.appendChild(bt); }
      b.appendChild(row);
    }
    b.appendChild(el('h3', '', 'Услуги'));
    const r1 = el('div', 'row');
        const sk = el('button', 'btn ' + (P.skillPts ? 'gold' : ''), `Навыки${P.skillPts ? ` (+${P.skillPts})` : ''}`); sk.onclick = () => W.skills({ npc: true }); r1.appendChild(sk); b.appendChild(r1);
    const r2 = el('div', 'row'); r2.style.marginTop = '8px';
    const rs = el('button', 'btn', `Сбросить навыки — ${EC.respecSkillPrice()} зол.`); rs.disabled = P.gold < EC.respecSkillPrice(); rs.onclick = () => { if (confirm('Сбросить все навыки и вернуть очки?')) { EC.respecSkills(); rerender(); } }; r2.appendChild(rs);
    b.appendChild(r2);
  });
  Q.talked('trainer');
};
// Доска объявлений: ежедневные, недельные (крупнее) и долгие контракты (самые трудные, повторяются бесконечно)
const qChips = r => `<div class="q-rw">${r.gold ? `<span class="chip g">💰 ${fmt(r.gold)}</span>` : ''}${r.shards ? `<span class="chip s">◆ ${r.shards}</span>` : ''}${r.potions ? `<span class="chip p">❤ ${r.potions}</span>` : ''}${r.xp ? `<span class="chip x">✦ ${r.xp} опыта</span>` : ''}${r.item ? `<span class="chip i">★ вещь</span>` : ''}${r.skillPts ? `<span class="chip k">+${r.skillPts} навык</span>` : ''}</div>`;
function qCard(title, cur, max, rw, state, onClaim, onGo) {
  const d = el('div', 'q-card' + (state === 'done' ? ' hot' : state === 'claimed' ? ' claimed' : ''), `<div class="q-t">${esc(title)}</div><div class="q-prog"><div class="pbar"><i style="width:${Math.min(100, cur / max * 100)}%"></i></div><span>${cur}/${max}</span></div>${qChips(rw)}`);
  const btn = el('button', 'btn sm ' + (state === 'done' ? 'gold' : ''), state === 'done' ? 'Забрать' : state === 'claimed' ? '✔ Получено' : 'Перейти');
  btn.disabled = state === 'claimed'; btn.onclick = () => { if (state === 'done') { onClaim(); rerender(); } else onGo(); };
  d.appendChild(btn); return d;
}
W.board = () => {
  let tab = W._boardTab || 'daily';
  modal('Доска объявлений', 'md', b => {
    const dq = DQ.dailyQuests(), wq = DQ.weeklyQuests();
    const cnt = { daily: dq.filter(q => q.done && !q.claimed).length, weekly: wq.filter(q => q.done && !q.claimed).length, contracts: REPEATABLE.filter(r => Q.repState(r).done).length };
    const tabs = el('div', 'q-tabs');
    for (const [id, name] of [['daily', 'Ежедневные'], ['weekly', 'Недельные'], ['contracts', 'Долгие']]) { const t = el('button', 'q-tab' + (tab === id ? ' on' : ''), `${name}${cnt[id] ? `<i>${cnt[id]}</i>` : ''}`); t.onclick = () => { tab = W._boardTab = id; rerender(); }; tabs.appendChild(t); }
    b.appendChild(tabs);
    if (tab === 'daily') {
      const r = DQ.dqReward(); for (const q of dq) b.appendChild(qCard(q.title, q.cur, q.n, { gold: r.gold, potions: r.potions }, q.claimed ? 'claimed' : q.done ? 'done' : 'go', () => DQ.claimDaily(q.id), closeModal));
      b.appendChild(el('p', 'muted', '<small>Три задания на день. Выполните все — получите «Сундук дня». Обновляются каждые сутки.</small>'));
    } else if (tab === 'weekly') {
      const r = DQ.wqReward(); for (const q of wq) b.appendChild(qCard(q.title, q.cur, q.n, { gold: r.gold, shards: r.shards }, q.claimed ? 'claimed' : q.done ? 'done' : 'go', () => DQ.claimWeekly(q.id), closeModal));
      b.appendChild(el('p', 'muted', '<small>Крупные цели на неделю: больше золота и осколки Бездны для Цитадели.</small>'));
    } else {
      for (const rr of REPEATABLE) { const s = Q.repState(rr); b.appendChild(qCard(rr.title, s.cur, rr.n, rr.reward || { gold: rr.gold }, s.done ? 'done' : 'go', () => Q.claimRep(rr.id), closeModal)); }
      b.appendChild(el('p', 'muted', '<small>Самые трудные и долгие задания. Прогресс идёт сам; после награды контракт начинается заново.</small>'));
    }
  }).live = true;
};

// ---------------------------------------------------------------- rewards / shop (monetization hub)
W.shrine = () => modal('Источник силы', 'md', b => {
  const P = G.profile, now = Date.now();
  // 1) благословение — главное предложение алтаря
  { const left = blessLeft(), on = left > 0, full = left > (BLESS_CAP - BLESS_MIN) * 60000;
    const c = el('div', 'bless-card' + (on ? ' on' : ''), `<div class="bl-ic">✦</div><div class="tx"><b>Сила источника</b><div>+25% золота и опыта, +15% к выпадению вещей — ${BLESS_MIN} минут</div><div class="muted">${on ? `Действует ещё <b>${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}</b>${full ? ' · предел ' + BLESS_CAP + ' мин' : ' · можно продлить'}` : 'Посмотрите рекламу — и 10 минут всё падает щедрее'}</div></div>`);
    const used = blessToday() >= BLESS_DAY; c.appendChild(el('div', 'muted', `<small>Сегодня: ${blessToday()} из ${BLESS_DAY}</small>`));
    const bt = el('button', 'btn ad', used ? 'Завтра' : on ? `+${BLESS_MIN} мин` : 'Получить'); bt.disabled = full || used || inCombat(); bt.onclick = () => blessing().then(rerender); c.appendChild(bt); b.appendChild(c); }
  // 2) календарь входа: 28 дней, пропуск не сбрасывает, каждый 3-й больше, 7/14/21/28 — вещь
  const ds = dailyStatus(), cur = ds.day, base = ds.streak - (ds.claimable ? 0 : 1) - (cur - 1);   // base — сколько дней было до этого круга
  b.appendChild(el('h3', '', `Дары источника · день ${cur} из ${LOGIN_DAYS}${ds.streak >= LOGIN_DAYS ? ` · круг ${Math.floor(base / LOGIN_DAYS) + 1}` : ''}`));
  const cal = el('div', 'login-cal');
  DAILY.forEach((r, i) => { const d = i + 1, got = d < cur || (d === cur && !ds.claimable), today = d === cur && ds.claimable, soon = !got && !today && d - cur <= 3;
    const what = r.item ? (r.item >= 3 ? '◆ золотая вещь' : '◆ синяя вещь') : r.mid ? '✉ свиток' : (r.gold * P.level) + ' зол.';
    const cell = el('div', 'lc' + (r.big ? ' big' : r.mid ? ' mid' : '') + (got ? ' got' : '') + (today ? ' today' : '') + (soon ? ' soon' : ''), `<i>${d}</i><span>${what}</span>${got ? '<em>✔</em>' : soon ? `<em>${d - cur === 1 ? "завтра" : "через " + (d - cur) + " дн."}</em>` : ''}`);
    cal.appendChild(cell); });
  b.appendChild(cal);
  const nb = DAILY.findIndex((r, i) => i + 1 > cur && (r.big || r.mid)), nr = nb >= 0 ? DAILY[nb] : null;
  const dr = el('div', 'row'); dr.style.marginTop = '6px';
  if (ds.claimable) { const a = el('button', 'btn gold', `Забрать день ${cur}`); a.onclick = () => { claimDaily(false); rerender(); }; const x2 = el('button', 'btn ad', 'Забрать ×1,5'); x2.onclick = () => watchRewarded('daily_double', offerToken('daily_double', 'd' + new Date().toDateString()), () => claimDaily(true)).then(rerender); dr.append(a, x2); }
  else dr.appendChild(el('span', 'muted', `Следующий дар — завтра.${nr ? ` Через ${nb + 1 - cur} дн.: <b>${nr.label}</b>` : ''} Пропуск дня не сбрасывает календарь.`));
  b.appendChild(dr);
  dailyBlock(b);
  // order chest
  const cs = chestStatus(); b.appendChild(el('h3', '', 'Сундук Ордена'));
  const cr = el('div', 'offer', `<div class="ic">▣</div><div class="tx"><b>Редкий + магический предмет и золото</b><div class="muted">${cs.ready ? 'Готов к открытию!' : 'Откроется через ' + Math.ceil(cs.left / 60000) + ' мин'}</div></div>`);
  const cb = el('button', 'btn ' + (cs.ready ? 'gold' : 'ad'), cs.ready ? 'Открыть' : 'Открыть сейчас'); cb.onclick = () => { (cs.ready ? Promise.resolve(openOrderChest()) : chestSkip()).then(rerender); }; cr.appendChild(cb); b.appendChild(cr);
  // IAP
  b.appendChild(el('h3', '', 'Лавка Ордена'));
  for (const [id, p] of Object.entries(PRODUCTS)) {
    if (!platform.p.hasProduct(id)) continue;
    const owned = (p.once && P.iap.tx['once_' + id]) || (!p.consumable && P.iap[{ gold_perk: 'goldPerk', no_ads: 'noAds', bag_big: 'bagBig' }[id]]);
    const o = el('div', 'offer', `<div class="ic">${esc(p.icon || '⛁')}</div><div class="tx"><b>${esc(p.title)}</b><div class="muted">${esc(p.desc)}</div></div>`);
    const pr = platform.p.catalogPrice(id), price = typeof pr === 'string' ? esc(pr) : `${esc(pr.value)} ${pr.img ? `<img class="cur" src="${esc(pr.img)}" alt="${esc(pr.code)}">` : esc(pr.code)}`;
    const bt = el('button', 'btn gold', owned ? 'Куплено' : price); bt.disabled = !!owned; bt.onclick = () => buy(id).then(rerender); o.appendChild(bt); b.appendChild(o);
  }
  if (platform.name === 'demo') b.appendChild(el('p', 'muted', '<small>Демо-режим: реклама и покупки имитируются, деньги не списываются. На Яндекс Играх подключается SDK площадки.</small>'));
});

// Предложение у «стены» (js/platform/offers.js): один раз, в спокойный момент, с честными бесплатными путями рядом
export function showWallOffer() {
  const w = wallOffer(); if (!w || G.modalOpen || inCombat() || inCinema()) return false;
  markShown(w.id, w.promo);
  const pr = platform.p.catalogPrice(w.id);
  const price = !pr ? '' : typeof pr === 'string' ? esc(pr) : `${esc(pr.value)} ${pr.img ? `<img class="cur" src="${esc(pr.img)}" alt="${esc(pr.code)}">` : esc(pr.code)}`;
  modal(w.product.title, 'sm', b => {
    b.appendChild(el('div', 'offer', `<div class="ic">${esc(w.product.icon || '★')}</div><div class="tx"><b>${esc(w.product.desc)}</b><div class="muted">${esc(w.why)}</div></div>`));
    b.appendChild(el('p', 'muted', 'Без покупки игра проходится полностью. Бесплатные пути: прокачаться в уже открытых местах, закалить и слить вещи у кузнеца Горана, пройти этапы Летописи битв.'));
    const r = el('div', 'row');
    const bt = el('button', 'btn gold', price || 'Купить'); bt.onclick = () => { closeModal(); buy(w.id); };
    const no = el('button', 'btn', 'Справлюсь сам'); no.onclick = closeModal;
    r.append(bt, no); b.appendChild(r);
  });
  return true;
}
// три поражения подряд в одном месте — бесплатная помощь, чтобы не бросили игру
export function showStreakHelp(where) {
  if (!streakHelp(where) || G.modalOpen || inCinema()) return false;
  modal('Трудное место', 'sm', b => {
    b.appendChild(el('p', '', 'Третья попытка подряд. Орден даёт подмогу: +15% ко всему урону на 10 минут.'));
    const r = el('div', 'row');
    const free = el('button', 'btn gold', 'Взять подмогу'); free.onclick = () => { const P = G.profile; P.boosts.helpUntil = Date.now() + 10 * 60e3; helpGiven(where); bus.emit('statsChanged'); bus.emit('toast', { text: 'Подмога Ордена: +15% урона на 10 минут', kind: 'good' }); closeModal(); };
    const no = el('button', 'btn', 'Сам справлюсь'); no.onclick = () => { helpGiven(where); closeModal(); };
    r.append(free, no); b.appendChild(r);
  });
  return true;
}

// ---------------------------------------------------------------- death / boss reward / chapter end
function showDeath() {
  const d = $('death'); d.classList.remove('hidden'); G.paused = true;
  d.innerHTML = `<h2>Вы погибли</h2><p class="muted">${G.zoneId === 'wild' ? 'Ноша потеряна. Враг запомнил вас — вернитесь и отомстите.' : G.run ? `Этаж ${G.run.floor} не пройден. Собранное золото остаётся у вас.` : 'Нежить торжествует… но Орден даёт второй шанс.'}</p>`;
  { const h = G.lastHit, EL = { fire: 'огнём', cold: 'холодом', light: 'молнией', poison: 'ядом' }, P = G.profile;   // сборка 49: кто убил и что можно было сделать
    if (h && h.name) { const tip = P.potions.hp > 0 ? `Осталось зелий здоровья: ${P.potions.hp} — пейте раньше, на трети здоровья.` : h.big && !h.proj ? 'Его сильный удар подсвечен на земле — уходите из красной зоны или уклоняйтесь.' : h.proj ? 'Стрелков и магов лучше бить первыми — их снаряды можно обойти.' : 'Купите зелья у Миры и наденьте броню получше у кузнеца.';
      d.innerHTML += `<p class="death-why">Вас убил: <b>${esc(h.name)}</b>${(() => { const n = (P.fallen || []).filter(f => f.who === h.name.replace(/^Чемпион: /, '')).length; return n > 1 ? ` (уже ${n}-й раз)` : ''; })()} — последний удар ${h.dmg}${EL[h.elem] ? ' ' + EL[h.elem] : ''}.<br><small>${tip}</small></p>`; } }
  const row = el('div', 'row'); row.style.justifyContent = 'center';
  const left = Math.max(0, MAX_REVIVES - (G.revives || 0)), canRev = left > 0 && G.zoneId !== 'castle' && G.zoneId !== 'town';
  const ad = el('button', 'btn ad', `Воскреснуть на месте (осталось ${left})`);
  ad.onclick = async () => { const tok = offerToken('revive'); const ok = await watchRewarded('revive', tok, () => { }); if (ok) { d.classList.add('hidden'); G.paused = false; revive(true); } };
  const loss = Math.floor(G.profile.gold * 0.1);
  const town = el('button', 'btn gold', `В деревню (−${loss} зол.)`); town.onclick = () => { G.profile.gold -= loss; d.classList.add('hidden'); G.paused = false; revive(false); };
  if (canRev) row.append(ad); row.append(town); d.appendChild(row);
  if (!canRev && G.zoneId !== 'castle' && G.zoneId !== 'town') d.appendChild(el('p', 'bad', 'Воскрешения за этот заход закончились — вернитесь в деревню, подлечитесь и усильтесь.'));
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
// Осколок памяти: сюжетная сцена после победы над стражем печати. Один раз на осколок (profile.story.mem).
export function showMemory(id) {
  const M = MEMORIES[id]; if (!M) return;
  const S = G.profile.story; S.mem = S.mem || {};
  if (S.mem[id]) return; S.mem[id] = 1; bus.emit('save');
  const seals = SEALS.filter(x => (S.flags || {})['seal_' + x.id]).length;
  setTimeout(() => modal(M.title, 'sm', b => {
    const box = el('div', 'mem-box', `<div class="mem-ic">${M.kind === 'turn' ? '✦' : '◈'}</div><div class="mem-sub">${esc(M.sub || '')}</div>`);
    for (const l of M.lines) box.appendChild(el('p', '', esc(l)));
    box.appendChild(el('div', 'mem-seals', SEALS.map((x, i) => `<i class="${i < seals ? 'on' : ''}" title="${esc(x.name)}"></i>`).join('')));
    box.appendChild(el('div', 'muted', `Печати: ${seals} из ${SEALS.length}`));
    b.appendChild(box);
    const r = el('div', 'row'); r.style.justifyContent = 'center'; const ok = el('button', 'btn gold', 'Дальше'); ok.onclick = closeModal; r.appendChild(ok); b.appendChild(r);
  }, { sticky: true }), 1400);
  bus.emit('sfx', 'levelup');
}
const CH_DONE = {
  1: ['Первая печать снова цела — Палач Бездны пал.', 'Начинается Глава II «Тени за порогом». Печатей четыре: вторая в Старом Лесу, третья во Фьордах. Первое задание — найти ледяной портал на северо-востоке деревни. Катакомбы растут вместе с вами, Палача можно побеждать снова.'],
  2: ['Вторая и третья печати устояли: Хозяин Чащи и ётун Скъёльд повержены.', 'Начинается Глава III «Кости великанов». Умирающий ётун сказал, где четвёртая печать: Костяные пустоши, портал из черепов в левой части деревни. Там же — тот, кто ломает печати.'],
  3: ['Четвёртая печать цела, и память вернулась целиком.', 'Начинается Глава IV «Цитадель Морвена» — финал. Цитадель открыта, Морвен ждёт в зале испытаний. Перед этим стоит окрепнуть: Глубины, Летопись битв, сеты у кузнеца.'],
  4: ['Бездна закрыта, Морвен повержен. История Тихого Брода окончена.', 'Открыты Круги Бездны: в окне Глубин выберите круг — чем он выше, тем злее враги, больше золота и выше шанс золотых и мифических вещей. А ещё остаются рекорды Глубин, Жатва Бездны, форты походов, Летопись и контракты доски.'],
};
function chapterDone(n = 1) {
  if (n === 1) G.profile.chapterDone = true;
  if (n === 4) G.profile.storyDone = true;
  bus.emit('save');
  if (n === 3) bus.emit('memory', 'elvin');
  if (n === 4) bus.emit('memory', 'final');
  const roman = ['', 'I', 'II', 'III', 'IV'][n] || n;
  setTimeout(() => modal(`Глава ${roman} пройдена!`, 'sm', b => {
    const t = CH_DONE[n] || CH_DONE[4];
    b.appendChild(el('p', '', t[0])); b.appendChild(el('p', 'muted', t[1]));
    const r = el('div', 'row'); const ok = el('button', 'btn gold', 'Продолжить'); ok.onclick = closeModal; r.appendChild(ok); b.appendChild(r);
  }), 1200);
}
export { W };

// ---------------------------------------------------------------- Depths: floor select, results, dozor, daily
W.depths = () => modal('Глубины катакомб', 'sm', b => {
  const P = G.profile; P.depths = P.depths || { best: 0, stars: {} };
  const tq = CS.torches(); const tl = CS.nextIn(tq, CS.TORCH_MS);
  const trow = el('div', 'row', `<b class="goldc">⚡ Энергия: ${tq.n}/${CS.TORCH_MAX}</b>${tl ? `<span class="muted">+1 через ${Math.ceil(tl / 60000)} мин</span>` : ''}`);
  { const eb = el('button', 'btn gold sm', '⚡ Получить энергию'); eb.onclick = () => bus.emit('openEnergy', rerender); trow.appendChild(eb); } b.appendChild(trow);
  // новый этаж (дальше рекорда) — без факела, факел уйдёт только за поражение; повтор пройденного — факел сразу
  const enter = f => { const free = f > (P.depths.best || 0); if (!free && !CS.spendTorch()) { bus.emit('toast', { text: 'Нет энергии ⚡', sub: 'Восстанавливается сама: 1 за 20 минут. Новые этажи — без энергии', kind: 'warn' }); bus.emit('openEnergy', rerender); return; } closeModal(); loadZone('depths', { floor: f, free }); };
  b.appendChild(el('p', 'muted', 'Короткие забеги на 5–8 минут. Каждый 5-й этаж — страж. Звёзды: ★ пройти, ★★ убить 90% врагов, ★★★ быстро и без смертей.'));
  // Круги Бездны (после Главы IV): сложность и награда растут от того, насколько глубоко игрок сам захочет
  if (SE.circlesOpen()) { const k = SE.circle();
    const c = el('div', 'weekly-card circle-card', `<b>◉ Круг Бездны: ${k || '—'}</b><div class="muted">Враги крепче ×${SE.circleHP(k).toFixed(1)}, бьют сильнее ×${SE.circleDmg(k).toFixed(1)}, золото и опыт ×${SE.circleRew(k).toFixed(1)}, вещи выпадают чаще. Круг действует на все этажи.</div>`);
    const row = el('div', 'row circle-row');
    const dn = el('button', 'btn sm', '−'); dn.disabled = k <= 0; dn.onclick = () => { SE.setCircle(k - 1); rerender(); };
    const up = el('button', 'btn sm', '+'); up.disabled = k >= SE.CIRCLE_MAX; up.onclick = () => { SE.setCircle(k + 1); rerender(); };
    const off = el('button', 'btn sm' + (k ? '' : ' gold'), 'Без круга'); off.onclick = () => { SE.setCircle(0); rerender(); };
    row.append(dn, el('b', 'circle-n', `${k} / ${SE.CIRCLE_MAX}`), up, off); c.appendChild(row); b.appendChild(c); }
  if (HU.huntFloor()) b.appendChild(el('p', 'bad', `⚠ Охота: ${esc(HU.bossOf(HU.current()).name)} — этаж ${HU.huntFloor()}`));
  { const R = SE.weeklyRule(), WS = SE.weeklyState(), f = HU.huntFloor() || SE.weeklyFloor(P.level),   // сборка 47: если охота ждёт на этаже Глубин — испытание на этом же этаже (чудовище там)
    days = 7 - ((Math.floor(Date.now() / 864e5) + 3) % 7);   // испытание недели (сборка 21)
    const c = el('div', 'weekly-card', `<b>⚔ Испытание недели: ${esc(R.name)}</b><div>${esc(R.txt)}</div><div class="muted">Этаж ${f} обычных Глубин${HU.huntFloor() ? ' — там же чудовище охоты' : ''} · ${WS.done ? `ваш рекорд ${Math.floor(WS.best / 60)}:${String(Math.floor(WS.best % 60)).padStart(2, '0')} · улучшайте время` : 'первая победа недели — вещь (синяя/золотая) и двойная награда'} · до смены ${days} дн.</div><div class="lb muted"></div>`);
    const go = el('button', 'btn gold', WS.done ? 'Ещё раз (на время)' : 'Принять вызов'); go.onclick = () => { closeModal(); loadZone('depths', { floor: f, weekly: true }); }; c.appendChild(go); b.appendChild(c);
    platform.p.getLeaderboard && platform.p.getLeaderboard('weeklyDepths').then(L => { const d = c.querySelector('.lb'); if (d && L && L.length) d.innerHTML = 'Лучшие недели: ' + L.slice(0, 5).map(e => `${e.rank}. ${esc(e.name)} ${Math.floor(e.score / 60000)}:${String(Math.floor(e.score / 1000) % 60).padStart(2, '0')}`).join(' · '); }); }
  if ((P.depths.best || 0) >= 2) {   // сборка 49: модификатор этажа — риск по желанию игрока, награда растёт вместе с ним
    const cur = FLOOR_MODS[P.depthsMod] ? P.depthsMod : '';
    const c = el('div', 'weekly-card mod-card', `<b>☠ Модификатор этажа</b><div class="muted">${cur ? `${esc(FLOOR_MODS[cur].txt)} — ${modReward(FLOOR_MODS[cur])}` : 'Сложнее — богаче. Действует на все этажи, кроме испытания недели.'}</div>`);
    const row = el('div', 'row mod-row');
    const off = el('button', 'btn sm' + (cur ? '' : ' gold'), 'Без'); off.onclick = () => { P.depthsMod = ''; rerender(); }; row.appendChild(off);
    for (const id of FLOOR_MOD_IDS) { const M = FLOOR_MODS[id], bt = el('button', 'btn sm' + (cur === id ? ' gold' : ''), `${M.glyph} ${esc(M.name)}`); bt.title = M.txt; bt.onclick = () => { P.depthsMod = id; rerender(); }; row.appendChild(bt); }
    c.appendChild(row); b.appendChild(c);
  }
  const next = P.depths.best + 1;
  const go = el('button', 'btn gold', `▶ Этаж ${next}${isBossFloor(next) ? ' · страж' : ''}${HU.huntFloor() === next ? ' · ⚠ охота' : ''} (ур. врагов ${floorLevel(next)})`);
  go.style.width = '100%'; go.disabled = P.level < floorLevel(next) - 1; if (go.disabled) go.textContent = `Этаж ${next}: нужен уровень ${floorLevel(next) - 1}`; go.onclick = () => enter(next);
  b.appendChild(go);
  if (P.depths.best) {
    b.appendChild(el('h3', '', 'Пройденные этажи'));
    const grid = el('div', 'row');
    for (let f = Math.max(1, P.depths.best - 11); f <= P.depths.best; f++) {
      const s = P.depths.stars[f] || 0; const bt = el('button', 'btn sm' + (HU.huntFloor() === f ? ' gold' : ''), `${HU.huntFloor() === f ? '⚠' : ''}${f}${isBossFloor(f) ? '♛' : ''} ${'★'.repeat(s)}${'☆'.repeat(3 - s)}`);
      bt.onclick = () => enter(f); grid.appendChild(bt);
    }
    b.appendChild(grid);
  }
}, { });

// ---------------------------------------------------------------- Походы: Фьорды Скъёльда / Старый Лес
W.wild = realm => modal(REALMS[realm].name, 'sm', b => {
  const RL = REALMS[realm], WS = wildState(realm), P = G.profile, next = Math.max(1, WS.depth || 1);
  b.appendChild(el('div', 'q cur', `<div class="qt">${esc(nextGoal(realm))}</div>`));
  b.appendChild(el('p', 'muted', RL.blurb));
  b.appendChild(el('p', 'muted', `Пять разных открытых локаций подряд: в конце каждой — портал «Вглубь», следующая локация требует уровня. Шестая — ${RL.fortName.toLowerCase()}: перебейте зверей вокруг, чтобы открылись ворота, и отбейте форт. Глубже — снова поля, каждый второй форт — босс. Дальше всего вы дошли до глубины <b class="goldc">${WS.depth || 0}</b>.`));
  const enter = d => { closeModal(); loadZone('wild', { realm, depth: d }); };
  const need = wildReqLevel(realm, next);
  const go = el('button', 'btn gold', `▶ ${locationName(realm, next)} · глубина ${next}${isWildBoss(next) ? ' · босс' : ''} (ур. врагов ${wildLevel(realm, next)})`);
  go.style.width = '100%'; if (P.level < need) { go.disabled = true; go.textContent = `Глубина ${next}: нужен уровень ${need}`; } go.onclick = () => enter(next); b.appendChild(go);
  if ((WS.depth || 0) > 1) {
    b.appendChild(el('h3', '', 'Пройденные локации')); const grid = el('div', 'row');
    for (let d = Math.max(1, (WS.depth || 1) - 11); d < WS.depth; d++) { const bt = el('button', 'btn sm', `${d}${isWildFort(d) ? (isWildBoss(d) ? '♛' : '⚑') : ''}`); bt.title = locationName(realm, d); bt.onclick = () => enter(d); grid.appendChild(bt); }
    b.appendChild(grid);
  }
  const NS = nemState(), foes = NS.list.filter(n => n.alive && n.realm === realm && (n.rank > 0 || n.defeats || n.fled)), tro = NS.trophies.filter(t => t.realm === realm);
  if (foes.length || tro.length) {
    b.appendChild(el('h3', '', 'Охота: личные враги'));
    for (const n of foes) b.appendChild(el('div', 'q cur', `<div class="qt">☠ ${esc(displayName(n))} · ранг ${n.rank}</div><div class="muted">Силён: ${n.traits.map(t => TRAITS[t].name + ' (' + TRAITS[t].txt + ')').join('; ')}</div><div class="muted">Хранит добычу: ${n.stash} зол.</div>`));
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

function starsStr(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }
W.wildResult = r => {
  if (G.zoneId !== 'wild' || !G.wild) return;
  const RL = REALMS[r.realm], mm = Math.floor(r.time / 60), ss = String(r.time % 60).padStart(2, '0');
  modal(r.boss ? `${r.name} повержен!` : `${RL.fortName} отбит!`, 'sm reward', b => {
    b.appendChild(el('div', 'rw-head', `<div class="rw-rays r${r.stars}"></div><div class="rw-t">Глубина ${r.depth}</div><div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.35}s">★</span>`).join('')}</div>`));
    const row = (ok, t) => `<div>${ok ? '✔' : '○'} ${t}</div>`;
    b.appendChild(el('div', 'stats', `${row(true, 'Форт отбит')}${row(r.chOpen >= r.chTotal, `Все сундуки: ${r.chOpen}/${r.chTotal}`)}${row(r.time <= r.par, `Быстро: ${mm}:${ss} (цель ${Math.floor(r.par / 60)}:${String(r.par % 60).padStart(2, '0')})`)}`));
    if (r.bonus) b.appendChild(el('div', 'rw-loot', `<span class="goldc">+${r.bonus} зол. за новые звёзды</span>`));
    if (r.nem) b.appendChild(el('p', '', `☠ ${esc(r.nem.name)} повержен — трофей навсегда добавил урон и золото.`));
    b.appendChild(el('p', 'muted', '🎒 Ноша теперь ваша, и золото идёт прямо в кошелёк. Можно собрать оставшиеся сундуки или идти дальше. Чем глубже — тем сильнее враги и лучше добыча.'));
    const rw = el('div', 'row'); rw.style.justifyContent = 'center';
    const nx = el('button', 'btn gold', `Вглубь ▶ (глубина ${r.depth + 1})`); nx.onclick = () => { closeModal(); loadZone('wild', { realm: r.realm, depth: r.depth + 1 }); };
    const stay = el('button', 'btn', 'Остаться в поле'); stay.onclick = closeModal;
    const home = el('button', 'btn', 'Домой'); home.onclick = () => { closeModal(); loadZone('town', { from: 'wild', realm: r.realm }); };
    rw.append(nx, stay, home); b.appendChild(rw);
  }, { sticky: true });
};
function floorResult(r) {
  setTimeout(() => {
    const m = modal(r.weekly ? 'Испытание недели пройдено!' : r.first ? 'Новый рекорд глубины!' : 'Этаж пройден', 'sm reward', b => {
      b.appendChild(el('div', 'rw-head', `<div class="rw-rays r${r.stars >= 3 ? 3 : r.stars >= 2 ? 2 : 1}"></div><div class="rw-t">${r.weekly ? 'Испытание недели' : 'Этаж ' + r.floor}</div><div class="stars"${r.weekly ? ' style="display:none"' : ''}>${[0, 1, 2].map(i => `<span class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.35}s">★</span>`).join('')}</div>`));
      const mm = Math.floor(r.time / 60), ss = String(Math.floor(r.time % 60)).padStart(2, '0');
      b.appendChild(el('div', 'stats', `<div><span>Время</span><b>${mm}:${ss}</b></div><div><span>Враги</span><b>${r.kills}/${r.total}</b></div><div><span>Собрано золота</span><b>${r.runGold}</b></div>`));
      b.appendChild(el('div', 'rw-loot', `<span class="goldc">+${r.gold} золота</span> · <span style="color:#b8e3ff">+${r.xp} опыта</span>${r.first ? ' · <span style="color:#ff9a9a">+1 зелье</span>' : ''}`));
      if (r.weekly) b.appendChild(el('p', 'goldc', `${esc(r.weekly)}${r.weeklyFirst ? ' · первая победа недели: вещь в сумке/надета' : ''}${r.weeklyRec ? ' · новый личный рекорд!' : ''}`));
      const row = el('div', 'row'); row.style.justifyContent = 'center';
      const ad = el('button', 'btn ad', `×2 золото (+${r.gold})`);
      ad.onclick = () => watchRewarded('floor_x2', offerToken('floor_x2', r.token), () => { G.profile.gold += r.gold; bus.emit('toast', { text: `+${r.gold} золота`, kind: 'good' }); }).then(ok => { if (ok) { ad.disabled = true; ad.textContent = '✔ Удвоено'; } });
      const nx = el('button', 'btn gold', `Этаж ${r.floor + (r.first ? 1 : 0) + (r.first ? 0 : 1)} ▶`);
      const next = Math.max(r.floor + 1, 1);
      nx.textContent = `Этаж ${next} ▶`;
      nx.onclick = async () => { const keepBoons = true; if (G.profile.level < floorLevel(next) - 1) { bus.emit('toast', { text: `Этаж ${next} — с ${floorLevel(next) - 1} уровня`, sub: 'Фармите опыт на пройденных этажах', kind: 'warn' }); return; } const free = next > (G.profile.depths.best || 0); if (!free && !CS.spendTorch()) { bus.emit('toast', { text: 'Нет энергии ⚡', sub: '+1 за 20 минут или «Получить энергию»', kind: 'warn' }); bus.emit('openEnergy'); return; } closeModal(); await maybeInterstitial('floor'); loadZone('depths', { floor: next, keepBoons, free, fullHeal: r.boss }); };   // сборка 49: после босса — передышка, следующий этаж с полным здоровьем
      const home = el('button', 'btn', 'В деревню');
      home.onclick = async () => { closeModal(); await maybeInterstitial('floor'); loadZone('town', { from: 'depths' }); };
      if (r.weekly) { nx.textContent = 'Ещё раз ▶'; nx.onclick = () => { closeModal(); loadZone('depths', { floor: r.floor, weekly: true }); }; }   // испытание недели: повтор на время, а не следующий этаж
      row.append(ad, nx, home); b.appendChild(row);
      if (r.boss && !r.weekly) b.appendChild(el('p', 'goldc', 'Передышка после босса: следующий этаж — с полным здоровьем и маной.'));
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
    { const t = CS.torches(), ds = dailyStatus(), wait = [];   // сборка 47: что ещё накопилось, пока игрока не было
      wait.push(`⚡ Энергия: ${t.n} из ${CS.TORCH_MAX}${t.n >= CS.TORCH_MAX ? ' — полная' : ''}`);
      if (ds.claimable && !earlyLock('extra')) wait.push(`🎁 Награда дня ${ds.day} в календаре`);
      try { if (wheelReady() && !earlyLock('extra')) wait.push('🎡 Колесо у Хозяйки Колеса крутится бесплатно'); } catch { }
      if (ds.claimable) wait.push('📜 Новые задания дня — у доски на площади');
      b.appendChild(el('div', 'rw-wait', '<b>Ещё ждёт:</b><br>' + wait.join('<br>'))); }
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
    b.appendChild(el('p', 'muted', 'Дар за просмотр рекламы или за кровь — действует до конца этажа. Можно идти дальше без дара.'));   // сборка 47: дары за рекламу; сборка 49: или за 30% здоровья
    const row = el('div', 'boons'), pl = G.player, BLOOD = 0.3;
    let blood = false; const tags = [];
    for (const id of pool) {
      const B = BOONS[id];
      const c = el('button', 'boon' + (B.minus ? ' cursed' : ''), `<div class="bg" style="color:${B.color};text-shadow:0 0 18px ${B.color}">${B.glyph}</div><b>${esc(B.name)}</b><span>${esc(B.desc)}${B.minus ? `<em class="minus">${esc(B.minus)}</em>` : ''}</span><small class="lv">▶ за рекламу</small>`);
      tags.push(c.querySelector('.lv'));
      const give = () => { r.boons.push(id); G.stats = calcStats(G.profile); bus.emit('statsChanged'); bus.emit('toast', { text: 'Дар: ' + B.name, kind: 'good' }); bus.emit('sfx', 'learn'); closeModal(); };
      c.onclick = async () => {
        if (blood) { pl.hp = Math.max(1, pl.hp - G.stats.maxHP * BLOOD); particles(pl.x, pl.y, 18, { c: [200, 30, 40], z: 1, sp: 2, size: 3 }); bus.emit('sfx', 'hurt'); give(); bus.emit('hud'); return; }   // здоровье как валюта
        if (G.auto) { give(); return; } await watchRewarded('boon', offerToken('boon', id + ':' + Date.now()), give);
      };
      row.appendChild(c);
    }
    b.appendChild(row);
    const can = pl.hp > G.stats.maxHP * (BLOOD + 0.05);
    const bl = el('button', 'btn blood', can ? '🩸 Заплатить кровью (−30% здоровья)' : '🩸 Мало здоровья для платы кровью');
    bl.disabled = !can;
    bl.onclick = () => { blood = !blood; bl.classList.toggle('on', blood); for (const t of tags) t.textContent = blood ? '🩸 за 30% здоровья' : '▶ за рекламу'; bl.textContent = blood ? '▶ Лучше за рекламу' : '🩸 Заплатить кровью (−30% здоровья)'; };
    b.appendChild(bl);
    const skip = el('button', 'btn', 'Без дара'); skip.onclick = () => closeModal(); b.appendChild(skip);
  }, { sticky: true });
  cur.bg.querySelector('.mx').style.display = 'none';
  if (G.auto) setTimeout(() => { const bs = document.querySelectorAll('.boons .boon'); if (bs.length) bs[Math.floor(Math.random() * bs.length)].click(); }, 2500);
}

// ---------------------------------------------------------------- «Жатва Бездны»
const mmssT = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
W.survival = () => modal('Жатва Бездны', 'md', b => {
  const P = G.profile; P.surv = P.surv || { best: 0, ach: {}, runs: 0 };
  b.appendChild(el('p', '', 'Бескрайняя арена Бездны и бесконечные волны. <b>Нужно только бегать</b> — герой атакует сам. Собирайте кристаллы душ, растите в уровне, выбирайте перки и пробуждайте оружие. Цель — продержаться 20 минут. Враги крепнут каждую минуту. <b>Каждый уровень забега даёт герою 2,5% опыта уровня</b> (до 75% за забег).'));
  const row = el('div', 'row'); row.style.cssText = 'justify-content:center;margin:10px 0'; const intro = !(P.story.flags && P.story.flags.bossKilled);
  const go = el('button', 'btn gold', intro ? '▶ Знакомство · 3 минуты' : `▶ В бой · ${SV.RUN_COST} ⚡`); go.style.width = '100%'; go.onclick = () => { if (!intro && !CS.spendEnergy(SV.RUN_COST)) { bus.emit('toast', { text: `Нужно ${SV.RUN_COST} ⚡ энергии`, kind: 'warn' }); bus.emit('openEnergy', rerender); return; } closeModal(); loadZone('survival'); }; row.appendChild(go); b.appendChild(row);   // кнопка вверху: не нужно листать список
  b.appendChild(el('div', 'stats', `<div><span>Рекорд</span><b>${mmssT(P.surv.best)}</b></div><div><span>Забегов</span><b>${P.surv.runs}</b></div>`));
  b.appendChild(el('h3', '', 'Достижения'));
  for (const a of SV.ACH) b.appendChild(el('div', 'q' + (P.surv.ach[a.id] ? ' done' : ''), `<div class="qt">${P.surv.ach[a.id] ? '🏆 ' : '○ '}${esc(a.name)}</div><div class="muted">+${a.gold} зол. · +${a.shards}◆</div>`));
  b.appendChild(el('h3', '', 'Пробуждения оружия'));
  b.appendChild(el('div', 'muted', SV.EVOS.map(e => `<b>${esc(e.name)}</b>: ${esc(SV.PERKS[e.from].name)} 5 ур. + ${esc(SV.PERKS[e.need].name)}`).join('<br>')));
});
function survLevel() {
  const S = G.surv; if (!S || S.over) return;
  if (cur) { setTimeout(survLevel, 500); return; }
  let cs = SV.choices(), extra = false; bus.emit('sfx', 'levelup');
  modal(`Уровень ${S.lvl}!`, 'md reward', b => {
    b.appendChild(el('p', 'muted', 'Выберите усиление:'));
    { const rr = el('button', 'btn ad sm', '↻ Перемешать за рекламу'); rr.onclick = async () => { const ok = await watchRewarded('surv_reroll', offerToken('surv_reroll', String(Date.now())), () => { S.rerolls++; }); if (ok) { cs = SV.choices(); rerender(); } }; b.appendChild(rr); }   // сборка 47
    const row = el('div', 'boons b4');   // сборка 47: карточки мельче, 4 в ряд; 3 бесплатно, 4-я случайная — за рекламу
    cs.forEach((c, i) => {
      if (i === 3 && !extra) {
        const lock = earlyLock('extra'), card = el('button', 'boon locked', `<div class="bg">?</div><b>Ещё вариант</b><small class="lv">${lock ? 'после обучения' : '▶ за рекламу'}</small><span>Случайное усиление</span>`);
        card.disabled = lock;
        card.onclick = async () => { const ok = await watchRewarded('surv_extra', offerToken('surv_extra', String(Date.now())), () => {}); if (ok) { extra = true; rerender(); } };
        row.appendChild(card); return;
      }
      const title = c.evo ? '⚡ ' + c.evo.name : c.gold ? 'Золото' : c.P.name, desc = c.evo ? c.evo.desc : c.gold ? '+50 золота' : c.P.desc(c.lvl), lv = c.evo ? 'ПРОБУЖДЕНИЕ' : c.gold ? '' : c.lvl ? `ур. ${c.lvl} → ${c.lvl + 1}` : 'новое';
      const card = el('button', 'boon' + (c.evo ? ' evo' : ''), `<div class="bg">${c.evo ? '✹' : c.gold ? '⛁' : (c.P.icon || '⚔')}</div><b>${esc(title)}</b><small class="lv">${lv}</small><span>${esc(desc)}</span>`);
      card.onclick = () => { SV.take(c); closeModal(); };
      row.appendChild(card);
    });
    b.appendChild(row);
  }, { sticky: true });
  cur.bg.querySelector('.mx').style.display = 'none';
}
function survEnd(r) {
  setTimeout(() => modal(r.win ? 'Вы выжили!' : 'Жатва окончена', 'sm reward', b => {
    b.appendChild(el('div', 'rw-head', `<div class="rw-rays r${r.win ? 3 : 1}"></div><div class="rw-t">${mmssT(r.t)}${r.record ? ' · рекорд!' : ''}</div>`));
    b.appendChild(el('div', 'stats', `<div><span>Убито</span><b>${r.kills}</b></div><div><span>Уровень забега</span><b>${r.lvl}</b></div>`));
    b.appendChild(el('div', 'rw-loot', `<span class="goldc">+${r.gold} золота</span>${r.heroXP ? ` · <span style="color:#b8e3ff">+${r.heroXP} опыта герою</span>` : ''}${r.shards ? ` · <span class="c-shard">+${r.shards}◆</span>` : ''}`));
    if (r.intro) b.appendChild(el('p', 'goldc', 'Староста Эдрик: «Больше портал не удержать — сил не хватает. Наберите золота, загляните к наставнику Элвину за усилением. Жатва откроется снова, когда падёт Палач Бездны».'));
    if (r.newAch.length) b.appendChild(el('p', 'goldc', '🏆 ' + r.newAch.map(esc).join(' · ')));
    const row = el('div', 'row'); row.style.justifyContent = 'center';
    const again = el('button', 'btn gold', `Ещё раз · ${SV.RUN_COST} ⚡`); again.onclick = () => { if (!CS.spendEnergy(SV.RUN_COST)) { bus.emit('toast', { text: `Нужно ${SV.RUN_COST} ⚡ энергии`, kind: 'warn' }); bus.emit('openEnergy'); return; } closeModal(); loadZone('survival'); };
    const home = el('button', 'btn', 'В деревню'); home.onclick = () => { closeModal(); loadZone('town', { from: 'survival' }); };
    if (!r.intro) row.append(again); row.append(home); b.appendChild(row);
  }, { sticky: true }), 700);
}

// ---------------------------------------------------------------- lore intros (first visit)
const LORE = {
  depths: ['Глубины катакомб', 'Под катакомбами Ордена нет дна. Каждый пятый этаж охраняет страж, а за стражами — всё более древняя тьма: затопленные склепы, пепельные шахты и, говорят, само Сердце Бездны. Дары Бездны помогут — но только пока вы не повернёте назад.'],
  survival: ['Жатва Бездны', 'Раз в поколение Бездна распахивается, и мёртвые идут бесконечной рекой. Орден посылает на арену лишь одного — чтобы выстоял до рассвета. Не останавливайтесь: собирайте кристаллы душ, и оружие само запоёт в ваших руках.'],
  castle: ['Цитадель Ордена', 'Когда-то здесь жили магистры Ордена. Теперь это ваш дом. Откройте залы: алтарь будет копить золото, пока вы спите, а в Зале испытаний стражи прошлого проверят вашу силу.'],
};
bus.on('zoneEntered', id => { const P = G.profile; P.lore = P.lore || {}; const L = LORE[id]; if (!L || P.lore[id] || (id === 'depths' && !(G.run && G.run.floor > 0))) return; P.lore[id] = 1; bus.emit('save');
  const show = () => { if (cur) { setTimeout(show, 800); return; } modal(L[0], 'sm reward', b => { b.appendChild(el('p', 'lore', esc(L[1]))); const r = el('div', 'row'); r.style.justifyContent = 'center'; const ok = el('button', 'btn gold', 'Вперёд'); ok.onclick = closeModal; r.appendChild(ok); b.appendChild(r); }); cur.bg.classList.add('rw-bg'); }; setTimeout(show, 600); });

// ---------------------------------------------------------------- main menu: big labelled tiles instead of a row of tiny icons
W.menu = () => modal('Меню', 'md', b => {
  const tiles = [
    ['inventory', '🎒', 'Герой', 'снаряжение и сумка', 'dotInv'], ['character', '🛡', 'Персонаж', 'характеристики', 'dotChar'], ['skills', '✦', 'Навыки', 'умения и кнопки', 'dotSkill'],
    ['journal', '📜', 'Задания', 'сюжет и ежедневные'], ['map', '🗺', 'Карта', 'текущая локация'],
    ['herospath', '⚔', 'Летопись битв', 'автобои', 'dotHW'], ['shrine', '🎁', 'Источник силы', 'дары, сила источника', 'dotGift'], ['season', '🏆', 'Путь сезона', SE.seasonName() + ' · 30 ступеней', 'dotSeason'], ['codex', '📖', 'Коллекция', '+0,5% за каждую находку'],
    ['help', '❓', 'Справка', 'подсказки и обучение'], ['settings', '⚙', 'Настройки', 'звук, графика'],
  ];
  const g = el('div', 'menu-grid');
  for (const [id, ic, name, sub, badge] of tiles) {
    const locked = TOWN_ONLY[id] && G.zoneId !== 'town';
    const n = badge ? BADGES[badge] || 0 : 0;
    const t = el('button', 'menu-tile' + (locked ? ' locked' : ''), `<span class="mt-ic">${ic}</span><b>${name}</b><small>${locked ? 'в деревне' : sub}</small>${n ? `<span class="mt-dot">${n}</span>` : ''}`);
    t.onclick = () => { closeModal(); openWindow(id); };
    g.appendChild(t);
  }
  b.appendChild(g);
});
