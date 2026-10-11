// «Жатва»: баланс забега без браузера. node tools/qa/surv_sim.mjs [класс] [уровень героя] [мин] [бег: line|circle|stand]
// Бот бегает (по прямой, по кругу или стоит), перки берёт по приоритету (сначала оружие). Печатает по минутам:
// убийства, уровень забега, здоровье, сколько стражей и палачей убито, сколько врагов вокруг и впереди.
import { G, bus } from '../../js/game/ctx.js';
import { newProfile } from '../../js/game/save.js';
import { stats } from '../../js/game/stats.js';
import { autoGrow } from '../../js/game/loot.js';
import * as SV from '../../js/game/survival.js';

const [cls = 'mage', lvlS = '5', minS = '10', mode = 'line'] = process.argv.slice(2);
const P = newProfile(cls); G.profile = P; P.level = +lvlS; autoGrow(P, P.level - 1); P.story = P.story || { flags: {} }; P.story.flags = { ...(P.story.flags || {}), bossKilled: true };
G.stats = stats(P);
G.particles = []; G.texts = []; G.effects = []; G.enemies = []; G.time = 0; G.dt = 1 / 30;
const pl = G.player = { x: 60, y: 60, r: 0.35, hp: G.stats.maxHP, inv: 0, dead: false, face: 0, shield: 0, faceTo() {}, busy: () => true, setAnim() {} };
G.zone = { map: { w: 120, h: 120, blocked: () => false, free: () => true } };
// камера как на телефоне в 3D: видно примерно 12×22 м вокруг героя
G.render3d = true; G.cam = { x: 60, y: 60, w: 400, h: 800, toScreen(x, y) { return [(x - this.x) * 34 + 200, (y - this.y) * 34 + 400]; } };
let modal = 0; bus.on('survLevel', () => { modal++; });
const PRI = ['main', 'shards', 'nova', 'chain', 'blades', 'knives', 'pool', 'might', 'haste', 'area', 'vigor', 'swift', 'magnet', 'fury', 'plate', 'eye', 'growth', 'greed'];
const S = SV.startRun();
let elites = 0, bosses = 0, deaths = 0; const total = +minS * 60, dt = 1 / 30;
let next = 60, ang = 0;
const ahead = () => { let n = 0; const a = Math.atan2(Math.sin(ang), Math.cos(ang)); for (const e of S.swarm) { const d = Math.hypot(e.x - pl.x, e.y - pl.y); const da = Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - pl.y, e.x - pl.x) - a), Math.cos(Math.atan2(e.y - pl.y, e.x - pl.x) - a))); if (d < 14 && da < 0.8) n++; } return n; };
console.log(`${cls} ур.${P.level} HP ${G.stats.maxHP} урон ${G.stats.dmgMin}–${G.stats.dmgMax} сила закл. ${G.stats.spellPower.toFixed(2)} режим ${mode}`);
console.log('мин  убито  ур.забега  HP%  стражи  палачи  рядом  впереди  смертей');
while (S.t < total && !S.over) {
  G.time += dt; G.dt = dt;
  if (mode === 'smart') {   // как живой игрок: уходит от близких врагов и снарядов, подбирает души поблизости, иначе бежит по большому кругу
    let mx = Math.cos(ang), my = Math.sin(ang); ang += dt * 0.15;
    for (const e of S.swarm) { const dx = pl.x - e.x, dy = pl.y - e.y, d2 = dx * dx + dy * dy; if (d2 < 16) { const w = (e.elite ? 1.5 : 1) / Math.max(0.3, d2); mx += dx * w; my += dy * w; } }
    for (const p of S.eprojs) { const dx = pl.x - p.x, dy = pl.y - p.y, d2 = dx * dx + dy * dy; if (d2 < 9) { mx += -p.vy * 0.3 * Math.sign(dx * -p.vy + dy * p.vx || 1); my += p.vx * 0.3 * Math.sign(dx * -p.vy + dy * p.vx || 1); } }
    let gb = null, gd = 49; for (const g of S.gems) { const d2 = (g.x - pl.x) ** 2 + (g.y - pl.y) ** 2; if (d2 < gd) { gd = d2; gb = g; } }
    if (gb) { const d = Math.sqrt(gd) || 1; mx += (gb.x - pl.x) / d * 0.8; my += (gb.y - pl.y) / d * 0.8; }
    const l = Math.hypot(mx, my) || 1, sp = 5.4 * SV.moveMul(); pl.x += mx / l * sp * dt; pl.y += my / l * sp * dt;
  } else if (mode !== 'stand') { if (mode === 'circle') ang += dt * 0.25; const sp = 5.4 * SV.moveMul(); pl.x += Math.cos(ang) * sp * dt; pl.y += Math.sin(ang) * sp * dt; pl.face = Math.round(ang / (Math.PI / 4)) & 7; }
  if (pl.inv > 0) pl.inv -= dt;
  const before = S.swarm.filter(e => e.elite && !e.boss).length, bb = S.swarm.filter(e => e.boss).length;
  const el = new Set(S.swarm.filter(e => e.elite || e.boss));
  SV.updateSurvival(dt);
  for (const e of el) if (e.dead) { if (e.boss) bosses++; else elites++; }
  if (pl.dead || pl.hp <= 0) { deaths++; pl.dead = false; pl.hp = G.stats.maxHP; S.asking = false; }
  while (modal > 0) { modal--; const c = SV.choices(); c.sort((a, b) => (a.evo ? -1 : b.evo ? 1 : PRI.indexOf(a.id) - PRI.indexOf(b.id))); SV.take(c[0]); }
  G.particles.length = 0; G.texts.length = 0; G.effects.length = 0;
  if (S.t >= next) { next += 60; console.log([String(Math.round(S.t / 60)).padEnd(5), String(S.kills).padEnd(7), String(S.lvl).padEnd(11), String(Math.round(pl.hp / G.stats.maxHP * 100)).padEnd(5), String(elites).padEnd(8), String(bosses).padEnd(8), String(S.swarm.length + '/' + S.swarm.filter(e => e.elite).length).padEnd(7), String(ahead()).padEnd(9), deaths].join('')); }
}
console.log('оружие', JSON.stringify(S.w), 'пассивки', JSON.stringify(S.p), 'пробуждения', Object.keys(S.evo).join(','));
