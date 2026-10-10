// Питомцы (сборка 58): один зверёк ходит за героем по деревне, подземельям, Цитадели и походам и сам дерётся.
// Состояние — G.pet (только логика; вид рисует renderer3d.js syncPet). Сохранение — P.pets: { own: { id: уровень }, active, met }.
// Урон слабый (доля среднего удара героя), у каждого свой эффект: поджог, яд, лечение героя, щит и т. д.
import { G, bus } from './ctx.js';
import { PETS, PET_MAX, petPrice, petUpCost, petReqLevel, GIFT_PET, TRAIN, TRAIN_MAX, TRAIN_STEP, trainCost } from '../data/pets.js';
import * as C from './combat.js';
import { dropGold } from './loot.js';
import { addShards } from './castle.js';
import { rand, rint } from '../core/util.js';
import { dirVec } from '../core/iso.js';

export function petsOf(P) {
  const S = P.pets || (P.pets = { own: {}, active: null, met: false });
  S.tr = S.tr || { phys: 0, mag: 0 };   // П29: дрессировка у Кофи
  for (const id in S.own) if (!PETS[id]) delete S.own[id];   // скарабей и кобра убраны (сборка 58)
  if (S.active && !PETS[S.active]) S.active = null;
  return S;
}
const LV = l => 1 + 0.15 * (l - 1);

// ---------------------------------------------------------------- лавка Кофи
export function petCan(id) {
  const P = G.profile, S = petsOf(P), lvl = S.own[id];
  if (!lvl) {
    if (P.level < petReqLevel(id)) return { ok: false, why: `ур. ${petReqLevel(id)}` };
    return { ok: (P.shards || 0) >= petPrice(id), cost: petPrice(id), buy: true };
  }
  if (lvl >= PET_MAX) return { ok: false, max: true };
  return { ok: (P.shards || 0) >= petUpCost(id, lvl), cost: petUpCost(id, lvl), up: true };
}
export function buyPet(id) {
  const P = G.profile, S = petsOf(P), c = petCan(id);
  if (!c.ok || !c.buy) { bus.emit('sfx', 'deny'); if (c.buy) bus.emit('toast', { text: `Нужно ${c.cost}◆ осколков Бездны`, sub: 'Осколки дают стражи, боссы, чемпионы, сундуки и недельные задания', kind: 'warn' }); return false; }
  P.shards -= c.cost; S.own[id] = 1; S.active = id; spawnPet(true);
  bus.emit('toast', { text: `${PETS[id].icon} ${PETS[id].name} теперь с вами`, sub: PETS[id].desc, kind: 'quest' }); bus.emit('sfx', 'rareDrop'); bus.emit('hud'); bus.emit('save'); return true;
}
export function upgradePet(id) {
  const P = G.profile, S = petsOf(P), c = petCan(id);
  if (!c.ok || !c.up) { bus.emit('sfx', 'deny'); return false; }
  P.shards -= c.cost; S.own[id]++; if (G.pet && G.pet.id === id) G.pet.lvl = S.own[id];
  bus.emit('float', { x: G.player.x, y: G.player.y, text: `${PETS[id].name} ↑`, color: '#9fe38e', z: 2.4 }); bus.emit('sfx', 'anvil'); bus.emit('hud'); bus.emit('save'); return true;
}
// ---------------------------------------------------------------- П29: дрессировка за золото (физ. и маг. урон всех питомцев)
export const trainMul = (kind, P = G.profile) => 1 + TRAIN_STEP * ((P && P.pets && P.pets.tr && P.pets.tr[kind]) || 0);
export function trainCan(kind) {
  const P = G.profile, l = petsOf(P).tr[kind] || 0; if (l >= TRAIN_MAX) return { ok: false, max: true, lvl: l };
  const cost = trainCost(l); return { ok: P.gold >= cost, cost, lvl: l };
}
export function trainPet(kind) {
  const P = G.profile, S = petsOf(P), c = trainCan(kind);
  if (!TRAIN[kind] || !c.ok) { bus.emit('sfx', 'deny'); if (c.cost) bus.emit('toast', { text: `Нужно ${c.cost} золота`, kind: 'warn' }); return false; }
  P.gold -= c.cost; S.tr[kind] = c.lvl + 1;
  bus.emit('float', { x: G.player.x, y: G.player.y, text: `${TRAIN[kind].name} питомца ↑`, color: '#9fe38e', z: 2.4 }); bus.emit('sfx', 'anvil'); bus.emit('hud'); bus.emit('save'); return true;
}
// сила питомца для окна характеристик: удар (физ.) и эффект (маг.) с учётом уровня питомца и дрессировки
export function petPower(id, P = G.profile) {
  const S = petsOf(P), lvl = S.own[id] || 1, D = PETS[id], st = G.stats || {}, avg = ((st.dmgMin || 1) + (st.dmgMax || 1)) / 2, base = avg * D.k * LV(lvl), r1 = v => +v.toFixed(1);
  // phys — урон удара (или игл), mag — урон искр / сила эффекта за удар (огонь 3 с, яд, вампиризм); 0 — у питомца этого нет
  return { lvl, phys: D.ranged && D.fx !== 'needle' ? 0 : r1(Math.max(1, base) * trainMul('phys', P)), mag: r1(base * trainMul('mag', P) * ({ burn: 1.05, poison: 0.6, leech: 0.6 }[D.fx] || (D.ranged && D.fx !== 'needle' ? 1 : 0))), physLvl: S.tr.phys, magLvl: S.tr.mag };
}
export function choosePet(id) {
  const S = petsOf(G.profile); if (id && !S.own[id]) return;
  S.active = S.active === id ? null : id; spawnPet(true); bus.emit('sfx', 'click'); bus.emit('save');
}
// первая встреча: Кофи дарит фенека
export function meetCaravan() {
  const S = petsOf(G.profile); if (S.met) return false;
  S.met = true; if (!S.own[GIFT_PET]) { S.own[GIFT_PET] = 1; if (!S.active) S.active = GIFT_PET; spawnPet(true); }
  bus.emit('save'); return true;
}

// ---------------------------------------------------------------- появление
export function spawnPet(near) {
  const P = G.profile, S = P && petsOf(P), id = S && S.active, pl = G.player;
  if (!id || !PETS[id] || !pl || !G.zone) { G.pet = null; return; }
  if (G.pet && G.pet.id === id && !near) return;
  const [x, y] = G.zone.map.nearestFree(pl.x - 0.9, pl.y + 0.9, 0.2);
  G.pet = { id, lvl: S.own[id] || 1, x, y, ang: 0, state: 'idle', act: null, cd: 0.5, healT: 0, shieldT: 4, stuck: 0, speed: 0 };
}
bus.on('zoneEntered', () => spawnPet(true));

// ---------------------------------------------------------------- поведение (каждый кадр из game.update)
export function updatePet(dt) {
  const p = G.pet, pl = G.player; if (!p || !pl) return;
  const D = PETS[p.id], map = G.zone.map, combat = G.zoneId !== 'town' && !pl.dead;
  if (p.act) { p.act.t += dt; if (!p.act.done && p.act.t >= p.act.dur * 0.5) { p.act.done = true; strike(p, p.act.e); } if (p.act.t >= p.act.dur) p.act = null; }
  p.cd -= dt;
  passive(p, dt, combat);
  // цель: та, что выбрал герой, иначе ближайший напавший рядом с героем
  let t = null;
  if (combat) {
    const ok = e => e && !e.dead && Math.hypot(e.x - pl.x, e.y - pl.y) < 8 && (e.aggro || G.auto);
    t = ok(pl.focus) ? pl.focus : C.nearestEnemy(pl.x, pl.y, 7, e => ok(e) && map.los(pl.x, pl.y, e.x, e.y));
  }
  let gx, gy, stop = 0.35;
  if (t) {
    const d = Math.hypot(t.x - p.x, t.y - p.y), reach = D.reach + t.r;
    if (d <= reach + 0.15 && (!D.ranged || map.los(p.x, p.y, t.x, t.y))) {
      p.ang = Math.atan2(t.y - p.y, t.x - p.x);
      if (p.cd <= 0 && !p.act) { p.cd = D.cd; p.act = { t: 0, dur: 0.5, e: t }; }
      gx = p.x; gy = p.y;
    } else { const k = (d - reach * 0.8) / (d || 1); gx = p.x + (t.x - p.x) * k; gy = p.y + (t.y - p.y) * k; stop = 0.1; }
  } else {
    // место у ноги героя: сзади слева по ходу
    const [fx, fy] = dirVec(pl.face ?? 1);
    gx = pl.x - fx * 1.0 - fy * 0.7; gy = pl.y - fy * 1.0 + fx * 0.7;
  }
  const dx = gx - p.x, dy = gy - p.y, d = Math.hypot(dx, dy);
  if (Math.hypot(pl.x - p.x, pl.y - p.y) > 12 || p.stuck > 1.5) {   // отстал или застрял — догоняет «прыжком» к герою
    [p.x, p.y] = map.nearestFree(pl.x - 0.8, pl.y + 0.8, 0.2); p.stuck = 0; p.speed = 0; return;
  }
  if (d > stop && !(p.act && !p.act.done)) {
    const v = Math.min(7.5, Math.max(2.2, d * 2.4)) * (D.speed || 1), st = Math.min(d, v * dt);
    const [nx, ny] = map.move(p.x, p.y, dx / d * st, dy / d * st, 0.2);
    const moved = Math.hypot(nx - p.x, ny - p.y);
    p.stuck = moved < st * 0.3 && d > 1.5 ? p.stuck + dt : 0;
    p.x = nx; p.y = ny; p.speed = moved / Math.max(dt, 1e-3);
    if (!t || d > 0.3) p.ang = Math.atan2(dy, dx);
  } else { p.speed = 0; if (!t && d < 0.5 && Math.hypot(pl.x - p.x, pl.y - p.y) > 0.3) p.ang = Math.atan2(pl.y - p.y, pl.x - p.x); }
}
function dmgOf(p) {
  const S = G.stats, avg = ((S.dmgMin || 1) + (S.dmgMax || 1)) / 2;
  return Math.max(1, avg * PETS[p.id].k * LV(p.lvl));
}
function strike(p, e) {
  if (!e || e.dead) return;
  const D = PETS[p.id], base = dmgOf(p), lv = p.lvl, mag = base * trainMul('mag'), dmg = D.ranged && D.fx !== 'needle' ? mag : base * trainMul('phys');   // П29: физ. — удар и иглы, маг. — искры и эффекты
  if (D.ranged) {
    const dx = e.x - p.x, dy = e.y - p.y, l = Math.hypot(dx, dy) || 1, sp = D.fx === 'needle' ? 14 : 10;
    C.spawnProj({ kind: D.fx === 'needle' ? 'shard' : 'bolt', x: p.x, y: p.y, z: 1.1, vx: dx / l * sp, vy: dy / l * sp, owner: 'p', dmg, elem: D.fx === 'needle' ? 'phys' : 'light', src: 'pet', range: D.reach + 2 });
    bus.emit('sfx', 'click'); return;
  }
  if (Math.hypot(e.x - p.x, e.y - p.y) > D.reach + e.r + 0.7) return;
  const done = C.damageEnemy(e, dmg, { src: 'pet', canCrit: false });
  if (e.dead) return;
  const s = e.st;
  switch (D.fx) {
    case 'burn': s.burn = 3; s.burnDps = Math.max(s.burnDps || 0, mag * 0.35); break;
    case 'poison': s.poison = Math.min(5, (s.poison || 0) + 1); s.poisonT = 4; s.poisonDps = Math.max(s.poisonDps || 0, mag * 0.15); break;
    case 'stun': if (rand() < 0.15 + 0.02 * (lv - 1)) { s.stun = Math.max(s.stun, e.D.boss ? 0.25 : e.D.elite ? 0.4 : 0.6); C.float(e.x, e.y, 'Оглушён', '#f0e08a'); } break;
    case 'leech': { const S = G.stats, h = Math.round(done * 0.6 * trainMul('mag')); if (h > 0 && pl().hp < S.maxHP) { pl().hp = Math.min(S.maxHP, pl().hp + h); C.float(pl().x, pl().y, '+' + h, '#7ef07a', { z: 2.3 }); } break; }
  }
}
const pl = () => G.player;
// эффекты без цели: огонёк лечит, голем ставит щит (только в бою)
function passive(p, dt, combat) {
  const D = PETS[p.id], P = G.player, S = G.stats; if (!S || P.dead) return;
  const fight = combat && G.time - (G.lastCombat || -99) < 4;
  if (D.fx === 'heal' && (p.healT += dt) >= 5) { p.healT = 0; if (P.hp < S.maxHP && combat) { const h = Math.round(S.maxHP * (0.03 + 0.005 * (p.lvl - 1)) * trainMul('mag')); P.hp = Math.min(S.maxHP, P.hp + h); C.float(P.x, P.y, '+' + h, '#7ef07a', { z: 2.3 }); C.particles(P.x, P.y, 6, { c: [190, 255, 170], z: 1.2, sp: 1, size: 3, life: 0.6 }); } }
  if (D.fx === 'shield' && (p.shieldT -= dt) <= 0) { p.shieldT = 8; if (fight) { P.shield = Math.min(S.maxHP * 0.3, (P.shield || 0) + S.maxHP * (0.06 + 0.01 * (p.lvl - 1)) * trainMul('mag')); C.float(P.x, P.y, 'Каменный щит', '#e0c08a', { z: 2.4 }); C.particles(P.x, P.y, 8, { c: [220, 180, 120], z: 0.8, sp: 1.5, size: 4, add: false, life: 0.7 }); } }
}
// ворон: с павших — горсть золота, изредка осколок
bus.on('kill', e => {
  const p = G.pet; if (!p || p.id !== 'crow' || G.zoneId === 'town' || !e || !e.D) return;
  if (rand() < 0.3 + 0.05 * (p.lvl - 1)) dropGold(e.x, e.y, rint(e.D.gold[0], e.D.gold[1]) * (1 + 0.12 * ((e.lvl || 1) - 1)) * 0.5);
  if (!e.D.boss && !e.D.elite && rand() < 0.02 + 0.006 * (p.lvl - 1)) addShards(1, e.x, e.y);
});
