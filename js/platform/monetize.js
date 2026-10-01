// Monetization & retention: rewarded offers (never in combat), IAP grants with de-duplication,
// interstitial pacing, daily login streak and the "ripening chest" timer.
import { G, bus, inCombat } from '../game/ctx.js';
import { platform, PRODUCTS } from './platform.js';
import { makeItem } from '../game/items.js';
import { stats } from '../game/stats.js';
import { autoEquip } from '../game/character.js';
import { uid } from '../core/util.js';

const MIN = 60 * 1000;
export const OFFERS = {
  xp_boost: { title: '+50% опыта на 15 минут', icon: '✦' },
  gold_boost: { title: '+50% золота на 15 минут', icon: '⛁' },
  revive: { title: 'Воскреснуть на месте', icon: '✚' },
  boss_extra: { title: 'Дополнительная добыча с босса', icon: '❖' },
  shop_refresh: { title: 'Бесплатно обновить товары', icon: '↻' },
  chest_skip: { title: 'Открыть сундук Ордена сейчас', icon: '⧗' },
  daily_double: { title: 'Удвоить ежедневную награду', icon: '×2' },
};
let busy = false;
// token-based single grant: each offer instance gets a token; the reward is applied at most once per token.
export function offerToken(kind, scope = '') { return `${kind}:${scope || uid('o')}`; }
export async function watchRewarded(kind, token, apply) {
  const P = G.profile;
  if (busy) return false;
  if (P.ads.used[token]) { bus.emit('toast', { text: 'Эта награда уже получена', kind: 'warn' }); return false; }
  if (inCombat() && kind !== 'revive' && kind !== 'boss_extra') { bus.emit('toast', { text: 'Реклама недоступна во время боя', kind: 'warn' }); return false; }
  busy = true; G.paused = true; bus.emit('audioPause', true); platform.p.gameplayStop();
  let ok = false;
  try { ok = await platform.p.showRewarded(); } catch { ok = false; }
  busy = false; G.paused = false; bus.emit('audioPause', false); platform.p.gameplayStart();
  if (!ok) { bus.emit('toast', { text: 'Награда не получена: видео не досмотрено', kind: 'warn' }); return false; }
  if (P.ads.used[token]) return false;  // double-callback guard
  P.ads.used[token] = Date.now(); pruneTokens();
  apply(); bus.emit('save'); bus.emit('hud'); return true;
}
function pruneTokens() { const u = G.profile.ads.used; const ks = Object.keys(u); if (ks.length > 300) ks.sort((a, b) => u[a] - u[b]).slice(0, ks.length - 300).forEach(k => delete u[k]); }

export const offers = {
  xpBoost() { return watchRewarded('xp_boost', offerToken('xp_boost', 'w' + Math.floor(Date.now() / (15 * MIN))), () => { const P = G.profile; P.boosts.xpUntil = Math.max(Date.now(), P.boosts.xpUntil) + 15 * MIN; bus.emit('toast', { text: 'Благословение опыта', sub: '+50% опыта на 15 минут', kind: 'good' }); }); },
  goldBoost() { return watchRewarded('gold_boost', offerToken('gold_boost', 'w' + Math.floor(Date.now() / (15 * MIN))), () => { const P = G.profile; P.boosts.goldUntil = Math.max(Date.now(), P.boosts.goldUntil) + 15 * MIN; bus.emit('toast', { text: 'Благословение золота', sub: '+50% золота на 15 минут', kind: 'good' }); }); },
  bossExtra(killId, x, y) { return watchRewarded('boss_extra', offerToken('boss_extra', killId), () => { const r = autoEquip(makeItem({ slot: 'weapon', cls: G.profile.cls, ilvl: G.profile.level + 1, rarity: 2 })); bus.emit('toast', { text: r.equipped ? 'Новое оружие надето: ' + r.item.name : 'Бонус: +' + r.sold + ' зол.', kind: 'good' }); }); },
  shopRefresh(onDone) { return watchRewarded('shop_refresh', offerToken('shop_refresh', 'lv' + G.profile.level + '_' + Math.floor(Date.now() / (30 * MIN))), onDone); },
};

// ---- interstitial pacing (only at safe transitions, never in/near combat, disabled by purchase)
let lastInter = Date.now();
export async function maybeInterstitial(reason) {
  const P = G.profile;
  if (P.iap.noAds || platform.name === 'demo' && !P.settings.demoInter) return false;
  if (Date.now() - lastInter < 4 * MIN || P.stats.playTime < 180) return false;
  lastInter = Date.now(); G.paused = true; bus.emit('audioPause', true);
  try { await platform.p.showInterstitial(); } catch { }
  G.paused = false; bus.emit('audioPause', false); return true;
}

// ---- IAP
export async function buy(productId) {
  const P = G.profile, def = PRODUCTS[productId];
  if (def.once && P.iap.tx['once_' + productId]) { bus.emit('toast', { text: 'Этот набор уже куплен', kind: 'warn' }); return false; }
  if (!def.consumable && P.iap[flagOf(productId)]) { bus.emit('toast', { text: 'Уже куплено', kind: 'warn' }); return false; }
  G.paused = true; const r = await platform.p.purchase(productId); G.paused = false;
  if (!r.ok) return false;
  return grantPurchase(productId, r.token);
}
const flagOf = id => ({ gold_perk: 'goldPerk', no_ads: 'noAds' }[id] || id);
export async function grantPurchase(productId, token) {
  const P = G.profile;
  if (P.iap.tx[token]) { await platform.p.consume(token); return false; }   // already granted — just finish the transaction
  P.iap.tx[token] = Date.now();
  switch (productId) {
    case 'starter_pack': P.gold += 1000; P.potions.hp += 10; P.potions.mp += 5; { const it = makeItem({ ilvl: Math.max(3, P.level), rarity: 2, slot: 'weapon', cls: P.cls }); delete it.req; autoEquip(it); } P.iap.tx['once_starter_pack'] = 1; break;
    case 'gold_small': P.gold += 600; break;
    case 'potion_pack': P.potions.hp += 15; P.potions.mp += 10; break;
    case 'gold_perk': P.iap.goldPerk = true; break;
    case 'no_ads': P.iap.noAds = true; break;
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

// ---- retention: daily login streak + ripening chest
export const DAILY = [{ gold: 50 }, { potions: 2 }, { gold: 100 }, { item: 1 }, { gold: 200 }, { potions: 4 }, { item: 2 }];
const dayKey = t => { const d = new Date(t); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
export function dailyStatus() {
  const P = G.profile; P.daily = P.daily || { last: 0, streak: 0 };
  const today = dayKey(Date.now()); const last = P.daily.last;
  const y = dayKey(Date.now() - 864e5);
  const streak = last === today ? P.daily.streak : last === y ? P.daily.streak : 0;
  return { claimable: last !== today, streak, day: streak % 7, reward: DAILY[(last === today ? streak - 1 : streak) % 7] };
}
export function claimDaily(double) {
  const P = G.profile; const s = dailyStatus(); if (!s.claimable) return false;
  const r = DAILY[s.streak % 7]; const m = double ? 2 : 1;
  if (r.gold) P.gold += r.gold * m * P.level;
  if (r.potions) P.potions.hp += r.potions * m;
  if (r.item) for (let i = 0; i < m; i++) { const it = makeItem({ ilvl: P.level, rarity: r.item, cls: P.cls }); delete it.req; autoEquip(it); }
  P.daily.last = dayKey(Date.now()); P.daily.streak = s.streak + 1;
  bus.emit('toast', { text: `Награда за вход — день ${s.streak + 1}`, kind: 'good' }); bus.emit('hud'); bus.emit('save'); return true;
}
export const CHEST_TIME = 4 * 60 * MIN;
export function chestStatus() { const P = G.profile; P.orderChest = P.orderChest || { readyAt: Date.now() + 20 * MIN }; const left = P.orderChest.readyAt - Date.now(); return { ready: left <= 0, left }; }
export function openOrderChest(viaAd) {
  const P = G.profile; const s = chestStatus();
  if (!s.ready && !viaAd) return false;
  { const it = makeItem({ ilvl: P.level + 1, rarity: 2, cls: P.cls }); delete it.req; autoEquip(it); }
  P.gold += 40 * P.level; P.orderChest.readyAt = Date.now() + CHEST_TIME;
  bus.emit('toast', { text: 'Сундук Ордена открыт!', sub: 'Редкий предмет (надет, если лучше) + золото', kind: 'good' }); bus.emit('sfx', 'chest'); bus.emit('hud'); bus.emit('save'); return true;
}
export function chestSkip() { const s = chestStatus(); if (s.ready) return openOrderChest(); return watchRewarded('chest_skip', offerToken('chest_skip', String(G.profile.orderChest.readyAt)), () => openOrderChest(true)); }
