// «Охота»: раз в 15 минут — тревога о мини-боссе (данные — data/hunts.js).
// Чудовище убито → охоту нужно сдать старосте Эдрику (награда у него).
// Пока охота не сдана (или не отменена), новая не появится: таймер ждёт.
// Состояние в сохранении: profile.hunt = { nextAt, cur: { …, slain }, done, last }.
import { G, bus } from './ctx.js';
import { Enemy } from './entities.js';
import * as C from './combat.js';
import * as Q from './quests.js';
import { HUNTS, PLACES, ROOM_NAMES, MINIBOSSES, HUNT_EVERY, HUNT_FIRST, huntReward } from '../data/hunts.js';
import { ROOM_LEVEL } from '../data/enemies.js';
import { floorLevel } from '../world/floorgen.js';
import { rand, rrange, pick } from '../core/util.js';

export function state() { const P = G.profile; return P.hunt || (P.hunt = { nextAt: 0, cur: null, done: 0, last: null }); }
// opens once the hero has gone down into the catacombs for the first time (story step 3)
export const unlocked = () => { const P = G.profile; return !!(P && P.tutorial && P.tutorial.prologue && (P.story.done || []).includes('enter')); };   // сборка 38: по id, а не по номеру — в начало сюжета вставлены задания
export const current = () => (G.profile && G.profile.hunt && G.profile.hunt.cur) || null;
export const defOf = cur => HUNTS.find(h => h.id === cur.id);
export const bossOf = cur => MINIBOSSES[defOf(cur).boss];
export const readyToTurnIn = () => { const c = current(); return !!(c && c.slain); };
export const msLeft = () => Math.max(0, state().nextAt - Date.now());

const depthsOpen = P => !!P.story.flags.bossKilled || !!(P.depths && P.depths.best > 0);
function available(H, P) { return P.level >= H.minLevel && (H.place !== 'depths' || depthsOpen(P)); }
function placeFor(H, P) {
  if (H.place === 'catacombs') return { room: pick(H.rooms) };
  if (H.place === 'depths') {   // a floor the hero can actually enter: up to the next unexplored one
    const best = (P.depths && P.depths.best) || 0, fl = [];
    for (let f = Math.max(1, best - 3); f <= best + 1; f++) if (P.level >= floorLevel(f) - 1) fl.push(f);
    return fl.length ? { floor: pick(fl) } : null;
  }
  return {};
}
function levelOf(cur, P) {
  if (cur.place === 'depths') return floorLevel(cur.floor) + 1;
  if (cur.place === 'catacombs') return Math.max(P.level, (ROOM_LEVEL[cur.room] || 3) + 1);
  return Math.max(2, P.level);
}
export function whereText(cur) {
  const p = PLACES[cur.place];
  if (cur.place === 'catacombs') return `${p.name}, зал «${ROOM_NAMES[cur.room] || cur.room}»`;
  if (cur.place === 'depths') return `${p.name}, этаж ${cur.floor}`;
  return p.name;
}
export const steps = cur => PLACES[cur.place].steps.map(s => s.replace('{room}', ROOM_NAMES[cur.room] || '').replace('{floor}', cur.floor));
export const huntFloor = () => { const c = current(); return c && !c.slain && c.place === 'depths' ? c.floor : 0; };

export function start() {
  const P = G.profile, h = state(); if (h.cur) return null;
  const all = HUNTS.filter(H => available(H, P)); let pool = all.filter(H => H.id !== h.last); if (!pool.length) pool = all;
  let H = null, where = null;
  for (let k = 0; k < 6 && !where; k++) { H = pick(pool); where = placeFor(H, P); }
  if (!where) return null;
  const cur = { uid: 'h' + Date.now().toString(36), id: H.id, place: H.place, ...where, t: Date.now() }; cur.lvl = levelOf(cur, P);
  h.cur = cur; h.last = H.id;
  bus.emit('toast', { text: '⚠ ' + H.title, sub: `${MINIBOSSES[H.boss].name} · ${whereText(cur)}`, kind: 'quest' }); bus.emit('sfx', 'roar');
  bus.emit('huntNew', cur); bus.emit('hud'); bus.emit('save');
  if (G.zone && G.zoneReady) spawnFor(G.zone, true);   // the beast may appear right where the hero is
  return cur;
}
// called by the game loop a few times per second
export function tick() {
  if (!unlocked()) return; const h = state();
  if (!h.nextAt) { h.nextAt = Date.now() + HUNT_FIRST; bus.emit('save'); }
  if (!h.cur && Date.now() >= h.nextAt && G.zoneId !== 'survival' && !(G.run && G.run.floor === 0)) start();
}

// where the current hunt's beast stands in this zone (null — it lives elsewhere)
function spot(zone, cur) {
  const p = PLACES[cur.place]; if (p.zone !== zone.id) return null;
  if (p.at) return p.at;
  if (cur.place === 'depths' && zone.json.floorN !== cur.floor) return null;
  const keys = Object.keys(zone.rooms); if (!keys.length) return null;
  const r = cur.place === 'catacombs' ? zone.rooms[cur.room] : zone.rooms[keys[Math.min(keys.length - 1, Math.max(1, Math.floor(keys.length / 2)))]];
  return r ? [r[0] + r[2] / 2, r[1] + r[3] / 2] : null;
}
export function spawnFor(zone, live) {
  const cur = current(); if (!cur || cur.slain || !zone) return null;
  if (G.enemies.some(e => e.huntUid === cur.uid && !e.dead)) return null;
  const at = spot(zone, cur); if (!at) return null;
  const [x, y] = zone.map.nearestFree(at[0], at[1], 0.7);
  const e = new Enemy(defOf(cur).boss, x, y, cur.lvl, { story: 'hunt' }); e.huntUid = cur.uid;
  G.enemies.push(e);
  if (live) { C.particles(x, y, 30, { c: [255, 60, 40], sp: 3, size: 4 }); if (G.run && G.run.floor > 0 && !G.run.done) G.run.total++; }
  return e;
}
// target for the red guide arrow
export function guideTarget() {
  const cur = current(); if (!cur || !G.zone) return null;
  if (cur.slain) {   // back to the elder: in the village — to him, elsewhere — to the way out
    if (G.zoneId === 'town') return G.npcs.find(n => n.id === 'elder') || null;
    if (G.zoneId === 'depths') { const ex = G.zone.inter.find(i => i.id === 'floor_exit'); return ex && !ex.hidden ? ex : null; }
    return G.zone.inter.find(i => i.type === 'portal' && !i.hidden && i.to !== G.zoneId) || null;
  }
  const e = G.enemies.find(o => o.huntUid === cur.uid && !o.dead); if (e) return e;
  const z = PLACES[cur.place].zone;
  if (G.zoneId === 'town' && z === 'catacombs') return G.zone.inter.find(i => i.id === 'portal_town') || null;
  if (G.zoneId === 'town' && z === 'depths') return G.zone.inter.find(i => i.type === 'depths') || null;
  return null;
}
export function canAbandon() { const cur = current(); return !!cur && !cur.slain && !G.enemies.some(e => e.huntUid === cur.uid && !e.dead && e.aggro); }
export function abandon() {
  const h = state(); if (!h.cur || !canAbandon()) return false;
  for (const e of G.enemies) if (!e.dead && (e.huntUid === h.cur.uid || (e.master && e.master.huntUid === h.cur.uid))) { e.remove = true; if (!e.summoned && G.run && G.run.floor > 0) G.run.total--; }
  h.cur = null; h.nextAt = Date.now() + HUNT_EVERY;
  bus.emit('toast', { text: 'Охота отменена', sub: 'Новая тревога — через 15 минут', kind: 'info' }); bus.emit('hud'); bus.emit('save'); return true;
}

// the beast is dead: the hunt now waits to be reported to the elder
function slain(e) {
  const cur = state().cur;
  for (const o of G.enemies) if (!o.dead && o.master === e) C.killEnemy(o, { quiet: true });   // the retinue crumbles
  cur.slain = true;
  bus.emit('float', { x: e.x, y: e.y, text: 'Трофей добыт!', color: '#ffd24a', big: 1, z: 3 });
  bus.emit('toast', { text: `Чудовище повержено: ${bossOf(cur).name}`, sub: 'Вернитесь в деревню к старосте Эдрику за наградой', kind: 'quest' });
  bus.emit('sfx', 'quest'); bus.emit('hud'); bus.emit('save');
}
// called from the elder's dialog: reward + the 15-minute timer starts only now
export function turnIn() {
  const P = G.profile, h = state(), cur = h.cur; if (!cur || !cur.slain) return false;
  const H = defOf(cur), B = MINIBOSSES[H.boss];
  h.cur = null; h.done = (h.done || 0) + 1; h.nextAt = Date.now() + HUNT_EVERY;
  P.stats.hunts = (P.stats.hunts || 0) + 1;
  const r = huntReward(cur.lvl); P.shards = (P.shards || 0) + r.shards;
  const t = H.trophy, names = typeof t.name === 'string' ? { warrior: t.name, archer: t.name, mage: t.name } : t.name;
  Q.grant({ gold: r.gold, xp: r.xp, potions: r.potions, items: [{ slot: t.slot, tier: 2, rarity: 2, names }] }, `Охота: ${B.name}`, { sub: 'Охота сдана старосте' });
  bus.emit('toast', { text: 'Охота сдана!', sub: `+${r.shards}◆ осколков Бездны · следующая тревога через 15 минут`, kind: 'good' });
  bus.emit('sfx', 'quest'); bus.emit('hud'); bus.emit('save'); return true;
}

export function initHunts() {
  bus.on('kill', e => { const cur = current(); if (e.story === 'hunt' && cur && e.huntUid === cur.uid && !cur.slain) slain(e); });
  bus.on('miniSummon', e => {
    const S = e.D.abil && e.D.abil.summon; if (!S || e.dead || !G.zone) return;
    if (G.enemies.filter(o => o.master === e && !o.dead).length >= S.n * 2) return;   // retinue cap
    for (let i = 0; i < S.n; i++) {
      const a = rand() * 6.28, rr = rrange(1.6, 3); const px = e.x + Math.cos(a) * rr, py = e.y + Math.sin(a) * rr;
      if (!G.zone.map.free(px, py, 0.35)) continue;
      const m = new Enemy(S.type, px, py, Math.max(1, e.lvl - 2)); m.aggro = true; m.summoned = true; m.master = e;
      C.particles(px, py, 14, { c: [255, 90, 70], sp: 2, size: 3 }); G.enemies.push(m);
    }
    bus.emit('float', { x: e.x, y: e.y, text: 'Ко мне!', color: '#ff7060', big: 1, z: 3 });
  });
}
