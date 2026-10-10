// Походы (Фьорды Скъёльда / Старый Лес): состояние, спавн, награды, прогресс заданий.
// Сохранение: profile.wild = { fjord: {best, depth, stat:{...}, claimed:{...}}, forest: {...} } — создаётся лениво.
import { G, bus } from './ctx.js';
import { Enemy } from './entities.js';
import * as L from './loot.js';
import * as C from './combat.js';
import { makeItem } from './items.js';
import { grant } from './quests.js';
import { rand, rrange, rint } from '../core/util.js';
import { REALMS, WILD_MOBS, WILD_QUESTS, isWildBoss, isWildFort } from '../data/wild.js';
import { applyFieldMemory } from './wildmem.js';
import { pickNemesis, applyNemesis, bankCarry, onNemesisKilled } from './nemesis.js';
import { bandLevel } from './progress.js';

export const wildState = (realm, P = G.profile) => {
  P.wild = P.wild || {};
  return P.wild[realm] = P.wild[realm] || { best: 0, depth: 0, stat: {}, claimed: {} };
};
const bump = (realm, k, n = 1) => { const S = wildState(realm).stat; S[k] = (S[k] || 0) + n; return S[k]; };

// Спавн мобов поля. Лагерь кладётся вокруг точки; командир/босс получают метку и своё имя.
export function spawnWild(zone) {
  applyFieldMemory(zone.json);
  for (const [type, x, y, n, spread, lvl, tag] of zone.json.spawns) {
    for (let i = 0; i < n; i++) {
      let px = x, py = y;
      for (let k = 0; k < 12; k++) { const tx = x + rrange(-spread, spread), ty = y + rrange(-spread, spread); if (zone.map.free(tx, ty, 0.45)) { px = tx; py = ty; break; } }
      const rr = WILD_MOBS[type].radius + 0.15; [px, py] = zone.map.nearestFree(px, py, rr);
      const e = new Enemy(type, px, py, bandLevel(lvl, lvl + 3, !!tag && tag !== 'fortguard'), { story: tag || null, champion: !tag && rand() < 0.04 + zone.json.wild.depth * 0.01 });   // сборка 47: герой +1 в пределах поле..поле+3
      if (tag === 'wildkeep') applyNemesis(e, pickNemesis(zone.json.wild.realm));
      if (tag === 'wildboss') e.name = `${WILD_MOBS[type].name} · глубина ${zone.json.wild.depth}`;
      G.enemies.push(e);
    }
  }
}



// портал «Вглубь» после падения форта
function openNext(e) {
  const it = G.zone.inter.find(i => i.id === 'wild_next'); if (!it || !it.hidden) return;
  it.hidden = false; it.draw.hidden = false; it.light.on = true;
  C.particles(it.x, it.y, 30, { c: REALMS[G.wild.realm].portalColor, sp: 3, size: 4 }); bus.emit('sfx', 'portal');
}

// Ворота форта открываются, когда перебиты лагеря и звери на поле вокруг (стража и командир внутри не считаются)
export const outsideLeft = () => G.enemies.filter(e => !e.dead && !e.summoned && !e.respawned && e.story !== 'fortguard' && e.story !== 'wildkeep' && e.story !== 'wildboss').length;
export function gateClosed() { const g = G.zone && G.zone.wildGate; return !!(g && !g.open); }
export function checkGate() {
  const g = G.zone && G.zone.wildGate; if (!g || g.open || outsideLeft() > 0) return;
  g.open = true; g.d.hidden = true; for (const [tx, ty] of g.tiles) G.zone.map.setSolid(tx, ty, 0);
  const cx = g.tiles[1][0] + 0.5, cy = g.tiles[1][1] + 0.5;
  C.particles(cx, cy, 30, { c: [255, 220, 150], sp: 3, size: 4 }); C.effect({ kind: 'ring', x: cx, y: cy, r: 3.5, dur: 0.6, c: [255, 210, 120] }); G.cam.kick(0.4);
  bus.emit('sfx', 'door'); bus.emit('toast', { text: 'Ворота форта открыты!', sub: 'Поле вокруг зачищено — идите внутрь', kind: 'good' }); bus.emit('wildProgress');
}
function onKill(e) {
  if (G.zoneId !== 'wild' || !G.wild) return;
  if (G.zone.wildGate) setTimeout(checkGate, 0);
  const realm = G.wild.realm, W = wildState(realm), lvl = e.lvl;
  if (!e.summoned && e.D.realm === realm) { bump(realm, 'kills'); bump(realm, 'k_' + e.type); }
  if (e.story === 'fquest') {   // П37: Шатун-людоед — задание старосты
    for (let i = 0; i < 4; i++) L.dropGold(e.x, e.y, rint(6, 12) * (1 + 0.15 * (lvl - 1))); L.dropPotion(e.x, e.y, 'hp');
    for (const p of G.pickups) if (p.t < 0.1) p.fly = true;
  }
  if (e.story === 'minib') {   // мини-босс святилища храма: золото, зелье, вещь — и подлетает к герою
    const P = G.profile; bump(realm, 'minis');
    for (let i = 0; i < 5; i++) L.dropGold(e.x, e.y, rint(5, 10) * (1 + 0.15 * (lvl - 1)));
    L.dropPotion(e.x, e.y, 'hp'); if (rand() < 0.6) L.dropItem(e.x, e.y, makeItem({ rarity: rand() < 0.25 ? 2 : 1, ilvl: P.level + 1, cls: P.cls || 'warrior' }));
    for (const p of G.pickups) if (p.t < 0.1) p.fly = true;
    for (const o of G.enemies) if (!o.dead && o.summoned) C.killEnemy(o, { quiet: true });
    bus.emit('toast', { text: `${e.D.name} повержен!`, sub: 'Святилище свободно: заберите сундук у алтаря', kind: 'good' }); bus.emit('sfx', 'levelup'); bus.emit('save');
  }
  if (e.story === 'wildkeep' || e.story === 'wildboss') {
    const boss = e.story === 'wildboss', depth = G.wild.depth, P = G.profile, cls = P.cls || 'warrior';
    G.wild.done = true; W.best = Math.max(W.best, depth);
    bump(realm, 'forts'); if (boss) bump(realm, 'bosses');
    for (const o of G.enemies) if (!o.dead && o.summoned) C.killEnemy(o, { quiet: true });
    // добыча командира: золото, зелья и редкая вещь
    for (let i = 0; i < (boss ? 12 : 7); i++) L.dropGold(e.x, e.y, rint(6, 12) * (1 + 0.15 * (lvl - 1)));
    L.dropPotion(e.x, e.y, 'hp'); L.dropPotion(e.x, e.y, 'mp'); if (boss) { L.dropPotion(e.x, e.y, 'hp'); L.dropPotion(e.x, e.y, 'hp'); }
    L.dropItem(e.x, e.y, boss ? makeItem({ epic: L.pickEpic(cls), ilvl: P.level + 2, cls }) : makeItem({ rarity: rand() < 0.3 ? 2 : 1, ilvl: P.level + 1, cls }));   // сборка 47: командир — обычно зелёная
    for (const p of G.pickups) if (p.t < 0.1) p.fly = true;   // всё, что упало с командира, само подлетает к герою
    openNext(e); if (e.nem) onNemesisKilled(e);
    bankCarry(boss ? 'Босс повержен' : 'Форт отбит');
    const ch = G.zone.inter.filter(i => i.type === 'chest'), chOpen = ch.filter(i => i.done).length, time = Math.round(G.time - G.wild.t0);
    const par = boss ? 420 : 200 + depth * 20, stars = 1 + (chOpen >= ch.length ? 1 : 0) + (time <= par ? 1 : 0);
    const prev = (W.stars = W.stars || {})[depth] || 0, extra = Math.max(0, stars - Math.max(prev, 1)); W.stars[depth] = Math.max(prev, stars);
    const bonus = extra * 25 * lvl; if (bonus) L.dropGold(e.x, e.y, bonus);
    G.wild.result = { realm, depth, boss, time, par, chOpen, chTotal: ch.length, stars, bonus, nem: e.nem ? { name: e.nem.name, rank: e.nem.rank, trophy: true } : null, name: e.D.name };
    // итог не выскакивает сам: загорается кнопка справа (hud.js), а сундуки форта можно спокойно собрать
    bus.emit('toast', { text: boss ? `${e.D.name} повержен!` : `${REALMS[realm].fortName} отбит!`, sub: 'Соберите сундуки. Справа загорелась кнопка выхода — нажмите, когда будете готовы', kind: 'good' });
    bus.emit('sfx', 'levelup');
    bus.emit('save'); bus.emit('wildProgress');
  }
}
bus.on('kill', onKill);
bus.on('chest', () => { if (G.zoneId === 'wild' && G.wild) { bump(G.wild.realm, 'chests'); } });

// Рог/зов командира и босса: подмога из списка minion
bus.on('wildSummon', ({ e, n, text }) => {
  const list = e.D.minion || []; if (!list.length || G.zoneId !== 'wild') return;
  bus.emit('float', { x: e.x, y: e.y, text, color: '#ffd24a', big: 1, z: 3.2 }); bus.emit('sfx', 'roar'); C.effect({ kind: 'ring', x: e.x, y: e.y, r: 4, dur: 0.6, c: [255, 210, 120] });
  for (let i = 0; i < n; i++) {
    const t = list[i % list.length], a = rand() * 6.28, r = rrange(2, 3.5), px = e.x + Math.cos(a) * r, py = e.y + Math.sin(a) * r;
    if (!G.zone.map.free(px, py, 0.45)) continue;
    const m = new Enemy(t, px, py, Math.max(1, e.lvl - 1)); m.aggro = true; m.summoned = true;
    C.particles(px, py, 12, { c: [255, 220, 150], sp: 2, size: 3 }); G.enemies.push(m);
  }
});

// Тайник: немного золота, иногда зелье.
export function openStash(it) {
  it.done = true; it.draw.hidden = true; bus.emit('sfx', 'chest');
  const lvl = G.zone.json.level; for (let i = 0; i < 2; i++) L.dropGold(it.x, it.y + 0.6, rint(2, 5) * (1 + 0.15 * (lvl - 1)));
  if (rand() < (G.zone.json.wild.pity ? 0.55 : 0.25)) L.dropPotion(it.x, it.y + 0.6, rand() < 0.7 ? 'hp' : 'mp');
  C.particles(it.x, it.y, 8, { c: [190, 160, 110], sp: 2, size: 3 });
}
// Сундуки: форт-сундук «с добром» даёт ещё и вещь.
export function wildChestExtra(it) {
  if (!it.rich || !G.wild) return;
  const P = G.profile, lvl = G.zone.json.level;
  const n0 = G.pickups.length; L.dropItem(it.x, it.y + 0.8, makeItem({ rarity: rand() < 0.3 ? 1 : 0, ilvl: Math.max(P.level, lvl) + 1, cls: P.cls || 'warrior' })); for (let i = n0; i < G.pickups.length; i++) G.pickups[i].fly = true;
}

// ---- задания
export function questProgress(realm, q) {
  const S = wildState(realm), v = q.stat === 'depth' ? S.depth || 0 : S.stat[q.stat] || 0;
  return { cur: Math.min(q.n, v), max: q.n, done: v >= q.n, claimed: !!S.claimed[q.id] };
}
export function claimQuest(realm, id) {
  const q = WILD_QUESTS[realm].find(x => x.id === id); if (!q) return false;
  const pr = questProgress(realm, q); if (!pr.done || pr.claimed) return false;
  wildState(realm).claimed[id] = true; grant(q.reward, q.title, { sub: 'Задание похода выполнено' }); return true;
}
export const claimable = realm => WILD_QUESTS[realm].filter(q => { const p = questProgress(realm, q); return p.done && !p.claimed; }).length;
export { isWildBoss };
