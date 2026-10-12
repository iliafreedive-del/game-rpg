// «Жатва Бездны» — survivors-like mode: an open arena, endless waves, the hero attacks automatically,
// the player only moves. Enemies drop soul crystals → run level → pick 1 of 3 perks (weapons, passives, evolutions).
import { G, bus } from './ctx.js';
import { ENEMIES } from '../data/enemies.js';
import { xpToNext } from './stats.js';
import { gainXP } from './loot.js';
import * as C from './combat.js';
import { getAtlas, drawFrame } from '../core/assets.js';
import { PX_PER_M } from '../core/iso.js';
import { drawProjSheet, drawStatusSheet, drawFxSheet, fxReady, fxGround, drawGroundGlow, statusBillboard } from '../render/fxsheets.js';
import { rand, rrange } from '../core/util.js';
const PHONE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

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
  magnet: { name: 'Притяжение душ', max: 5, passive: 1, icon: '◇', desc: () => '+40% к радиусу сбора кристаллов' },
  vigor:  { name: 'Жизненная сила', max: 5, passive: 1, icon: '♥', desc: () => '+20% здоровья и восстановление' },
  // сборка 47: больше пассивок — выбор разнообразнее (как в Vampire Survivors)
  plate:  { name: 'Латы душ', max: 5, passive: 1, icon: '⛨', desc: () => '−8% получаемого урона' },
  growth: { name: 'Жажда душ', max: 5, passive: 1, icon: '✧', desc: () => '+12% опыта забега с кристаллов' },
  greed:  { name: 'Жадность', max: 5, passive: 1, icon: '⛁', desc: () => '+20% золота за забег' },
  eye:    { name: 'Острый глаз', max: 5, passive: 1, icon: '◎', desc: () => '+4% шанса крита в забеге' },
  fury:   { name: 'Ярость', max: 5, passive: 1, icon: '✹', desc: () => '+6% урона и +4% скорости оружия' },
  // правки 3, второй заход: ещё шесть видов оружия — у каждого своё поведение, все яркие
  meteor: { name: 'Метеоры', max: 5, w: 1, icon: '☄', desc: l => l ? 'Больше метеоров, урон +15%' : 'С неба падают огненные камни на врагов' },
  spear:  { name: 'Копьё света', max: 5, w: 1, icon: '➶', desc: l => l ? '+1 копьё, урон +15%' : 'Сияющее копьё пронзает всех на линии' },
  frost:  { name: 'Морозная аура', max: 5, w: 1, icon: '✲', desc: l => l ? 'Радиус и урон ауры +15%' : 'Холод вокруг героя ранит и замедляет врагов' },
  thunder:{ name: 'Громовержец', max: 5, w: 1, icon: '☇', desc: l => l ? '+1 удар молнии, урон +15%' : 'Молнии бьют с неба по случайным врагам' },
  scythe: { name: 'Серп жнеца', max: 5, w: 1, icon: '☾', desc: l => l ? '+1 серп, урон +15%' : 'Серп летит вперёд и возвращается, режет всех на пути' },
  rain:   { name: 'Дождь клинков', max: 5, w: 1, icon: '⇊', desc: l => l ? 'Шире и сильнее' : 'Клинки сыплются с неба на толпу врагов' },
};
export const EVOS = [
  { id: 'evo_blades', from: 'blades', need: 'haste', name: 'Вихрь стали', desc: 'Клинков вдвое больше, урон ×2' },
  { id: 'evo_nova', from: 'nova', need: 'area', name: 'Инферно', desc: 'Кольцо каждые 1,5 с и огромный радиус' },
  { id: 'evo_chain', from: 'chain', need: 'might', name: 'Небесный гнев', desc: 'Молнии бьют трижды за раз' },
  { id: 'evo_shards', from: 'shards', need: 'swift', name: 'Буран', desc: 'Двойная волна осколков, замораживает' },
  { id: 'evo_knives', from: 'knives', need: 'magnet', name: 'Ливень кинжалов', desc: 'Кинжалы летят во все стороны' },
  { id: 'evo_main', from: 'main', need: 'vigor', name: 'Оружие героя', desc: 'Основная атака ×2.5 и пронзает всех' },
  { id: 'evo_meteor', from: 'meteor', need: 'fury', name: 'Звездопад', desc: 'Метеоров втрое больше, после них горит земля' },
  { id: 'evo_spear', from: 'spear', need: 'eye', name: 'Копьё рассвета', desc: 'Копья летят веером из пяти, урон ×2' },
  { id: 'evo_frost', from: 'frost', need: 'plate', name: 'Абсолютный ноль', desc: 'Аура шире в 1,6 раза и замораживает врагов' },
  { id: 'evo_thunder', from: 'thunder', need: 'greed', name: 'Буревестник', desc: 'Молний вдвое больше, каждая перескакивает на соседей' },
  { id: 'evo_scythe', from: 'scythe', need: 'growth', name: 'Жатва смерти', desc: 'Серпов вдвое больше, они крупнее и бьют вдвое сильнее' },
  { id: 'evo_rain', from: 'rain', need: 'area', name: 'Стальной шторм', desc: 'Дождь клинков в полтора раза шире и идёт сразу в двух местах' },
];
// правки 3: билды Жатвы — собрали всё из списка (любого уровня) — оружие билда бьёт сильнее и получает особое свойство
export const BUILDS = [
  { id: 'fire', name: 'Пламя Бездны', need: ['nova', 'pool', 'meteor'], desc: 'Огонь +30% урона, метеоры оставляют горящую землю' },
  { id: 'frost', name: 'Вечная мерзлота', need: ['shards', 'frost'], desc: 'Лёд +30% урона, замедленные враги получают +25% урона от всего' },
  { id: 'storm', name: 'Гроза', need: ['chain', 'thunder'], desc: 'Молнии +30% урона и +2 прыжка у цепной молнии' },
  { id: 'steel', name: 'Стальной вихрь', need: ['blades', 'knives', 'scythe'], desc: 'Клинки, кинжалы и серп +30% урона, клинки крутятся быстрее' },
  { id: 'dawn', name: 'Рассвет', need: ['spear', 'rain'], desc: 'Копья и дождь клинков +30% урона, копий вдвое больше' },
  { id: 'hero', name: 'Путь героя', need: ['main', 'might', 'fury'], desc: 'Оружие класса +40% урона' },
];
// правки 3: три длины забега — 10 минут, 20 минут и час. Враги крепнут по доле забега: в короткой быстрее, в часовой медленнее
export const MODES = { short: { min: 10, cost: 2, name: 'Быстрая жатва' }, std: { min: 20, cost: 3, name: 'Жатва' }, long: { min: 60, cost: 6, name: 'Долгая ночь' } };
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
  { id: 'build', name: 'Собрать билд', test: S => Object.keys(S.builds || {}).length > 0, gold: 600, shards: 4 },
  { id: 'h60', name: 'Продержаться целый час', test: S => S.t >= 3600, gold: 10000, shards: 40 },
];
// сборка 47: Жатва — знакомство на 3 минуты с 2-го уровня (один раз, до Палача), потом — после Палача Бездны, забег стоит 3 ⚡
export const REQ_LEVEL = 2, GOAL = 20 * 60, INTRO_T = 180, RUN_COST = 3;
// враги растут от уровня героя (раньше у них было 10–60 HP при любом герое) и от времени забега; урон по герою — тоже
const heroL = () => (G.profile && G.profile.level) || 1;
// правки 3 (баланс как в сюрвайвл-играх, Vampire Survivors / Brotato): сила забега — в перках забега, а не в уровне героя.
// Раньше здоровье врагов росло от уровня героя так же круто, как в катакомбах (×13 на 10-м уровне), а урон в Жатве брался
// от урона оружия (у мага — 5–11 при любом уровне): к 10-му уровню враги толстели быстрее героя, «урон не проходил».
// Теперь: враги крепнут прежде всего от минут забега и чуть-чуть от уровня героя (+10% за уровень), урон героя в Жатве — 14 ×
// «сила героя» (его настоящий урон в игре против голого героя 1-го уровня того же класса, в степени 0,7 — шмот помогает, но не ломает).
const lvlHP = L => 1 + 0.1 * (L - 1), lvlDmg = L => 1 + 0.1 * (L - 1);
const timeHP = m => 1 + m * 0.42 + Math.pow(Math.max(0, m - 5), 1.8) * 0.35;
const timeDmg = m => 1 + m * 0.1 + Math.max(0, m - 8) * 0.12;
const REF_DPS = { warrior: 12.4, archer: 14.3, mage: 24.8 };   // урон в секунду голого героя 1-го уровня (stats.js: dps; у мага — spellDps)
export function heroPower(s = G.stats, cls = (G.profile && G.profile.cls) || 'warrior') {
  const dps = cls === 'mage' ? Math.max(s.dps || 0, s.spellDps || 0) : s.dps || 0;
  return Math.min(4, Math.max(0.8, Math.pow(Math.max(0.1, dps) / (REF_DPS[cls] || 12), 0.7)));
}

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
export function startRun(mode = G.survMode || 'std') {
  const intro = !(G.profile.story && G.profile.story.flags && G.profile.story.flags.bossKilled), M = MODES[mode] || MODES.std;
  const S = G.surv = { t: 0, kills: 0, lvl: 1, xp: 0, next: 10, swarm: [], gems: [], projs: [], eprojs: [], pools: [], w: { main: 1 }, p: {}, evo: {}, cd: {}, spawnT: 0, eliteT: 75, guardN: 0, guardKills: 0, bossT: 600, bossKills: 0, gold: 0, over: false, hp0: G.stats.maxHP, ach: {}, orbit: 0, pending: 0, intro, rerolls: 0, pow: heroPower(), mode: intro ? 'std' : mode, goal: M.min * 60, tk: intro ? 1 : Math.pow(20 / M.min, M.min > 20 ? 0.75 : 0.35), xpK: mode === 'short' && !intro ? 0.7 : 1, builds: {}, bm: {}, drops: [], rains: [], bolts: [] };
  if (S.mode === 'short') S.bossT = 300;
  G.player.hp = G.stats.maxHP; G.auto = false;
  setTimeout(() => bus.emit('toast', { text: 'Жатва Бездны', sub: intro ? 'Староста держит портал 3 минуты: бегайте, герой бьёт сам. Каждый уровень забега — опыт герою' : 'Только бегайте — герой бьёт сам. Каждый уровень забега даёт опыт герою.', kind: 'quest' }), 400);   // сборка 59: когда табло Жатвы уже на экране — тост встаёт под ним, а не под «Сдаться»
  return S;
}
const might = () => (1 + (G.surv.p.might || 0) * 0.12) * (1 + (G.surv.p.fury || 0) * 0.06);
const haste = () => (1 - (G.surv.p.haste || 0) * 0.08) * (1 - (G.surv.p.fury || 0) * 0.04);
const area = () => 1 + (G.surv.p.area || 0) * 0.12;
export const moveMul = () => G.surv ? 1 + (G.surv.p.swift || 0) * 0.08 : 1;
const baseDmg = () => 14 * (G.surv.pow || 1) * might() * (1 + (G.surv.w.main - 1) * 0.25);

// ---------------------------------------------------------------- update
export function updateSurvival(dt) {
  const S = G.surv; if (!S || S.over) return;
  const pl = G.player; if (pl.dead) { if (!S.asking) endRun(false); return; }
  S.t += dt; const em = S.t / 60 * S.tk;   // «минуты сложности»: в короткой жатве враги крепнут быстрее, в часовой — медленнее
  // spawns: density grows every minute
  S.spawnT -= dt;
  const mins = em, cap = Math.min(G.render3d ? (PHONE ? 85 : 115) : 170, 40 + mins * 14);   // в 3D каждый враг — настоящая модель, поэтому потолок ниже; правки 3: толпа гуще (было 75)
  if (S.spawnT <= 0 && S.swarm.length < cap) {
    S.spawnT = Math.max(0.15, 0.7 - mins * 0.05);
    const n = 1 + Math.floor(mins / 1.2);
    const pool = TYPES.filter(t => S.t >= t.from);
    const melee = pool.filter(t => !t.shoot), shooters = S.swarm.filter(e => e.shoot).length;
    for (let i = 0; i < n; i++) { let t = pool[Math.floor(rand() * pool.length)]; if (t.shoot && (rand() < 0.55 || shooters > S.swarm.length * 0.22)) t = melee[Math.floor(rand() * melee.length)]; spawn(t, false); }   // стрелков — не больше пятой части толпы
  }
  S.eliteT -= dt; if (S.eliteT <= 0) { S.eliteT = 90; const g = GUARDS[S.guardN++ % GUARDS.length]; spawn(g, true); bus.emit('toast', { text: g.name + '!', sub: g.tip, kind: 'warn' }); }   // правки 3: стражи по очереди разные
  S.bossT -= dt; if (S.bossT <= 0) { S.bossT = 600; spawn({ type: 'boss', hp: 3000, spd: 2.2, dmg: 28, xp: 120 }, true, true); bus.emit('toast', { text: 'Палач жатвы пришёл за вами!', kind: 'warn' }); bus.emit('sfx', 'roar'); }
  // enemies: chase + cheap separation via spatial hash
  const grid = new Map(); const key = (x, y) => (x | 0) * 1000 + (y | 0);
  for (const e of S.swarm) { const k = key(e.x, e.y); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e); }
  const map = G.zone.map;
  for (const e of S.swarm) {
    e.t += dt; e.flash -= dt; e.hitCd -= dt; if (e.slowT > 0) e.slowT -= dt; if (e.burn > 0) { e.burn -= dt; hitE(e, e.burnDps * dt, true); }
    let vx = pl.x - e.x, vy = pl.y - e.y; const d = Math.hypot(vx, vy) || 1; vx /= d; vy /= d;
    if (e.g) { const v = guardAI(e, d, vx, vy, dt); vx = v[0]; vy = v[1]; }
    if (e.shoot) {   // стрелок держит дистанцию 5–8 м и раз в 2,6 с пускает медленный снаряд в героя: от него можно увернуться
      if (d < 5) { vx = -vx * 0.6; vy = -vy * 0.6; } else if (d < 8) { vx *= 0.05; vy *= 0.05; }
      e.shotCd = (e.shotCd ?? 1 + rand() * 1.5) - dt;
      if (e.shotCd <= 0 && d < 11) { e.shotCd = 2.6; e.hitCd = 0.9; const sp = e.shoot === 'arrow' ? 8 : 6;
        S.eprojs.push({ kind: e.shoot, x: e.x, y: e.y, vx: (pl.x - e.x) / d * sp, vy: (pl.y - e.y) / d * sp, dmg: e.dmg, life: 2.4 }); bus.emit('sfx', e.shoot === 'arrow' ? 'bow' : 'cast'); }
    }
    for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) { const a = grid.get(key(e.x + gx, e.y + gy)); if (a) for (const o of a) { if (o === e) continue; const ox = e.x - o.x, oy = e.y - o.y, dd = ox * ox + oy * oy, rr = (e.r + o.r) * 0.9; if (dd < rr * rr && dd > 1e-4) { const k2 = (rr - Math.sqrt(dd)) * 3; vx += ox * k2; vy += oy * k2; } } }
    if (e.frozen > 0) e.frozen -= dt; const sp = e.spd * (e.dash > 0 ? 3.6 : 1) * (e.slowT > 0 && !(e.dash > 0) ? 0.5 : 1) * (e.frozen > 0 ? 0 : 1) * dt; const nx = e.x + vx * sp, ny = e.y + vy * sp;
    if (!map.blocked(nx | 0, ny | 0)) { e.x = nx; e.y = ny; }
    e.dir = dirOf8(vx, vy);
    if (!e.shoot && d < e.r + pl.r + 0.15 && e.hitCd <= 0 && pl.inv <= 0) { e.hitCd = 0.9; C.hurtPlayer({ lvl: heroL() + (mins | 0) }, e.dmg * (e.dash > 0 ? 1.6 : 1) * (1 - (S.p.plate || 0) * 0.08), 'phys'); }
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
  S.shatN = 0;
  for (const p of S.projs) {
    p.life -= dt; p.t = (p.t || 0) + dt;
    if (p.back) { if (!p.ret && p.t > p.back) { p.ret = 1; p.hit.clear(); } if (p.ret) { const dx = pl.x - p.x, dy = pl.y - p.y, l = Math.hypot(dx, dy) || 1; p.vx = dx / l * 15; p.vy = dy / l * 15; if (l < 0.6) p.life = 0; } }   // серп: туда и обратно, на обратном пути режет снова
    p.x += p.vx * dt; p.y += p.vy * dt;
    for (const e of S.swarm) { if (e.dead || p.hit.has(e)) continue; if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + p.r) ** 2) { p.hit.add(e); hitE(e, p.dmg); if (p.hitFx && S.shatN < 6) { S.shatN++; fx(p.hitFx, e.x, e.y, { z: 0.5, ex: pl.x, ey: pl.y }); } if (p.slow) { if (e.slowT <= 0 && S.shatN < 6 && Math.random() < 0.3) { S.shatN++; C.effect({ kind: 'shatter', x: e.x, y: e.y, r: 0.5, dur: 0.4, seed: Math.random() * 6 }); } e.slowT = 1.2; }   /* правки 3: брызги льда — не больше 6 за кадр */ if (--p.pierce < 0) { p.life = 0; break; } } }
  }
  S.projs = S.projs.filter(p => p.life > 0);
  // burning ground
  for (const q of S.pools) { if (!q.fx) { q.fx = 1; if (!fxReady('gr_burning_ground')) C.effect({ kind: 'firepool', x: q.x, y: q.y, r: q.r, dur: q.t }); } q.t -= dt; q.tick -= dt; if (q.tick <= 0) { q.tick = 0.4; for (const e of S.swarm) if (!e.dead && (e.x - q.x) ** 2 + (e.y - q.y) ** 2 < q.r * q.r) hitE(e, q.dps * 0.4, true); } }
  S.pools = S.pools.filter(q => q.t > 0);
  // deaths → gems
  for (const e of S.swarm) if (e.hp <= 0 && !e.dead) {
    e.dead = true; S.kills++; G.profile.stats.survKills = (G.profile.stats.survKills || 0) + 1;   // правки 3: убийства в Жатве не идут в задания деревни (доска, «Уничтожить N врагов»)
    if (e.elite && !e.boss) S.guardKills++;
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
    if (d < 0.5) { g.taken = true; if (g === S.gemTip) S.gemTip = null; if (g.gold) { S.gold += g.gold; bus.emit('sfx', 'coin'); } else { S.xp += g.v * (1 + (S.p.growth || 0) * 0.12); S.souls = (S.souls || 0) + 1; bus.emit('sfx', 'pickup'); } }
  }
  S.gems = S.gems.filter(g => !g.taken);
  if (S.gems.length > 400) S.gems.splice(0, S.gems.length - 400);
  while (S.xp >= S.next) { S.xp -= S.next; S.lvl++; C.sheet('sv_levelup', pl.x, pl.y); S.next = Math.round((6 + S.lvl * 4 + Math.max(0, S.lvl - 20) * 3) * S.xpK); S.pending++; }   // правки 3: уровни забега чаще (как в Vampire Survivors: к 10-й минуте ≈ 25-й уровень, было ≈ 8-й)
  if (S.pending > 0 && !G.modalOpen) { S.pending--; bus.emit('survLevel'); }
  pl.hp = Math.min(G.stats.maxHP, pl.hp + (S.p.vigor || 0) * 0.6 * dt);
  for (const a of ACH) if (!S.ach[a.id] && a.test(S)) { S.ach[a.id] = 1; bus.emit('toast', { text: '🏆 ' + a.name, sub: `+${a.gold} зол. · +${a.shards}◆ после забега`, kind: 'quest' }); bus.emit('sfx', 'quest'); }
  if (S.intro && S.t >= INTRO_T) { endRun(true); return; }
  if (S.t >= S.goal) endRun(true);
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
  if (Math.hypot(mvx, mvy) > 0.01) { S.runDir = Math.atan2(mvy, mvx); S.runT = Math.min(3, (S.runT || 0) + G.dt); } else S.runT = Math.max(0, (S.runT || 0) - G.dt * 2);
  S.lastX = pl.x; S.lastY = pl.y;
  for (const e of S.swarm) {
    if (e.dead || e.elite || (e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 < 24 * 24) continue;   // правки 3: раньше (30 м) — бегущего в одну сторону догоняли поздно; стража не переносим — он сам бежит за героем
    const p = edgePoint(S.runDir); if (p) { e.x = p[0]; e.y = p[1]; }
  }
}
// правки 3: «бегу в одну сторону — впереди никого»: пока герой бежит, 2 из 3 врагов появляются за краем кадра ПО ХОДУ бега
function spawn(t, elite, boss) {
  const S = G.surv, pl = G.player;
  const p = edgePoint(S.runT > 0.5 && rand() < 0.67 ? S.runDir : null); if (!p) return;
  const [x, y] = p;
  const mins = S.t / 60 * S.tk, L = heroL(), hpMul = (elite && !boss ? 1 + mins * 0.3 : timeHP(mins)) * lvlHP(L);   // стражи крепнут медленнее толпы: их должно быть реально убить
  const D = ENEMIES[t.type];
  S.swarm.push({ type: t.type, model: t.model, scale: t.scale, g: t.g, name: t.name, shoot: t.shoot, atlas: D.atlas, x, y, hp: t.hp * hpMul, max: t.hp * hpMul, spd: t.spd * (1 + mins * 0.02), dmg: t.dmg * lvlDmg(L) * timeDmg(mins), xp: t.xp, r: boss ? 0.8 : elite ? 0.55 : t.type === 'beast' ? 0.45 : 0.32, t: rand() * 2, flash: 0, hitCd: 0, dir: 0, elite, boss, gcd: 2 + rand() * 2 });
}
// ---------------------------------------------------------------- стражи жатвы (правки 3): у каждого свой вид, походка и приём
const GUARDS = [
  { g: 'charge', type: 'elite_guard', model: 'surv_guard', scale: 1.3, name: 'Страж жатвы', tip: 'Замирает и бросается вперёд — отбегите вбок', hp: 120, spd: 2.2, dmg: 14, xp: 25 },
  { g: 'slam', type: 'elite_guard', model: 'surv_brute', scale: 1.35, name: 'Костолом', tip: 'Бьёт по земле вокруг себя — не стойте в красном круге', hp: 150, spd: 2.7, dmg: 18, xp: 30 },
  { g: 'volley', type: 'skel_mage', scale: 1.5, name: 'Жнец душ', tip: 'Держится поодаль и пускает кольцо снарядов', hp: 100, spd: 2.0, dmg: 10, xp: 25 },
];
const RED = [255, 80, 50];
function guardAI(e, d, vx, vy, dt) {
  const S = G.surv, pl = G.player;
  e.gcd -= dt; if (e.dash > 0) e.dash -= dt;
  if (e.act) {   // замах: стоит на месте (виден телеграф), потом приём
    e.act.t += dt; if (e.act.t < e.act.dur) return [0, 0];
    const k = e.act.k; e.act = null;
    if (k === 'charge') { e.dash = 0.65; e.dx = e.ax; e.dy = e.ay; bus.emit('sfx', 'whirl'); }
    else if (k === 'slam') { C.effect({ kind: 'wave', x: e.x, y: e.y, r: 3.2, dur: 0.45, c: RED }); C.particles(e.x, e.y, 14, { c: [200, 160, 120], sp: 4, size: 3, life: 0.5 }); bus.emit('sfx', 'boom');
      if (pl.inv <= 0 && (pl.x - e.x) ** 2 + (pl.y - e.y) ** 2 < 3.2 * 3.2) C.hurtPlayer({ lvl: heroL() + (S.t / 60 * S.tk | 0) }, e.dmg * 1.8 * (1 - (S.p.plate || 0) * 0.08), 'phys'); }
    else if (k === 'volley') { const n = 12, a0 = rand() * 6.283; for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283; S.eprojs.push({ kind: 'orb', x: e.x, y: e.y, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, dmg: e.dmg, life: 3 }); } bus.emit('sfx', 'cast'); }
    return [vx, vy];
  }
  if (e.dash > 0) return [e.dx, e.dy];
  if (e.g === 'charge' && e.gcd <= 0 && d < 9 && d > 2) { e.gcd = 5; e.ax = vx; e.ay = vy; e.act = { k: 'charge', t: 0, dur: 0.7 }; C.effect({ kind: 'ring', x: e.x, y: e.y, r: 1.4, dur: 0.7, c: RED }); return [0, 0]; }
  if (e.g === 'slam' && e.gcd <= 0 && d < 3) { e.gcd = 4.5; e.act = { k: 'slam', t: 0, dur: 0.85 }; C.effect({ kind: 'ring', x: e.x, y: e.y, r: 3.2, dur: 0.85, c: RED }); return [0, 0]; }
  if (e.g === 'volley') {
    if (e.gcd <= 0 && d < 11) { e.gcd = 4; e.act = { k: 'volley', t: 0, dur: 0.6 }; C.effect({ kind: 'ring', x: e.x, y: e.y, r: 1.2, dur: 0.6, c: [200, 90, 255] }); return [0, 0]; }
    if (d < 5.5) return [-vx * 0.7, -vy * 0.7]; if (d < 8) return [vx * 0.1, vy * 0.1];
  }
  return [vx, vy];
}
function hitE(e, d, quiet) {
  const S = G.surv; let crit = false; if (S.builds.frost && e.slowT > 0) d *= 1.25; if (!quiet && rand() < G.stats.critChance + (S.p.eye || 0) * 0.04) { d *= G.stats.critMult; crit = true; }
  e.hp -= d; if (!quiet) e.flash = 0.1;
  if (!quiet && (crit || e.elite || e.boss)) C.float(e.x, e.y, Math.round(d) + (crit ? '!' : ''), crit ? '#ffd23a' : '#fff', { z: 1.6, big: crit ? 1 : 0, life: 0.6 });
}
// правки 3: основная атака и молния в первую очередь бьют стража, если он в досягаемости, — иначе его заслоняла толпа и он жил вечно
function target(x, y, R) { let b = null, bd = R * R; for (const e of G.surv.swarm) { if (e.dead || !e.elite) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; b = e; } } return b || nearest(x, y, R); }
function nearest(x, y, R, skip) { let b = null, bd = R * R; for (const e of G.surv.swarm) { if (e.dead || (skip && skip.has(e))) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; b = e; } } return b; }
function ready(id, cd) { const S = G.surv; S.cd[id] = (S.cd[id] ?? 0.5) - G.dt; if (S.cd[id] > 0) return false; S.cd[id] = cd * haste(); return true; }
function weapons(dt) {
  const S = G.surv, pl = G.player, w = S.w, cls = G.profile.cls || 'warrior', D = baseDmg(), A = area(), B = new Proxy(S.bm, { get: (o, k) => o[k] || 1 });   // B.x — множитель билда
  // main class weapon
  const evoMain = S.evo.evo_main ? 2.5 : 1;
  S.fireT = Math.max(0, (S.fireT || 0) - dt);   // для 3D: пока >0 герой играет анимацию выстрела/удара
  if (cls === 'warrior') {
    if (ready('main', 1.1 - w.main * 0.07)) { S.fireT = 0.4; const R = 2.6 * A; if (!fx('sv_main_warrior', pl.x, pl.y, { a: S.orbit * 2, size: R * 2.2 }) && !fx('sk_whirlwind', pl.x, pl.y, { a: S.orbit * 2, size: R * 2.3, dur: 0.3 })) { C.effect({ kind: 'slash', x: pl.x, y: pl.y, a: S.orbit * 2, r: R * 0.8, arc: 330, dur: 0.28 }); C.effect({ kind: 'ring', x: pl.x, y: pl.y, r: R, dur: 0.25, c: [255, 235, 200] }); }   /* правки 3: нарисованный взмах */ for (const e of S.swarm) if ((e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 < (R + e.r) ** 2) { hitE(e, D * B.main * 1.4 * evoMain); const l = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; e.x += (e.x - pl.x) / l * 0.4; e.y += (e.y - pl.y) / l * 0.4; } bus.emit('sfx', 'swing'); }
  } else {
    if (ready('main', (cls === 'archer' ? 0.7 : 0.85) - w.main * 0.05)) {
      const t = target(pl.x, pl.y, 10); if (t) { S.fireT = 0.42; S.fireClip = cls; pl.faceTo(t.x, t.y); const n = 1 + Math.floor(w.main / 2); const a0 = Math.atan2(t.y - pl.y, t.x - pl.x);
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.14; S.projs.push({ kind: S.evo.evo_main ? 'evo' : cls === 'archer' ? 'arrow' : 'bolt', hitFx: cls === 'archer' ? 'hit_arrow' : 'hit_star_bolt', x: pl.x, y: pl.y, vx: Math.cos(a) * 14, vy: Math.sin(a) * 14, dmg: D * B.main * (cls === 'mage' ? 1.3 : 1) * evoMain, r: 0.3, pierce: S.evo.evo_main ? 99 : cls === 'archer' ? 1 : 0, life: 1.1, hit: new Set(), t: 0 }); }
        bus.emit('sfx', cls === 'archer' ? 'bow' : 'cast'); }
    }
  }
  if (w.knives && ready('knives', 0.7)) { const face = G.player.face * Math.PI / 4; const n = w.knives + 1; const all = S.evo.evo_knives;
    for (let i = 0; i < (all ? 12 : n); i++) { const a = all ? i / 12 * 6.283 : face + (i - (n - 1) / 2) * 0.12; S.projs.push({ kind: all ? 'knife_evo' : 'knife', t: 0, x: pl.x, y: pl.y, vx: Math.cos(a) * 16, vy: Math.sin(a) * 16, dmg: D * B.knives * 0.6 * (1 + w.knives * 0.15), r: 0.25, pierce: 1, life: 0.8, hit: new Set() }); } }
  if (w.blades) { S.orbit += dt * 3.4 * (S.builds.steel ? 1.4 : 1); const n = (w.blades + 1) * (S.evo.evo_blades ? 2 : 1); S.bladePts = [];
    for (let k = 0; k < n; k++) { const a = S.orbit + k / n * 6.283, R = 1.8 * A; const bx = pl.x + Math.cos(a) * R, by = pl.y + Math.sin(a) * R; S.bladePts.push([bx, by, a]);
      for (const e of S.swarm) { e.bcd = (e.bcd || 0) - dt / n; if (e.bcd <= 0 && (e.x - bx) ** 2 + (e.y - by) ** 2 < (0.5 + e.r) ** 2) { e.bcd = 0.4; hitE(e, D * B.blades * 0.55 * (S.evo.evo_blades ? 2 : 1)); } } } }
  if (w.nova && ready('nova', S.evo.evo_nova ? 1.5 : 3)) { const R = (2.4 + w.nova * 0.3) * A * (S.evo.evo_nova ? 1.6 : 1); if (!fx(S.evo.evo_nova ? 'sv_evo_inferno' : 'sv_abyss_ring', pl.x, pl.y, { size: R * 2.2 }) && !fx('ct_abyss_nova', pl.x, pl.y, { size: R * 2.4, dur: 0.55 })) { C.effect({ kind: 'ring', x: pl.x, y: pl.y, r: R, dur: 0.5, c: [190, 110, 255] }); C.effect({ kind: 'firepool', x: pl.x, y: pl.y, r: R * 0.8, dur: 0.6 }); } C.particles(pl.x, pl.y, 10, { c: [200, 120, 255], z: 0.3, sp: R * 2, size: 4, life: 0.5 }); for (const e of S.swarm) if ((e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 < (R + e.r) ** 2) hitE(e, D * B.nova * 0.9 * (1 + w.nova * 0.15)); bus.emit('sfx', 'fire'); }
  if (w.chain && ready('chain', 2)) { for (let rep = 0; rep < (S.evo.evo_chain ? 3 : 1); rep++) { let px = pl.x, py = pl.y; const hit = new Set(); for (let j = 0; j < 3 + w.chain + (S.builds.storm ? 2 : 0); j++) { const t = j ? nearest(px, py, 5, hit) : target(px, py, 9); if (!t) break; hit.add(t); C.lightningArc(px, py, t.x, t.y); hitE(t, D * B.chain * 1.1 * (1 + w.chain * 0.15)); px = t.x; py = t.y; } } bus.emit('sfx', 'zap'); }
  if (w.shards && ready('shards', 2.5)) { if (S.evo.evo_shards && !fx('sv_evo_blizzard', pl.x, pl.y, { size: 8 })) fx('fj_blizzard_nova', pl.x, pl.y, { size: 9, dur: 0.6 }); for (let wave = 0; wave < (S.evo.evo_shards ? 2 : 1); wave++) { const n = 6 + w.shards * 2; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + wave * 0.2; S.projs.push({ kind: 'shard', x: pl.x, y: pl.y, vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, dmg: D * B.shards * 0.7, r: 0.28, pierce: 1, life: 0.9, hit: new Set(), slow: 1, t: 0 }); } } bus.emit('sfx', 'ice'); }
  if (w.pool && ready('pool', 3)) { const t = nearest(pl.x, pl.y, 9); if (t) S.pools.push({ x: t.x, y: t.y, r: (1.4 + w.pool * 0.2) * A, t: 3 + w.pool * 0.5, dps: D * B.pool * 0.8, tick: 0 }); }
  // правки 3, второй заход: новые виды оружия
  if (w.meteor && ready('meteor', 2.6)) { const n = (1 + Math.floor(w.meteor / 2)) * (S.evo.evo_meteor ? 3 : 1), R = (1.5 + w.meteor * 0.15) * A;
    for (let i = 0; i < n; i++) { const t = randomFoe(9); if (!t) break; S.drops.push({ x: t.x + (rand() - 0.5) * 0.8, y: t.y + (rand() - 0.5) * 0.8, t: 0.5 + i * 0.12, T: 0.5 + i * 0.12, R, dmg: D * B.meteor * 1.6 * (1 + w.meteor * 0.15) }); } }
  for (const m of S.drops) { m.t -= dt; if (m.t > 0) continue; m.done = 1;   // сборка 66: удар метеора — лист полного комплекта (у «Звездопада» — свой взрыв)
    if (!fx(S.evo.evo_meteor ? 'sv_evo_sky_wrath' : 'sk_meteor_impact', m.x, m.y, { size: m.R * (S.evo.evo_meteor ? 2.4 : 2.6) }) && !fx('hit_fire_explosion', m.x, m.y, { size: m.R * 2.3 })) { C.effect({ kind: 'ring', x: m.x, y: m.y, r: m.R, dur: 0.4, c: [255, 170, 60] }); C.effect({ kind: 'firepool', x: m.x, y: m.y, r: m.R * 0.8, dur: 0.5 }); }
    C.particles(m.x, m.y, 8, { c: [255, 160, 60], z: 0.3, sp: 4, size: 4, life: 0.5 }); bus.emit('sfx', 'boom');
    for (const e of S.swarm) if ((e.x - m.x) ** 2 + (e.y - m.y) ** 2 < (m.R + e.r) ** 2) hitE(e, m.dmg);
    if ((S.builds.fire || S.evo.evo_meteor) && S.pools.length < 12) S.pools.push({ x: m.x, y: m.y, r: m.R * 0.8, t: 2.5, dps: m.dmg * 0.35, tick: 0 }); }
  S.drops = S.drops.filter(m => !m.done);
  if (w.spear && ready('spear', 1.5)) { const t = target(pl.x, pl.y, 11); if (t) { const n = (S.evo.evo_spear ? 5 : 1 + Math.floor((w.spear - 1) / 2)) * (S.builds.dawn ? 2 : 1), a0 = Math.atan2(t.y - pl.y, t.x - pl.x);
    for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * (S.evo.evo_spear ? 0.32 : 0.18); S.projs.push({ kind: 'spear', hitFx: 'hit_pierce_shot', x: pl.x, y: pl.y, vx: Math.cos(a) * 18, vy: Math.sin(a) * 18, dmg: D * B.spear * 1.2 * (1 + w.spear * 0.15) * (S.evo.evo_spear ? 2 : 1), r: 0.4, pierce: 99, life: 0.75, hit: new Set(), t: 0 }); }
    bus.emit('sfx', 'bow'); } }
  if (w.frost) { S.frostR = (1.7 + w.frost * 0.25) * A * (S.evo.evo_frost ? 1.6 : 1);
    if (ready('frost', 0.5)) for (const e of S.swarm) if ((e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 < (S.frostR + e.r) ** 2) { e.slowT = 0.8; hitE(e, D * B.frost * 0.45 * (1 + w.frost * 0.15), true); e.flash = 0.06; if (S.evo.evo_frost && !e.boss && rand() < 0.2) e.frozen = 0.7; } }
  if (w.thunder && ready('thunder', 2.8)) { const n = (2 + w.thunder) * (S.evo.evo_thunder ? 2 : 1);
    for (let i = 0; i < n; i++) { const t = randomFoe(10); if (!t) break; if (!fx('sk_thunder_strike', t.x, t.y, { size: 2.8 })) { S.bolts.push({ x: t.x, y: t.y, t: 0.3, s: rand() * 99 }); fx('hit_star_bolt', t.x, t.y, { z: 0.2 }); }   // сборка 66: молния с неба — лист
      const dm = D * B.thunder * 1.5 * (1 + w.thunder * 0.15); for (const e of S.swarm) if ((e.x - t.x) ** 2 + (e.y - t.y) ** 2 < (0.9 + e.r) ** 2) hitE(e, dm);
      if (S.evo.evo_thunder) { const hit = new Set([t]); let px = t.x, py = t.y; for (let j = 0; j < 2; j++) { const q = nearest(px, py, 4, hit); if (!q) break; hit.add(q); C.lightningArc(px, py, q.x, q.y); hitE(q, dm * 0.7); px = q.x; py = q.y; } } }
    bus.emit('sfx', 'zap'); }
  if (w.scythe && ready('scythe', 2.2)) { const n = (1 + Math.floor(w.scythe / 2)) * (S.evo.evo_scythe ? 2 : 1), face = G.player.face * Math.PI / 4;
    for (let i = 0; i < n; i++) { const a = face + (i - (n - 1) / 2) * (6.283 / Math.max(3, n)); S.projs.push({ kind: 'scythe', x: pl.x, y: pl.y, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, dmg: D * B.scythe * (1 + w.scythe * 0.15) * (S.evo.evo_scythe ? 2 : 1), r: S.evo.evo_scythe ? 0.9 : 0.6, pierce: 1e9, life: 1.8, back: 0.5, hit: new Set(), t: 0 }); }
    bus.emit('sfx', 'whirl'); }
  if (w.rain && ready('rain', 3.6)) { for (let k = 0; k < (S.evo.evo_rain ? 2 : 1); k++) { const t = k ? randomFoe(9) : target(pl.x, pl.y, 9); if (!t) break; const r = (1.8 + w.rain * 0.2) * A * (S.evo.evo_rain ? 1.5 : 1);
    S.rains.push({ x: t.x, y: t.y, r, t: 2.2, tick: 0, dmg: D * B.rain * 0.5 * (1 + w.rain * 0.15) }); fx('sk_arrow_rain_zone', t.x, t.y, { size: r * 2.2, dur: 2.2, fade: 1 }); } }
  for (const z of S.rains) { z.t -= dt; z.tick -= dt; if (z.tick > 0) continue; z.tick = 0.25;
    for (const e of S.swarm) if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + e.r) ** 2) hitE(e, z.dmg, true);
    const a = rand() * 6.283, d = Math.sqrt(rand()) * z.r; if (!fx('sk_arrow_rain_drop', z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, { size: 2.2 })) C.particles(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 3, { c: [220, 230, 255], z: 1.5, sp: 1, size: 3, life: 0.3 }); }
  S.rains = S.rains.filter(z => z.t > 0);
  for (const b of S.bolts) b.t -= dt; S.bolts = S.bolts.filter(b => b.t > 0);
}
// случайный враг рядом (метеоры, громовержец): несколько попыток, иначе ближайший
function randomFoe(R) { const S = G.surv, pl = G.player, n = S.swarm.length; for (let i = 0; i < 8 && n; i++) { const e = S.swarm[(rand() * n) | 0]; if (!e.dead && (e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 < R * R) return e; } return nearest(pl.x, pl.y, R); }
// эффекты Жатвы — сложением цветов: ярко на тёмной арене (правки 3: «скилы тусклые»)
const fx = (id, x, y, o = {}) => C.sheet(id, x, y, { ...o, add: 1 });

// ---------------------------------------------------------------- level-up choices
export function choices() {
  const S = G.surv, out = [];
  for (const E of EVOS) if (!S.evo[E.id] && (E.from === 'main' ? S.w.main : S.w[E.from]) >= 5 && (S.p[E.need] || 0) >= 1) out.push({ evo: E });
  const nW = Object.keys(S.w).length, nP = Object.keys(S.p).length;
  const pool = Object.entries(PERKS).filter(([id, P]) => { const cur = P.passive ? S.p[id] || 0 : S.w[id] || 0; if (cur >= P.max) return false; if (!cur && (P.passive ? nP >= 6 : nW >= 6)) return false; return true; });
  pool.sort(() => rand() - 0.5);
  for (const [id, P] of pool) { if (out.length >= 4) break; out.push({ id, P, lvl: P.passive ? S.p[id] || 0 : S.w[id] || 0, tag: buildTag(S, id) }); }
  if (!out.length) out.push({ rep: 'power' }, { rep: 'life' }, { gold: true });   // правки 3: всё прокачано (часовая жатва) — сила растёт и дальше
  return out;
}
export function take(c) {
  const S = G.surv;
  if (c.evo) { S.evo[c.evo.id] = 1; bus.emit('toast', { text: 'Пробуждение: ' + c.evo.name, sub: c.evo.desc, kind: 'quest' }); bus.emit('sfx', 'epicDrop'); return; }
  if (c.gold) { S.gold += 50; return; }
  if (c.rep === 'power') { S.pow0 = S.pow0 || S.pow || 1; S.pow += S.pow0 * 0.1; bus.emit('sfx', 'learn'); return; }
  if (c.rep === 'life') { S.hp0x = S.hp0x || G.stats.maxHP; G.stats.maxHP += Math.round(S.hp0x * 0.1); G.player.hp = G.stats.maxHP; bus.emit('sfx', 'learn'); return; }
  if (c.P.passive) S.p[c.id] = (S.p[c.id] || 0) + 1; else S.w[c.id] = (S.w[c.id] || 0) + 1;
  checkBuilds();
  if (c.id === 'vigor') { G.stats.maxHP = Math.round(G.stats.maxHP * 1.2); G.player.hp = Math.min(G.stats.maxHP, G.player.hp + G.stats.maxHP * 0.2); }
  bus.emit('sfx', 'learn');
}

const owns = (S, id) => PERKS[id] && PERKS[id].passive ? (S.p[id] || 0) > 0 : (S.w[id] || 0) > 0;
function checkBuilds() {
  const S = G.surv;
  for (const B of BUILDS) if (!S.builds[B.id] && B.need.every(id => owns(S, id))) {
    S.builds[B.id] = 1; for (const id of B.need) if (!PERKS[id].passive) S.bm[id] = (S.bm[id] || 1) * (B.id === 'hero' ? 1.4 : 1.3);
    bus.emit('toast', { text: 'Билд собран: ' + B.name, sub: B.desc, kind: 'quest' }); bus.emit('sfx', 'epicDrop');
  }
}
// карточка перка: часть какого билда (сколько уже собрано)
function buildTag(S, id) {
  for (const B of BUILDS) if (!S.builds[B.id] && B.need.includes(id)) { const have = B.need.filter(x => owns(S, x)).length + (owns(S, id) ? 0 : 1); return `Билд «${B.name}» ${have}/${B.need.length}`; }
  return '';
}

// ---------------------------------------------------------------- задания Жатвы на день (правки 3)
// У Жатвы свои задания: каждый день три новых, счёт идёт только в Жатве и не связан с доской объявлений деревни
// (а задания дня у доски иногда сами посылают сюда — «Продержаться 5 минут в Жатве»).
const SDQ = [
  { id: 'kills', n: [400, 800], t: n => `Убить ${n} врагов (за день)`, cur: D => D.kills },
  { id: 'guards', n: [2, 4], t: n => `Победить ${n} стражей жатвы (за день)`, cur: D => D.guards },
  { id: 'surv', n: [6, 10], t: n => `Продержаться ${n} мин за один забег`, cur: D => Math.floor(D.bestT / 60) },
  { id: 'lvl', n: [15, 25], t: n => `Достичь ${n} уровня за один забег`, cur: D => D.bestLvl },
  { id: 'evo', n: [1, 1], t: () => 'Пробудить оружие', cur: D => D.evo },
  { id: 'souls', n: [600, 1200], t: n => `Собрать ${n} душ (за день)`, cur: D => D.souls },
];
const dayNo = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
export const sdqReward = () => ({ gold: 60 + 15 * ((G.profile && G.profile.level) || 1), shards: 1 });
export function survDaily() {
  const P = G.profile; P.surv = P.surv || { best: 0, ach: {}, runs: 0 }; const today = dayNo();
  if (!P.surv.day || P.surv.day.day !== today) {
    let r = today % 2147483646 + 7; const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
    const picks = [...SDQ].sort(() => R() - 0.5).slice(0, 3);
    P.surv.day = { day: today, kills: 0, guards: 0, bestT: 0, bestLvl: 0, evo: 0, souls: 0, list: picks.map(q => { const st = q.n[1] - q.n[0] >= 100 ? 50 : 1; return { id: q.id, n: q.n[0] + Math.round(R() * (q.n[1] - q.n[0]) / st) * st, claimed: false }; }) };
  }
  const D = P.surv.day;
  return D.list.map(q => { const def = SDQ.find(x => x.id === q.id); const cur = Math.min(q.n, def.cur(D)); return { ...q, title: def.t(q.n), cur, done: cur >= q.n }; });
}
export const survDailyReady = () => !!(G.profile && G.profile.surv && survDaily().some(q => q.done && !q.claimed));
export function claimSurvDaily(id) {
  const P = G.profile, q = survDaily().find(x => x.id === id); if (!q || !q.done || q.claimed) return false;
  P.surv.day.list.find(x => x.id === id).claimed = true; const r = sdqReward(); P.gold += r.gold; P.shards = (P.shards || 0) + r.shards;
  bus.emit('toast', { text: 'Задание Жатвы выполнено', sub: `+${r.gold} зол. · +${r.shards}◆`, kind: 'good' }); bus.emit('sfx', 'quest'); bus.emit('hud'); bus.emit('save'); return true;
}
function dayProgress(S) {
  survDaily(); const D = G.profile.surv.day, was = survDaily().filter(q => q.done).length;
  D.kills += S.kills; D.guards += S.guardKills; D.bestT = Math.max(D.bestT, S.t); D.bestLvl = Math.max(D.bestLvl, S.lvl); D.evo += Object.keys(S.evo).length; D.souls += S.souls || 0;
  return survDaily().filter(q => q.done && !q.claimed).length > 0 && survDaily().filter(q => q.done).length > was;
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
  const dayDone = !S.intro && dayProgress(S);
  bus.emit('survEnd', { win, t: S.t, kills: S.kills, lvl: S.lvl, gold: gold + achGold, shards, newAch, record, heroXP, intro: S.intro, guards: S.guardKills, dayDone });
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
// правки 3: спрайты эффектов Жатвы рисуются один раз в маленький холст и потом только копируются (drawImage).
// Раньше каждый осколок «Ледяной звезды», кинжал и душа рисовались с shadowBlur — это размытие на каждом кадре
// для каждого снаряда, и на круге из 16–32 осколков кадры проседали даже без врагов рядом.
const SPR = new Map();
function sprite(key, size, paint) {
  let c = SPR.get(key); if (c) return c;
  c = document.createElement('canvas'); const k = 2; c.width = c.height = Math.ceil(size * k); const x = c.getContext('2d'); x.scale(k, k); x.translate(size / 2, size / 2); paint(x, size / 2);
  SPR.set(key, c); return c;
}
const glow = (x, R, col, a = 0.55) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.45, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, 7); x.fill(); };
// душа: ромбик-кристалл с белым ядром и мягким сиянием (как sv_soul_drop в промте для GPT)
const soulSpr = (col, hex) => sprite('soul' + hex, 64, (x, R) => { glow(x, R, col, 0.6); const s = R * 0.42;
  x.fillStyle = hex; x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, -s * 1.35); x.lineTo(s * 0.8, 0); x.lineTo(0, s * 1.35); x.lineTo(-s * 0.8, 0); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.moveTo(0, -s * 0.7); x.lineTo(s * 0.32, 0); x.lineTo(0, s * 0.5); x.lineTo(-s * 0.32, 0); x.closePath(); x.fill(); });
const shardSpr = () => sprite('shard', 40, (x, R) => { x.save(); x.scale(1, 0.55); glow(x, R, '143,220,255', 0.5); x.restore();
  x.fillStyle = 'rgba(220,250,255,0.95)'; x.strokeStyle = 'rgba(120,200,255,0.9)'; x.lineWidth = 1; x.beginPath(); x.moveTo(R * 0.6, 0); x.lineTo(0, -R * 0.22); x.lineTo(-R * 0.5, 0); x.lineTo(0, R * 0.22); x.closePath(); x.fill(); x.stroke(); });
const knifeSpr = () => sprite('knife', 32, (x, R) => { x.save(); x.scale(1, 0.4); glow(x, R, '188,212,255', 0.4); x.restore();
  x.fillStyle = '#eef3ff'; x.beginPath(); x.moveTo(R * 0.65, 0); x.lineTo(-R * 0.25, -R * 0.16); x.lineTo(-R * 0.25, R * 0.16); x.fill(); x.fillStyle = '#6a4a2a'; x.fillRect(-R * 0.56, -R * 0.09, R * 0.31, R * 0.18); });
const boltSpr = () => sprite('bolt', 40, (x, R) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.8); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(180,140,255,0.9)'); g.addColorStop(1, 'rgba(120,80,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * 0.8, 0, 7); x.fill(); });
const bladeSpr = () => sprite('blade', 48, (x, R) => { x.save(); x.scale(1, 0.25); const g = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.85); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(200,190,255,0.5)'); g.addColorStop(1, 'rgba(120,90,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * 0.85, 0, 7); x.fill(); x.restore(); });
const blit = (ctx, img, x, y, s, a = 0) => { if (a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.drawImage(img, -s / 2, -s / 2, s, s); ctx.restore(); } else ctx.drawImage(img, x - s / 2, y - s / 2, s, s); };
const PSHEET = { knife: 'proj_knife', knife_evo: 'proj_knife_evo', shard: 'proj_ice_shard', arrow: 'proj_arrow', bolt: 'proj_star_bolt', evo: 'proj_hero_weapon_evo', spear: 'proj_pierce_shot' };
// правки 3, второй заход: серп жнеца и метеор — свои спрайты (тоже рисуются один раз)
const scytheSpr = () => sprite('scythe', 64, (x, R) => { glow(x, R, '190,255,170', 0.55); x.strokeStyle = 'rgba(235,255,225,1)'; x.lineWidth = R * 0.16; x.lineCap = 'round'; x.beginPath(); x.arc(0, 0, R * 0.55, -2.4, 0.9); x.stroke(); x.strokeStyle = 'rgba(140,255,120,0.9)'; x.lineWidth = R * 0.07; x.beginPath(); x.arc(0, 0, R * 0.4, -2.2, 0.7); x.stroke(); });
const fireSpr = () => sprite('fire', 48, (x, R) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.3, 'rgba(255,190,70,0.95)'); g.addColorStop(0.7, 'rgba(255,90,20,0.5)'); g.addColorStop(1, 'rgba(255,40,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, 7); x.fill(); });
// правки 3: души крупнее; второй заход — на 40 % меньше (спрайт 60 → 36 px), «жирные» вдвое больше.
// Золото — тот же кристалл того же размера, только жёлтый (раньше монетка 26 px с крошечным кругом внутри)
export const SOUL_PX = 20, SOUL_BIG = 2, SOUL_K = 1.8;
export const gemSprites = () => ({ blue: soulSpr('122,224,255', '#7ae0ff'), pink: soulSpr('255,106,216', '#ff6ad8'), gold: soulSpr('255,205,80', '#ffcf4a') });
const poolFx = (q, k = 1, a = 0, dt = 0) => ({ id: 'gr_burning_ground', x: q.x, y: q.y, a, t: G.time + q.x + dt, dur: 1, cyc: 0.8, size: q.r * 2.3 * k, add: 1 });
// горящая земля: кольцо огня и внутри ещё два таких же, меньше и повёрнутых, — середина горит, а не пустая
const POOL_RINGS = [[1, 0, 0], [0.66, 1.3, 0.27], [0.36, 2.6, 0.53]];
const drawPool = (c, cam, q) => { const al = Math.min(1, q.t * 2); let ok = false; if (fxReady('gr_burning_ground')) drawGroundGlow(c, cam, q.x, q.y, q.r * 0.95, al * (0.85 + Math.sin(G.time * 7 + q.x) * 0.15)); for (const [k, a, dt] of POOL_RINGS) ok = drawFxSheet(c, cam, poolFx(q, k, a, dt), al) || ok; return ok; };
const markFx = m => ({ id: 'sk_meteor_target', x: m.x, y: m.y, t: 1 - Math.max(0, m.t / m.T), dur: 1, size: m.R * 2.2, add: 1 });
// сборка 66: горящая земля и метки метеоров — на плоскость у земли в 3D (render3d/decals.js), чтобы мобы стояли на них, а не под ними
// морозная аура вокруг героя; flat — рисуем на холст пола (вид сверху, без сплющивания)
function drawFrost(c, cam, flat) {
  const S = G.surv; if (!S.w.frost || !S.frostR) return 0;
  const pl = G.player, [cx, cy] = cam.toScreen(pl.x, pl.y), [rx] = cam.toScreen(pl.x + S.frostR, pl.y), R = Math.abs(rx - cx), pu = 0.75 + 0.25 * Math.sin(G.time * 5), d = flat ? 3 : 2;
  c.save(); c.translate(cx, cy); if (!flat) c.scale(1, 0.5); const g = c.createRadialGradient(0, 0, R * 0.3, 0, 0, R); g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(0.8, `rgba(140,215,255,${0.22 * pu})`); g.addColorStop(1, 'rgba(200,240,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); c.strokeStyle = `rgba(200,240,255,${0.55 * pu})`; c.lineWidth = flat ? 4 : 3; c.beginPath(); c.arc(0, 0, R * 0.96, 0, 7); c.stroke();
  for (let i = 0; i < 10; i++) { const a = G.time * 0.8 + i * 0.628; c.fillStyle = 'rgba(230,250,255,0.9)'; c.fillRect(Math.cos(a) * R * 0.9 - d, Math.sin(a) * R * 0.9 - d, d * 2, d * 2); } c.restore(); return 1;
}
export function drawSurvivalGround(c, cam) {
  const S = G.surv; if (!S) return 0; let n = 0;
  if (fxReady('gr_burning_ground')) for (const q of S.pools) if (drawPool(c, cam, q)) n++;
  if (fxReady('sk_meteor_target')) for (const m of S.drops || []) if (drawFxSheet(c, cam, markFx(m), 1)) n++;
  n += drawFrost(c, cam, true);
  return n;
}
// сборка 66 (ОС-14): танцующие клинки в 3D — щиты в сцене (render3d/decals.js): за героем клинок прячется за ним
export function survivalUpright(L) {
  const S = G.surv; if (!S || !S.bladePts) return; const bid = S.evo.evo_blades ? 'sv_evo_blades' : 'sv_orbit_blade'; if (!fxReady(bid)) return;
  for (const [bx, by] of S.bladePts) { const b = statusBillboard(bid, bx, by, 0.3, S.evo.evo_blades ? 1.6 : 1.2); if (b) { b.add = true; L.push(b); } }
}
// прежний рисунок клинка (лист не загрузился) в 3D: за спиной героя, где его заслоняет фигура, не рисуем
export const hiddenBehind = (cam, x, y) => { const P = G.player; if (!fxGround.on || !P || x + y >= P.x + P.y) return false; const [sx] = cam.toScreen(x, y), [px] = cam.toScreen(P.x, P.y); return Math.abs(sx - px) < 26 * cam.zoom; };
export function drawSurvivalFx(ctx, cam) {
  const S = G.surv; if (!S) return; const z = cam.zoom, zz = Math.max(0.8, z);
  const gb = fxReady('gr_burning_ground');   // сборка 66: горящая земля — лист круга огня (цикл), пока не загрузился — прежнее пятно; в 3D — на плоскости у земли (drawSurvivalGround)
  for (const q of S.pools) { if (gb && (fxGround.on || drawPool(ctx, cam, q))) continue; const [x, y] = cam.toScreen(q.x, q.y); ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.r * 45 * z); g.addColorStop(0, 'rgba(255,150,40,0.55)'); g.addColorStop(1, 'rgba(255,60,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, q.r * 45 * z, 0, 7); ctx.fill(); ctx.restore(); }
  if (!cam.proj) {   // в 3D души и золото лежат в сцене (render3d/renderer3d.js syncGems): мобы и герой их заслоняют; здесь — только 2D-режим
    const W = cam.w || innerWidth, H = cam.h || innerHeight, bob = Math.sin(G.time * 3) * 3, sp = gemSprites();
    for (const g of S.gems) { const [x, y] = cam.toScreen(g.x, g.y, 0.25); if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
      const big = g.big && !g.gold; blit(ctx, g.gold ? sp.gold : big ? sp.pink : sp.blue, x, y + bob * (big ? 1.5 : 1), SOUL_PX * zz * (big ? SOUL_BIG : 1) * SOUL_K); } }
  ctx.globalCompositeOperation = 'lighter';
  for (const p of S.projs) {
    const [x, y] = cam.toScreen(p.x, p.y, 0.9), [x2, y2] = cam.toScreen(p.x - p.vx * 0.05, p.y - p.vy * 0.05, 0.9); const ang = Math.atan2(y - y2, x - x2);
    { const id = PSHEET[p.kind]; if (id && fxReady(id) && drawProjSheet(ctx, cam, id, p.x, p.y, 0.9, ang, p.t || 0, p.kind === 'spear' ? 3.4 : undefined)) continue; }   // нарисованный лист из промта (когда пришлют), иначе спрайт
    if (p.kind === 'scythe') { const k = p.r / 0.6; blit(ctx, scytheSpr(), x, y, 78 * z * k, p.t * 16); continue; }
    if (p.kind === 'spear') { ctx.strokeStyle = 'rgba(255,220,120,0.45)'; ctx.lineWidth = 12 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * 60 * z, y - Math.sin(ang) * 60 * z); ctx.stroke(); ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 4 * z; ctx.stroke(); continue; }
    if (p.kind === 'knife' || p.kind === 'knife_evo') blit(ctx, knifeSpr(), x, y, 40 * z, ang);
    else if (p.kind === 'shard') blit(ctx, shardSpr(), x, y, 44 * z, ang);
    else if (p.kind === 'arrow') { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const g = ctx.createLinearGradient(-40 * z, 0, 8 * z, 0); g.addColorStop(0, 'rgba(255,210,120,0)'); g.addColorStop(1, 'rgba(255,230,160,1)'); ctx.strokeStyle = g; ctx.lineWidth = 3.5 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-40 * z, 0); ctx.lineTo(6 * z, 0); ctx.stroke(); ctx.restore(); }
    else { ctx.strokeStyle = 'rgba(170,140,255,0.5)'; ctx.lineWidth = 6 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * 30 * z, y - Math.sin(ang) * 30 * z); ctx.stroke(); blit(ctx, boltSpr(), x, y, 52 * z); }
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
  // метеоры: падают наискосок, на земле — растущая метка
  for (const m of S.drops || []) { const k = Math.max(0, m.t / m.T), [gx, gy] = cam.toScreen(m.x, m.y), [ex, ey] = cam.toScreen(m.x + m.R, m.y);
    if (!(fxReady('sk_meteor_target') && (fxGround.on || drawFxSheet(ctx, cam, markFx(m), 1)))) { ctx.save(); ctx.translate(gx, gy); ctx.scale(1, 0.5); ctx.strokeStyle = `rgba(255,140,50,${0.35 + 0.5 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, Math.abs(ex - gx) * (1 - k * 0.6), 0, 7); ctx.stroke(); ctx.restore(); }
    const [x, y] = cam.toScreen(m.x - 2.2 * k, m.y, 7 * k), [x2, y2] = cam.toScreen(m.x - 2.2 * k - 0.4, m.y, 7 * k + 1.3), ang = Math.atan2(y - y2, x - x2);
    if (fxReady('proj_fireball') && drawProjSheet(ctx, cam, 'proj_fireball', m.x - 2.2 * k, m.y, 7 * k, ang, G.time, 2.6)) continue;
    ctx.strokeStyle = 'rgba(255,150,50,0.6)'; ctx.lineWidth = 14 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2 + (x2 - x) * 1.5, y2 + (y2 - y) * 1.5); ctx.stroke(); blit(ctx, fireSpr(), x, y, 56 * z); }
  // морозная аура: голубой круг на земле, пульсирует; в 3D — на плоскости у земли (drawSurvivalGround): это обруч на полу, дальняя половина прячется за героем
  if (!fxGround.on) drawFrost(ctx, cam, false);
  // громовержец: молния с неба
  for (const b of S.bolts || []) { const [x0, y0] = cam.toScreen(b.x, b.y, 0), [x1, y1] = cam.toScreen(b.x, b.y, 9), al = Math.min(1, b.t / 0.15);
    ctx.beginPath(); ctx.moveTo(x1, y1); for (let i = 1; i < 8; i++) { const f = i / 8; ctx.lineTo(x1 + (x0 - x1) * f + Math.sin(b.s + i * 2.7 + G.time * 40) * 14 * z, y1 + (y0 - y1) * f); } ctx.lineTo(x0, y0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(140,170,255,${0.55 * al})`; ctx.lineWidth = 14 * z; ctx.stroke(); ctx.strokeStyle = `rgba(255,255,255,${al})`; ctx.lineWidth = 4 * z; ctx.stroke();
    blit(ctx, boltSpr(), x0, y0, 90 * z); }
  if (S.gemTip && !S.gemTip.taken) {   // сборка 60 (П13): над первой душой — прыгающая стрелка
    const g = S.gemTip, [x, y] = cam.toScreen(g.x, g.y, 0.25), b = Math.abs(Math.sin(G.time * 4)) * 10;
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.translate(x, y - 44 - b); ctx.fillStyle = '#7ae0ff'; ctx.strokeStyle = '#06222c'; ctx.lineWidth = 3; ctx.shadowColor = '#7ae0ff'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(-12, -16); ctx.lineTo(12, -16); ctx.lineTo(0, 4); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); ctx.globalCompositeOperation = 'lighter';
  }
  if (S.bladePts) { const bid = S.evo.evo_blades ? 'sv_evo_blades' : 'sv_orbit_blade', ok = fxReady(bid); if (!(ok && fxGround.on)) for (const [bx, by, a] of S.bladePts) { if (hiddenBehind(cam, bx, by)) continue; if (ok && drawStatusSheet(ctx, cam, bid, bx, by, 0.3, S.evo.evo_blades ? 1.6 : 1.2)) continue; const [x, y] = cam.toScreen(bx, by, 0.9); blit(ctx, bladeSpr(), x, y, 60 * z, a * 3); blit(ctx, bladeSpr(), x, y, 40 * z, a * 3); } }
  ctx.globalCompositeOperation = 'source-over';
}
