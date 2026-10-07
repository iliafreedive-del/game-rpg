// Entities: animation controller, Player, Enemy (with AI), NPC. Rendering data only; combat math in combat.js.
import { G, bus } from './ctx.js';
import { ENEMIES, scaleHP, scaleDmg } from '../data/enemies.js';
import { WEAPONS } from '../data/items.js';
import { dirOf, dirVec } from '../core/iso.js';
import { rand, rrange, clamp, angDiff } from '../core/util.js';
import * as C from './combat.js';
import { makeWildAI } from './wildai.js';

export class Anim {
  constructor() { this.clip = 'idle'; this.t = 0; this.fps = 6; this.loop = true; this.nf = 4; this.done = false; }
  play(clip, nf, fps, loop = false, restart = true) {
    if (!restart && this.clip === clip) { this.fps = fps; return; }
    this.clip = clip; this.nf = nf; this.fps = fps; this.loop = loop; this.t = 0; this.done = false;
  }
  update(dt) { this.t += dt; if (!this.loop && this.t * this.fps >= this.nf) this.done = true; }
  get frame() { const f = Math.floor(this.t * this.fps); return this.loop ? f % this.nf : Math.min(this.nf - 1, f); }
  get prog() { return clamp(this.t * this.fps / this.nf, 0, 1); }
}
const HERO_NF = { idle: 4, walk: 8, run: 8, hit: 3, death: 8, dodge: 5, cast: 6, slash1: 7, slash2: 7, chop2: 9, sweep2: 8, bowdraw: 5, bowrel: 3 };

// ------------------------------------------------------------------ Player
export class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.r = 0.3; this.dir = 1; this.face = 1; this.turnT = 0;
    this.anim = new Anim(); this.state = 'idle'; this.stateT = 0;
    this.hp = 1; this.mp = 1; this.shield = 0; this.inv = 0; this.combo = 0; this.hitCount = 0;
    this.act = null; this.cds = {}; this.potT = 0; this.potHeal = 0; this.potMana = 0; this.moveMag = 0; this.meters = 0;
    this.flash = 0; this.dead = false;
  }
  get S() { return G.stats; }
  weaponType() { return G.profile.gear.weapon ? G.profile.gear.weapon.wt : 'sword'; }
  setAnim(clip, fps, loop = false, restart = true) { this.anim.play(clip, HERO_NF[clip], fps, loop, restart); }
  faceTo(tx, ty) { const d = dirOf(tx - this.x, ty - this.y); this.face = d; }
  busy() { return this.state === 'attack' || this.state === 'cast' || this.state === 'dodge' || this.state === 'dead'; }

  update(dt, input) {
    const S = this.S; this.stateT += dt; this.anim.update(dt);
    if (this.inv > 0) this.inv -= dt; if (this.flash > 0) this.flash -= dt;
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
    // regen & potions
    if (!this.dead) {
      this.hp = Math.min(S.maxHP, this.hp + S.hpRegen * dt + this.potHeal * dt);
      this.mp = Math.min(S.maxMP, this.mp + S.mpRegen * dt + this.potMana * dt);
      if (this.potT > 0) { this.potT -= dt; if (this.potT <= 0) this.potHeal = this.potMana = 0; }
    }
    // turning through intermediate directions (no 180° snaps), but fast
    if (this.dir !== this.face) { this.turnT -= dt; if (this.turnT <= 0) { const d = ((this.face - this.dir + 8) % 8); this.dir = (this.dir + (d <= 4 ? 1 : 7)) % 8; this.turnT = 0.012; } }   // быстрый разворот (180° ≈ 0,05 с)
    if (this.dead) return;
    if (this.state === 'dodge') {
      this.trailT = (this.trailT || 0) + dt; if (this.trailT > 0.045) { this.trailT = 0; (this.trail = this.trail || []).push({ x: this.x, y: this.y, dir: this.dir, f: `${this.anim.clip}_${this.dir}_${this.anim.frame}`, t: 0 }); if (this.trail.length > 6) this.trail.shift(); }
      const [vx, vy] = dirVec(this.dodgeDir); const sp = 8.2 * (1 - this.anim.prog * 0.55);
      [this.x, this.y] = G.zone.map.move(this.x, this.y, vx * sp * dt, vy * sp * dt, this.r);
      if (this.anim.done) { this.state = 'idle'; bus.emit('dust', { x: this.x, y: this.y }); }
      return;
    }
    if (this.state === 'hit') { if (this.anim.done) this.state = 'idle'; }
    // бой как в Archero: на ходу герой не бьёт и не стреляет — побежал, обычный удар/выстрел брошен, лицо по ходу движения;
    // остановился — game.js сразу начинает атаку (разворот к цели). Навыки по-прежнему держат на месте
    if (this.state === 'attack' || this.state === 'cast') {
      const a = this.act;
      if (input.mag > 0.12 && a && a.kind !== 'skill') { this.state = 'idle'; this.act = null; }
      else { C.updatePlayerAction(this, dt); if (this.state === 'attack' || this.state === 'cast') return; }
    }
    // movement
    const mag = input.mag;
    if (mag > 0.12) {   // удар по герою не сбивает шаг (сборка 19)
      const run = mag > 0.55; const sp = (run ? 5.4 : 3.2) * (this.S.moveMul || 1) * (G.surv ? 1 + (G.surv.p.swift || 0) * 0.08 : 1) * (this.slowT > 0 ? 0.6 : 1) * (G.wild ? G.wild.slow : 1) * (G.run && G.run.boons && G.run.boons.includes('haste') ? 1.12 : 1);
      const ox = this.x, oy = this.y;
      [this.x, this.y] = G.zone.map.move(this.x, this.y, input.wx * sp * dt, input.wy * sp * dt, this.r);
      const moved = Math.hypot(this.x - ox, this.y - oy); this.meters += moved;
      this.face = dirOf(input.wx, input.wy);
      if (run) this.setAnim('run', 13, true, this.anim.clip !== 'run'); else this.setAnim('walk', 10.5, true, this.anim.clip !== 'walk');
      this.state = 'move';
    } else if (this.state !== 'hit') {
      if (this.state !== 'idle') this.setAnim('idle', 5, true); this.state = 'idle';
    }
    if (this.slowT > 0) this.slowT -= dt;
  }
  dodge(wx, wy) {
    if (this.dead || this.state === 'dodge' || (this.cds.dodge > 0)) return false;
    const d = (Math.hypot(wx, wy) > 0.1) ? dirOf(wx, wy) : this.face;
    this.dodgeDir = d; this.face = d; this.dir = d; this.state = 'dodge'; this.stateT = 0; this.inv = 0.32; this.cds.dodge = G.run && G.run.boons && G.run.boons.includes('haste') ? 0.65 : 0.9;
    this.setAnim('dodge', 5 / 0.42); bus.emit('sfx', 'dodge'); this.trail = []; this.trailT = 0;
    bus.emit('dust', { x: this.x, y: this.y }); return true;
  }
}

// ------------------------------------------------------------------ Enemy
export const AFFIXES = {
  swift: { name: 'Проворный', spd: 1.3, hp: 0.8 },          // быстрый и хрупкий
  plated: { name: 'Бронированный', armor: 2.2, hp: 1.3, spd: 0.9 },
  frosty: { name: 'Ледяной', slow: true },                  // удары замедляют героя
  volatile: { name: 'Взрывной' },                           // при смерти взрывается — отойдите
};
const AFFIX_KEYS = Object.keys(AFFIXES);
export class Enemy {
  constructor(type, x, y, lvl, opts = {}) {
    const D = ENEMIES[type]; this.type = type; this.D = D; this.lvl = lvl;
    this.x = x; this.y = y; this.hx = x; this.hy = y; this.r = D.radius; this.dir = rand() * 8 | 0;
    this.champion = !!opts.champion;
    const diff = D.boss ? 1.7 : D.elite ? 1.5 : 1.2;   // сложность: враги прочнее и бьют больнее (было слишком легко)
    const hm = scaleHP(lvl) * (this.champion ? 2.2 : 1) * diff;
    this.maxHP = Math.round(D.hp * hm); this.hp = this.maxHP;
    this.dmgMul = scaleDmg(lvl) * (this.champion ? 1.3 : 1) * (D.boss || D.elite ? 1.15 : 1.08);
    this.armor = Math.round(D.armor * (1 + 0.15 * (lvl - 1)));
    this.anim = new Anim(); this.setAnim('idle', 5, true); this.anim.t = rand() * 2;
    this.state = 'idle'; this.cd = rrange(0.3, 1.2); this.aggro = false; this.dead = false; this.remove = false;
    this.st = { burn: 0, burnDps: 0, chill: 0, chillT: 0, slow: 0, slowT: 0, frozen: 0, shock: 0, shockAmp: 0, bleed: 0, bleedDps: 0, stun: 0 };
    this.flash = 0; this.hitStun = 0; this.zig = rand() * 6; this.phase = 1; this.id = Enemy.nid++;
    this.story = opts.story || null; this.room = opts.room || null; this.teleg = null; this.summonT = 8;
    this.name = (this.champion ? 'Чемпион: ' : '') + D.name;
    // чемпионы получают случайную черту — враги одного вида ведут себя по-разному
    if (this.champion && !D.boss && !D.elite && !opts.story) {
      const k = AFFIX_KEYS[(rand() * AFFIX_KEYS.length) | 0], A = AFFIXES[k]; this.affix = k; this.name = `${A.name} ${D.name.toLowerCase()}`;
      this.maxHP = Math.round(this.maxHP * (A.hp || 1)); this.hp = this.maxHP; this.armor = Math.round(this.armor * (A.armor || 1)); this.spdBonus = A.spd || 1;
      if (A.slow) this.D = { ...D, onHit: 'slow' };
    }
  }
  static nid = 1;
  get atlasName() { return this.D.atlas; }
  clipNF(clip) { const A = C.atlasOf(this.D.atlas); return A && A.clips[clip] ? A.clips[clip][0] : 4; }
  setAnim(clip, fps, loop = false, restart = true) { this.anim.play(clip, this.clipNF(clip), fps, loop, restart); }
  speedMul() { const s = this.st; if (s.frozen > 0 || s.stun > 0) return 0; return (1 - (s.slowT > 0 ? s.slow : 0)) * (this.enraged ? 1.35 : 1) * (this.spdBonus || 1); }

  update(dt, P) {
    this.anim.update(dt * (this.st.frozen > 0 ? 0 : Math.max(0.35, this.speedMul() || 0.35)));
    if (this.flash > 0) this.flash -= dt;
    C.tickStatus(this, dt);
    if (this.dead) { if (this.anim.done) { this.corpseT = (this.corpseT || 0) + dt; if (this.corpseT > 8) this.remove = true; } return; }
    if (this.st.frozen > 0 || this.st.stun > 0) return;
    if (this.hitStun > 0) { this.hitStun -= dt; if (this.anim.done) this.setAnim('idle', 5, true); return; }
    this.cd -= dt;
    const dx = P.x - this.x, dy = P.y - this.y, d = Math.hypot(dx, dy);
    const map = G.zone.map;
    if (!this.aggro && this.wakeT !== undefined) { this.wakeT -= dt; this.dir = dirOf(dx, dy); if (this.anim.clip !== 'idle') this.setAnim('idle', 5, true); if (this.wakeT <= 0) { this.aggro = true; this.woken = true; bus.emit('aggro', this); } return; }
    if (this.ret) {   // возвращается на место: героя не замечает, здоровье восстанавливается
      this.hp = Math.min(this.maxHP, this.hp + this.maxHP * 0.3 * dt);
      if (Math.hypot(this.hx - this.x, this.hy - this.y) > 0.7) { this.moveToward(this.hx, this.hy, dt, 1.3); return; }
      this.ret = false; this.hp = this.maxHP; this.setAnim('idle', 5, true); return;
    }
    if (!this.aggro) {
      const R = ((this.D.boss ? 9.5 : G.wild ? 5.2 : 6.2) + (G.stats && G.stats.ranged ? 3 : 0)) * (G.wild ? G.wild.noise : 1);   // стрелок и маг привлекают врагов издалека
      if (!P.dead && d < R && map.los(this.x, this.y, P.x, P.y)) {
        // постепенное замечание: сначала моб «приглядывается» (стоит, смотрит), и только потом бросается
        if (this.alertT === undefined) this.alertT = this.D.boss ? 0.4 : rrange(0.25, 0.6) * (d < 3 ? 0.4 : 1);
        this.alertT -= dt; this.dir = dirOf(dx, dy); if (this.anim.clip !== 'idle') this.setAnim('idle', 5, true);
        if (this.alertT > 0) return;
        this.aggro = true; bus.emit('aggro', this); if (this.D.boss) bus.emit('bossStart', this);
      }
      else { if (this.alertT !== undefined && d > R + 1.5) this.alertT = undefined; if (this.anim.clip !== 'idle') this.setAnim('idle', 5, true); return; }
    }
    // поводок: герой ушёл далеко или моб утащился от своего места — теряет интерес и идёт обратно (сборка 47: паки за героем не собираются)
    if (this.aggro && !this.D.boss && (!this.story || this.story === 'hunt') && !this.summoned) { const hd = Math.hypot(this.x - this.hx, this.y - this.hy); if (d > 12 || hd > 16 || (d > 8 && !map.los(this.x, this.y, P.x, P.y))) { this.leashT = (this.leashT || 0) + dt; if (this.leashT > (hd > 16 ? 0.5 : 2)) { this.aggro = false; this.leashT = 0; this.alertT = undefined; this.wakeT = undefined; this.state = 'idle'; this.cd = 1.5; this.ret = true; } } else this.leashT = 0; }
    if (P.dead) { if (this.state !== 'attack') { this.setAnim('idle', 5, true); this.state = 'idle'; } return; }
    if (this.state === 'attack') { C.updateEnemyAttack(this, dt, P); return; }
    AI[this.D.ai](this, dt, P, d, dx, dy);
  }
  moveToward(tx, ty, dt, spMul = 1, useFlow = true) {
    const map = G.zone.map; let vx = tx - this.x, vy = ty - this.y; const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
    // путь: прямо, если не мешают ни стены, ни пропсы; иначе по полю в обход пропсов (раньше поле видело только стены,
    // и мобы упирались в сундуки, саркофаги, деревья и камни). Проверка прямого пути — раз в 0,25 с
    if (useFlow) {
      if (!(this.pathT > G.time) || this.pathTx == null || Math.abs(this.pathTx - tx) + Math.abs(this.pathTy - ty) > 1) { this.pathT = G.time + 0.25; this.pathTx = tx; this.pathTy = ty; this.pathClear = map.clearPath(this.x, this.y, tx, ty, this.r * 0.9); }
      if (!this.pathClear) { const f = map.chaseDir(this.x, this.y, tx, ty) || (!map.los(this.x, this.y, tx, ty) && map.flowDir(this.x, this.y)); if (f) { vx = f[0]; vy = f[1]; } }
    }
    // separation from other enemies
    for (const o of G.enemies) { if (o === this || o.dead) continue; const ox = this.x - o.x, oy = this.y - o.y, dd = ox * ox + oy * oy, rr = (this.r + o.r) * 1.1; if (dd < rr * rr && dd > 1e-4) { const k = (rr - Math.sqrt(dd)) * 2; vx += ox * k; vy += oy * k; } }
    const sp = this.D.speed * 0.8 * spMul * this.speedMul();   // мобы заметно медленнее героя (бег героя 4.6 м/с)
    // упёрся (шаг вперёд занят) — пробуем отклониться на 30…110° в ту сторону, что в прошлый раз помогла
    { const l2 = Math.hypot(vx, vy) || 1; vx /= l2; vy /= l2; const pr = this.r * 0.9, ahead = Math.max(0.25, sp * 0.12);
      if (!map.free(this.x + vx * ahead, this.y + vy * ahead, pr)) { const a0 = Math.atan2(vy, vx), sd = this.sideSign || 1;
        for (const da of [0.5, 0.9, 1.3, 1.9]) { let hit = false; for (const sg of [sd, -sd]) { const a = a0 + da * sg; if (map.free(this.x + Math.cos(a) * ahead, this.y + Math.sin(a) * ahead, pr)) { vx = Math.cos(a); vy = Math.sin(a); this.sideSign = sg; hit = true; break; } } if (hit) break; } } }
    [this.x, this.y] = map.move(this.x, this.y, vx * sp * dt, vy * sp * dt, this.r * 0.9);
    this.dir = dirOf(vx, vy);
    const wf = (this.D.fps && this.D.fps.walk) || 10; this.setAnim('walk', wf * Math.max(0.5, spMul * this.speedMul()), true, this.anim.clip !== 'walk');
  }
  startAttack(kind, P) {
    const D = this.D; this.state = 'attack'; this.atk = { kind, hit: false, t: 0 };
    this.dir = dirOf(P.x - this.x, P.y - this.y);
    let clip = kind === 'attack2' ? 'attack2' : kind === 'slam' ? 'slam' : kind === 'roar' ? 'roar' : 'attack';
    const A = C.atlasOf(D.atlas); if (A && A.clips && !A.clips[clip]) clip = 'attack';   // у зверей нет attack2/slam/roar — бьют обычной анимацией
    const fps = (D.fps && D.fps[clip]) || 10;
    this.setAnim(clip, fps * (this.enraged ? 1.25 : 1));
    this.atk.impact = D.impact; this.atk.tx = P.x; this.atk.ty = P.y;
    C.enemyTelegraph(this, kind, P);
  }
}
// ------------------------------------------------------------------ AI behaviours
const AI = {
  melee(e, dt, P, d) {
    if (d <= e.D.range + P.r && e.cd <= 0 && G.zone.map.los(e.x, e.y, P.x, P.y)) { e.startAttack('attack', P); e.cd = e.D.cd * rrange(0.85, 1.15); return; }
    if (d > e.D.range + P.r - 0.1) e.moveToward(P.x, P.y, dt); else { e.dir = dirOf(P.x - e.x, P.y - e.y); e.setAnim('idle', 5, true, e.anim.clip !== 'idle'); }
  },
  fast(e, dt, P, d, dx, dy) {
    if (d <= e.D.range + P.r && e.cd <= 0) { e.startAttack('attack', P); e.cd = e.D.cd; return; }
    // zig-zag approach
    e.zig += dt * 5; const s = Math.sin(e.zig) * 0.7 * Math.min(1, d / 3);
    const l = d || 1; const tx = P.x - dy / l * s * 2, ty = P.y + dx / l * s * 2;
    if (d > e.D.range + P.r - 0.1) e.moveToward(tx, ty, dt); else e.setAnim('idle', 5, true, e.anim.clip !== 'idle');
  },
  archer(e, dt, P, d) { ranged(e, dt, P, d); },
  caster(e, dt, P, d) {
    e.blinkCd = (e.blinkCd || 3) - dt;
    if (d < 2.6 && e.blinkCd <= 0) { C.blink(e, P); e.blinkCd = 5.5; return; }
    ranged(e, dt, P, d);
  },
  beast(e, dt, P, d) {
    if (e.lunge) { // dash phase
      const L = e.lunge; L.t += dt;
      const sp = 7.5; const [nx, ny] = G.zone.map.move(e.x, e.y, L.vx * sp * dt, L.vy * sp * dt, e.r);
      const blocked = Math.hypot(nx - e.x, ny - e.y) < sp * dt * 0.3; e.x = nx; e.y = ny;
      if (!L.hit && Math.hypot(P.x - e.x, P.y - e.y) < e.r + P.r + 0.35) { L.hit = true; C.enemyHitsPlayer(e, 1.3, 'phys'); }
      if (L.t > 0.45 || blocked) { e.lunge = null; e.state = 'idle'; e.setAnim('idle', 5, true); e.cd = e.D.cd; }
      return;
    }
    if (d < 4.2 && d > 1.4 && e.cd <= 0 && G.zone.map.los(e.x, e.y, P.x, P.y)) {
      // telegraphed lunge
      e.state = 'attack'; e.atk = { kind: 'lunge', t: 0, hit: false, impact: 0.99 }; e.dir = dirOf(P.x - e.x, P.y - e.y);
      e.setAnim('attack', 7 / 0.65); C.enemyTelegraph(e, 'lunge', P); return;
    }
    AI.melee(e, dt, P, d);
  },
  elite(e, dt, P, d) {
    if (!e.enraged && e.hp < e.maxHP * 0.5) { e.enraged = true; bus.emit('float', { x: e.x, y: e.y, text: 'ЯРОСТЬ!', color: '#ff5040', big: 1 }); bus.emit('sfx', 'roar'); }
    if (d <= e.D.range + P.r + 0.2 && e.cd <= 0) { e.startAttack(rand() < 0.45 ? 'attack2' : 'attack', P); e.cd = e.D.cd * (e.enraged ? 0.7 : 1); return; }
    if (d > e.D.range + P.r) e.moveToward(P.x, P.y, dt); else e.setAnim('idle', 5, true, e.anim.clip !== 'idle');
  },
  boss(e, dt, P, d) {
    const f = e.hp / e.maxHP;
    const ph = f > 0.6 ? 1 : f > 0.3 ? 2 : 3;
    if (ph !== e.phase) { e.phase = ph; e.startAttack('roar', P); e.cd = 1.2; if (ph === 3) e.enraged = true; bus.emit('bossPhase', { e, ph }); return; }
    e.summonT -= dt;
    if (ph >= 2 && e.summonT <= 0) { e.summonT = ph === 3 ? 11 : 14; C.bossSummon(e); }
    if (e.cd <= 0) {
      if (d > 3.5 && ph >= 2 && rand() < 0.5) { e.startAttack('slam', P); e.cd = 2.2; return; }   // ranged rift slam
      if (d <= e.D.range + P.r + 0.3) {
        const r = rand(); e.startAttack(r < 0.4 ? 'attack' : r < 0.75 ? 'attack2' : 'slam', P); e.cd = e.D.cd * (ph === 3 ? 0.75 : 1); return;
      }
    }
    if (d > e.D.range + P.r) e.moveToward(P.x, P.y, dt, ph === 3 ? 1.3 : 1); else e.setAnim('idle', 5, true, e.anim.clip !== 'idle');
  },
  // hunt mini-bosses: a base behaviour + special abilities from data/hunts.js (enrage / summon / nova / volley)
  mini(e, dt, P, d, dx, dy) {
    const A = e.D.abil || {};
    if (A.enrage && !e.enraged && e.hp < e.maxHP * 0.5) { e.enraged = true; bus.emit('float', { x: e.x, y: e.y, text: 'ЯРОСТЬ!', color: '#ff5040', big: 1 }); bus.emit('sfx', 'roar'); if (A.summon) bus.emit('miniSummon', e); }
    if (A.summon) { e.sumT = (e.sumT ?? A.summon.cd * 0.5) - dt; if (e.sumT <= 0) { e.sumT = A.summon.cd * (e.enraged ? 0.7 : 1); bus.emit('miniSummon', e); } }
    if (A.nova) e.novaT = (e.novaT ?? A.nova.cd * 0.5) - dt;
    if (A.volley) e.volT = (e.volT ?? A.volley.cd * 0.5) - dt;
    if (e.cd <= 0) {
      if (A.nova && e.novaT <= 0 && d < A.nova.r + 0.8) { e.novaT = A.nova.cd * (e.enraged ? 0.75 : 1); e.startAttack('nova', P); e.setAnim('attack', 5); e.atk.impact = 0.8; e.cd = 1; return; }
      if (A.volley && e.volT <= 0 && d < e.D.range && G.zone.map.los(e.x, e.y, P.x, P.y)) { e.volT = A.volley.cd * (e.enraged ? 0.75 : 1); e.startAttack('volley', P); e.setAnim('attack', 6); e.cd = e.D.cd; return; }
    }
    AI[e.D.base](e, dt, P, d, dx, dy);
  },
};
function ranged(e, dt, P, d) {
  const los = G.zone.map.los(e.x, e.y, P.x, P.y);
  if (los && d <= e.D.range && e.cd <= 0) { e.startAttack('attack', P); e.cd = e.D.cd * rrange(0.85, 1.2); return; }
  if (!los || d > e.D.range) e.moveToward(P.x, P.y, dt);
  else if (d < e.D.keep - 1) { // kite: step away
    const vx = e.x - P.x, vy = e.y - P.y; e.moveToward(e.x + vx, e.y + vy, dt, 0.9, false); e.dir = dirOf(P.x - e.x, P.y - e.y);
  } else { e.dir = dirOf(P.x - e.x, P.y - e.y); e.setAnim('idle', 5, true, e.anim.clip !== 'idle'); }
}

Object.assign(AI, makeWildAI(AI, ranged));   // походы: стая, рывок, великан, командир, корни, босс поля

// ------------------------------------------------------------------ NPC
export class NPC {
  constructor(def) { Object.assign(this, def); this.anim = new Anim(); this.anim.play('idle', 6, 5, true); this.anim.t = rand() * 3; this.dir = 1; this.talkT = 0; }
  update(dt, P) {
    this.anim.update(dt);
    const d = Math.hypot(P.x - this.x, P.y - this.y);
    if (d < 4) this.dir = dirOf(P.x - this.x, P.y - this.y);
    if (this.talkT > 0) { this.talkT -= dt; if (this.anim.clip !== 'talk') this.anim.play('talk', 6, 6, true); }
    else if (this.anim.clip !== 'idle') this.anim.play('idle', 6, 5, true);
  }
}
