// Game orchestration: zone loading, spawning, main update, interactions, death/revive, autosave.
import { G, bus, inCombat } from './ctx.js';
import { Zone } from '../world/zone.js';
import { Player, Enemy, NPC } from './entities.js';
import { stats } from './stats.js';
import { makeItem } from './items.js';
import { ROOM_LEVEL } from '../data/enemies.js';
import * as C from './combat.js';
import * as L from './loot.js';
import * as Q from './quests.js';
import { REPEATABLE } from '../data/quests.js';
import { saveLocal } from './save.js';
import { loadJSON, loadGroup } from '../core/assets.js';
import { loadFloor, buildFloorCanvas } from '../render/index.js';
import { generateFloor, isBossFloor, parTime } from '../world/floorgen.js';
import { generateCastle } from '../world/castlegen.js';
import { wheelReady } from '../ui/wheel.js';
import { ROOMS, DECOR } from '../data/upgrades.js';
import * as CS from './castle.js';
import * as SV from './survival.js';
import { resize as rResize } from '../render/index.js';
import { SKILLS } from '../data/skills.js';
import { rand, rrange, rint } from '../core/util.js';
import { pollMove, input, mouse, tapAim } from '../core/input.js';
import { platform } from '../platform/platform.js';
import { maybeInterstitial } from '../platform/monetize.js';

G.npcs = [];
let saveTimer = 0, saveQueued = false, meterAcc = 0, questT = 0;
const ZONES = { town: 'maps/village.json', catacombs: 'maps/catacombs.json' };

export function requestSave() { saveQueued = true; }
export function saveNow() {
  const P = G.profile; if (!P) return;
  if (G.player && !G.player.dead) { P.hpFrac = G.player.hp / G.stats.maxHP; }
  P.world.lastZone = 'town'; if (G.dozorChecked) P.dozorAt = Date.now();   // always resume in the village (safe start, no mid-fight restore)
  saveLocal(P); saveQueued = false; saveTimer = 0;
  if (platform.p && platform.p.cloudSave && platform.name !== 'demo') platform.p.cloudSave(P);
}
bus.on('save', requestSave);

export async function loadZone(id, how = {}) {
  G.zoneReady = false; bus.emit('zoneLoading', id);
  const P = G.profile;
  // keep dungeon state when leaving through a Scroll of Return
  G.dungeonCache = null;   // dungeons always repopulate when re-entered
  G.enemies = []; G.projectiles = []; G.pickups = []; G.effects = []; G.texts = []; G.particles = []; G.npcs = []; C.clearTimers();
  let zone;
  if (id === 'catacombs' && how.useCache && G.dungeonCache) {
    zone = G.dungeonCache.zone; G.enemies = G.dungeonCache.enemies; G.pickups = G.dungeonCache.pickups;
  } else if (id === 'survival') {
    const json = SV.generateArena(); zone = new Zone('survival', json, P); zone.dark = false;
    await buildFloorCanvas(zone);
  } else if (id === 'castle') {
    CS.C(); const json = generateCastle(P.castle);
    zone = new Zone('castle', json, P); zone.dark = false;   // bright, readable citadel
    await buildFloorCanvas(zone);
  } else if (id === 'depths') {
    const json = generateFloor(how.floor ?? 1);
    zone = new Zone('depths', json, P);
    await buildFloorCanvas(zone);
  } else {
    const json = structuredClone(await loadJSON(ZONES[id]));
    if (id === 'town' && depthsUnlocked()) json.objects.push({ t: 'depths', x: 13.5, y: 8.5 });
    if (id === 'town' && P.tutorial.prologue) json.objects.push({ t: 'castle', x: 18.5, y: 7.5 }, { t: 'survportal', x: 16.5, y: 12.5 });
    if (id === 'town') { const bd = json.objects.find(o => o.t === 'board'); if (bd) { bd.x = 31.5; bd.y = 21.5; } json.objects.push({ t: 'wheel', x: 22.5, y: 26.5 }); }
    if (id === 'town') json.objects.push({ t: 'hwsign', x: 17.5, y: 28.8 }, { t: 'banner', x: 22.6, y: 16.4 }, { t: 'banner', x: 18.4, y: 23.9 }, { t: 'statue', x: 24.8, y: 14.5 }, { t: 'weapon_rack', x: 29.5, y: 17.8 }, { t: 'crystals', x: 31, y: 26.4 });
    if (id === 'catacombs') json.objects.push({ t: 'crystals', x: 47.5, y: 42 }, { t: 'crystals', x: 55, y: 51 }, { t: 'mushrooms', x: 7, y: 25 }, { t: 'mushrooms', x: 13, y: 31 }, { t: 'stalagmite', x: 5.5, y: 32 }, { t: 'puddle', x: 10, y: 28 }, { t: 'banner', x: 43, y: 23 });
    zone = new Zone(id, json, P);
    await loadFloor(zone);
  }
  if (G.run && G.run.boons) G.lastBoons = G.run.boons.slice();
  G.zone = zone; G.zoneId = id; G.run = null;
  if (id === 'catacombs') {
    const W = P.world.opened, ks = zone.inter.find(i => i.loot === 'key');
    if (ks && W[ks.id]) P.world.hasKey = true;            // repair: opened key sarcophagus always means we hold the key
    if (W.medallion) P.world.hasMedallion = true;
    if (ks && !ks.done && !ks.light) ks.light = zone.addLight(ks.x, ks.y, { r: 3.2, c: [255, 200, 90], flicker: 0.4, z: 1 });
    const door = zone.inter.find(i => i.type === 'door'); if (door) door.label = P.world.hasKey ? 'Отпереть дверь ключом' : 'Дверь заперта';
  }
  const fresh = !G.player; const pl = G.player || new Player(0, 0); G.player = pl;
  pl.dead = false; pl.state = 'idle'; pl.act = null; pl.setAnim('idle', 5, true);
  if (id === 'town') {
    const from = how.from === 'catacombs';
    const portal = zone.inter.find(i => i.id === 'portal_town');
    [pl.x, pl.y] = from ? [portal.x + 1.2, portal.y + 1.6] : zone.start; pl.face = pl.dir = 1;
    for (const n of zone.json.npcs) G.npcs.push(new NPC({ ...n }));
    await loadGroup(zone.json.npcs.map(n => 'npc_' + n.id)).catch(() => { });
  } else if (id === 'survival') {
    [pl.x, pl.y] = zone.start; pl.face = pl.dir = 1;
  } else if (id === 'castle') {
    [pl.x, pl.y] = zone.start; pl.face = pl.dir = 5; G.trial = null;
  } else if (id === 'depths') {
    [pl.x, pl.y] = zone.start; pl.face = pl.dir = 1;
    spawnFloor(zone); G.diedThisRun = false; G.dungeonCache = null;
    G.run = { floor: zone.json.floorN, t0: G.time, kills: 0, total: G.enemies.length, gold0: P.stats.gold, deaths: 0, done: false, boons: how.keepBoons && G.lastBoons ? G.lastBoons.slice() : [] }; G.lastBoons = null;
  } else {
    if (how.useCache && G.dungeonCache) { pl.x = G.dungeonCache.x; pl.y = G.dungeonCache.y; G.dungeonCache = null; }
    else { [pl.x, pl.y] = zone.start; spawnDungeon(zone); G.diedThisRun = false; G.dungeonCache = null; }
    pl.face = pl.dir = 1;
  }
  [pl.x, pl.y] = zone.map.nearestFree(pl.x, pl.y, pl.r + 0.05);
  G.cam.x = pl.x; G.cam.y = pl.y;
  G.stats = stats(P);
  if (fresh || pl.hp <= 0 || how.fullHeal || id === 'town') { pl.hp = G.stats.maxHP; pl.mp = G.stats.maxMP; }
  G.zoomMul = id === 'survival' ? 0.6 : (id === 'catacombs' || id === 'depths') ? 0.8 : 1; rResize();
  if (id === 'survival') SV.startRun(); else G.surv = null;
  G.zoneReady = true;
  bus.emit('zoneEntered', id); bus.emit('hud'); requestSave();
}

function roomLevel(zone, x, y) {
  if (zone.id === 'depths') return zone.json.level;
  const base = ROOM_LEVEL[zone.roomAt(x, y)] || 3;
  return G.profile.chapterDone ? Math.max(base, G.profile.level - 1 + Math.floor(base / 3)) : base;
}
function spawnDungeon(zone) {
  const P = G.profile, W = P.world.opened;
  const visits = (P.world.visits = (P.world.visits || 0) + 1);
  for (const [type, x, y, n, spread] of zone.json.spawns) {
    const lvl = roomLevel(zone, x, y);
    const champ = visits > 1 && rand() < (P.chapterDone ? 0.3 : 0.15);
    for (let i = 0; i < n; i++) {
      let px = x, py = y;
      for (let k = 0; k < 8; k++) { const tx = x + rrange(-spread, spread), ty = y + rrange(-spread, spread); if (zone.map.free(tx, ty, 0.35)) { px = tx; py = ty; break; } }
      [px, py] = zone.map.nearestFree(px, py, 0.36);
      G.enemies.push(new Enemy(type, px, py, lvl, { champion: champ && i === 0, room: zone.roomAt(x, y) }));
    }
  }
  const [el, bo] = zone.json.story;
  if (W.medallion && !P.story.flags.eliteKilled) spawnElite(zone);
  if (P.story.flags.gateOpen || W.gateOpen) G.enemies.push(new Enemy('boss', bo[1], bo[2], P.chapterDone ? Math.max(6, P.level) : 6, { story: 'boss' }));
}
export const depthsUnlocked = () => !!G.profile.story.flags.bossKilled || (G.profile.depths && G.profile.depths.best > 0);
function spawnFloor(zone) {
  for (const [type, x, y, n, spread, lvl, tag] of zone.json.spawns) {
    for (let i = 0; i < n; i++) {
      let px = x, py = y;
      for (let k = 0; k < 10; k++) { const tx = x + rrange(-spread, spread), ty = y + rrange(-spread, spread); if (zone.map.free(tx, ty, 0.4)) { px = tx; py = ty; break; } }
      const rr = ({ boss: 0.8, elite_guard: 0.55, beast: 0.5 })[type] || 0.35; [px, py] = zone.map.nearestFree(px, py, rr);
      const e = new Enemy(type, px, py, lvl, { story: tag || null, champion: !tag && rand() < 0.05 + zone.json.floorN * 0.01 });
      if (tag === 'floorboss') e.name = type === 'boss' ? `Палач Глубин · этаж ${zone.json.floorN}` : `Страж глубин · этаж ${zone.json.floorN}`;
      G.enemies.push(e);
    }
  }
}
function spawnElite(zone) {
  const el = zone.json.story[0]; G.enemies.push(new Enemy('elite_guard', el[1], el[2], G.profile.chapterDone ? Math.max(5, G.profile.level) : 5, { story: 'elite' }));
}

// ------------------------------------------------------------------ events
bus.on('kill', e => {
  if (e.story === 'trial') { const t = G.trial; G.trial = null; if (t) setTimeout(() => CS.trialReward(t), 1200); }
  L.gainXP(L.killXP(e), e.x, e.y); if (e.story !== 'trial') L.enemyLoot(e);
  if (G.run && !e.summoned) {
    G.run.kills++;
    const r = G.run; if (r.floor > 0 && !r.done) { r.boonAt = r.boonAt || [Math.ceil(r.total * 0.5)]; if (r.boonAt.length && r.kills >= r.boonAt[0]) { r.boonAt.shift(); setTimeout(() => bus.emit('boonChoice'), 350); } }
  }
  if (G.zoneId === 'depths' && G.run && G.run.floor > 0 && G.enemies.every(x => x.dead || x.summoned)) {
    const ex = G.zone.inter.find(i => i.id === 'floor_exit'); if (ex && ex.hidden) { ex.hidden = false; ex.draw.hidden = false; ex.light.on = true; C.particles(ex.x, ex.y, 30, { c: [140, 210, 255], sp: 3, size: 4 }); bus.emit('toast', { text: 'Этаж зачищен!', sub: 'Портал выхода открыт', kind: 'good' }); bus.emit('sfx', 'portal'); }
  }
  if (e.D.boss && G.zoneId === 'catacombs') {
    G.profile.world.opened.bossPortal = true; G.profile.world.bossPortal = true;
    const it = G.zone.inter.find(i => i.id === 'portal_return');
    if (it) { it.hidden = false; it.draw.hidden = false; it.light.on = true; }
    for (const o of G.enemies) if (!o.dead && o.summoned) C.killEnemy(o, { quiet: true });
    G.bossKill = { id: 'boss_' + Date.now(), x: e.x, y: e.y }; G.lastCombat = -99;
    setTimeout(() => bus.emit('bossDefeated', G.bossKill), 2200);
  }
});
bus.on('dust', ({ x, y }) => C.particles(x, y, 10, { c: [150, 135, 115], z: 0.1, sp: 1.6, vz: 1.2, g: 3, size: 4, add: false, life: 0.5 }));
bus.on('aggro', e => { const room = G.zone.roomAt(e.x, e.y); for (const o of G.enemies) if (!o.aggro && !o.dead && !o.D.boss && (Math.hypot(o.x - e.x, o.y - e.y) < 5 && G.zone.map.los(o.x, o.y, e.x, e.y) || (room && G.zone.roomAt(o.x, o.y) === room))) o.aggro = true; });
bus.on('summon', ({ x, y, n, lvl }) => {
  for (let i = 0; i < n; i++) {
    const a = rand() * 6.28, r = rrange(2, 3.5); const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (!G.zone.map.free(px, py, 0.35)) continue;
    const e = new Enemy(rand() < 0.3 ? 'skel_archer' : 'skel_warrior', px, py, Math.max(1, lvl - 1)); e.aggro = true; e.summoned = true;
    C.particles(px, py, 14, { c: [170, 90, 255], sp: 2, size: 3 }); G.enemies.push(e);
  }
});
bus.on('playerDeath', () => {
  if (G.zoneId === 'survival') { SV.endRun(false); return; }
  G.profile.stats.deaths++; G.diedThisRun = true; if (G.run) G.run.deaths++; requestSave();
  setTimeout(() => bus.emit('showDeath'), 1300);
});
export function revive(inPlace) {
  const pl = G.player; pl.dead = false; pl.state = 'idle'; pl.hp = G.stats.maxHP; pl.mp = G.stats.maxMP; pl.inv = 2; pl.setAnim('idle', 5, true);
  if (inPlace) { C.effect({ kind: 'ring', x: pl.x, y: pl.y, r: 4, dur: 0.6, c: [255, 230, 150] }); for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - pl.x, e.y - pl.y) < 4) { e.kb = { vx: (e.x - pl.x), vy: (e.y - pl.y), t: 0.25 }; } }
  else loadZone('town', { from: 'death', fullHeal: true });
}

// ------------------------------------------------------------------ interactions
export function interact(it) {
  const P = G.profile, W = P.world.opened, pl = G.player;
  if (!it || pl.dead) return;
  switch (it.type) {
    case 'portal':
      if (it.hidden) return;
      if (it.reqLevel && P.level < it.reqLevel) { bus.emit('toast', { text: `Портал откроется с ${it.reqLevel} уровня`, sub: 'Фармите золото и опыт в катакомбах', kind: 'warn' }); bus.emit('sfx', 'deny'); return; }
      bus.emit('sfx', 'portal');
      if (it.to === 'castle') { loadZone('castle'); return; }
      if (it.to === 'catacombs') { maybeInterstitial('descend').then(() => loadZone('catacombs', { useCache: !!G.dungeonCache })); }
      else loadZone('town', { from: 'catacombs' });
      return;
    case 'npc': { const n = G.npcs.find(x => x.id === it.id); if (n) n.talkT = 4; bus.emit('openNPC', it.id); return; }
    case 'board': bus.emit('openBoard'); return;
    case 'herospath': bus.emit('openHeroPath'); return;
    case 'wheel': bus.emit('openWheel'); return;
    case 'survival': if (P.level < SV.REQ_LEVEL) { bus.emit('toast', { text: `Кровавая жатва открывается с ${SV.REQ_LEVEL} уровня`, kind: 'warn' }); bus.emit('sfx', 'deny'); return; } bus.emit('openSurvival'); return;
    case 'depths': if (it.reqLevel && P.level < it.reqLevel) { bus.emit('toast', { text: `Глубины открываются с ${it.reqLevel} уровня`, kind: 'warn' }); bus.emit('sfx', 'deny'); return; } bus.emit('openDepths'); return;
    case 'exit': if (!it.hidden) finishFloor(); else bus.emit('toast', { text: 'Портал запечатан', sub: 'Убейте всех врагов на этаже', kind: 'warn' }); return;
    case 'shrine': bus.emit('openShrine'); return;
    case 'sarc': {
      it.done = true; it.draw.spr = 'sarcophagus_open'; bus.emit('sfx', 'door');
      if (it.loot === 'key') { W[it.id] = true; P.world.hasKey = true; if (it.light) it.light.on = false; bus.emit('keyItem', 'key'); bus.emit('toast', { text: 'Найден ключ от склепа', sub: 'Он в инвентаре (предметы задания). Откройте дверь на востоке', kind: 'good' }); C.particles(it.x, it.y, 20, { c: [255, 220, 120], sp: 2, size: 3 }); }
      else { const lvl = roomLevel(G.zone, it.x, it.y); for (let i = 0; i < 2; i++) L.dropGold(it.x, it.y + 0.8, rint(2, 6) * lvl); if (rand() < 0.3 && G.zoneId === 'catacombs') spawnAmbush(it); }
      requestSave(); return;
    }
    case 'chest': {
      it.done = true; it.draw.spr = (it.rich ? 'chest_rich' : 'chest') + '_open'; if (it.persist) W[it.id] = true;
      bus.emit('sfx', 'chest'); bus.emit('chest'); L.chestLoot(it.x, it.y + 0.7, it.rich, roomLevel(G.zone, it.x, it.y) + (it.rich ? 1 : 0), it.id); requestSave(); return;
    }
    case 'medallion': {
      it.done = true; it.draw.spr = 'altar'; it.light.on = false; W.medallion = true; P.world.hasMedallion = true;
      bus.emit('toast', { text: 'Медальон Ордена получен', sub: 'Где-то на юге пробудился Страж…', kind: 'good' }); bus.emit('sfx', 'rareDrop');
      G.cam.shake = 0.6; bus.emit('sfx', 'roar');
      if (!P.story.flags.eliteKilled) spawnElite(G.zone);
      Q.setFlag('medallion'); requestSave(); return;
    }
    case 'door':
      if (!P.world.hasKey) { bus.emit('toast', { text: 'Дверь заперта', sub: 'Нужен ключ — поищите в саркофагах оссуария', kind: 'warn' }); bus.emit('sfx', 'deny'); return; }
      it.done = true; W[it.id] = true; it.draw.spr = 'door_open'; G.zone.map.setSolid(it.tile[0], it.tile[1], 0); bus.emit('sfx', 'door'); bus.emit('toast', { text: 'Дверь открыта', sub: 'Медальон — на алтаре в зале за дверью', kind: 'good' }); requestSave(); return;
    case 'secret':
      it.done = true; W[it.id] = true; for (const d of it.draws) d.hidden = true; for (const [x, y] of it.tiles) { G.zone.map.setSolid(x, y, 0); C.particles(x + 0.5, y + 0.5, 12, { c: [120, 110, 100], sp: 2.5, add: false, size: 4 }); }
      for (const d of G.zone.statics) if (d.tag === it.id) d.hidden = true;
      G.cam.shake = 0.4; bus.emit('sfx', 'door'); bus.emit('toast', { text: 'Тайный проход!', sub: 'За стеной скрыта сокровищница', kind: 'good' }); requestSave(); return;
    case 'gate':
      if (!P.world.hasMedallion) { bus.emit('toast', { text: 'Врата запечатаны', sub: 'На печати углубление в форме медальона', kind: 'warn' }); bus.emit('sfx', 'deny'); return; }
      it.done = true; W.gateOpen = true; it.draw.spr = 'door_open'; it.light.on = false; G.zone.map.setSolid(it.tile[0], it.tile[1], 0);
      bus.emit('sfx', 'door'); G.cam.shake = 0.7; bus.emit('toast', { text: 'Печать сломлена', sub: 'Палач Бездны пробуждается…', kind: 'quest' });
      Q.setFlag('gateOpen');
      if (!G.enemies.some(e => e.D.boss)) { const bo = G.zone.json.story[1]; G.enemies.push(new Enemy('boss', bo[1], bo[2], P.chapterDone ? Math.max(6, P.level) : 6, { story: 'boss' })); }
      requestSave(); return;
  }
}
function spawnAmbush(it) {
  bus.emit('toast', { text: 'Засада!', kind: 'warn' });
  for (let i = 0; i < 2; i++) { const e = new Enemy('skel_warrior', it.x + rrange(-1.5, 1.5), it.y + 1.5 + rrange(0, 1), roomLevel(G.zone, it.x, it.y)); if (G.zone.map.free(e.x, e.y, 0.35)) { e.aggro = true; G.enemies.push(e); } }
}
// «АВТО»: the hero fights on his own — for lazy players, trials and farming.
function autoTick(inp) {
  const pl = G.player, P = G.profile, S = G.stats, map = G.zone.map; if (pl.dead || pl.busy()) return;
  // unstuck: if we tried to move but barely moved, side-step for a moment
  const A = G.autoS || (G.autoS = { t: 0, x: pl.x, y: pl.y, side: 0, sx: 0, sy: 0 });
  A.t += G.dt || 0.016;
  if (A.side > 0) { A.side -= G.dt || 0.016; inp.wx = A.sx; inp.wy = A.sy; inp.mag = 0.8; return; }
  if (A.t > 0.6) { const moved = Math.hypot(pl.x - A.x, pl.y - A.y); if (A.wanted && moved < 0.15) { const a = Math.random() < 0.5 ? 1.57 : -1.57; const ang = Math.atan2(A.wy, A.wx) + a; A.sx = Math.cos(ang); A.sy = Math.sin(ang); A.side = 0.45; } A.t = 0; A.x = pl.x; A.y = pl.y; A.wanted = false; }
  if (pl.hp < S.maxHP * 0.35 && P.potions.hp > 0 && !(pl.cds.pot_hp > 0)) usePotion('hp');
  let tgt = null, td = 1e9;
  for (const e of G.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - pl.x, e.y - pl.y); if (d < 16 && d < td && (e.aggro || d < 9)) { td = d; tgt = e; } }
  if (tgt) {
    for (const id of P.slots) { if (!id) continue; const sk = SKILLS[id]; if (C.skillUsable(id).ok && pl.mp >= sk.mana && td < (id === 'whirlwind' ? 2.2 : 7.5) && map.los(pl.x, pl.y, tgt.x, tgt.y)) { C.castSkill(id); return; } }
    const range = S.ranged ? S.range * 0.8 : S.range + 0.25;
    if (td > range || !map.los(pl.x, pl.y, tgt.x, tgt.y)) { const d = map.guideDir(pl.x, pl.y, tgt.x, tgt.y) || [(tgt.x - pl.x) / td, (tgt.y - pl.y) / td]; inp.wx = d[0]; inp.wy = d[1]; inp.mag = 0.8; A.wanted = true; A.wx = d[0]; A.wy = d[1]; }
    else { pl.faceTo(tgt.x, tgt.y); C.playerAttack(pl); }
    return;
  }
  if (G.zoneId === 'depths' || G.zoneId === 'catacombs') {   // hunt the nearest living enemy anywhere on the floor
    let far = null, fd = 1e9; for (const e of G.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - pl.x, e.y - pl.y); if (d < fd && (G.zoneId === 'depths' || d < 30)) { fd = d; far = e; } }
    const pkNear = G.pickups.some(p => Math.hypot(p.x - pl.x, p.y - pl.y) < 4);
    if (far && !pkNear) { const d = map.guideDir(pl.x, pl.y, far.x, far.y) || [(far.x - pl.x) / fd, (far.y - pl.y) / fd]; inp.wx = d[0]; inp.wy = d[1]; inp.mag = 0.8; A.wanted = true; A.wx = d[0]; A.wy = d[1]; return; }
  }
  const pk = G.pickups.filter(p => Math.hypot(p.x - pl.x, p.y - pl.y) < 7).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0];
  const goal = pk || (G.zoneId === 'catacombs' || G.zoneId === 'depths' ? G.guide : null);
  if (goal) {
    const d = Math.hypot(goal.x - pl.x, goal.y - pl.y);
    if (goal.type === 'exit' && d < 1.4) { interact(goal); return; }
    if (d > 0.9) { const g = map.guideDir(pl.x, pl.y, goal.x, goal.y) || [(goal.x - pl.x) / d, (goal.y - pl.y) / d]; inp.wx = g[0]; inp.wy = g[1]; inp.mag = 0.8; A.wanted = true; A.wx = g[0]; A.wy = g[1]; }
  }
}
function boonTick(dt) {
  const r = G.run, pl = G.player, S = G.stats; if (pl.dead) return;
  const avg = (S.dmgMin + S.dmgMax) / 2;
  if (r.boons.includes('nova')) { r.novaT = (r.novaT ?? 2) - dt; if (r.novaT <= 0) { r.novaT = 4; C.effect({ kind: 'ring', x: pl.x, y: pl.y, r: 3, dur: 0.45, c: [190, 110, 255] }); for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - pl.x, e.y - pl.y) < 3 + e.r) C.damageEnemy(e, avg * 1.3, { elem: 'fire', src: 'spell', canCrit: false }); bus.emit('sfx', 'fire'); } }
  if (r.boons.includes('blades')) {
    r.bladeA = (r.bladeA || 0) + dt * 3.6; r.blades = [];
    for (let k = 0; k < 2; k++) { const a = r.bladeA + k * Math.PI; const bx = pl.x + Math.cos(a) * 1.6, by = pl.y + Math.sin(a) * 1.6; r.blades.push([bx, by, a]);
      for (const e of G.enemies) { if (e.dead) continue; e.bladeCd = (e.bladeCd || 0) - dt / 2; if (e.bladeCd <= 0 && Math.hypot(e.x - bx, e.y - by) < 0.55 + e.r) { e.bladeCd = 0.45; C.damageEnemy(e, avg * 0.55, { src: 'blade', canCrit: true }); } } }
  }
}
const touch = () => matchMedia('(pointer:coarse)').matches;
function tutorialTick() {
  const T = G.tut || (G.tut = { step: 0, t: 0 }); T.t += G.dt || 0.016;
  const say = (text, sub) => bus.emit('toast', { text, sub, kind: 'quest' });
  if (T.step === 0 && G.time - G.run.t0 > 0.8) { T.step = 1; say(touch() ? 'Коснитесь левой половины экрана и ведите палец' : 'Двигайтесь: WASD или зажмите мышь', 'Выберитесь из склепа'); }
  else if (T.step === 1 && G.enemies.some(e => e.aggro)) { T.step = 2; say(touch() ? 'Держите большую кнопку справа — атака' : 'Пробел — атака, Shift — уклонение', 'Герой сам подойдёт к врагу'); }
  else if (T.step === 2 && G.run.kills >= 1) { T.step = 3; say('Отлично! Добейте остальных', 'Кнопка со стрелкой — уклонение от удара'); }
  else if (T.step === 3 && G.enemies.every(e => e.dead)) { T.step = 4; const ex = G.zone.inter.find(i => i.id === 'floor_exit'); if (ex) { ex.hidden = false; ex.draw.hidden = false; ex.light.on = true; } say('Портал открыт — идите к свету', 'Золотые стрелки на земле укажут путь'); }
}
export function finishFloor() {
  const r = G.run, P = G.profile; if (!r) return;
  if (r.done) { if (G.lastFloorResult) bus.emit('floorResult', G.lastFloorResult); return; }
  r.done = true; G.lastCombat = -99;
  if (r.floor === 0) {   // prologue → village
    P.tutorial.prologue = true; G.tut = null; L.gainXP(45);
    bus.emit('toast', { text: 'Вы выбрались из склепа!', sub: 'Староста Эдрик ждёт на площади', kind: 'quest' });
    loadZone('town', { from: 'catacombs' }); return;
  }
  P.depths = P.depths || { best: 0, stars: {} };
  const time = G.time - r.t0, first = r.floor > P.depths.best;
  const stars = 1 + (r.kills >= Math.ceil(r.total * 0.9) ? 1 : 0) + (time <= parTime(r.floor, r.total) && r.deaths === 0 ? 1 : 0);
  const prevStars = P.depths.stars[r.floor] || 0;
  const gold = Math.round((25 + r.floor * 15) * (first ? 2 : 1) * (1 + (stars - 1) * 0.25));
  const xp = Math.round((20 + r.floor * 14) * (first ? 1.5 : 1));
  P.gold += gold; P.stats.gold += 0; P.stats.floors = (P.stats.floors || 0) + 1; if (stars === 3) P.stats.stars3 = (P.stats.stars3 || 0) + 1;
  if (first) { P.depths.best = r.floor; P.potions.hp += 1; }
  P.depths.stars[r.floor] = Math.max(prevStars, stars);
  L.gainXP(xp);
  const res = { floor: r.floor, time, kills: r.kills, total: r.total, stars, prevStars, gold, xp, first, runGold: P.stats.gold - r.gold0, boss: isBossFloor(r.floor), token: 'floor_' + r.floor + '_' + Math.round(r.t0 * 1000) };
  G.lastFloorResult = res; bus.emit('floorResult', res); bus.emit('hud'); saveNow();
}
bus.on('roomUnlocked', id => { const it = G.zone && G.zone.inter.find(i => i.type === 'roomgate' && i.room === id); if (it) { it.done = true; it.draw.spr = 'door_open'; G.zone.map.setSolid(it.tile[0], it.tile[1], 0); G.panelTarget = null; bus.emit('panel', null); C.particles(it.x, it.y, 20, { c: [255, 210, 120], sp: 2.5, size: 4 }); G.cam.shake = 0.3; } });
bus.on('decorPlaced', ({ sid, id }) => { const it = G.zone && G.zone.inter.find(i => i.sid === sid); if (!it) return; const D = DECOR[id]; it.draw.spr = D.spr; it.draw.hidden = false; it.draw.flat = D.spr === 'rug'; it.draw.tall = D.spr === 'statue' || D.spr === 'banner'; C.particles(it.x, it.y, 18, { c: [255, 220, 140], sp: 2, size: 3 }); });
export function startTrial(t) {
  const s = CS.seals(); if (s.n <= 0 || G.trial) return;
  if (s.n >= CS.SEAL_MAX) s.at = Date.now(); s.n--;
  const room = G.zone.json.rooms.trial; const cx = room[0] + room[2] / 2, cy = room[1] + room[3] / 2;
  const e = new Enemy(t.type, ...G.zone.map.nearestFree(cx + 3, cy, 0.8), G.profile.level + t.lvl, { story: 'trial' }); e.aggro = true; e.name = t.name;
  G.enemies.push(e); G.trial = t; G.zone.map.buildFlow(Math.floor(G.player.x), Math.floor(G.player.y), -1e9);
  bus.emit('toast', { text: 'Испытание: ' + t.name, sub: G.auto ? 'Автобой включён' : 'Нажмите АВТО, чтобы герой сражался сам', kind: 'quest' }); bus.emit('sfx', 'roar'); requestSave();
}
export function useScroll() {
  const P = G.profile; if (G.zoneId !== 'catacombs') { bus.emit('toast', { text: 'Свиток работает только в подземелье', kind: 'warn' }); return; }
  if (P.scrolls <= 0) { bus.emit('toast', { text: 'Нет свитков возврата', sub: 'Купите у торговки', kind: 'warn' }); return; }
  if (inCombat()) { bus.emit('toast', { text: 'Нельзя читать свиток в бою', kind: 'warn' }); return; }
  P.scrolls--; bus.emit('sfx', 'portal'); loadZone('town', { from: 'catacombs', keepDungeon: G.zoneId === 'catacombs' });
}
export function usePotion(k) {
  const P = G.profile, pl = G.player; if (pl.dead) return;
  if (P.potions[k] <= 0) { bus.emit('toast', { text: k === 'hp' ? 'Нет зелий здоровья' : 'Нет зелий маны', kind: 'warn' }); bus.emit('sfx', 'deny'); return; }
  if ((pl.cds['pot_' + k] || 0) > 0) return;
  P.potions[k]--; pl.cds['pot_' + k] = 1.2; pl.potT = 1;
  if (k === 'hp') pl.potHeal = G.stats.maxHP * 0.45; else pl.potMana = G.stats.maxMP * 0.5;
  bus.emit('sfx', 'potion'); C.particles(pl.x, pl.y, 12, { c: k === 'hp' ? [255, 80, 80] : [90, 140, 255], z: 0.3, sp: 0.8, vz: 3, g: 0, size: 3 }); bus.emit('hud');
}

// ------------------------------------------------------------------ main update
export function update(dt) {
  if (!G.zoneReady || G.paused) return;
  G.dt = dt;
  G.time += dt; G.profile.stats.playTime += dt;
  const pl = G.player, inp = pollMove();
  // mouse: LMB fires/strikes toward the cursor (the hero turns to it); keys/joystick still move
  if (tapAim.held != null && !pl.busy() && !pl.dead && !G.modalOpen && G.zoneId !== 'survival') { const [wx, wy] = G.cam.toWorld(tapAim.x, tapAim.y + 20); C.playerAttack(pl, { x: wx, y: wy }); }
  if (mouse.aim && !pl.busy() && !pl.dead && !G.modalOpen && G.zoneId !== 'survival') { const [wx, wy] = G.cam.toWorld(mouse.x, mouse.y + 20); C.playerAttack(pl, { x: wx, y: wy }); }
  // hold-to-attack with auto-approach to the nearest target (mobile friendly)
  if (input.attackHeld && !pl.busy() && !pl.dead && G.zoneId !== 'survival') {
    const W = G.stats; const range = W.ranged ? W.range : W.range * 0.8;
    const t = C.pickTarget(pl, range);
    if (t || inp.mag > 0.12) { if (t) C.playerAttack(pl); }
    else { const near = C.nearestEnemy(pl.x, pl.y, 7, e => G.zone.map.los(pl.x, pl.y, e.x, e.y)); if (near) { const dx = near.x - pl.x, dy = near.y - pl.y, l = Math.hypot(dx, dy); inp.wx = dx / l; inp.wy = dy / l; inp.mag = 0.7; } else C.playerAttack(pl); }
  }
  if (pl.comboT > 0) { pl.comboT -= dt; if (pl.comboT <= 0) pl.combo = 0; }
  if (G.auto && !G.modalOpen) autoTick(inp);
  const m0 = pl.meters; pl.update(dt, inp); meterAcc += pl.meters - m0; pl.meters = 0;
  if (meterAcc > 5) { Q.addMeters(meterAcc); meterAcc = 0; }
  if (G.zoneId !== 'town') G.zone.map.buildFlow(Math.floor(pl.x), Math.floor(pl.y), G.time);
  for (const e of G.enemies) e.update(dt, pl);
  if (G.zoneId === 'survival') SV.updateSurvival(dt);
  for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i].remove) G.enemies.splice(i, 1);
  for (const n of G.npcs) n.update(dt, pl);
  C.updateProjectiles(dt); C.updateTimers(dt); L.updatePickups(dt);
  // age VFX (bounded, removed when finished → no leaks)
  for (const e of G.effects) e.t += dt; G.effects = G.effects.filter(e => e.t < e.dur);
  for (const t of G.texts) t.t += dt; G.texts = G.texts.filter(t => t.t < t.life);
  for (const p of G.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= p.g * dt; p.z = Math.max(0, p.z + p.vz * dt); p.vx *= 0.97; p.vy *= 0.97; }
  G.particles = G.particles.filter(p => p.t < p.life);
  G.cam.follow(pl.x, pl.y, dt, 7);
  if (G.run && G.run.floor === 0 && !G.run.done) tutorialTick();
  if (G.run && G.run.boons && G.run.boons.length) boonTick(dt);
  const bp = G.zone.biome && G.zone.biome.particles;   // ambient biome particles around the hero (drips, embers, spores)
  if (bp && Math.random() < bp.rate * dt) { const a = Math.random() * 6.28, rr = 2 + Math.random() * 7; C.particles(pl.x + Math.cos(a) * rr, pl.y + Math.sin(a) * rr, 1, { c: bp.c, z: bp.vz < 0 ? 3 : 0.1, sp: 0.2, spMin: 0, vz: bp.vz, vzMin: bp.vz * 0.5, g: bp.g, size: bp.size, life: bp.life }); }
  // focus: nearest available interactable
  let best = null, bd = 1e9;
  for (const it of G.zone.inter) { if (it.done || it.hidden) continue; const d = Math.hypot(it.x - pl.x, it.y - pl.y); if (d < it.r && d < bd) { bd = d; best = it; } }
  let pt = null, pd = 1e9;
  for (const it of G.zone.inter) { if (!it.panel || it.hidden || (it.type === 'roomgate' && it.done)) continue; const d = Math.hypot(it.x - pl.x, it.y - pl.y); if (d < it.r + 0.3 && d < pd) { pd = d; pt = it; } }
  if (pt !== G.panelDismissed) G.panelDismissed = null;   // walked away → the panel may open again
  if (pt && pt === G.panelDismissed) pt = null;
  if (pt !== G.panelTarget) { G.panelTarget = pt; bus.emit('panel', pt); }
  if (best && best.panel) best = null;
  if (best && best.type === 'door' && G.profile.world.hasKey && !best.done && bd < 1.6) interact(best);
  if (best && best.type === 'door') best.label = G.profile.world.hasKey ? 'Отпереть дверь ключом' : 'Дверь заперта';
  if (best !== G.focus) { G.focus = best; bus.emit('focus', best); }
  // quest checks for proximity objectives
  if ((questT += dt) > 0.3) { questT = 0; Q.check(); updateMarkers(); }
  // autosave
  saveTimer += dt; if ((saveQueued && saveTimer > 1.5 && !inCombat()) || saveTimer > 15) saveNow();
}
function updateMarkers() {
  const q = Q.current();
  // guide target for the on-ground arrow
  let t = null;
  if (q) {
    if (q.where && q.where !== G.zoneId) t = G.zone.inter.find(i => i.type === 'portal' && !i.hidden) || null;
    else if (q.target) t = G.zone.inter.find(i => i.id === q.target && !i.hidden) || G.enemies.find(e => e.story === q.target && !e.dead) || null;
    if (!t && q.id === 'medallion' && !G.profile.world.hasKey) t = G.zone.inter.find(i => i.loot === 'key' && !i.done) || null;
    if (!t && q.id === 'medallion' && G.profile.world.hasKey) t = G.zone.inter.find(i => i.type === 'door' && !i.done) || G.zone.inter.find(i => i.id === 'medallion');
  }
  if (G.zoneId === 'depths') { const ex = G.zone.inter.find(i => i.id === 'floor_exit'); t = ex && !ex.hidden ? ex : G.enemies.find(e => e.story === 'floorboss' && !e.dead) || null; }
  G.guide = t;
  for (const n of G.npcs) n.marker = q && q.target === n.id ? (q.id === 'finish' ? '?' : '!') : null;
  for (const it of G.zone.inter) { if (it.type === 'socket') { const open = it.room === 'hall' || (G.profile.castle && G.profile.castle[it.room]); it.hidden = !open; it.glow = open && !(G.profile.castle.decor && G.profile.castle.decor[it.sid]); } else if (it.type === 'roomgate') { it.plate = it.done ? null : ROOMS[it.room].name; it.reqLevel = it.done ? 0 : ROOMS[it.room].lvl; } else if (it.type === 'room') it.plate = ROOMS[it.room].name; }
  const wh = G.zone.inter.find(i => i.id === 'wheel'); if (wh) wh.marker = wheelReady() ? '!' : null;
  const bd = G.zone.inter.find(i => i.id === 'board'); if (bd) bd.marker = REPEATABLE.some(r => Q.repState(r).done) ? '?' : REPEATABLE.some(r => !Q.repState(r).accepted) ? '!' : null;
  const P = G.profile; const tr = G.npcs.find(n => n.id === 'trainer'); if (tr && !tr.marker && (P.attrPts || P.skillPts)) tr.marker = '+';
}
export { Q };
