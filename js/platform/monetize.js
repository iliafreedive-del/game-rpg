// Monetization & retention: rewarded offers (never in combat), IAP grants with de-duplication,
// interstitial pacing, daily login streak and the "ripening chest" timer.
import { G, bus, inCombat } from '../game/ctx.js';
import { platform, PRODUCTS, gameplay } from './platform.js';
import { makeItem, makeSetItem, pickSet, itemPower, applyKindPerk, MAX_UPG } from '../game/items.js';
import { stats } from '../game/stats.js';
import { autoEquip } from '../game/character.js';
import { uid } from '../core/util.js';
import { pickEpic } from '../game/loot.js';
import { earlyLock, lockToast } from '../game/progress.js';
import { SETS } from '../data/sets.js';
import * as CS from '../game/castle.js';
import { track } from './analytics.js';

const MIN = 60 * 1000;
export const OFFERS = {
  bless: { title: 'Сила источника: +25% золота и опыта на 10 минут', icon: '✦' },
  xp_boost: { title: '+50% опыта на 15 минут', icon: '✦' },
  gold_boost: { title: '+50% золота на 15 минут', icon: '⛁' },
  revive: { title: 'Воскреснуть на месте', icon: '✚' },
  boss_extra: { title: 'Дополнительная добыча с босса', icon: '❖' },
  shop_refresh: { title: 'Бесплатно обновить товары', icon: '↻' },
  chest_skip: { title: 'Открыть сундук Ордена сейчас', icon: '⧗' },
  daily_double: { title: 'Ежедневная награда ×1,5', icon: '×1,5' },
  auto: { title: 'Автобой на 30 минут', icon: '▶' },
};
let busy = false;
// token-based single grant: each offer instance gets a token; the reward is applied at most once per token.
export function offerToken(kind, scope = '') { return `${kind}:${scope || uid('o')}`; }
export async function watchRewarded(kind, token, apply) {
  const P = G.profile;
  if (busy) return false;
  if (kind !== 'revive' && earlyLock('extra')) { lockToast('extra'); return false; }   // сборка 47: награды за рекламу — после обучения
  if (P.ads.used[token]) { bus.emit('toast', { text: 'Эта награда уже получена', kind: 'warn' }); return false; }
  // в открытом окне на паузе (Летопись битв и т. п.) время мира стоит — «недавний бой» там не считается
  const wasPaused = G.paused, frozen = wasPaused && G.modalOpen;
  if (!frozen && inCombat() && kind !== 'revive' && kind !== 'boss_extra') { bus.emit('toast', { text: 'Реклама недоступна во время боя', kind: 'warn' }); return false; }
  busy = true; G.paused = true; bus.emit('audioPause', true); gameplay(false);
  let ok = false;
  try { ok = await platform.p.showRewarded(); } catch { ok = false; }
  track('ad_rewarded', { kind, ok: ok ? 1 : 0 });
  busy = false; G.paused = wasPaused; bus.emit('audioPause', false);   // окно на паузе остаётся на паузе; GameplayAPI.start — из main.js, когда игра снова идёт
  if (!ok) { bus.emit('toast', { text: 'Награда не получена: видео не досмотрено', kind: 'warn' }); return false; }
  if (P.ads.used[token]) return false;  // double-callback guard
  P.ads.used[token] = Date.now(); pruneTokens();
  apply(); bus.emit('save'); bus.emit('hud'); return true;
}
function pruneTokens() { const u = G.profile.ads.used; const ks = Object.keys(u); if (ks.length > 300) ks.sort((a, b) => u[a] - u[b]).slice(0, ks.length - 300).forEach(k => delete u[k]); }

export const offers = {
  xpBoost() { return watchRewarded('xp_boost', offerToken('xp_boost', 'w' + Math.floor(Date.now() / (15 * MIN))), () => { const P = G.profile; P.boosts.xpUntil = Math.max(Date.now(), P.boosts.xpUntil) + 15 * MIN; bus.emit('toast', { text: 'Сила опыта', sub: '+50% опыта на 15 минут', kind: 'good' }); }); },
  goldBoost() { return watchRewarded('gold_boost', offerToken('gold_boost', 'w' + Math.floor(Date.now() / (15 * MIN))), () => { const P = G.profile; P.boosts.goldUntil = Math.max(Date.now(), P.boosts.goldUntil) + 15 * MIN; bus.emit('toast', { text: 'Сила золота', sub: '+50% золота на 15 минут', kind: 'good' }); }); },
  bossExtra(killId, x, y) { return watchRewarded('boss_extra', offerToken('boss_extra', killId), () => { const r = autoEquip(makeItem({ slot: 'weapon', cls: G.profile.cls, ilvl: G.profile.level + 1, rarity: 2 })); bus.emit('toast', { text: r.equipped ? 'Новое оружие надето: ' + r.item.name : 'Бонус: +' + r.sold + ' зол.', kind: 'good' }); }); },
  shopRefresh(onDone) { return watchRewarded('shop_refresh', offerToken('shop_refresh', 'lv' + G.profile.level + '_' + Math.floor(Date.now() / (30 * MIN))), onDone); },
};

// ---- автобой за рекламу (сборка 47): один ролик — 30 минут. Бесплатно в обучении и с покупкой «Без рекламы»
export const AUTO_MIN = 30;
export const autoFree = () => !!(G.profile.iap && G.profile.iap.noAds) || earlyLock('extra');
export const autoLeft = () => Math.max(0, ((G.profile.boosts && G.profile.boosts.autoUntil) || 0) - Date.now());
export const autoOK = () => autoFree() || autoLeft() > 0;
export function autoAd() { return watchRewarded('auto', offerToken('auto', String(Date.now())), () => { const B = G.profile.boosts; B.autoUntil = Math.max(Date.now(), B.autoUntil || 0) + AUTO_MIN * MIN; }); }

// ---- interstitial pacing (only at safe transitions, never in/near combat, disabled by purchase)
let lastInter = Date.now();
export async function maybeInterstitial(reason) {
  const P = G.profile;
  if (P.iap.noAds || platform.name === 'demo' && !P.settings.demoInter) return false;
  // сборка 54: частота меняется флагами в консоли Яндекса без новой версии: inter_gap_min (минут между показами), inter_first_sec (не раньше, сек игры)
  const F = platform.flags || {}, gap = +F.inter_gap_min > 0 ? +F.inter_gap_min : 4, first = +F.inter_first_sec >= 0 && F.inter_first_sec != null ? +F.inter_first_sec : 180;
  if (Date.now() - lastInter < gap * MIN || P.stats.playTime < first) return false;
  lastInter = Date.now(); G.paused = true; bus.emit('audioPause', true); gameplay(false);
  try { await platform.p.showInterstitial(); } catch { }
  track('ad_inter', { reason: reason || '' });
  G.paused = false; bus.emit('audioPause', false); return true;
}

// ---- IAP
export async function buy(productId) {
  const P = G.profile, def = PRODUCTS[productId];
  if (earlyLock('extra')) { lockToast('extra'); return false; }   // сборка 47: покупки — после обучения
  if (def.once && P.iap.tx['once_' + productId]) { bus.emit('toast', { text: 'Этот набор уже куплен', kind: 'warn' }); return false; }
  if (!def.consumable && P.iap[flagOf(productId)]) { bus.emit('toast', { text: 'Уже куплено', kind: 'warn' }); return false; }
  G.paused = true; gameplay(false); const r = await platform.p.purchase(productId); G.paused = false;
  track(r.ok ? 'buy_ok' : 'buy_cancel', { id: productId });
  if (!r.ok) return false;
  return grantPurchase(productId, r.token);
}
// Лестница снаряжения: платная вещь на одну редкость выше того, что игрок добывает сам, уровня «герой + 3».
// Через 2–3 вечера враги дорастают, и вещь становится обычной — её можно закалять и сливать дальше.
function grantGear(def) {
  const P = G.profile, cls = P.cls || 'warrior', ilvl = P.level + 3, g = def.gear, out = [];
  // сборка 47: купленная вещь всегда заметно лучше надетой (жалоба: набор за 99 ₽ слабее своих зелёных) — редкость не ниже надетой +1, закалка до +20% силы
  const fix = it => { delete it.req; it.ilvl = ilvl; const cur = P.gear[it.slot];
    if (cur) { it.rarity = Math.max(it.rarity, Math.min(4, cur.rarity + 1)); applyKindPerk(it); let k = 0; while (itemPower(it) < itemPower(cur) * 1.2 && k++ < MAX_UPG) it.upg = (it.upg || 0) + 1; }
    return it; };
  if (g.kind === 'set') {
    const setId = Object.keys(SETS).filter(k => SETS[k].branch && SETS[k].cls.includes(cls))[0] || pickSet(cls);
    for (const slot of ['head', 'chest', 'amulet']) { const it = makeSetItem(setId, slot, ilvl, cls); it.rarity = g.rarity; out.push(autoEquip(fix(it), true)); }
  } else if (g.kind === 'epic' || g.kind === 'mythic') {
    const it = makeItem({ epic: pickEpic(cls), ilvl, cls, noClamp: true });
    if (g.kind === 'mythic') it.rarity = 4;
    out.push(autoEquip(fix(it), true));
  }
  return out;
}
export const flagOf = id => ({ gold_perk: 'goldPerk', no_ads: 'noAds', bag_big: 'bagBig' }[id] || id);
export async function grantPurchase(productId, token) {
  const P = G.profile;
  if (P.iap.tx[token]) { await platform.p.consume(token); return false; }   // already granted — just finish the transaction
  P.iap.tx[token] = Date.now();
  switch (productId) {
    case 'starter_pack': P.gold += 1000; P.potions.hp += 10; P.potions.mp += 5; { const it = makeItem({ ilvl: Math.max(3, P.level), rarity: 2, slot: 'weapon', cls: P.cls }); delete it.req; autoEquip(it); } P.iap.tx['once_starter_pack'] = 1; break;
    case 'gold_small': P.gold += 600; break;
    case 'guard_armor': case 'seal_blade': case 'magister_plate': case 'order_weapon': case 'abyss_set': {
      const items = grantGear(PRODUCTS[productId]); P.iap.tx['once_' + productId] = 1;
      bus.emit('reward', { title: PRODUCTS[productId].title, sub: 'Покупка получена', gold: 0, xp: 0, potions: 0, scrolls: 0, skillPts: 0, items });
      break; }
    case 'season_pass': P.seasonPass = P.seasonPass || {}; P.seasonPass[new Date().getFullYear() + '-' + (new Date().getMonth() + 1)] = 1; break;
    case 'energy_pack': { const t = CS.torches(); t.n += 50; break; }   // сборка 47: можно сверх запаса
    case 'potion_pack': P.potions.hp += 15; P.potions.mp += 10; break;
    case 'gold_perk': P.iap.goldPerk = true; break;
    case 'no_ads': P.iap.noAds = true; break;
    case 'bag_big': if (!P.iap.bagBig) { P.iap.bagBig = true; P.bagSize += 20; } break;   // повторное восстановление покупки не добавит мест
  }
  bus.emit('save');   // persist grant BEFORE consuming, so a crash cannot lose it
  if (PRODUCTS[productId].consumable) await platform.p.consume(token);
  G.stats = stats(P); bus.emit('hud'); bus.emit('toast', { text: 'Покупка получена', sub: PRODUCTS[productId].title, kind: 'good' }); bus.emit('sfx', 'quest');
  return true;
}
export async function restorePurchases() {
  const list = await platform.p.getPurchases();
  for (const p of list) await grantPurchase(p.productId, p.token);
}

// ---- retention: календарь входа у алтаря богини (сборка 19) + сундук Ордена
// 28 дней по кругу; пропуск дня НЕ сбрасывает прогресс (следующий вход = следующий день календаря).
// Каждый 3-й день награда больше (свиток, зелья), 7/14/21/28 — крупная (вещь). Видно, что будет через 1–3 дня.
export const LOGIN_DAYS = 28;
export function loginReward(d) {   // d — день календаря 1..28
  if (d % 7 === 0) return { big: true, gold: 120, potions: 3, scrolls: 1, item: d >= 21 ? 3 : 2, label: d >= 21 ? 'Золотая вещь' : 'Синяя вещь' };
  if (d % 3 === 0) return { mid: true, gold: 70, potions: 3, scrolls: 1, label: 'Свиток и зелья' };
  return { gold: 35, potions: d % 2 ? 1 : 0, label: 'Золото' };
}
export const DAILY = Array.from({ length: LOGIN_DAYS }, (_, i) => loginReward(i + 1));
const dayKey = t => { const d = new Date(t); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
export function dailyStatus() {
  const P = G.profile; P.daily = P.daily || { last: 0, streak: 0 };
  const today = dayKey(Date.now()), claimable = P.daily.last !== today, n = P.daily.streak;   // streak — сколько дней календаря уже получено (всего)
  const day = claimable ? n % LOGIN_DAYS + 1 : (n - 1) % LOGIN_DAYS + 1;   // текущий день календаря
  return { claimable, streak: n, day, reward: loginReward(day) };
}
export function claimDaily(double) {
  const P = G.profile; const s = dailyStatus(); if (!s.claimable) return false;
  const r = s.reward, m = double ? 1.5 : 1;   // за рекламу — ×1,5 (сборка 47; было ×2), вещь — одна
  if (r.gold) P.gold += Math.round(r.gold * m * P.level);
  if (r.potions) P.potions.hp += Math.round(r.potions * m);
  if (r.scrolls) P.scrolls += Math.round(r.scrolls * m);
  if (r.item) for (let i = 0; i < 1; i++) { const it = makeItem({ ilvl: P.level, rarity: r.item, cls: P.cls }); delete it.req; autoEquip(it); }
  P.daily.last = dayKey(Date.now()); P.daily.streak = s.streak + 1; bus.emit('loginClaimed');
  bus.emit('toast', { text: `Дар источника — день ${s.day} из ${LOGIN_DAYS}`, sub: r.big ? 'Большая награда!' : r.mid ? 'Награда каждого 3-го дня' : '', kind: 'good' }); bus.emit('sfx', 'quest'); bus.emit('hud'); bus.emit('save'); return true;
}

// ---- благословение богини за рекламу: +25% золота и опыта, +15% к выпадению вещей (сборка 47; было +50% / +25%); 10 минут за просмотр, не больше 30 подряд
export const BLESS_MIN = 10, BLESS_CAP = 30;
// сборка 47: не больше 3 просмотров в день (30 минут), иначе реклама подряд качает героя быстрее игры
export const BLESS_DAY = 3;
export function blessToday() { const P = G.profile, d = dayKey(Date.now()); P.ads.bless = P.ads.bless && P.ads.bless.d === d ? P.ads.bless : { d, n: 0 }; return P.ads.bless.n; }
export const blessLeft = () => Math.max(0, ((G.profile.boosts && G.profile.boosts.blessUntil) || 0) - Date.now());
export const blessed = () => blessLeft() > 0;
export function blessing() {
  if (blessLeft() > (BLESS_CAP - BLESS_MIN) * MIN) { bus.emit('toast', { text: 'Сила источника уже на пределе', sub: `Не больше ${BLESS_CAP} минут подряд`, kind: 'warn' }); return Promise.resolve(false); }
  if (blessToday() >= BLESS_DAY) { bus.emit('toast', { text: 'Источник силы отдыхает до завтра', sub: `Не больше ${BLESS_DAY} раз в день`, kind: 'warn' }); return Promise.resolve(false); }
  return watchRewarded('bless', offerToken('bless'), () => { const P = G.profile; blessToday(); P.ads.bless.n++; P.boosts.blessUntil = Math.max(Date.now(), P.boosts.blessUntil || 0) + BLESS_MIN * MIN; P.boosts.blessWarned = false;
    bus.emit('toast', { text: 'Сила источника!', sub: '+25% золота и опыта, +15% вещей — 10 минут. Вперёд, в бой!', kind: 'good' }); bus.emit('sfx', 'levelup'); });
}
// напоминание за минуту до конца и по окончании (вызывается раз в секунду из hud.js)
export function blessTick() {
  const P = G.profile, B = P.boosts; if (!B || !B.blessUntil) return;
  const left = B.blessUntil - Date.now();
  if (left > 0 && left < 60000 && !B.blessWarned) { B.blessWarned = true; bus.emit('toast', { text: 'Сила источника угасает — минута!', sub: 'Вернитесь к источнику силы на площади, чтобы продлить', kind: 'quest' }); }
  if (left <= 0 && B.blessWarned !== 'done') { B.blessWarned = 'done'; bus.emit('toast', { text: 'Сила источника угасла', sub: 'Источник силы на площади деревни даст новое', kind: 'info' }); bus.emit('save'); }
}
export const CHEST_TIME = 4 * 60 * MIN;
export function chestStatus() { const P = G.profile; P.orderChest = P.orderChest || { readyAt: Date.now() + 20 * MIN }; const left = P.orderChest.readyAt - Date.now(); return { ready: left <= 0, left }; }
export function openOrderChest(viaAd) {
  const P = G.profile; const s = chestStatus();
  if (!s.ready && !viaAd) return false;
  { const it = makeItem({ ilvl: P.level + 1, rarity: Math.random() < 0.25 ? 2 : 1, cls: P.cls }); delete it.req; autoEquip(it); }   // сборка 47: обычно зелёная, синяя — 1 из 4
  P.gold += 40 * P.level; P.orderChest.readyAt = Date.now() + CHEST_TIME;
  bus.emit('toast', { text: 'Сундук Ордена открыт!', sub: 'Вещь (надета, если лучше) + золото', kind: 'good' }); bus.emit('sfx', 'chest'); bus.emit('hud'); bus.emit('save'); return true;
}
export function chestSkip() { const s = chestStatus(); if (s.ready) return openOrderChest(); return watchRewarded('chest_skip', offerToken('chest_skip', String(G.profile.orderChest.readyAt)), () => openOrderChest(true)); }
