// Combat: player attacks & skills, damage formulas, status effects, enemy attacks, projectiles, VFX spawning.
import { G, bus } from './ctx.js';
import { WEAPONS } from '../data/items.js';
import { SKILLS } from '../data/skills.js';
import { effRank, damageReduction, hasBoon } from './stats.js';
import { getAtlas } from '../core/assets.js';
import { dirOf, dirVec } from '../core/iso.js';
import { rand, rrange, rint, clamp, angDiff } from '../core/util.js';

export const atlasOf = n => getAtlas(n);
const R = id => effRank(G.profile, id);
const MAX_PARTICLES = 350, MAX_TEXTS = 50, MAX_EFFECTS = 80;

// ------------------------------------------------------------------ VFX helpers (bounded pools)
export function float(x, y, text, color = '#fff', o = {}) {
  if (G.texts.length >= MAX_TEXTS) G.texts.shift();
  G.texts.push({ x, y, z: o.z ?? 1.9, text: String(text), color, t: 0, life: o.life || 0.9, big: o.big || 0, dx: rrange(-0.25, 0.25) });
}
bus.on('float', f => float(f.x, f.y, f.text, f.color, f));
export function particles(x, y, n, o) {
  for (let i = 0; i < n; i++) {
    if (G.particles.length >= MAX_PARTICLES) G.particles.shift();
    const a = rand() * Math.PI * 2, s = rrange(o.spMin ?? 0.5, o.sp ?? 2.5);
    G.particles.push({ x, y, z: o.z ?? 0.8, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rrange(o.vzMin ?? 0.5, o.vz ?? 3), g: o.g ?? 6, t: 0, life: rrange(0.35, o.life ?? 0.8), c: o.c || [255, 200, 120], size: o.size ?? 3, add: o.add ?? true });
  }
}
export function effect(e) { if (G.effects.length >= MAX_EFFECTS) G.effects.shift(); e.t = 0; G.effects.push(e); return e; }

// ------------------------------------------------------------------ targeting
export function nearestEnemy(x, y, maxD, filter) {
  let best = null, bd = maxD * maxD;
  for (const e of G.enemies) { if (e.dead || (filter && !filter(e))) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
export function pickTarget(P, range) {
  // prefer enemies in front, within range, with line of sight
  let best = null, bs = 1e9; const [fx, fy] = dirVec(P.face);
  for (const e of G.enemies) {
    if (e.dead) continue; const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
    if (d > range + e.r) continue; if (!G.zone.map.los(P.x, P.y, e.x, e.y)) continue;
    const front = (dx * fx + dy * fy) / (d || 1);
    const score = d - front * 1.2 + (e.D.boss || e.D.elite ? -0.3 : 0);
    if (score < bs) { bs = score; best = e; }
  }
  return best;
}

// ------------------------------------------------------------------ damage to enemies
export function rollWeapon(S) { return rrange(S.dmgMin, S.dmgMax + 0.999) | 0; }
export function damageEnemy(e, amount, o = {}) {
  if (e.dead) return 0;
  const S = G.stats; let dmg = amount; let crit = false, weakHit = false;
  if (o.canCrit !== false) { const cc = S.critChance + (o.critBonus || 0); if (rand() < cc) { crit = true; dmg *= S.critMult; } }
  if (!o.elem || o.elem === 'phys') { const red = damageReduction(e.armor * (1 - (o.pierce || 0)), G.profile.level) * 0.9; dmg *= 1 - red; }
  if (e.st.shock > 0) dmg *= 1 + e.st.shockAmp;
  if (G.player && G.player.warcry > G.time && o.src !== 'dot') dmg *= G.player.warcryMul || 1.25;
  if (e.st.frozen > 0 && R('shatter')) dmg *= 1.5;
  if (S.effects.execute && e.hp < e.maxHP * 0.3 && o.src === 'melee') dmg *= 2;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.flash = 0.12; G.lastCombat = G.time; e.lastSrc = o.src;
  if (!e.aggro) { e.aggro = true; bus.emit('aggro', e); }   // попал по врагу — он (и ближайшие соседи) тут же бросаются в бой
  const col = o.elem === 'fire' ? '#ff9a4a' : o.elem === 'cold' ? '#8fdcff' : o.elem === 'light' ? '#d0c2ff' : crit ? '#ffd23a' : '#ffffff';
  if (!o.quiet) float(e.x, e.y, crit ? dmg + '!' : dmg, col, { big: crit ? 1 : 0, z: e.D.boss ? 3.2 : 1.9 });
  // life on hit
  if (S.leech && o.src && o.src !== 'dot') { G.player.hp = Math.min(S.maxHP, G.player.hp + S.leech); }
  // bleed from crits (sword branch) and axes
  if (o.src === 'melee') {
    const bl = R('bloodletting'); let b = 0;
    if (crit && bl) b += dmg * bl * 0.3;
    if (o.axeBleed && rand() < 0.25) b += dmg * 0.5;
    if (b > 0) { e.st.bleed = 3; e.st.bleedDps = Math.max(e.st.bleedDps, b / 3); }
  }
  // overload sparks
  const ov = R('overload'); if (ov && o.src !== 'dot' && o.src !== 'spark' && rand() < ov * 0.10) {
    const t = nearestEnemy(e.x, e.y, 5, x => x !== e); if (t) { lightningArc(e.x, e.y, t.x, t.y); damageEnemy(t, dmg * 0.5 * S.elem.light, { elem: 'light', src: 'spark', canCrit: false }); }
  }
  if (G.run && G.run.boons && (o.src === 'melee' || o.src === 'weapon') && !e.dead && e.hp > 0) {
    if (hasBoon('burn') && rand() < 0.35) applyIgnite(e, dmg);
    if (hasBoon('frost') && rand() < 0.5) applyChill(e);
    if (hasBoon('storm') && crit) { let px = e.x, py = e.y; const hit = new Set([e]); for (let j = 0; j < 3; j++) { const t = nearestEnemy(px, py, 4.5, x => !hit.has(x)); if (!t) break; hit.add(t); lightningArc(px, py, t.x, t.y); damageEnemy(t, dmg * 0.5, { elem: 'light', src: 'spark', canCrit: false }); px = t.x; py = t.y; } }
  }
  if (!e.D.boss && !e.D.elite && dmg > e.maxHP * 0.15 && e.state !== 'attack') { e.hitStun = 0.18; e.setAnim('hit', 3 / 0.25); }
  if (o.knock && !e.D.boss) { const l = Math.hypot(e.x - o.kx, e.y - o.ky) || 1; e.kb = { vx: (e.x - o.kx) / l * o.knock, vy: (e.y - o.ky) / l * o.knock, t: 0.18 }; }
  particles(e.x, e.y, crit ? 7 : 4, { c: e.D.skeleton ? [230, 220, 200] : [150, 20, 20], z: 1, sp: 2.2, size: 2.5, add: false, life: 0.5 });
  if (e.hp <= 0) killEnemy(e, o);
  return dmg;
}
function applyIgnite(e, base) {
  const ip = R('ignite_plus');
  const dur = 3 + ip; const total = base * 0.4 * (1 + ip * 0.5) * G.stats.elem.fire;
  e.st.burn = dur; e.st.burnDps = Math.max(e.st.burnDps || 0, total / dur);
}
function applyChill(e) {
  const dc = R('deep_cold');
  e.st.slow = Math.max(e.st.slow, 0.3 + dc * 0.1); e.st.slowT = 2.5 + dc;
  e.st.chill++; e.st.chillT = 3 + dc;
  effect({ kind: 'shatter', x: e.x, y: e.y, r: 0.5, dur: 0.5, seed: rand() * 6 });
  if (e.st.chill >= 3) { effect({ kind: 'shatter', x: e.x, y: e.y, r: 1.1, dur: 1.2, seed: rand() * 6 }); e.st.chill = 0; e.st.frozen = (e.D.boss ? 0.6 : e.D.elite ? 1 : 1.5) + dc * 0.3; float(e.x, e.y, 'Заморожен', '#aee8ff'); bus.emit('sfx', 'freeze'); }
}
export function killEnemy(e, o = {}) {
  e.dead = true; e.hp = 0; e.state = 'dead'; e.setAnim('death', 9); e.teleg = null;
  const S = G.stats;
  if (e.st.burn > 0 && R('burn_explode')) { const dmg = (10 + 6 * Math.max(1, R('fireball'))) * S.spellPower * S.elem.fire * 0.8; explosion(e.x, e.y, 2, dmg, 'fire', true, e); }
  if (e.st.frozen > 0 && R('shatter')) { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; spawnProj({ kind: 'shard', x: e.x, y: e.y, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, owner: 'p', dmg: (9 + 5 * Math.max(1, R('ice_shard'))) * S.spellPower * S.elem.cold * 0.6, elem: 'cold', range: 5 }); } }
  if (S.effects.bloodShield) G.player.shield = Math.min(S.maxHP * 0.3, G.player.shield + S.maxHP * 0.1);
  if (hasBoon('vitality')) G.player.hp = Math.min(S.maxHP, G.player.hp + S.maxHP * 0.02);
  if (hasBoon('boom') && !o.fromBoom) { const d = (S.dmgMin + S.dmgMax) * 0.6; setTimeoutGame(0.08, () => { effect({ kind: 'burst', x: e.x, y: e.y, r: 2, dur: 0.4, c: [255, 170, 90] }); for (const t of G.enemies) if (!t.dead && t !== e && Math.hypot(t.x - e.x, t.y - e.y) < 2 + t.r) damageEnemy(t, d, { elem: 'fire', src: 'spell', fromBoom: true, canCrit: false }); G.cam.shake = Math.max(G.cam.shake, 0.2); bus.emit('sfx', 'boom'); }); }
  particles(e.x, e.y, 12, { c: e.D.skeleton ? [220, 210, 190] : [120, 20, 20], z: 1, sp: 3, add: false, size: 3 });
  bus.emit('sfx', e.D.skeleton ? 'bones' : 'death');
  bus.emit('kill', e);
}
export function explosion(x, y, r, dmg, elem, ignite, except) {
  effect({ kind: 'burst', x, y, r, dur: 0.55, c: elem === 'fire' ? [255, 140, 40] : elem === 'cold' ? [140, 220, 255] : [200, 180, 255] });
  if (elem === 'fire') { effect({ kind: 'scorch', x, y, r: r * 0.9, dur: 4 }); particles(x, y, 14, { c: [255, 200, 90], z: 0.4, sp: 3, vz: 5, g: 5, size: 5, life: 0.9 }); particles(x, y, 10, { c: [90, 70, 60], z: 0.8, sp: 1.5, vz: 2.5, g: -1, size: 7, life: 1.2, add: false }); }
  particles(x, y, 22, { c: elem === 'fire' ? [255, 150, 50] : [180, 220, 255], z: 0.6, sp: 5, size: 4 });
  for (const t of G.enemies) { if (t.dead || t === except) continue; if (Math.hypot(t.x - x, t.y - y) < r + t.r) { damageEnemy(t, dmg, { elem, src: 'spell' }); if (ignite && !t.dead) applyIgnite(t, dmg); } }
  bus.emit('sfx', 'boom'); G.cam.shake = Math.max(G.cam.shake, 0.25);
}
export function lightningArc(x1, y1, x2, y2) { effect({ kind: 'bolt', x1, y1, x2, y2, dur: 0.28, seed: rand() * 1000 }); particles(x2, y2, 6, { c: [210, 200, 255], z: 1, sp: 3, size: 2.5, life: 0.35 }); }

// ------------------------------------------------------------------ statuses
export function tickStatus(e, dt) {
  const s = e.st;
  if (e.kb) { const k = e.kb; [e.x, e.y] = G.zone.map.move(e.x, e.y, k.vx * dt * 5, k.vy * dt * 5, e.r); k.t -= dt; if (k.t <= 0) e.kb = null; }
  if (e.dead) return;
  if (s.burn > 0) {
    s.burn -= dt; s.burnAcc = (s.burnAcc || 0) + s.burnDps * dt; s.burnTick = (s.burnTick || 0) + dt;
    if (rand() < dt * 8) particles(e.x + rrange(-0.2, 0.2), e.y + rrange(-0.2, 0.2), 1, { c: [255, 130, 40], z: rrange(0.4, 1.4), sp: 0.3, vz: 1.5, g: -1, size: 3, life: 0.5 });
    if (s.burnTick >= 0.5) {
      s.burnTick = 0; const d = Math.round(s.burnAcc); s.burnAcc = 0;
      if (d > 0) damageEnemy(e, d, { elem: 'fire', src: 'dot', canCrit: false });
      const fs = R('fire_spread');
      if (fs && !e.dead && (s.spreadT = (s.spreadT || 0) + 0.5) >= 1) { s.spreadT = 0; for (const o of G.enemies) if (o !== e && !o.dead && o.st.burn <= 0 && Math.hypot(o.x - e.x, o.y - e.y) < 2 && rand() < fs * 0.25) { o.st.burn = s.burn; o.st.burnDps = s.burnDps * 0.8; float(o.x, o.y, 'Поджог', '#ff9a4a'); } }
    }
    if (s.burn <= 0) s.burnDps = 0;
  }
  if (s.bleed > 0) { s.bleed -= dt; s.bleedAcc = (s.bleedAcc || 0) + s.bleedDps * dt; if ((s.bleedT = (s.bleedT || 0) + dt) >= 0.6) { s.bleedT = 0; const d = Math.round(s.bleedAcc); s.bleedAcc = 0; if (d > 0) damageEnemy(e, d, { src: 'dot', canCrit: false, elem: 'bleed' }); } if (s.bleed <= 0) s.bleedDps = 0; }
  if (s.slowT > 0) { s.slowT -= dt; if (s.slowT <= 0) s.slow = 0; }
  if (s.chillT > 0) { s.chillT -= dt; if (s.chillT <= 0) s.chill = 0; }
  if (s.frozen > 0) s.frozen -= dt;
  if (s.shock > 0) s.shock -= dt;
  if (s.stun > 0) s.stun -= dt;
}

// ------------------------------------------------------------------ player: basic attack
// aim: optional world point (mouse). Without it the attack auto-targets the best enemy in front.
export const nearAim = (aim, R) => { let b = null, bd = R * R; for (const e of G.enemies) { if (e.dead) continue; const d = (e.x - aim.x) ** 2 + (e.y - aim.y) ** 2; if (d < bd) { bd = d; b = e; } } return b; };
// force: готовая цель (автоатака стоя выбирает её сама — ближайший или тот, в кого ткнули)
export function playerAttack(P, aim, force) {
  if (P.dead || P.busy() || P.state === 'hit') return false;
  const S = G.stats, wt = P.weaponType(), W = WEAPONS[wt];
  const tgt = force || (aim ? nearAim(aim, 1.4) : pickTarget(P, W.projectile ? W.range : W.range + 0.4));
  if (tgt) P.faceTo(tgt.x, tgt.y); else if (aim) P.faceTo(aim.x, aim.y);
  P.dir = P.face;
  const dur = 1 / S.aps;
  if (wt === 'bow') {
    P.state = 'attack'; P.act = { kind: 'bow', phase: 'draw', t: 0, dur, tgt, aim, impact: 0.99, cancelable: true };
    P.setAnim('bowdraw', 5 / (dur * 0.68));
  } else if (wt === 'staff') {
    P.state = 'attack'; P.act = { kind: 'staff', t: 0, dur, tgt, aim, impact: 0.5, cancelable: true, fired: false };
    P.setAnim('cast', 6 / dur);
  } else {
    const clip = W.clips[P.combo % 2];
    P.state = 'attack'; P.act = { kind: 'melee', t: 0, dur, tgt, aim, impact: W.impact, cancelable: true, fired: false, second: P.combo % 2 === 1, W };
    P.setAnim(clip, (clip === 'chop2' ? 9 : clip === 'sweep2' ? 8 : 7) / dur);
    P.combo++; P.comboT = 1.2;
    bus.emit('sfx', 'swing');
  }
  P.stateT = 0; G.lastCombat = G.time;
  if (G.zoneId === 'town') dummyHit(P, wt, W, dur);
  return true;
}
// сборка 47: манекены у наставника Элвина — по ним можно бить, над манекеном видно, сколько урона наносит герой (с критами)
function dummyHit(P, wt, W, dur) {
  const J = G.zone && G.zone.json; if (!J || !J.objects) return;
  const reach = W.projectile ? W.range : W.range + 0.9;
  const d = J.objects.filter(o => o.t === 'dummy').map(o => [o, Math.hypot(o.x - P.x, o.y - P.y)]).filter(([, r]) => r <= reach).sort((a, b) => a[1] - b[1])[0];
  if (!d) return; const o = d[0]; P.faceTo(o.x, o.y); P.dir = P.face;
  setTimeout(() => {
    const S = G.stats; if (!S || G.zoneId !== 'town') return;
    let v = S.dmgMin + Math.random() * (S.dmgMax - S.dmgMin); if (wt === 'staff') v *= S.spellPower;
    const crit = Math.random() < S.critChance; if (crit) v *= S.critMult;
    float(o.x, o.y, Math.round(v) + (crit ? '!' : ''), crit ? '#ffd23a' : '#fff', { z: 2.1, big: crit ? 1 : 0, life: 0.9 });
    bus.emit('sfx', 'hit');
  }, dur * 1000 * (W.impact || 0.5));
}
export function updatePlayerAction(P, dt) {
  const a = P.act; if (!a) { P.state = 'idle'; return; }
  a.t += dt;
  if (a.tgt && !a.tgt.dead && (a.t < 0.15 || (a.kind === 'melee' && !a.fired))) P.faceTo(a.tgt.x, a.tgt.y);
  // замах воина: цель отходит — герой подшагивает за ней до удара (иначе отбегающего моба он постоянно не доставал)
  if (a.kind === 'melee' && !a.fired && a.tgt && !a.tgt.dead) {
    const dx = a.tgt.x - P.x, dy = a.tgt.y - P.y, d = Math.hypot(dx, dy), want = a.W.range * 0.75 + a.tgt.r;
    if (d > want && d < a.W.range + a.tgt.r + 2.5) { const st = Math.min(d - want, 6.5 * dt); [P.x, P.y] = G.zone.map.move(P.x, P.y, dx / d * st, dy / d * st, P.r); }
  }
  const S = G.stats;
  if (a.kind === 'bow') {
    if (a.phase === 'draw' && P.anim.done) {
      a.phase = 'rel'; P.setAnim('bowrel', 3 / (a.dur * 0.32));
      const t = a.tgt && !a.tgt.dead ? a.tgt : a.aim ? null : pickTarget(P, 9);
      const ang = t ? Math.atan2(t.y - P.y, t.x - P.x) : a.aim ? Math.atan2(a.aim.y - P.y, a.aim.x - P.x) : P.face * Math.PI / 4;
      fireArrow(P, ang, 1); bus.emit('sfx', 'bow'); a.fired = true;
    } else if (a.phase === 'rel' && P.anim.done) endAction(P);
    return;
  }
  if (a.kind === 'staff' && !a.fired && P.anim.prog >= a.impact) {
    a.fired = true; const t = a.tgt && !a.tgt.dead ? a.tgt : a.aim ? null : pickTarget(P, 8);
    const ang = t ? Math.atan2(t.y - P.y, t.x - P.x) : a.aim ? Math.atan2(a.aim.y - P.y, a.aim.x - P.x) : P.face * Math.PI / 4;
    spawnProj({ kind: 'bolt', x: P.x, y: P.y, vx: Math.cos(ang) * 12, vy: Math.sin(ang) * 12, owner: 'p', dmg: rollWeapon(S), elem: 'magic', range: 8, src: 'weapon' });
    if (hasBoon('split')) for (const da of [-0.22, 0.22]) spawnProj({ kind: 'bolt', x: P.x, y: P.y, vx: Math.cos(ang + da) * 12, vy: Math.sin(ang + da) * 12, owner: 'p', dmg: rollWeapon(S) * 0.6, elem: 'magic', range: 8, src: 'weapon' });
    bus.emit('sfx', 'cast');
  }
  if (a.kind === 'melee' && !a.fired && P.anim.prog >= a.impact) { a.fired = true; meleeImpact(P, a); }
  if (a.kind === 'skill' && !a.fired && P.anim.prog >= a.impact) { a.fired = true; a.fire(); }
  if (P.anim.done) endAction(P);
}
function endAction(P) { P.act = null; P.state = 'idle'; P.setAnim('idle', 5, true); }

function meleeImpact(P, a) {
  const S = G.stats, W = a.W; P.hitCount++;
  const crush = R('crush') && P.hitCount % 4 === 0;
  const fa = a.aim ? Math.atan2(a.aim.y - P.y, a.aim.x - P.x) : P.face * Math.PI / 4; const ang0 = a.tgt && !a.tgt.dead ? Math.atan2(a.tgt.y - P.y, a.tgt.x - P.x) : fa;
  const mult = (a.second ? 1.25 : 1) * (crush ? 2.5 : 1);
  const cl = R('cleave'); let hitAny = false;
  const opts = { src: 'melee', pierce: W.pierce || 0, axeBleed: !!W.bleed };
  // primary target
  const prim = a.tgt && !a.tgt.dead && Math.hypot(a.tgt.x - P.x, a.tgt.y - P.y) <= W.range + a.tgt.r + 0.6 ? a.tgt : null;   // по своей цели — с запасом
  for (const e of G.enemies) {
    if (e.dead) continue; const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
    if (e !== prim && d > W.range + e.r + 0.2) continue;
    const inArc = Math.abs(angDiff(ang0, Math.atan2(dy, dx))) <= (W.arc / 2) * Math.PI / 180;
    if (e !== prim && !inArc && d > e.r + 0.5) continue;
    let m;
    if (e === prim || (!prim && !hitAny)) m = 1;
    else if (W.cleave) m = 0.85; else if (hasBoon('split')) m = 0.6; else if (cl) m = 0.3 + cl * 0.2; else if (crush) m = 0.6; else continue;
    hitAny = true;
    damageEnemy(e, rollWeapon(S) * mult * m, { ...opts, knock: a.second || crush ? 0.9 : 0, kx: P.x, ky: P.y });
    if (crush && !e.dead) e.st.stun = 1;
    if (S.effects.chainHit) { const t = nearestEnemy(e.x, e.y, 3.5, x => x !== e); if (t) { lightningArc(e.x, e.y, t.x, t.y); damageEnemy(t, rollWeapon(S) * 0.5, { src: 'melee' }); } }
  }
  if (crush) { effect({ kind: 'ring', x: P.x, y: P.y, r: 2, dur: 0.4, c: [255, 220, 150] }); G.cam.shake = 0.35; bus.emit('sfx', 'boom'); }
  if (hitAny) { bus.emit('sfx', 'hit'); G.cam.shake = Math.max(G.cam.shake, 0.12); }
  effect({ kind: 'slash', x: P.x, y: P.y, a: ang0, r: W.range, arc: W.arc, dur: 0.18, second: a.second });
}
function fireArrow(P, ang, dmgMul) {
  const S = G.stats; const pierce = R('pierce');
  // стрела вылетает из лука: на 0,55 м впереди героя и на высоте плеча (z — только для рисования), а не из центра тела
  const mk = (a, split) => spawnProj({ kind: 'arrow', x: P.x + Math.cos(a) * 0.55, y: P.y + Math.sin(a) * 0.55, z: 1.35, vx: Math.cos(a) * 15, vy: Math.sin(a) * 15, owner: 'p', dmg: rollWeapon(S) * dmgMul, elem: 'phys', range: 9.5, pierce, explosive: R('explosive'), src: 'weapon', split });
  mk(ang, S.effects.splitArrow ? 0.25 : 0);
  if (hasBoon('split')) { for (const da of [-0.2, 0.2]) spawnProj({ kind: 'arrow', x: P.x + Math.cos(ang + da) * 0.55, y: P.y + Math.sin(ang + da) * 0.55, z: 1.35, vx: Math.cos(ang + da) * 15, vy: Math.sin(ang + da) * 15, owner: 'p', dmg: rollWeapon(S) * dmgMul * 0.6, elem: 'phys', range: 9.5, pierce, src: 'weapon' }); }
}

// ------------------------------------------------------------------ player: skills
export function skillUsable(id) {
  const P = G.player, S = G.stats, sk = SKILLS[id]; if (!sk || !R(id)) return { ok: false, why: 'Не изучено' };
  if (sk.weapon === 'bow' && P.weaponType() !== 'bow') return { ok: false, why: 'Нужен лук' };
  if (sk.weapon === 'melee' && WEAPONS[P.weaponType()].projectile) return { ok: false, why: 'Нужно оружие ближнего боя' };
  if ((P.cds[id] || 0) > 0) return { ok: false, why: 'Перезарядка' };
  if (P.mp < sk.mana) return { ok: false, why: 'Мало маны' };
  return { ok: true };
}
export function castSkill(id, aim) {
  const P = G.player; if (P.dead || P.state === 'dodge') return false;
  // навык прерывает автоатаку (обычный удар/выстрел), но не другой навык
  if ((P.state === 'attack' || P.state === 'cast') && P.act && P.act.cancelable && P.act.kind !== 'skill') { P.act = null; P.state = 'idle'; }
  if (P.busy()) return false;
  if (P.state === 'hit') P.state = 'idle';
  const u = skillUsable(id); if (!u.ok) { float(P.x, P.y, u.why, '#ff9c8a', { z: 2.3 }); bus.emit('sfx', 'deny'); return false; }
  const sk = SKILLS[id], r = R(id), S = G.stats;
  const echo = S.effects.echo && sk.elem && rand() < 0.25;
  if (!echo) P.mp -= sk.mana; else float(P.x, P.y, 'Эхо!', '#d7b7ff', { z: 2.4 });
  P.cds[id] = sk.cd; G.lastCombat = G.time;
  const range = id === 'volley' || id === 'pierce_shot' || id === 'arrow_rain' ? 10 : id === 'leap' ? 8 : 8;
  const tgt = aim ? nearAim(aim, 1.6) : pickTarget(P, range); if (tgt) P.faceTo(tgt.x, tgt.y); else if (aim) P.faceTo(aim.x, aim.y); P.dir = P.face;
  const ang = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : aim ? Math.atan2(aim.y - P.y, aim.x - P.x) : P.face * Math.PI / 4;
  const sp = S.spellPower;
  let fire, clip = 'cast', dur = 0.5, impact = 0.5;
  switch (id) {
    case 'fireball': fire = () => { spawnProj({ kind: 'fireball', x: P.x, y: P.y, vx: Math.cos(ang) * 11, vy: Math.sin(ang) * 11, owner: 'p', dmg: (7 + r * 4) * sp * S.elem.fire, elem: 'fire', range: 9, aoe: 1.4, ignite: true }); bus.emit('sfx', 'fire'); }; break;
    case 'ice_shard': fire = () => { spawnProj({ kind: 'shard', x: P.x, y: P.y, vx: Math.cos(ang) * 15, vy: Math.sin(ang) * 15, owner: 'p', dmg: (6 + r * 3) * sp * S.elem.cold, elem: 'cold', range: 9, chill: true }); bus.emit('sfx', 'ice'); }; dur = 0.42; break;
    case 'chain': fire = () => { chainLightning(P, tgt, (8 + r * 4) * sp * S.elem.light, 2 + (r >> 1)); }; dur = 0.45; break;
    case 'thunder': fire = () => { effect({ kind: 'ring', x: P.x, y: P.y, r: 5, dur: 0.5, c: [190, 170, 255] }); setTimeoutGame(0.4, () => { const d = (8 + Math.max(1, R('chain')) * 4) * sp * S.elem.light * 2; for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - G.player.x, e.y - G.player.y) < 5) { lightningArc(e.x - 0.8, e.y - 3, e.x, e.y); damageEnemy(e, d, { elem: 'light', src: 'spell' }); shock(e); } G.cam.shake = 0.5; bus.emit('sfx', 'thunder'); }); }; dur = 0.55; break;
    case 'whirlwind': {
      const wt = P.weaponType(); clip = wt === 'greatsword' ? 'sweep2' : 'slash2'; dur = 0.5; impact = 0.5;
      fire = () => { effect({ kind: 'ring', x: P.x, y: P.y, r: 2.2, dur: 0.35, c: [255, 235, 200] }); for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 2.2 + e.r) damageEnemy(e, rollWeapon(S) * (1.4 + r * 0.2), { src: 'melee', knock: 1.2, kx: P.x, ky: P.y, pierce: WEAPONS[wt].pierce || 0 }); bus.emit('sfx', 'whirl'); G.cam.shake = 0.2; };
      break;
    }
    case 'leap': {
      const dest = tgt ? { x: tgt.x - Math.cos(ang) * 0.8, y: tgt.y - Math.sin(ang) * 0.8 } : aim ? aim : { x: P.x + Math.cos(ang) * 5, y: P.y + Math.sin(ang) * 5 };
      clip = 'dodge'; dur = 0.55; impact = 0.85;
      const sx = P.x, sy = P.y, [fx, fy] = G.zone.map.nearestFree(dest.x, dest.y, P.r);
      P.inv = 0.6; bus.emit('dust', { x: P.x, y: P.y });
      for (let k = 1; k <= 8; k++) setTimeoutGame(dur * 0.8 * k / 8, () => { P.x = sx + (fx - sx) * k / 8; P.y = sy + (fy - sy) * k / 8; });
      fire = () => { effect({ kind: 'ring', x: P.x, y: P.y, r: 2.6, dur: 0.45, c: [255, 210, 140] }); effect({ kind: 'scorch', x: P.x, y: P.y, r: 1.6, dur: 3 }); bus.emit('dust', { x: P.x, y: P.y }); particles(P.x, P.y, 26, { c: [170, 150, 120], z: 0.2, sp: 4, vz: 3, g: 6, size: 5, add: false }); G.cam.shake = 0.5; bus.emit('sfx', 'heavy');
        for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 2.6 + e.r) { damageEnemy(e, rollWeapon(S) * (1.8 + r * 0.3), { src: 'melee', knock: 1, kx: P.x, ky: P.y }); if (!e.dead) e.st.stun = 1; } };
      break;
    }
    case 'warcry': {
      dur = 0.5; impact = 0.4;
      fire = () => { P.warcry = G.time + 8; P.warcryMul = 1.25 + r * 0.05; effect({ kind: 'aura', dur: 1.2 }); effect({ kind: 'ring', x: P.x, y: P.y, r: 5, dur: 0.6, c: [255, 190, 70] }); bus.emit('sfx', 'roar'); G.cam.shake = 0.3;
        for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 5) { e.st.slow = 0.5; e.st.slowT = 2.5; } float(P.x, P.y, 'Боевой клич!', '#ffcf6a', { big: 1, z: 2.6 }); };
      break;
    }
    case 'meteor': {
      const tp = tgt ? { x: tgt.x, y: tgt.y } : aim ? aim : { x: P.x + Math.cos(ang) * 6, y: P.y + Math.sin(ang) * 6 };
      dur = 0.55;
      fire = () => { effect({ kind: 'meteor', x: tp.x, y: tp.y, r: 2.2, dur: 0.75 }); bus.emit('sfx', 'fire');
        setTimeoutGame(0.75, () => { const d = (22 + r * 10) * sp * S.elem.fire; explosion(tp.x, tp.y, 2.3, d, 'fire', true); G.cam.shake = 0.6; effect({ kind: 'firepool', x: tp.x, y: tp.y, r: 2, dur: 3 });
          for (let k = 1; k <= 6; k++) setTimeoutGame(k * 0.5, () => { for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - tp.x, e.y - tp.y) < 2 + e.r) damageEnemy(e, d * 0.12, { elem: 'fire', src: 'dot', canCrit: false, quiet: true }); }); }); };
      break;
    }
    case 'frost_nova': {
      dur = 0.45; impact = 0.5;
      fire = () => { effect({ kind: 'ring', x: P.x, y: P.y, r: 3.6, dur: 0.5, c: [150, 225, 255] }); effect({ kind: 'frost', x: P.x, y: P.y, r: 3.6, dur: 2.5 }); bus.emit('sfx', 'freeze');
        for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; effect({ kind: 'shatter', x: P.x + Math.cos(a) * 2.2, y: P.y + Math.sin(a) * 2.2, r: 0.8, dur: 1, seed: a }); }
        for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 3.6 + e.r) { damageEnemy(e, (8 + r * 4) * sp * S.elem.cold, { elem: 'cold', src: 'spell' }); if (!e.dead) { applyChill(e); applyChill(e); } } };
      break;
    }
    case 'arrow_rain': {
      const tp = tgt ? { x: tgt.x, y: tgt.y } : aim ? aim : { x: P.x + Math.cos(ang) * 6, y: P.y + Math.sin(ang) * 6 };
      clip = 'bowrel'; dur = 0.4; impact = 0.1;
      fire = () => { effect({ kind: 'rain', x: tp.x, y: tp.y, r: 3, dur: 1.7 }); bus.emit('sfx', 'bow');
        for (let k = 0; k < 10; k++) setTimeoutGame(0.2 + k * 0.15, () => { for (let j = 0; j < 3; j++) { const a = rand() * 6.283, rr = Math.sqrt(rand()) * 3; const x = tp.x + Math.cos(a) * rr, y = tp.y + Math.sin(a) * rr; particles(x, y, 3, { c: [255, 220, 150], z: 0.1, sp: 1, vz: 2, g: 6, size: 2.5, life: 0.3 }); effect({ kind: 'bolt', x1: x - 0.3, y1: y - 2.5, x2: x, y2: y, dur: 0.12, seed: rand() * 999 }); }
          for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - tp.x, e.y - tp.y) < 3 + e.r) damageEnemy(e, rollWeapon(S) * (0.4 + r * 0.08), { src: 'weapon', quiet: k % 2 === 1 }); }); };
      break;
    }
    case 'pierce_shot': {
      clip = 'bowrel'; dur = 0.35; impact = 0.05;
      fire = () => { spawnProj({ kind: 'pierce', x: P.x, y: P.y, vx: Math.cos(ang) * 18, vy: Math.sin(ang) * 18, owner: 'p', dmg: rollWeapon(S) * (2.2 + r * 0.3), elem: 'phys', range: 14, pierce: 99, src: 'weapon' }); bus.emit('sfx', 'bow'); G.cam.shake = 0.15; };
      break;
    }
    case 'volley': {
      clip = 'bowrel'; dur = 0.35; impact = 0.05;
      fire = () => { const n = 5 + (r >> 1); for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.13; fireArrow(P, a, 0.6 + r * 0.1); } bus.emit('sfx', 'bow'); };
      break;
    }
  }
  const nf = { cast: 6, slash2: 7, sweep2: 8, bowrel: 3, dodge: 5 }[clip];
  P.state = 'cast'; P.act = { kind: 'skill', t: 0, impact, fired: false, fire, cancelable: false, id };
  P.setAnim(clip, nf / dur); P.stateT = 0;
  return true;
}
function shock(e) { const c = R('conduct'); if (c) { e.st.shock = 3; e.st.shockAmp = c * 0.08; } }
function chainLightning(P, first, dmg, jumps) {
  let cur = first || nearestEnemy(P.x, P.y, 8, e => G.zone.map.los(P.x, P.y, e.x, e.y));
  let px = P.x, py = P.y; const hit = new Set();
  if (!cur) { lightningArc(P.x, P.y, P.x + Math.cos(P.face * Math.PI / 4) * 4, P.y + Math.sin(P.face * Math.PI / 4) * 4); bus.emit('sfx', 'zap'); return; }
  for (let j = 0; j <= jumps && cur; j++) {
    lightningArc(px, py, cur.x, cur.y); hit.add(cur);
    damageEnemy(cur, dmg * Math.pow(0.75, j), { elem: 'light', src: 'spell' }); shock(cur);
    px = cur.x; py = cur.y;
    cur = nearestEnemy(px, py, 4, e => !hit.has(e));
  }
  bus.emit('sfx', 'zap');
}
// timers bound to game time (paused with the game, cleared on zone change)
const timers = [];
export function setTimeoutGame(t, fn) { timers.push({ t, fn }); }
export function updateTimers(dt) { for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } } }
export function clearTimers() { timers.length = 0; }

// ------------------------------------------------------------------ projectiles
export function spawnProj(p) { p.t = 0; p.dist = 0; p.hit = new Set(); p.dead = false; if (G.projectiles.length > 120) G.projectiles.shift(); G.projectiles.push(p); return p; }
export function updateProjectiles(dt) {
  const map = G.zone.map, P = G.player;
  for (const p of G.projectiles) {
    if (p.dead) continue;
    p.t += dt; const sx = p.vx * dt, sy = p.vy * dt; p.x += sx; p.y += sy; p.dist += Math.hypot(sx, sy);
    if (p.split && !p.didSplit && p.t > p.split) { p.didSplit = true; const a = Math.atan2(p.vy, p.vx), s = Math.hypot(p.vx, p.vy); for (const da of [-0.2, 0.2]) spawnProj({ ...p, hit: undefined, vx: Math.cos(a + da) * s, vy: Math.sin(a + da) * s, split: 0, didSplit: true, dist: p.dist }); }
    if (p.kind === 'fireball' && rand() < 0.6) particles(p.x, p.y, 1, { c: [255, 140, 40], z: 1.0, sp: 0.4, vz: 0.5, g: 0, size: 4, life: 0.35 });
    if (p.kind === 'darkbolt' && rand() < 0.5) particles(p.x, p.y, 1, { c: [180, 110, 255], z: 1.1, sp: 0.3, vz: 0.3, g: 0, size: 3, life: 0.3 });
    if (map.blocked(Math.floor(p.x), Math.floor(p.y)) || p.dist > p.range) { projEnd(p, true); continue; }
    if (p.owner === 'p') {
      for (const e of G.enemies) {
        if (e.dead || p.hit.has(e)) continue;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + 0.25) ** 2) {
          p.hit.add(e);
          if (p.aoe) { explosion(p.x, p.y, p.aoe, p.dmg, p.elem, p.ignite); p.dead = true; break; }
          damageEnemy(e, p.dmg, { elem: p.elem === 'magic' ? 'phys' : p.elem, src: p.src || 'spell', pierce: p.elem === 'magic' ? 1 : 0 });
          if (p.chill && !e.dead) applyChill(e);
          if (p.explosive && rand() < 0.25) explosion(p.x, p.y, 1.8, p.dmg * 0.7, 'fire', false);
          if ((p.pierce || 0) > 0) { p.pierce--; continue; }
          projEnd(p, false); break;
        }
      }
    } else if (!P.dead && (P.x - p.x) ** 2 + (P.y - p.y) ** 2 < (P.r + 0.2) ** 2) {
      projEnd(p, false); if (P.inv <= 0) hurtPlayer(p.src, p.dmg, p.elem);
    }
  }
  for (let i = G.projectiles.length - 1; i >= 0; i--) if (G.projectiles[i].dead) G.projectiles.splice(i, 1);
}
function projEnd(p, wall) {
  p.dead = true;
  if (p.aoe && wall) explosion(p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.aoe, p.dmg, p.elem, p.ignite);
  else if (p.kind === 'shard') particles(p.x, p.y, 6, { c: [170, 230, 255], z: 1, sp: 2, size: 3 });
  else if (p.kind === 'bolt' || p.kind === 'darkbolt') particles(p.x, p.y, 6, { c: p.kind === 'bolt' ? [140, 200, 255] : [190, 120, 255], z: 1, sp: 2, size: 3 });
}

// ------------------------------------------------------------------ enemy attacks
export function enemyTelegraph(e, kind, P) {
  const ang = Math.atan2(P.y - e.y, P.x - e.x);
  let tg = null;
  const spec = e.D.tele && e.D.tele[kind];   // походы: телеграф задан данными моба (data/wild.js)
  if (spec) { tg = { ...spec, a: ang }; if (spec.shape === 'circle') { tg.x = spec.at === 'target' ? P.x : e.x; tg.y = spec.at === 'target' ? P.y : e.y; } }
  else if (kind === 'lunge') tg = { shape: 'line', a: ang, r: 3.6, w: 0.7 };
  else if (kind === 'nova') tg = { shape: 'circle', x: e.x, y: e.y, r: e.D.abil.nova.r };
  else if (kind === 'volley') tg = { shape: 'cone', a: ang, r: 6, arc: e.D.abil.volley.spread * (e.D.abil.volley.n - 1) * 180 / Math.PI + 12 };
  else if (e.D.proj) tg = null;   // ranged shots are never telegraphed
  else if (e.D.elite || e.D.boss) {
    if (kind === 'attack') tg = { shape: 'cone', a: ang, r: e.D.boss ? 3.2 : 2.6, arc: 70 };
    else if (kind === 'attack2') tg = { shape: 'circle', x: e.x, y: e.y, r: e.D.boss ? 3.1 : 2.5 };
    else if (kind === 'slam') tg = { shape: 'circle', x: P.x, y: P.y, r: 2.0, rift: true };
  }
  e.teleg = tg; if (tg) { tg.x = tg.x ?? e.x; tg.y = tg.y ?? e.y; tg.t = 0; }
}
export function updateEnemyAttack(e, dt, P) {
  const a = e.atk; a.t += dt; if (e.teleg) e.teleg.t += dt;
  if (!a.hit && e.anim.prog >= a.impact) {
    a.hit = true; const D = e.D; const tg = e.teleg;
    if (a.kind === 'lunge') { const ang = tg.a; e.lunge = { vx: Math.cos(ang), vy: Math.sin(ang), t: 0, hit: false }; e.teleg = null; e.state = 'lunge'; return; }
    if (a.kind === 'nova') {   // hunt mini-boss: ring blast around itself
      const N = D.abil.nova, c = N.c || [255, 80, 40];
      effect({ kind: 'ring', x: e.x, y: e.y, r: N.r, dur: 0.5, c }); particles(e.x, e.y, 26, { c, sp: 4.5, size: 4 });
      G.cam.shake = Math.max(G.cam.shake, 0.35); bus.emit('sfx', N.elem === 'fire' ? 'fire' : 'heavy');
      if (Math.hypot(P.x - e.x, P.y - e.y) < N.r + P.r) enemyHitsPlayer(e, N.mult || 1.3, N.elem || 'phys');
    } else if (a.kind === 'volley') {   // hunt mini-boss: fan of projectiles
      const V = D.abil.volley, ang = tg ? tg.a : Math.atan2(P.y - e.y, P.x - e.x), sp = D.proj === 'arrow' ? 11 : 7.5;
      for (let i = 0; i < V.n; i++) { const a2 = ang + (i - (V.n - 1) / 2) * V.spread; spawnProj({ kind: D.proj, x: e.x, y: e.y, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, owner: 'e', dmg: rrange(D.dmg[0], D.dmg[1]) * e.dmgMul * 0.8, elem: D.elem || 'phys', range: 11, src: e }); }
      bus.emit('sfx', D.proj === 'arrow' ? 'bow' : 'cast');
    } else if (a.kind === 'roar') { effect({ kind: 'ring', x: e.x, y: e.y, r: 4, dur: 0.6, c: [200, 100, 255] }); G.cam.shake = 0.5; bus.emit('sfx', 'roar'); }
    else if (D.proj) {
      const ang = Math.atan2(P.y - e.y, P.x - e.x);
      const sp = D.proj === 'arrow' ? 11 : 7.5;
      spawnProj({ kind: D.proj, x: e.x, y: e.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, owner: 'e', dmg: rrange(D.dmg[0], D.dmg[1]) * e.dmgMul, elem: D.elem || 'phys', range: 11, src: e });
      bus.emit('sfx', D.proj === 'arrow' ? 'bow' : 'cast');
    } else if (tg) {
      const inside = inShape(tg, P, e);
      if (tg.shape === 'circle' && tg.rift) { const cc = tg.elem === 'cold' ? [150, 215, 255] : D.realm === 'forest' ? [110, 200, 90] : D.realm === 'bones' ? [255, 140, 60] : [180, 80, 255]; effect({ kind: 'burst', x: tg.x, y: tg.y, r: tg.r, dur: 0.5, c: cc }); particles(tg.x, tg.y, 20, { c: cc, sp: 4, size: 4 }); }
      else effect({ kind: tg.shape === 'cone' ? 'slash' : 'ring', x: e.x, y: e.y, a: tg.a, r: tg.r, arc: tg.arc || 360, dur: 0.3, c: [255, 90, 60], enemy: true });
      G.cam.shake = Math.max(G.cam.shake, D.boss ? 0.45 : 0.3); bus.emit('sfx', 'heavy');
      if (inside) { enemyHitsPlayer(e, tg.mult ?? (a.kind === 'slam' ? 1.3 : a.kind === 'attack2' ? 0.9 : 1.1), tg.elem === 'cold' ? 'cold' : tg.elem ? tg.elem : tg.rift && !D.realm ? 'fire' : 'phys'); if (tg.slow && !P.dead) P.slowT = Math.max(P.slowT || 0, tg.slow); }
      if (D.boss && e.phase === 3 && a.kind === 'slam') setTimeoutGame(0.35, () => shockwave(e));
    } else {
      // regular melee: hit if still in reach & roughly in front
      const d = Math.hypot(P.x - e.x, P.y - e.y);
      if (d <= D.range + P.r + 0.45) enemyHitsPlayer(e, 1, 'phys');
      bus.emit('sfx', 'swingE');
    }
    e.teleg = null;
  }
  if (e.anim.done) { e.state = 'idle'; e.setAnim('idle', 5, true); e.teleg = null; }
}
function shockwave(e) {
  const cold = e.D.novaElem === 'cold';
  effect({ kind: 'wave', x: e.x, y: e.y, r: 6, dur: 0.8, c: cold ? [150, 215, 255] : e.D.realm ? [110, 200, 90] : [200, 90, 255] });
  const P = G.player; const d = Math.hypot(P.x - e.x, P.y - e.y);
  setTimeoutGame(d / 7.5, () => { if (Math.abs(Math.hypot(P.x - e.x, P.y - e.y) - d) < 1.6 && !P.dead) enemyHitsPlayer(e, 0.6, cold ? 'cold' : e.D.realm ? 'phys' : 'fire'); });
}
function inShape(tg, P, e) {
  const dx = P.x - tg.x, dy = P.y - tg.y, d = Math.hypot(dx, dy);
  if (tg.shape === 'circle') return d < tg.r + P.r;
  if (tg.shape === 'cone') return d < tg.r + P.r && Math.abs(angDiff(tg.a, Math.atan2(dy, dx))) < (tg.arc / 2 + 12) * Math.PI / 180;
  return false;
}
export function enemyHitsPlayer(e, mult, elem) {
  const P = G.player; if (P.dead) return;
  if (P.inv > 0) { float(P.x, P.y, 'Уклонение', '#bfe8ff', { z: 2.2 }); return; }
  hurtPlayer(e, rrange(e.D.dmg[0], e.D.dmg[1]) * e.dmgMul * mult, elem);
  // ice armor / thorns react to melee attackers
  if (Math.hypot(P.x - e.x, P.y - e.y) < 3) {
    if (R('ice_armor') && !e.dead) applyChill(e);
    if (G.stats.effects.thorns && !e.dead) damageEnemy(e, e.D.dmg[1] * e.dmgMul * 0.3, { canCrit: false, quiet: false, src: 'thorns' });
  }
}
export function hurtPlayer(src, raw, elem) {
  const P = G.player, S = G.stats; if (P.dead) return;
  G.lastCombat = G.time;
  const lvl = src && src.lvl ? src.lvl : G.profile.level;
  let dmg = raw;
  if (!elem || elem === 'phys') {
    if (S.block > 0 && rand() < S.block) { float(P.x, P.y, 'Блок', '#e6d7a8', { z: 2.2 }); bus.emit('sfx', 'block'); return; }
    dmg *= 1 - damageReduction(S.armor, lvl);
  }
  dmg = Math.max(1, Math.round(dmg));
  if (P.shield > 0) { const ab = Math.min(P.shield, dmg); P.shield -= ab; dmg -= ab; }
  if (src && src.D && src.D.onHit === 'slow') P.slowT = Math.max(P.slowT || 0, 1.6);   // мороз: замедление героя
  P.hp -= dmg; P.flash = 0.15; bus.emit('hurt', { dmg, src: src && src.type ? src.type : src && src.src && src.src.type ? src.src.type : String(src && src.kind || 'proj') });
  float(P.x, P.y, '-' + dmg, '#ff5a4a', { z: 2.1 });
  if (src && src.vamp && !src.dead) src.hp = Math.min(src.maxHP, src.hp + dmg * src.vamp);   // «Кровопийца»
  bus.emit('sfx', 'hurt');
  if (dmg > S.maxHP * 0.12 && !P.busy()) { P.state = 'hit'; P.stateT = 0; P.setAnim('hit', 3 / 0.3); }
  if (P.hp <= 0) { P.hp = 0; P.dead = true; P.state = 'dead'; P.setAnim('death', 9); bus.emit('playerDeath'); }
}
export function blink(e, P) {
  const map = G.zone.map;
  for (let k = 0; k < 10; k++) {
    const a = rand() * Math.PI * 2, r = rrange(4, 6); const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    if (map.free(x, y, e.r) && map.los(x, y, P.x, P.y)) {
      particles(e.x, e.y, 10, { c: [180, 110, 255], sp: 2, size: 3 });
      e.x = x; e.y = y; particles(x, y, 10, { c: [180, 110, 255], sp: 2, size: 3 }); bus.emit('sfx', 'blink'); return;
    }
  }
}
export function bossSummon(e) {
  bus.emit('summon', { x: e.x, y: e.y, n: e.phase === 3 ? 3 : 2, lvl: e.lvl });
  float(e.x, e.y, 'Восстаньте!', '#c9a0ff', { big: 1, z: 3.4 });
}
