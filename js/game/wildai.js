// ИИ мобов походов: стая (pack), рывок (charge), великан/медведь (giant), командир форта (jarl),
// корни лешего (root), босс поля (wildboss). Подключается из entities.js: Object.assign(AI, makeWildAI(AI, ranged)).
import { G, bus } from './ctx.js';
import { dirOf } from '../core/iso.js';
import { rand, rrange, clamp } from '../core/util.js';
import * as C from './combat.js';

const livingMinions = () => G.enemies.reduce((n, o) => n + (!o.dead && o.summoned ? 1 : 0), 0);

// П21: у стай каждого края свой второй приём (через раз с рывком): Фьорды — ледяное дыхание конусом, Пустоши — прыжок на героя,
// Храм — каменные шипы по прямой. Лес — классический рывок. Удары — в updateEnemyAttack (combat.js), вид — groundFx и render/renderer.js
const PACK_ALT = { fjord: 'breath', bones: 'pounce', temple: 'quake' };
function startSpecial(e, P, kind) {
  const T = kind === 'breath' ? 0.75 : 0.7;
  e.state = 'attack'; e.atk = { kind, t: 0, hit: false, impact: 0.85 }; e.dir = dirOf(P.x - e.x, P.y - e.y);
  e.setAnim('attack', e.clipNF('attack') / T); C.enemyTelegraph(e, kind, P); e.cd = e.D.cd * rrange(0.9, 1.2);
}
// Подготовка рывка с телеграфом (линия). Удар — в updateEnemyAttack (kind 'lunge'), полёт — lungeTick.
function startLunge(e, P) {
  e.state = 'attack'; e.atk = { kind: 'lunge', t: 0, hit: false, impact: 0.99 }; e.dir = dirOf(P.x - e.x, P.y - e.y);
  e.setAnim('attack', e.clipNF('attack') / 0.62); C.enemyTelegraph(e, 'lunge', P);
}
function lungeTick(e, dt, P) {
  const L = e.lunge, Cg = e.D.charge || { speed: 8, mult: 1.3, r: 3.4 }; L.t += dt;
  const sp = Cg.speed, [nx, ny] = G.zone.map.move(e.x, e.y, L.vx * sp * dt, L.vy * sp * dt, e.r);
  const blocked = Math.hypot(nx - e.x, ny - e.y) < sp * dt * 0.3; e.x = nx; e.y = ny;
  if (!L.hit && Math.hypot(P.x - e.x, P.y - e.y) < e.r + P.r + 0.35) { L.hit = true; C.enemyHitsPlayer(e, Cg.mult, 'phys'); if (!C.mobStrikeFx(e, P)) C.mobSheet(e, 'charge_crash', P.x, P.y, { size: 2.6 }); }   // П21: бросок попал — укус/клыки, у людей — удар разбега
  if (L.t > (Cg.r || 3.4) / sp + 0.1 || blocked) {
    if (blocked && Cg.crashStun) { e.st.stun = Cg.crashStun; C.mobSheet(e, 'charge_crash', e.x + L.vx * e.r, e.y + L.vy * e.r, { size: 2.8 * (e.D.size || 1) }); bus.emit('float', { x: e.x, y: e.y, text: 'Врезался!', color: '#ffd24a' }); C.particles(e.x, e.y, 10, { c: [150, 135, 115], sp: 2, size: 3 }); }
    e.lunge = null; e.state = 'idle'; e.setAnim('idle', 5, true); e.cd = Cg.cd ? Math.min(Cg.cd, e.D.cd * 1.6) : e.D.cd;
    e.recoverT = 0.85;   // П69: после броска зверь «выдыхается» на месте — окно, чтобы по нему попасть (раньше сразу снова кружил)
  }
}
function enrageOnce(e, text) {
  e.enraged = true; bus.emit('float', { x: e.x, y: e.y, text, color: '#ff5040', big: 1 }); bus.emit('sfx', 'roar');
  C.effect({ kind: 'ring', x: e.x, y: e.y, r: 3, dur: 0.5, c: [255, 120, 60] });
}

export function makeWildAI(AI, ranged) {
  return {
    // Стая: кружит вокруг героя, чем больше сородичей рядом — тем быстрее; затем телеграфный бросок.
    pack(e, dt, P, d) {
      if (e.lunge) return lungeTick(e, dt, P);
      if (e.recoverT > 0) { e.recoverT -= dt; e.dir = dirOf(P.x - e.x, P.y - e.y); e.setAnim('idle', 5, true, e.anim.clip !== 'idle'); return; }
      const map = G.zone.map, los = map.los(e.x, e.y, P.x, P.y);
      let mates = 0; for (const o of G.enemies) if (o !== e && !o.dead && o.D.ai === 'pack' && Math.hypot(o.x - e.x, o.y - e.y) < 7) mates++;
      const boost = 1 + Math.min(3, mates) * 0.07;
      if (d <= e.D.range + P.r && e.cd <= 0) { e.startAttack('attack', P); e.cd = e.D.cd * rrange(0.85, 1.15); return; }
      if (e.cd <= 0 && d < 4.4 && d > 1.6 && los) { const alt = PACK_ALT[e.D.realm]; if (alt && (e.altN = (e.altN || 0) + 1) % 2 === 0 && (alt !== 'breath' || d < 3.3)) startSpecial(e, P, alt); else startLunge(e, P); return; }
      if (d > 4.5) { e.moveToward(P.x, P.y, dt, boost); return; }
      e.orbit = e.orbit || (rand() < 0.5 ? 1 : -1);
      // П69: кружит медленнее (было 0,55 рад и с ускорением стаи) — по кружащему волку можно попасть
      const a = Math.atan2(e.y - P.y, e.x - P.x) + e.orbit * 0.3, rr = clamp(d, 2.6, 3.6);
      e.moveToward(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr, dt, 0.8, false);
      e.dir = dirOf(P.x - e.x, P.y - e.y);
    },
    // Рывок (секач, берсерк): ближний бой + бросок по прямой; секач врезается в препятствие и оглушается.
    charge(e, dt, P, d) {
      if (e.lunge) return lungeTick(e, dt, P);
      if (e.recoverT > 0) { e.recoverT -= dt; e.dir = dirOf(P.x - e.x, P.y - e.y); e.setAnim('idle', 5, true, e.anim.clip !== 'idle'); return; }
      const Cg = e.D.charge;
      if (e.D.fury && !e.enraged && e.hp < e.maxHP * e.D.fury) enrageOnce(e, 'ЯРОСТЬ!');
      e.chCd = (e.chCd ?? rrange(1, 3)) - dt;
      if (e.chCd <= 0 && d > 2.2 && d < Cg.r + 0.6 && G.zone.map.los(e.x, e.y, P.x, P.y)) { startLunge(e, P); e.chCd = Cg.cd * (e.enraged ? 0.7 : 1) * rrange(0.9, 1.2); return; }
      AI.melee(e, dt, P, d);
    },
    // Великан / медведь: широкий мах вблизи, удар по месту (ётун бьёт издали по точке героя).
    giant(e, dt, P, d) {
      if (e.D.enrage && !e.enraged && e.hp < e.maxHP * e.D.enrage) enrageOnce(e, 'РЁВ!');
      const los = G.zone.map.los(e.x, e.y, P.x, P.y), far2 = e.D.tele.attack2.at === 'target';
      if (e.cd <= 0 && los) {
        if (d <= e.D.range + P.r + 0.3) { e.startAttack(far2 || rand() < 0.65 ? 'attack' : 'attack2', P); e.cd = e.D.cd * (e.enraged ? 0.75 : 1); return; }
        if (far2 && d < 7.5) { e.startAttack('attack2', P); e.cd = e.D.cd * 1.15 * (e.enraged ? 0.75 : 1); return; }
      }
      if (d > e.D.range + P.r) e.moveToward(P.x, P.y, dt); else { e.dir = dirOf(P.x - e.x, P.y - e.y); e.setAnim('idle', 5, true, e.anim.clip !== 'idle'); }
    },
    // Командир форта: рубит конусом и кругом, трубит в рог и зовёт подмогу, в ярости быстрее.
    jarl(e, dt, P, d) {
      if (!e.enraged && e.hp < e.maxHP * 0.5) enrageOnce(e, 'ЯРОСТЬ!');
      e.hornT = (e.hornT ?? 5) - dt;
      if (e.hornT <= 0 && livingMinions() < 6) { e.hornT = (e.enraged ? 10 : 14) * (e.hornMul || 1); bus.emit('wildSummon', { e, n: e.enraged ? 3 : 2, text: 'Рог войны!' }); e.cd = Math.max(e.cd, 0.8); return; }
      if (d <= e.D.range + P.r + 0.2 && e.cd <= 0) { e.startAttack(rand() < 0.45 ? 'attack2' : 'attack', P); e.cd = e.D.cd * (e.enraged ? 0.7 : 1); return; }
      if (d > e.D.range + P.r) e.moveToward(P.x, P.y, dt); else { e.dir = dirOf(P.x - e.x, P.y - e.y); e.setAnim('idle', 5, true, e.anim.clip !== 'idle'); }
    },
    // Леший: держит дистанцию и вызывает корни под героем (телеграф-круг, замедление).
    root(e, dt, P, d) { ranged(e, dt, P, d); },
    // Босс поля: три фазы, зовёт стаю, бьёт по точке героя и волной.
    wildboss(e, dt, P, d) {
      const f = e.hp / e.maxHP, ph = f > 0.6 ? 1 : f > 0.3 ? 2 : 3;
      if (ph !== e.phase) { e.phase = ph; e.startAttack('roar', P); e.cd = 1.2; if (ph === 3) e.enraged = true; bus.emit('bossPhase', { e, ph }); if (ph >= 2) bus.emit('wildSummon', { e, n: 3, text: ph === 2 ? 'На помощь!' : 'Ко мне, стая!' }); return; }
      e.summonT -= dt;
      if (ph >= 2 && e.summonT <= 0 && livingMinions() < 6) { e.summonT = ph === 3 ? 12 : 16; bus.emit('wildSummon', { e, n: ph === 3 ? 3 : 2, text: 'На помощь!' }); }
      if (e.cd <= 0) {
        if (d > 3.5 && ph >= 2 && rand() < 0.5) { e.startAttack('slam', P); e.cd = 3.2; return; }   // П51: между лужами ≥ 3 с
        if (d <= e.D.range + P.r + 0.3) { const r = rand(), k = r < 0.4 ? 'attack' : r < 0.75 ? 'attack2' : 'slam'; e.startAttack(k, P); e.cd = k === 'slam' ? 2.6 : e.D.cd * (ph === 3 ? 0.75 : 1); return; }
      }
      if (d > e.D.range + P.r) e.moveToward(P.x, P.y, dt, ph === 3 ? 1.3 : 1); else { e.dir = dirOf(P.x - e.x, P.y - e.y); e.setAnim('idle', 5, true, e.anim.clip !== 'idle'); }
    },
  };
}
