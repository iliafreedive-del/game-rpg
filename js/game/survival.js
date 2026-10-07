// «Жатва Бездны» — survivors-like mode: an open arena, endless waves, the hero attacks automatically,
// the player only moves. Enemies drop soul crystals → run level → pick 1 of 3 perks (weapons, passives, evolutions).
import { G, bus } from './ctx.js';
import { STORY } from '../data/quests.js';
import { ENEMIES } from '../data/enemies.js';
import * as C from './combat.js';
import { getAtlas, drawFrame } from '../core/assets.js';
import { PX_PER_M } from '../core/iso.js';
import { rand, rrange } from '../core/util.js';

// ---------------------------------------------------------------- perks
export const PERKS = {
  main:   { name: 'Оружие класса', max: 5, w: 1, desc: l => l ? 'Урон и частота основной атаки +25%' : 'Ваше оружие' },
  knives: { name: 'Метательные кинжалы', max: 5, w: 1, icon: '🗡', desc: l => l ? `+1 кинжал, урон +15%` : 'Бросает кинжалы по направлению бега' },
  blades: { name: 'Танцующие клинки', max: 5, w: 1, icon: '✦', desc: l => l ? '+1 клинок на орбите' : 'Клинки вращаются вокруг героя' },
  nova:   { name: 'Кольцо Бездны', max: 5, w: 1, icon: '◌', desc: l => l ? 'Радиус и урон кольца +15%' : 'Кольцо фиолетового огня каждые 3 с' },
  chain:  { name: 'Цепная молния', max: 5, w: 1, icon: 'ϟ', desc: l => l ? '+1 прыжок, урон +15%' : 'Молния прыгает между врагами' },
  shards: { name: 'Ледяная звезда', max: 5, w: 1, icon: '❄', desc: l => l ? '+2 осколка' : 'Осколки льда во все стороны, замедляют' },
  pool:   { name: 'Горящая земля', max: 5, w: 1, icon: '♨', desc: l => l ? 'Больше и дольше' : 'Поджигает землю под врагами' },
  might:  { name: 'Мощь', max: 5, passive: 1, icon: '⚔', desc: () => '+12% ко всему урону' },
  haste:  { name: 'Спешка', max: 5, passive: 1, icon: '⚡', desc: () => 'Оружие срабатывает на 8% чаще' },
  area:   { name: 'Размах', max: 5, passive: 1, icon: '◎', desc: () => '+12% к площади атак' },
  swift:  { name: 'Лёгкие сапоги', max: 5, passive: 1, icon: '»', desc: () => '+8% к скорости бега' },
  magnet: { name: 'Притяжение душ', max: 5, passive: 1, icon: '◆', desc: () => '+40% к радиусу сбора кристаллов' },
  vigor:  { name: 'Жизненная сила', max: 5, passive: 1, icon: '♥', desc: () => '+20% здоровья и восстановление' },
};
export const EVOS = [
  { id: 'evo_blades', from: 'blades', need: 'haste', name: 'Вихрь стали', desc: 'Клинков вдвое больше, урон ×2' },
  { id: 'evo_nova', from: 'nova', need: 'area', name: 'Инферно', desc: 'Кольцо каждые 1,5 с и огромный радиус' },
  { id: 'evo_chain', from: 'chain', need: 'might', name: 'Небесный гнев', desc: 'Молнии бьют трижды за раз' },
  { id: 'evo_shards', from: 'shards', need: 'swift', name: 'Буран', desc: 'Двойная волна осколков, замораживает' },
  { id: 'evo_knives', from: 'knives', need: 'magnet', name: 'Ливень кинжалов', desc: 'Кинжалы летят во все стороны' },
  { id: 'evo_main', from: 'main', need: 'vigor', name: 'Оружие героя', desc: 'Основная атака ×2.5 и пронзает всех' },
];
export const ACH = [
  { id: 's5', name: 'Выжить 5 минут', test: S => S.t >= 300, gold: 300, shards: 2 },
  { id: 's10', name: 'Выжить 10 минут', test: S => S.t >= 600, gold: 800, shards: 5 },
  { id: 's15', name: 'Выжить 15 минут', test: S => S.t >= 900, gold: 1500, shards: 8 },
  { id: 's20', name: 'Продержаться 20 минут', test: S => S.t >= 1200, gold: 3000, shards: 15 },
  { id: 'k300', name: 'Убить 300 врагов за забег', test: S => S.kills >= 300, gold: 300, shards: 2 },
  { id: 'k1000', name: 'Убить 1000 врагов за забег', test: S => S.kills >= 1000, gold: 1200, shards: 6 },
  { id: 'evo', name: 'Пробудить оружие', test: S => Object.keys(S.evo).length > 0, gold: 500, shards: 4 },
  { id: 'lv25', name: 'Достичь 25 уровня в забеге', test: S => S.lvl >= 25, gold: 800, shards: 5 },
  { id: 'boss', name: 'Победить Палача жатвы', test: S => S.bossKills > 0, gold: 1000, shards: 8 },
];
export const REQ_LEVEL = 5, GOAL = 20 * 60;

// ---------------------------------------------------------------- arena
export function generateArena() {
  const W = 100, H = 100, rows = [];   // огромная арена: бегать и отступать есть где
  for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) r += (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) ? '#' : '.'; rows.push(r); }
  let s = 99; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const o = [];
  for (let k = 0; k < 70; k++) { const x = 5 + R() * (W - 10), y = 5 + R() * (H - 10); if (Math.hypot(x - W / 2, y - H / 2) < 6) continue; o.push({ t: ['crystals', 'stalagmite', 'lavarock', 'rocks', 'skulls', 'mushrooms', 'bones', 'pillar'][k % 8], x, y }); }
  for (let k = 0; k < 16; k++) o.push({ t: 'brazier', x: W / 2 + Math.cos(k / 16 * 6.283) * (14 + (k % 2) * 14), y: H / 2 + Math.sin(k / 16 * 6.283) * (14 + (k % 2) * 14) });
  return { name: 'Жатва Бездны', floorN: 666, dungeon: true, survival: true, biome: 'abyss', w: W, h: H, rows, objects: o, torches: [], spawns: [], total: 0, rooms: {}, start: [W / 2, H / 2], level: 1, story: [] };
}

// ---------------------------------------------------------------- run state
const TYPES = [
  { type: 'skel_warrior', from: 0, hp: 14, spd: 1.9, dmg: 6, xp: 1 },
  { type: 'ghoul', from: 30, hp: 10, spd: 3.2, dmg: 5, xp: 1 },
  { type: 'skel_mage', from: 120, hp: 22, spd: 1.8, dmg: 8, xp: 2 },
  { type: 'beast', from: 200, hp: 60, spd: 2.3, dmg: 12, xp: 4 },
  { type: 'skel_archer', from: 320, hp: 26, spd: 2.4, dmg: 9, xp: 2 },
];
export function startRun() {
  const S = G.surv = { trial: G.profile.story.stage === STORY.findIndex(q => q.id === 'surv_try'), t: 0, kills: 0, lvl: 1, xp: 0, next: 12, swarm: [], gems: [], projs: [], pools: [], w: { main: 1 }, p: {}, evo: {}, cd: {}, spawnT: 0, eliteT: 150, bossT: 600, bossKills: 0, gold: 0, over: false, hp0: G.stats.maxHP, ach: {}, orbit: 0, pending: 0 };
  G.player.hp = G.stats.maxHP; G.auto = false;
  bus.emit('toast', { text: 'Жатва Бездны', sub: 'Только бегайте — герой бьёт сам. Собирайте кристаллы душ.', kind: 'quest' });
  return S;
}
const might = () => 1 + (G.surv.p.might || 0) * 0.12;
const haste = () => 1 - (G.surv.p.haste || 0) * 0.08;
const area = () => 1 + (G.surv.p.area || 0) * 0.12;
export const moveMul = () => G.surv ? 1 + (G.surv.p.swift || 0) * 0.08 : 1;
const baseDmg = () => { const s = G.stats; return (s.dmgMin + s.dmgMax) / 2 * might() * (1 + (G.surv.w.main - 1) * 0.25); };

// ---------------------------------------------------------------- update
export function updateSurvival(dt) {
  const S = G.surv; if (!S || S.over) return;
  const pl = G.player; if (pl.dead) { if (!S.asking) endRun(false); return; }
  S.t += dt;
  // spawns: density grows every minute
  S.spawnT -= dt;
  const mins = S.t / 60, cap = Math.min(G.render3d ? 75 : 170, 28 + mins * 12);   // в 3D каждый враг — настоящая модель, поэтому потолок ниже
  if (S.spawnT <= 0 && S.swarm.length < cap) {
    S.spawnT = Math.max(0.18, 0.9 - mins * 0.05);
    const n = 1 + Math.floor(mins / 1.5);
    const pool = TYPES.filter(t => S.t >= t.from);
    for (let i = 0; i < n; i++) spawn(pool[Math.floor(rand() * pool.length)], false);
  }
  S.eliteT -= dt; if (S.eliteT <= 0) { S.eliteT = 120; spawn({ type: 'elite_guard', hp: 420, spd: 2.1, dmg: 18, xp: 25 }, true); bus.emit('toast', { text: 'Страж жатвы!', kind: 'warn' }); }
  S.bossT -= dt; if (S.bossT <= 0) { S.bossT = 600; spawn({ type: 'boss', hp: 3000, spd: 2.2, dmg: 28, xp: 120 }, true, true); bus.emit('toast', { text: 'Палач жатвы пришёл за вами!', kind: 'warn' }); bus.emit('sfx', 'roar'); }
  const hpMul = 1 + mins * 0.45 + Math.max(0, mins - 10) * 0.4;
  // enemies: chase + cheap separation via spatial hash
  const grid = new Map(); const key = (x, y) => (x | 0) * 1000 + (y | 0);
  for (const e of S.swarm) { const k = key(e.x, e.y); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e); }
  const map = G.zone.map;
  for (const e of S.swarm) {
    e.t += dt; e.flash -= dt; e.hitCd -= dt; if (e.slowT > 0) e.slowT -= dt; if (e.burn > 0) { e.burn -= dt; hitE(e, e.burnDps * dt, true); }
    let vx = pl.x - e.x, vy = pl.y - e.y; const d = Math.hypot(vx, vy) || 1; vx /= d; vy /= d;
    for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) { const a = grid.get(key(e.x + gx, e.y + gy)); if (a) for (const o of a) { if (o === e) continue; const ox = e.x - o.x, oy = e.y - o.y, dd = ox * ox + oy * oy, rr = (e.r + o.r) * 0.9; if (dd < rr * rr && dd > 1e-4) { const k2 = (rr - Math.sqrt(dd)) * 3; vx += ox * k2; vy += oy * k2; } } }
    const sp = e.spd * (e.slowT > 0 ? 0.5 : 1) * dt; const nx = e.x + vx * sp, ny = e.y + vy * sp;
    if (!map.blocked(nx | 0, ny | 0)) { e.x = nx; e.y = ny; }
    e.dir = dirOf8(vx, vy);
    if (d < e.r + pl.r + 0.15 && e.hitCd <= 0 && pl.inv <= 0) { e.hitCd = 0.9; C.hurtPlayer({ lvl: 1 + mins | 0 }, e.dmg * (1 + mins * 0.12), 'phys'); }
  }
  weapons(dt);
  // projectiles
  for (const p of S.projs) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    for (const e of S.swarm) { if (e.dead || p.hit.has(e)) continue; if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + p.r) ** 2) { p.hit.add(e); hitE(e, p.dmg); if (p.slow) { e.slowT = 1.2; if (Math.random() < 0.3) C.effect({ kind: 'shatter', x: e.x, y: e.y, r: 0.5, dur: 0.4, seed: Math.random() * 6 }); } if (--p.pierce < 0) { p.life = 0; break; } } }
  }
  S.projs = S.projs.filter(p => p.life > 0);
  // burning ground
  for (const q of S.pools) { if (!q.fx) { q.fx = 1; C.effect({ kind: 'firepool', x: q.x, y: q.y, r: q.r, dur: q.t }); } q.t -= dt; q.tick -= dt; if (q.tick <= 0) { q.tick = 0.4; for (const e of S.swarm) if (!e.dead && (e.x - q.x) ** 2 + (e.y - q.y) ** 2 < q.r * q.r) hitE(e, q.dps * 0.4, true); } }
  S.pools = S.pools.filter(q => q.t > 0);
  // deaths → gems
  for (const e of S.swarm) if (e.hp <= 0 && !e.dead) {
    e.dead = true; S.kills++; G.profile.stats.kills++;
    S.gems.push({ x: e.x, y: e.y, v: e.xp, big: e.xp >= 4 });
    if (rand() < 0.03) S.gems.push({ x: e.x + 0.3, y: e.y, gold: 3 + (mins | 0) });
    if (e.boss) { S.bossKills++; for (let k = 0; k < 3; k++) S.pending++; bus.emit('toast', { text: 'Палач повержен!', sub: '+3 выбора перков', kind: 'good' }); }
    C.particles(e.x, e.y, 5, { c: [200, 140, 255], z: 0.8, sp: 2, size: 3, life: 0.4 });
  }
  S.swarm = S.swarm.filter(e => !e.dead);
  // gems: magnet + collect
  const mag = 1.8 * (1 + (S.p.magnet || 0) * 0.4);
  for (const g of S.gems) {
    const dx = pl.x - g.x, dy = pl.y - g.y, d = Math.hypot(dx, dy);
    if (d < mag || g.pull) { g.pull = true; const k = Math.min(1, dt * 10 / Math.max(0.2, d)); g.x += dx * k; g.y += dy * k; }
    if (d < 0.5) { g.taken = true; if (g.gold) { S.gold += g.gold; bus.emit('sfx', 'coin'); } else { S.xp += g.v; bus.emit('sfx', 'pickup'); } }
  }
  S.gems = S.gems.filter(g => !g.taken);
  if (S.gems.length > 400) S.gems.splice(0, S.gems.length - 400);
  while (S.xp >= S.next) { S.xp -= S.next; S.lvl++; S.next = Math.round(10 + S.lvl * 8 + S.lvl * S.lvl * 0.5); S.pending++; }
  if (S.pending > 0 && !G.modalOpen) { S.pending--; bus.emit('survLevel'); }
  pl.hp = Math.min(G.stats.maxHP, pl.hp + (S.p.vigor || 0) * 0.6 * dt);
  for (const a of ACH) if (!S.ach[a.id] && a.test(S)) { S.ach[a.id] = 1; bus.emit('toast', { text: '🏆 ' + a.name, sub: `+${a.gold} зол. · +${a.shards}◆ после забега`, kind: 'quest' }); bus.emit('sfx', 'quest'); }
  if (S.t >= GOAL) endRun(true);
  // сборка 47: пробная Жатва в обучении — портал держится 3 минуты
  if (S.trial && S.t >= TRIAL_T) { bus.emit('toast', { text: 'Портал Жатвы закрывается!', sub: 'Староста не может держать его дольше', kind: 'warn' }); endRun(false); }
}
const TRIAL_T = 180;
// сборка 47: первая смерть за забег — окно «Возродиться за рекламу / Выйти» (js/ui/windows.js survDeath)
export function offerRevive() { const S = G.surv; if (!S || S.over || S.revived) return false; S.asking = S.revived = true; bus.emit('survDeath'); return true; }
export function revive(ok) {
  const S = G.surv, pl = G.player; if (!S || S.over) return; S.asking = false;
  if (!ok) { endRun(false); return; }
  pl.dead = false; pl.hp = G.stats.maxHP;
  for (const e of S.swarm) { const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy) || 1; if (d < 6) { e.x = pl.x + dx / d * 6; e.y = pl.y + dy / d * 6; } }   // враги отброшены от героя
  C.effect({ kind: 'ring', x: pl.x, y: pl.y, r: 6, dur: 0.6, c: [255, 220, 150] }); bus.emit('sfx', 'levelup');
}
const dirOf8 = (x, y) => ((Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8);
// враги появляются ЗА краем экрана, а не из воздуха на глазах: ищем по случайному направлению ближайшую точку, которая на экран не попадает
const offscreen = (x, y) => { const c = G.cam, [sx, sy] = c.toScreen(x, y, 0.5); return sx < -70 || sx > c.w + 70 || sy < -90 || sy > c.h + 90; };
function spawn(t, elite, boss) {
  const S = G.surv, pl = G.player, map = G.zone.map;
  let x = pl.x, y = pl.y, ok = false;
  for (let k = 0; k < 4 && !ok; k++) {
    const a = rand() * 6.283;
    for (let r = 9; r < 46 && !ok; r += 1.5) {
      x = pl.x + Math.cos(a) * r; y = pl.y + Math.sin(a) * r;
      ok = x > 3 && y > 3 && x < map.w - 3 && y < map.h - 3 && !map.blocked(x | 0, y | 0) && offscreen(x, y);
    }
  }
  if (!ok) return;
  const mins = S.t / 60, hpMul = 1 + mins * 0.45 + Math.max(0, mins - 10) * 0.4;
  const D = ENEMIES[t.type];
  S.swarm.push({ type: t.type, atlas: D.atlas, x, y, hp: t.hp * hpMul, max: t.hp * hpMul, spd: t.spd * (1 + mins * 0.02), dmg: t.dmg, xp: t.xp, r: boss ? 0.8 : elite ? 0.55 : t.type === 'beast' ? 0.45 : 0.32, t: rand() * 2, flash: 0, hitCd: 0, dir: 0, elite, boss });
}
function hitE(e, d, quiet) {
  const S = G.surv; let crit = false; if (!quiet && rand() < G.stats.critChance) { d *= G.stats.critMult; crit = true; }
  e.hp -= d; if (!quiet) e.flash = 0.1;
  if (!quiet && (crit || e.elite || e.boss)) C.float(e.x, e.y, Math.round(d) + (crit ? '!' : ''), crit ? '#ffd23a' : '#fff', { z: 1.6, big: crit ? 1 : 0, life: 0.6 });
}
function nearest(x, y, R, skip) { let b = null, bd = R * R; for (const e of G.surv.swarm) { if (e.dead || (skip && skip.has(e))) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; b = e; } } return b; }
function ready(id, cd) { const S = G.surv; S.cd[id] = (S.cd[id] ?? 0.5) - G.dt; if (S.cd[id] > 0) return false; S.cd[id] = cd * haste(); return true; }
function weapons(dt) {
  const S = G.surv, pl = G.player, w = S.w, cls = G.profile.cls || 'warrior', D = baseDmg(), A = area();
  // main class weapon
  const evoMain = S.evo.evo_main ? 2.5 : 1;
  S.fireT = Math.max(0, (S.fireT || 0) - dt);   // для 3D: пока >0 герой играет анимацию выстрела/удара
  if (cls === 'warrior') {
    if (ready('main', 1.15 - w.main * 0.07)) { S.fireT = 0.4; const R = 2.2 * A; C.effect({ kind: 'slash', x: pl.x, y: pl.y, a: S.orbit * 2, r: R * 0.8, arc: 330, dur: 0.28 }); C.effect({ kind: 'ring', x: pl.x, y: pl.y, r: R, dur: 0.25, c: [255, 235, 200] }); for (const e of S.swarm) if ((e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 < (R + e.r) ** 2) { hitE(e, D * 1.2 * evoMain); const l = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; e.x += (e.x - pl.x) / l * 0.4; e.y += (e.y - pl.y) / l * 0.4; } bus.emit('sfx', 'swing'); }
  } else {
    if (ready('main', (cls === 'archer' ? 0.7 : 0.85) - w.main * 0.05)) {
      const t = nearest(pl.x, pl.y, 11); if (t) { S.fireT = 0.42; S.fireClip = cls; pl.faceTo(t.x, t.y); const n = 1 + Math.floor(w.main / 2); const a0 = Math.atan2(t.y - pl.y, t.x - pl.x);
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.14; S.projs.push({ kind: cls === 'archer' ? 'arrow' : 'bolt', x: pl.x, y: pl.y, vx: Math.cos(a) * 14, vy: Math.sin(a) * 14, dmg: D * (cls === 'mage' ? 1.3 : 1) * evoMain, r: 0.3, pierce: S.evo.evo_main ? 99 : cls === 'archer' ? 1 : 0, life: 1.1, hit: new Set() }); }
        bus.emit('sfx', cls === 'archer' ? 'bow' : 'cast'); }
    }
  }
  if (w.knives && ready('knives', 0.7)) { const face = G.player.face * Math.PI / 4; const n = w.knives + 1; const all = S.evo.evo_knives;
    for (let i = 0; i < (all ? 12 : n); i++) { const a = all ? i / 12 * 6.283 : face + (i - (n - 1) / 2) * 0.12; S.projs.push({ kind: 'knife', x: pl.x, y: pl.y, vx: Math.cos(a) * 16, vy: Math.sin(a) * 16, dmg: D * 0.6 * (1 + w.knives * 0.15), r: 0.25, pierce: 1, life: 0.8, hit: new Set() }); } }
  if (w.blades) { S.orbit += dt * 3.4; const n = (w.blades + 1) * (S.evo.evo_blades ? 2 : 1); S.bladePts = [];
    for (let k = 0; k < n; k++) { const a = S.orbit + k / n * 6.283, R = 1.8 * A; const bx = pl.x + Math.cos(a) * R, by = pl.y + Math.sin(a) * R; S.bladePts.push([bx, by, a]);
      for (const e of S.swarm) { e.bcd = (e.bcd || 0) - dt / n; if (e.bcd <= 0 && (e.x - bx) ** 2 + (e.y - by) ** 2 < (0.5 + e.r) ** 2) { e.bcd = 0.4; hitE(e, D * 0.55 * (S.evo.evo_blades ? 2 : 1)); } } } }
  if (w.nova && ready('nova', S.evo.evo_nova ? 1.5 : 3)) { const R = (2.4 + w.nova * 0.3) * A * (S.evo.evo_nova ? 1.6 : 1); C.effect({ kind: 'ring', x: pl.x, y: pl.y, r: R, dur: 0.5, c: [190, 110, 255] }); C.effect({ kind: 'firepool', x: pl.x, y: pl.y, r: R * 0.8, dur: 0.6 }); C.particles(pl.x, pl.y, 18, { c: [200, 120, 255], z: 0.3, sp: R * 2, size: 4, life: 0.5 }); for (const e of S.swarm) if ((e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 < (R + e.r) ** 2) hitE(e, D * 0.9 * (1 + w.nova * 0.15)); bus.emit('sfx', 'fire'); }
  if (w.chain && ready('chain', 2)) { for (let rep = 0; rep < (S.evo.evo_chain ? 3 : 1); rep++) { let px = pl.x, py = pl.y; const hit = new Set(); for (let j = 0; j < 3 + w.chain; j++) { const t = nearest(px, py, j ? 5 : 9, hit); if (!t) break; hit.add(t); C.lightningArc(px, py, t.x, t.y); hitE(t, D * 1.1 * (1 + w.chain * 0.15)); px = t.x; py = t.y; } } bus.emit('sfx', 'zap'); }
  if (w.shards && ready('shards', 2.5)) { for (let wave = 0; wave < (S.evo.evo_shards ? 2 : 1); wave++) { const n = 6 + w.shards * 2; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + wave * 0.2; S.projs.push({ kind: 'shard', x: pl.x, y: pl.y, vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, dmg: D * 0.7, r: 0.28, pierce: 1, life: 0.9, hit: new Set(), slow: 1 }); } } bus.emit('sfx', 'ice'); }
  if (w.pool && ready('pool', 3)) { const t = nearest(pl.x, pl.y, 9); if (t) S.pools.push({ x: t.x, y: t.y, r: (1.4 + w.pool * 0.2) * A, t: 3 + w.pool * 0.5, dps: D * 0.8, tick: 0 }); }
}

// ---------------------------------------------------------------- level-up choices
export function choices() {
  const S = G.surv, out = [];
  for (const E of EVOS) if (!S.evo[E.id] && (E.from === 'main' ? S.w.main : S.w[E.from]) >= 5 && (S.p[E.need] || 0) >= 1) out.push({ evo: E });
  const nW = Object.keys(S.w).length, nP = Object.keys(S.p).length;
  const pool = Object.entries(PERKS).filter(([id, P]) => { const cur = P.passive ? S.p[id] || 0 : S.w[id] || 0; if (cur >= P.max) return false; if (!cur && (P.passive ? nP >= 5 : nW >= 6)) return false; return true; });
  pool.sort(() => rand() - 0.5);
  for (const [id, P] of pool) { if (out.length >= 3) break; out.push({ id, P, lvl: P.passive ? S.p[id] || 0 : S.w[id] || 0 }); }
  if (!out.length) out.push({ gold: true });
  return out;
}
export function take(c) {
  const S = G.surv;
  if (c.evo) { S.evo[c.evo.id] = 1; bus.emit('toast', { text: 'Пробуждение: ' + c.evo.name, sub: c.evo.desc, kind: 'quest' }); bus.emit('sfx', 'epicDrop'); return; }
  if (c.gold) { S.gold += 50; return; }
  if (c.P.passive) S.p[c.id] = (S.p[c.id] || 0) + 1; else S.w[c.id] = (S.w[c.id] || 0) + 1;
  if (c.id === 'vigor') { G.stats.maxHP = Math.round(G.stats.maxHP * 1.2); G.player.hp = Math.min(G.stats.maxHP, G.player.hp + G.stats.maxHP * 0.2); }
  bus.emit('sfx', 'learn');
}

// ---------------------------------------------------------------- end
export function endRun(win) {
  const S = G.surv; if (!S || S.over) return; S.over = true;
  const P = G.profile; P.surv = P.surv || { best: 0, ach: {}, runs: 0 };
  const mins = S.t / 60; const gold = Math.round(S.gold + S.kills * 0.6 + mins * 35); let shards = Math.floor(mins / 4);
  let achGold = 0; const newAch = [];
  for (const a of ACH) if (S.ach[a.id] && !P.surv.ach[a.id]) { P.surv.ach[a.id] = 1; achGold += a.gold; shards += a.shards; newAch.push(a.name); }
  P.gold += gold + achGold; P.shards = (P.shards || 0) + shards; P.surv.runs++; const record = S.t > P.surv.best; if (record) P.surv.best = S.t;
  G.player.dead = false; G.player.hp = G.stats.maxHP;
  if (S.trial) P.story.flags.survTried = true;   // шаг обучения засчитан при любом исходе (смерть, выход, 3 минуты)
  bus.emit('survEnd', { win, t: S.t, kills: S.kills, lvl: S.lvl, gold: gold + achGold, shards, newAch, record });
  bus.emit('save');
}
// ---------------------------------------------------------------- draw (called by renderer inside the depth-sorted world pass)
export function survivalDrawables(list, cam, W, H) {
  const S = G.surv; if (!S) return;
  for (const e of S.swarm) { const [x, y] = cam.toScreen(e.x, e.y); if (x < -80 || x > W + 80 || y < -120 || y > H + 60) continue; list.push({ k: e.x + e.y + 0.05, t: 5, e, x, y }); }
}
const MIRROR = { 0: [0, 0], 1: [1, 0], 2: [0, 1], 3: [3, 0], 4: [4, 0], 5: [5, 0], 6: [4, 1], 7: [3, 1] };
export function drawSwarmUnit(ctx, it, zoom) {
  const e = it.e, A = getAtlas(e.atlas); if (!A) return;
  const nf = (A.clips.walk || [8])[0]; const f = Math.floor(e.t * 10) % nf; const [d, fl] = MIRROR[e.dir];
  const sc = zoom * PX_PER_M / A.ppm * (e.boss ? 1 : e.elite ? 1.15 : 1);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(it.x, it.y, e.r * 34 * zoom, e.r * 17 * zoom, 0, 0, 7); ctx.fill();
  drawFrame(ctx, A, `walk_${d}_${f}`, it.x, it.y, sc, !!fl);
  if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; drawFrame(ctx, A, `walk_${d}_${f}`, it.x, it.y, sc, !!fl); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  if (e.elite || e.boss) { const w = e.boss ? 90 : 56; ctx.fillStyle = '#000b'; ctx.fillRect(it.x - w / 2, it.y - (e.boss ? 150 : 95) * zoom, w, 5); ctx.fillStyle = e.boss ? '#b04ae0' : '#e8a42a'; ctx.fillRect(it.x - w / 2, it.y - (e.boss ? 150 : 95) * zoom, w * Math.max(0, e.hp / e.max), 5); }
}
export function drawSurvivalFx(ctx, cam) {
  const S = G.surv; if (!S) return; const z = cam.zoom;
  for (const q of S.pools) { const [x, y] = cam.toScreen(q.x, q.y); ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.r * 45 * z); g.addColorStop(0, 'rgba(255,150,40,0.55)'); g.addColorStop(1, 'rgba(255,60,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, q.r * 45 * z, 0, 7); ctx.fill(); ctx.restore(); }
  for (const g of S.gems) { const [x, y] = cam.toScreen(g.x, g.y, 0.25); ctx.fillStyle = g.gold ? '#ffd45a' : g.big ? '#ff6ad8' : '#7ae0ff'; ctx.save(); ctx.translate(x, y); ctx.rotate(0.785); const s = (g.big ? 6 : 4) * Math.max(0.8, z); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore(); }
  ctx.globalCompositeOperation = 'lighter';
  for (const p of S.projs) {
    const [x, y] = cam.toScreen(p.x, p.y, 0.9), [x2, y2] = cam.toScreen(p.x - p.vx * 0.05, p.y - p.vy * 0.05, 0.9); const ang = Math.atan2(y - y2, x - x2);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (p.kind === 'knife') { ctx.fillStyle = '#eef3ff'; ctx.shadowColor = '#bcd4ff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(10 * z, 0); ctx.lineTo(-4 * z, -2.5 * z); ctx.lineTo(-4 * z, 2.5 * z); ctx.fill(); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-9 * z, -1.5 * z, 5 * z, 3 * z); }
    else if (p.kind === 'shard') { ctx.fillStyle = 'rgba(220,250,255,0.95)'; ctx.shadowColor = '#8fdcff'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(11 * z, 0); ctx.lineTo(0, -4 * z); ctx.lineTo(-9 * z, 0); ctx.lineTo(0, 4 * z); ctx.fill(); }
    else if (p.kind === 'arrow') { const g = ctx.createLinearGradient(-40 * z, 0, 8 * z, 0); g.addColorStop(0, 'rgba(255,210,120,0)'); g.addColorStop(1, 'rgba(255,230,160,1)'); ctx.strokeStyle = g; ctx.lineWidth = 3.5 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-40 * z, 0); ctx.lineTo(6 * z, 0); ctx.stroke(); }
    else { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 16 * z); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(180,140,255,0.9)'); g.addColorStop(1, 'rgba(120,80,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 16 * z, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(170,140,255,0.5)'; ctx.lineWidth = 6 * z; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30 * z, 0); ctx.stroke(); }
    ctx.restore();
  }
  if (S.bladePts) for (const [bx, by, a] of S.bladePts) { const [x, y] = cam.toScreen(bx, by, 0.9); ctx.save(); ctx.translate(x, y); ctx.rotate(a * 3); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 20 * z); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(200,190,255,0.5)'); g.addColorStop(1, 'rgba(120,90,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 20 * z, 5 * z, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.globalCompositeOperation = 'source-over';
}
