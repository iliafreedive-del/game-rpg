// «Жатва Бездны» — survivors-like mode: an open arena, endless waves, the hero attacks automatically,
// the player only moves. Enemies drop soul crystals → run level → pick 1 of 3 perks (weapons, passives, evolutions).
import { G, bus } from './ctx.js';
import { ENEMIES, scaleHP, scaleDmg } from '../data/enemies.js';
import { xpToNext } from './stats.js';
import { gainXP } from './loot.js';
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
  // сборка 47: больше пассивок — выбор разнообразнее (как в Vampire Survivors)
  plate:  { name: 'Латы душ', max: 5, passive: 1, icon: '⛨', desc: () => '−8% получаемого урона' },
  growth: { name: 'Жажда душ', max: 5, passive: 1, icon: '✧', desc: () => '+12% опыта забега с кристаллов' },
  greed:  { name: 'Жадность', max: 5, passive: 1, icon: '⛁', desc: () => '+20% золота за забег' },
  eye:    { name: 'Острый глаз', max: 5, passive: 1, icon: '◎', desc: () => '+4% шанса крита в забеге' },
  fury:   { name: 'Ярость', max: 5, passive: 1, icon: '✹', desc: () => '+6% урона и +4% скорости оружия' },
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
// сборка 47: Жатва — знакомство на 3 минуты с 2-го уровня (один раз, до Палача), потом — после Палача Бездны, забег стоит 3 ⚡
export const REQ_LEVEL = 2, GOAL = 20 * 60, INTRO_T = 180, RUN_COST = 3;
// враги растут от уровня героя (раньше у них было 10–60 HP при любом герое) и от времени забега; урон по герою — тоже
const heroL = () => (G.profile && G.profile.level) || 1;
const timeHP = m => 1 + m * 0.6 + Math.pow(Math.max(0, m - 4), 1.5) * 0.35;
const timeDmg = m => 1 + m * 0.18 + Math.max(0, m - 8) * 0.12;

// ---------------------------------------------------------------- arena
// сборка 50: поле бесконечное, как в старой «змейке». Убранство повторяется плиткой TILE×TILE, а когда герой отходит от центра
// дальше WRAP, весь мир (герой, враги, кристаллы, снаряды, камера) незаметно сдвигается на TILE назад — картинка та же, края нет.
export const TILE = 40, WRAP = 20, ARENA_C = 60;
export function generateArena() {
  const W = 120, H = 120, rows = [];
  for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) r += (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) ? '#' : '.'; rows.push(r); }
  let s = 99; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const tile = [], c = ARENA_C % TILE;
  for (let k = 0; k < 15; k++) { const x = R() * TILE, y = R() * TILE; if (Math.hypot(x - c, y - c) < 6) continue; tile.push({ t: ['crystals', 'stalagmite', 'lavarock', 'rocks', 'skulls', 'mushrooms', 'bones', 'pillar'][k % 8], x, y }); }
  tile.push({ t: 'brazier', x: c + 8, y: c - 9 }, { t: 'brazier', x: c - 10, y: c + 7 }, { t: 'brazier', x: (c + 20) % TILE, y: (c + 20) % TILE });
  const o = [];
  for (let ty = 0; ty * TILE < H; ty++) for (let tx = 0; tx * TILE < W; tx++) for (const q of tile) { const x = q.x + tx * TILE, y = q.y + ty * TILE; if (x > 3 && y > 3 && x < W - 3 && y < H - 3) o.push({ ...q, x, y }); }
  return { name: 'Жатва Бездны', floorN: 666, dungeon: true, survival: true, biome: 'abyss', w: W, h: H, rows, objects: o, torches: [], spawns: [], total: 0, rooms: {}, start: [ARENA_C, ARENA_C], level: 1, story: [] };
}
// сдвиг мира на (dx, dy) — всё, что рисуется в мировых координатах
function shiftWorld(dx, dy) {
  const S = G.surv, pl = G.player, mv = o => { o.x += dx; o.y += dy; };
  mv(pl); G.cam.x += dx; G.cam.y += dy;
  for (const e of S.swarm) mv(e);   // сборка 55: отставших больше не переносят на плитку вперёд — они появлялись из воздуха прямо перед героем (см. catchUp)
  for (const a of [S.gems, S.projs, S.pools, S.eprojs, G.particles, G.texts]) for (const o of a) mv(o);
  for (const e of G.effects) { if (e.x != null) mv(e); if (e.x1 != null) { e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy; } }
  if (S.bladePts) for (const b of S.bladePts) { b[0] += dx; b[1] += dy; }
  if (S.lastX != null) { S.lastX += dx; S.lastY += dy; }
  bus.emit('worldShift', { dx, dy });
}

// ---------------------------------------------------------------- run state
const TYPES = [
  { type: 'skel_warrior', from: 0, hp: 14, spd: 1.9, dmg: 6, xp: 1 },
  { type: 'ghoul', from: 30, hp: 10, spd: 3.2, dmg: 5, xp: 1 },
  { type: 'skel_archer', from: 40, hp: 16, spd: 2.2, dmg: 7, xp: 2, shoot: 'arrow' },   // сборка 50: стрелки — стоять на месте нельзя
  { type: 'skel_mage', from: 120, hp: 22, spd: 1.8, dmg: 8, xp: 2, shoot: 'orb' },
  { type: 'beast', from: 200, hp: 60, spd: 2.3, dmg: 12, xp: 4 },
];
export function startRun() {
  const intro = !(G.profile.story && G.profile.story.flags && G.profile.story.flags.bossKilled);
  const S = G.surv = { t: 0, kills: 0, lvl: 1, xp: 0, next: 12, swarm: [], gems: [], projs: [], eprojs: [], pools: [], w: { main: 1 }, p: {}, evo: {}, cd: {}, spawnT: 0, eliteT: 150, bossT: 600, bossKills: 0, gold: 0, over: false, hp0: G.stats.maxHP, ach: {}, orbit: 0, pending: 0, intro, rerolls: 0 };
  G.player.hp = G.stats.maxHP; G.auto = false;
  setTimeout(() => bus.emit('toast', { text: 'Жатва Бездны', sub: intro ? 'Староста держит портал 3 минуты: бегайте, герой бьёт сам. Каждый уровень забега — опыт герою' : 'Только бегайте — герой бьёт сам. Каждый уровень забега даёт опыт герою.', kind: 'quest' }), 400);   // сборка 59: когда табло Жатвы уже на экране — тост встаёт под ним, а не под «Сдаться»
  return S;
}
const might = () => (1 + (G.surv.p.might || 0) * 0.12) * (1 + (G.surv.p.fury || 0) * 0.06);
const haste = () => (1 - (G.surv.p.haste || 0) * 0.08) * (1 - (G.surv.p.fury || 0) * 0.04);
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
    const melee = pool.filter(t => !t.shoot), shooters = S.swarm.filter(e => e.shoot).length;
    for (let i = 0; i < n; i++) { let t = pool[Math.floor(rand() * pool.length)]; if (t.shoot && (rand() < 0.55 || shooters > S.swarm.length * 0.22)) t = melee[Math.floor(rand() * melee.length)]; spawn(t, false); }   // стрелков — не больше пятой части толпы
  }
  S.eliteT -= dt; if (S.eliteT <= 0) { S.eliteT = 120; spawn({ type: 'elite_guard', hp: 420, spd: 2.1, dmg: 18, xp: 25 }, true); bus.emit('toast', { text: 'Страж жатвы!', kind: 'warn' }); }
  S.bossT -= dt; if (S.bossT <= 0) { S.bossT = 600; spawn({ type: 'boss', hp: 3000, spd: 2.2, dmg: 28, xp: 120 }, true, true); bus.emit('toast', { text: 'Палач жатвы пришёл за вами!', kind: 'warn' }); bus.emit('sfx', 'roar'); }
  // enemies: chase + cheap separation via spatial hash
  const grid = new Map(); const key = (x, y) => (x | 0) * 1000 + (y | 0);
  for (const e of S.swarm) { const k = key(e.x, e.y); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e); }
  const map = G.zone.map;
  for (const e of S.swarm) {
    e.t += dt; e.flash -= dt; e.hitCd -= dt; if (e.slowT > 0) e.slowT -= dt; if (e.burn > 0) { e.burn -= dt; hitE(e, e.burnDps * dt, true); }
    let vx = pl.x - e.x, vy = pl.y - e.y; const d = Math.hypot(vx, vy) || 1; vx /= d; vy /= d;
    if (e.shoot) {   // стрелок держит дистанцию 5–8 м и раз в 2,6 с пускает медленный снаряд в героя: от него можно увернуться
      if (d < 5) { vx = -vx * 0.6; vy = -vy * 0.6; } else if (d < 8) { vx *= 0.05; vy *= 0.05; }
      e.shotCd = (e.shotCd ?? 1 + rand() * 1.5) - dt;
      if (e.shotCd <= 0 && d < 11) { e.shotCd = 2.6; e.hitCd = 0.9; const sp = e.shoot === 'arrow' ? 8 : 6;
        S.eprojs.push({ kind: e.shoot, x: e.x, y: e.y, vx: (pl.x - e.x) / d * sp, vy: (pl.y - e.y) / d * sp, dmg: e.dmg, life: 2.4 }); bus.emit('sfx', e.shoot === 'arrow' ? 'bow' : 'cast'); }
    }
    for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) { const a = grid.get(key(e.x + gx, e.y + gy)); if (a) for (const o of a) { if (o === e) continue; const ox = e.x - o.x, oy = e.y - o.y, dd = ox * ox + oy * oy, rr = (e.r + o.r) * 0.9; if (dd < rr * rr && dd > 1e-4) { const k2 = (rr - Math.sqrt(dd)) * 3; vx += ox * k2; vy += oy * k2; } } }
    const sp = e.spd * (e.slowT > 0 ? 0.5 : 1) * dt; const nx = e.x + vx * sp, ny = e.y + vy * sp;
    if (!map.blocked(nx | 0, ny | 0)) { e.x = nx; e.y = ny; }
    e.dir = dirOf8(vx, vy);
    if (!e.shoot && d < e.r + pl.r + 0.15 && e.hitCd <= 0 && pl.inv <= 0) { e.hitCd = 0.9; C.hurtPlayer({ lvl: heroL() + (mins | 0) }, e.dmg * (1 - (S.p.plate || 0) * 0.08), 'phys'); }
  }
  weapons(dt);
  // снаряды стрелков
  for (const p of S.eprojs) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (pl.inv <= 0 && (p.x - pl.x) ** 2 + (p.y - pl.y) ** 2 < (pl.r + 0.25) ** 2) { p.life = 0; C.hurtPlayer({ lvl: heroL() + (mins | 0) }, p.dmg * (1 - (S.p.plate || 0) * 0.08), 'phys'); }
    else if (map.blocked(p.x | 0, p.y | 0)) p.life = 0; }
  S.eprojs = S.eprojs.filter(p => p.life > 0);
  // бесконечное поле
  catchUp();
  { let dx = 0, dy = 0; if (pl.x < ARENA_C - WRAP) dx = TILE; else if (pl.x > ARENA_C + WRAP) dx = -TILE; if (pl.y < ARENA_C - WRAP) dy = TILE; else if (pl.y > ARENA_C + WRAP) dy = -TILE; if (dx || dy) shiftWorld(dx, dy); }
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
    if (!S.gemTip && !(G.profile.tutorial && G.profile.tutorial.tips && G.profile.tutorial.tips.survGem)) { S.gemTip = S.gems[S.gems.length - 1]; bus.emit('survGemTip'); }   // сборка 60 (П13): первая синяя душа — стрелка и короткая пауза
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
    if (d < 0.5) { g.taken = true; if (g === S.gemTip) S.gemTip = null; if (g.gold) { S.gold += g.gold; bus.emit('sfx', 'coin'); } else { S.xp += g.v * (1 + (S.p.growth || 0) * 0.12); bus.emit('sfx', 'pickup'); } }
  }
  S.gems = S.gems.filter(g => !g.taken);
  if (S.gems.length > 400) S.gems.splice(0, S.gems.length - 400);
  while (S.xp >= S.next) { S.xp -= S.next; S.lvl++; S.next = Math.round(10 + S.lvl * 8 + S.lvl * S.lvl * 0.5); S.pending++; }
  if (S.pending > 0 && !G.modalOpen) { S.pending--; bus.emit('survLevel'); }
  pl.hp = Math.min(G.stats.maxHP, pl.hp + (S.p.vigor || 0) * 0.6 * dt);
  for (const a of ACH) if (!S.ach[a.id] && a.test(S)) { S.ach[a.id] = 1; bus.emit('toast', { text: '🏆 ' + a.name, sub: `+${a.gold} зол. · +${a.shards}◆ после забега`, kind: 'quest' }); bus.emit('sfx', 'quest'); }
  if (S.intro && S.t >= INTRO_T) { endRun(true); return; }
  if (S.t >= GOAL) endRun(true);
}
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
const offscreen = (x, y) => { const c = G.cam, [sx, sy] = c.toScreen(x, y, 0.5); return sx < -120 || sx > c.w + 120 || sy < -160 || sy > c.h + 140; };   // сборка 50: запас шире — враг целиком за кадром
// точка за краем кадра; dir — направление (рад), куда предпочтительно ставить (вперёд по ходу героя), иначе случайно
function edgePoint(dir) {
  const pl = G.player, map = G.zone.map;
  for (let k = 0; k < 6; k++) {
    const a = dir != null && k < 4 ? dir + (rand() - 0.5) * 2.2 : rand() * 6.283;
    for (let r = 10; r < 34; r += 1.5) {
      const x = pl.x + Math.cos(a) * r, y = pl.y + Math.sin(a) * r;
      if (x > 3 && y > 3 && x < map.w - 3 && y < map.h - 3 && !map.blocked(x | 0, y | 0) && offscreen(x, y)) return [x, y];
    }
  }
  return null;
}
// сборка 55: враг отстал дальше 30 м (герой долго бежит в одну сторону) — переносим его за край кадра по ходу героя: он снова
// подходит из-за экрана, а не возникает на виду
function catchUp() {
  const S = G.surv, pl = G.player, mvx = pl.x - (S.lastX ?? pl.x), mvy = pl.y - (S.lastY ?? pl.y);
  if (Math.hypot(mvx, mvy) > 0.01) S.runDir = Math.atan2(mvy, mvx);
  S.lastX = pl.x; S.lastY = pl.y;
  for (const e of S.swarm) {
    if (e.dead || (e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 < 30 * 30) continue;
    const p = edgePoint(S.runDir); if (p) { e.x = p[0]; e.y = p[1]; }
  }
}
function spawn(t, elite, boss) {
  const S = G.surv, pl = G.player;
  const p = edgePoint(); if (!p) return;
  const [x, y] = p;
  const mins = S.t / 60, L = heroL(), hpMul = timeHP(mins) * scaleHP(L) * 0.8;
  const D = ENEMIES[t.type];
  S.swarm.push({ type: t.type, shoot: t.shoot, atlas: D.atlas, x, y, hp: t.hp * hpMul, max: t.hp * hpMul, spd: t.spd * (1 + mins * 0.02), dmg: t.dmg * scaleDmg(L) * timeDmg(mins), xp: t.xp, r: boss ? 0.8 : elite ? 0.55 : t.type === 'beast' ? 0.45 : 0.32, t: rand() * 2, flash: 0, hitCd: 0, dir: 0, elite, boss });
}
function hitE(e, d, quiet) {
  const S = G.surv; let crit = false; if (!quiet && rand() < G.stats.critChance + (S.p.eye || 0) * 0.04) { d *= G.stats.critMult; crit = true; }
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
  const pool = Object.entries(PERKS).filter(([id, P]) => { const cur = P.passive ? S.p[id] || 0 : S.w[id] || 0; if (cur >= P.max) return false; if (!cur && (P.passive ? nP >= 6 : nW >= 6)) return false; return true; });
  pool.sort(() => rand() - 0.5);
  for (const [id, P] of pool) { if (out.length >= 4) break; out.push({ id, P, lvl: P.passive ? S.p[id] || 0 : S.w[id] || 0 }); }
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
  const mins = S.t / 60; const gold = Math.round((S.gold + S.kills * 0.6 + mins * 35) * (1 + (S.p.greed || 0) * 0.2)); let shards = Math.floor(mins / 4);
  // сборка 47: уровни забега качают героя — каждый уровень Жатвы = 2,5% опыта до следующего уровня героя (до 75% за забег)
  const heroXP = Math.round(xpToNext(P.level) * Math.min(0.75, 0.025 * (S.lvl - 1)));
  let achGold = 0; const newAch = [];
  for (const a of ACH) if (S.ach[a.id] && !P.surv.ach[a.id]) { P.surv.ach[a.id] = 1; achGold += a.gold; shards += a.shards; newAch.push(a.name); }
  P.gold += gold + achGold; P.shards = (P.shards || 0) + shards; P.surv.runs++; const record = S.t > P.surv.best; if (record) P.surv.best = S.t;
  P.stats.survSec = (P.stats.survSec || 0) + Math.round(S.t);   // для заданий дня «продержаться в Жатве»
  G.player.dead = false; G.player.hp = G.stats.maxHP;
  if (S.intro) P.story.flags.survTried = true;   // шаг обучения «Продержаться в Жатве» (сборка 47) — при любом исходе
  if (heroXP > 0) gainXP(heroXP);
  if (S.intro) P.survIntro = 1;
  bus.emit('survEnd', { win, t: S.t, kills: S.kills, lvl: S.lvl, gold: gold + achGold, shards, newAch, record, heroXP, intro: S.intro });
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
  for (const p of S.eprojs || []) {   // снаряды стрелков — крупные и яркие, чтобы было видно, откуда летит
    if (p.kind === 'arrow') {   // сборка 60 (П14/П13): у лучника — стрела (светлое древко с оперением), а не огненный шар; магия — у колдунов позже
      const [x, y] = cam.toScreen(p.x, p.y, 1.0), [x2, y2] = cam.toScreen(p.x - p.vx * 0.09, p.y - p.vy * 0.09, 1.0), a = Math.atan2(y - y2, x - x2), L = Math.hypot(x - x2, y - y2) || 1;
      ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.translate(x, y); ctx.rotate(a); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5 * Math.max(0.8, z); ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.strokeStyle = '#f2e2b8'; ctx.lineWidth = 2.5 * Math.max(0.8, z); ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
      const k = 7 * Math.max(0.8, z); ctx.fillStyle = '#d8dde8'; ctx.beginPath(); ctx.moveTo(k * 1.2, 0); ctx.lineTo(-k * 0.3, -k * 0.55); ctx.lineTo(-k * 0.3, k * 0.55); ctx.fill();
      ctx.fillStyle = '#c84a3a'; ctx.fillRect(-L, -k * 0.45, k * 0.9, k * 0.9); ctx.restore(); ctx.globalCompositeOperation = 'lighter'; continue;
    }
    const [x, y] = cam.toScreen(p.x, p.y, 1.0), r = (p.kind === 'orb' ? 14 : 10) * Math.max(0.8, z);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.4, p.kind === 'orb' ? 'rgba(255,90,200,0.95)' : 'rgba(255,170,60,0.95)'); g.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    const [x2, y2] = cam.toScreen(p.x - p.vx * 0.12, p.y - p.vy * 0.12, 1.0); ctx.strokeStyle = p.kind === 'orb' ? 'rgba(255,90,200,0.55)' : 'rgba(255,190,90,0.6)'; ctx.lineWidth = r * 0.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  }
  if (S.gemTip && !S.gemTip.taken) {   // сборка 60 (П13): над первой душой — прыгающая стрелка
    const g = S.gemTip, [x, y] = cam.toScreen(g.x, g.y, 0.25), b = Math.abs(Math.sin(G.time * 4)) * 10;
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.translate(x, y - 22 - b); ctx.fillStyle = '#7ae0ff'; ctx.strokeStyle = '#06222c'; ctx.lineWidth = 3; ctx.shadowColor = '#7ae0ff'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(-12, -16); ctx.lineTo(12, -16); ctx.lineTo(0, 4); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); ctx.globalCompositeOperation = 'lighter';
  }
  if (S.bladePts) for (const [bx, by, a] of S.bladePts) { const [x, y] = cam.toScreen(bx, by, 0.9); ctx.save(); ctx.translate(x, y); ctx.rotate(a * 3); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 20 * z); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(200,190,255,0.5)'); g.addColorStop(1, 'rgba(120,90,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 20 * z, 5 * z, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.globalCompositeOperation = 'source-over';
}
