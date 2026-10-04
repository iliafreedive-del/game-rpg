// «Летопись битв» (сборка 44): логика боя «герой против отряда из 2–4 врагов» без DOM и рендера — её же гоняет tools/qa/hw_sim.mjs.
// Ходы по очереди, как в браузерных автобоях: по инициативе (скорость атаки) ходит один боец за раз. Ближний бой — подбежал,
// ударил, отскочил на своё место; стрелок и маг бьют издалека снарядом. Арена в метрах: герой слева (x < 0), отряд справа, z — глубина.

export const ARENA = { heroX: -5.4, foeX0: 1.6, foeX1: 5.4, zMax: 2.4 };
const RUN = 10, BACK_T = 0.4, PAUSE = 0.15;

// расстановка отряда: ближний бой — первая линия, стрелки и маги — вторая; босс — в центре первой линии
export function formation(foes) {
  const front = foes.filter(f => !f.ranged), back = foes.filter(f => f.ranged);
  const rows = [front, back].filter(r => r.length);
  rows.forEach((row, ri) => {
    const x = rows.length === 1 ? (ARENA.foeX0 + ARENA.foeX1) / 2 + 0.4 : ri === 0 ? ARENA.foeX0 + 0.6 : ARENA.foeX1 - 0.3;
    const n = row.length, step = n > 1 ? Math.min(2.4, (ARENA.zMax * 2) / (n - 1)) : 0;
    row.sort((a, b) => (b.boss ? 1 : 0) - (a.boss ? 1 : 0));   // босс первым → в середину
    const order = n === 3 ? [1, 0, 2] : n === 2 ? [0, 1] : [...Array(n).keys()];
    row.forEach((f, i) => { const k = order.indexOf(i); f.home = { x: x + (ri === 1 ? (k % 2 ? 0.9 : -0.3) : n > 2 ? (k === 1 ? -0.5 : 0.9) : k % 2 ? 0.6 : -0.3) + (rows.length === 1 && n > 2 && k !== 1 ? 0.8 : 0), z: (k - (n - 1) / 2) * step }; });
  });
  for (const f of foes) { f.x = f.home.x; f.z = f.home.z; }
}

// hero: { hp, dmg, aps, crit, critMult, armor, spell, cls }; foes: [{ type, name, lvl, hp, dmg, aps, ranged, boss, big }]
export function makeBattle(hero, foes, rnd = Math.random) {
  const rr = (a, b) => a + (b - a) * rnd();
  const ev = [];   // события для рендера: { k: 'num'|'proj'|'label'|'slash'|'boom'|'sfx', ... }
  const H = { side: 'h', ...hero, max: hero.hp, x: ARENA.heroX, z: 0, home: { x: ARENA.heroX, z: 0 }, ranged: hero.cls !== 'warrior', reach: 1.25, ini: 0.6, n: 0 };
  for (const f of foes) Object.assign(f, { side: 'f', max: f.hp, reach: f.big ? 1.9 : 1.35, ini: rr(0, 0.5), act: null, flash: 0, hitT: 0, dead: false, deadT: 0 });
  formation(foes);
  const all = [H, ...foes];
  const B = { H, foes, all, ev, time: 0, over: null, pause: 0.6, projs: [], skillEvery: 4, skillIn: 3 };
  const alive = () => foes.filter(f => !f.dead);
  const redu = lvl => H.armor / (H.armor + 50 + 10 * lvl);
  const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  for (const u of all) u.yaw = u.side === 'h' ? Math.PI / 2 : -Math.PI / 2;

  function damage(src, dst, mul, o = {}) {
    if (dst.dead || (dst === H && H.hp <= 0)) return;
    if (!o.sure && rnd() < (dst === H ? 0.08 : 0.05)) {   // уворот
      dst.dodge = 0.35; ev.push({ k: 'num', u: dst, s: 'Уворот!', c: '#9fe38e', big: 1 }); ev.push({ k: 'sfx', id: 'dodge' }); return;
    }
    let d, crit = false;
    if (src === H) { d = H.dmg * mul * rr(0.88, 1.12); crit = rnd() < H.crit; if (crit) d *= H.critMult; }
    else d = src.dmg * mul * rr(0.88, 1.12) * (1 - redu(src.lvl));
    d = Math.max(1, Math.round(d)); dst.hp -= d; dst.flash = 0.16; dst.hitT = 0.28;
    ev.push({ k: 'num', u: dst, s: crit ? d + ' Крит' : String(d), c: dst === H ? '#ff6a5a' : crit ? '#ffd24a' : '#fff', big: crit ? 2 : o.big ? 1 : 0 });
    ev.push({ k: 'sfx', id: dst === H ? 'hurt' : crit ? 'heavy' : 'hit' });
    if (dst.hp <= 0) { dst.hp = 0; if (dst !== H) { dst.dead = true; dst.deadT = 0; ev.push({ k: 'sfx', id: 'bones' }); } }
  }
  const splash = (src, c, R, mul) => { for (const f of alive()) if (f !== c && Math.hypot(f.x - c.x, f.z - c.z) < R) damage(src, f, mul, { sure: true }); };

  // цель героя: добиваем раненого, иначе ближайший (ближний бой) / самый опасный — стрелок (дальний)
  function heroTarget() {
    const L = alive(); if (!L.length) return null;
    if (H.tgt && !H.tgt.dead) return H.tgt;
    return H.tgt = L.slice().sort((a, b) => (a.hp / a.max) - (b.hp / b.max) || Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z))[0];
  }

  function start(u) {
    const tgt = u === H ? heroTarget() : H; if (!tgt) return;
    let skill = false;
    if (u === H) { H.n++; if (--B.skillIn <= 0) { skill = true; B.skillIn = B.skillEvery; } }
    const kind = u.ranged ? 'shoot' : 'melee';
    u.act = { kind, skill, tgt, ph: kind === 'melee' ? 'go' : 'aim', t: 0, fired: false, from: { x: u.x, z: u.z } };
    if (skill) ev.push({ k: 'label', u, s: { warrior: 'Сокрушение', archer: 'Залп', mage: 'Огненный шар' }[H.cls] || 'Умение' });
    if (kind === 'melee') {   // встать перед целью, чуть со стороны своего края
      const dir = u.side === 'h' ? -1 : 1, R = (u.reach + (tgt.big ? 0.5 : 0)) * (skill ? 1.1 : 1);
      u.act.to = { x: tgt.x + dir * R, z: tgt.z + (u.side === 'h' ? 0 : rr(-0.25, 0.25)) };
      u.act.dur = Math.max(0.28, Math.min(0.6, Math.hypot(u.act.to.x - u.x, u.act.to.z - u.z) / RUN));
    }
  }

  function fire(u) {   // снаряд или удар
    const a = u.act, t = a.tgt;
    if (u === H && a.skill) {
      if (H.cls === 'warrior') { damage(H, t, 2.2, { sure: true, big: 1 }); splash(H, t, 2.6, 0.8); ev.push({ k: 'boom', x: t.x, z: t.z, c: 'gold' }); }
      else if (H.cls === 'archer') { const L = alive(); for (let i = 0; i < 3; i++) { const v = L[(i + (rnd() * L.length | 0)) % L.length]; B.projs.push({ k: 'arrow', src: u, tgt: v, x: u.x, z: u.z, t: -i * 0.12, d: 0.42, mul: 0.95 }); } }
      else B.projs.push({ k: 'fireball', src: u, tgt: t, x: u.x, z: u.z, t: 0, d: 0.55, mul: 2.1 * Math.max(1, H.spell / 1.2), aoe: 3, amul: 0.6 });
      return;
    }
    if (a.kind === 'melee') { damage(u, t, u.boss && rnd() < 0.3 ? 1.5 : 1); ev.push({ k: 'slash', u: t, from: u }); return; }
    const k = u === H ? (H.cls === 'mage' ? 'bolt' : 'arrow') : (u.type === 'skel_mage' ? 'shadow' : 'arrow');
    B.projs.push({ k, src: u, tgt: t, x: u.x, z: u.z, t: 0, d: k === 'arrow' ? 0.38 : 0.5, mul: 1 });
  }

  function stepAct(u, dt) {
    const a = u.act; a.t += dt;
    if (a.kind === 'melee') {
      if (a.ph === 'go') {
        const k = Math.min(1, a.t / a.dur), e = k * k * (3 - 2 * k);
        u.x = a.from.x + (a.to.x - a.from.x) * e; u.z = a.from.z + (a.to.z - a.from.z) * e; u.yaw = yawTo(u, a.tgt);
        if (k >= 1) { a.ph = 'hit'; a.t = 0; a.dur = a.skill ? 0.7 : 0.48; a.imp = a.skill ? 0.55 : 0.45; }
      } else if (a.ph === 'hit') {
        if (!a.fired && a.t / a.dur >= a.imp) { a.fired = true; fire(u); }
        if (a.t >= a.dur) { a.ph = 'back'; a.t = 0; a.from = { x: u.x, z: u.z }; }
      } else {   // отскок на своё место лицом к противнику
        const k = Math.min(1, a.t / BACK_T), e = 1 - (1 - k) * (1 - k);
        u.x = a.from.x + (u.home.x - a.from.x) * e; u.z = a.from.z + (u.home.z - a.from.z) * e;
        if (k >= 1) u.act = null;
      }
    } else {
      a.dur = a.skill ? 0.65 : 0.5; a.imp = 0.55; u.yaw = yawTo(u, a.tgt);
      if (!a.fired && a.t / a.dur >= a.imp) { a.fired = true; fire(u); }
      if (a.t >= a.dur) u.act = null;
    }
  }

  B.step = dt => {
    if (B.over) return;
    B.time += dt;
    for (const u of all) { u.flash = Math.max(0, (u.flash || 0) - dt); u.hitT = Math.max(0, (u.hitT || 0) - dt); u.dodge = Math.max(0, (u.dodge || 0) - dt); if (u.dead) u.deadT += dt; }
    for (let i = B.projs.length - 1; i >= 0; i--) {
      const p = B.projs[i]; p.t += dt; if (p.t < 0) continue;
      const k = Math.min(1, p.t / p.d); p.x = p.src.x + (p.tgt.x - p.src.x) * k; p.z = p.src.z + (p.tgt.z - p.src.z) * k; p.k01 = k;
      if (k >= 1) {
        B.projs.splice(i, 1);
        if (!p.tgt.dead) damage(p.src, p.tgt, p.mul, { big: !!p.aoe, sure: !!p.aoe });
        if (p.aoe) { splash(p.src, p.tgt, p.aoe, p.amul); ev.push({ k: 'boom', x: p.tgt.x, z: p.tgt.z, c: 'fire' }); }
      }
    }
    const busy = all.find(u => u.act);
    if (busy) stepAct(busy, dt);
    else if (!B.projs.length) {
      B.pause -= dt;
      if (B.pause <= 0 && H.hp > 0 && alive().length) {
        // следующий ход — у того, кто раньше наберёт инициативу (скорость атаки); время ожидания пропускаем
        const L = [H, ...alive()]; let best = null, bt = 1e9;
        for (const u of L) { const t = Math.max(0, (1 - u.ini) / Math.max(0.2, u.aps)); if (t < bt) { bt = t; best = u; } }
        for (const u of L) u.ini += u.aps * bt;
        best.ini -= 1; start(best); B.pause = PAUSE;
      }
    }
    if (!B.over && !busy && !B.projs.length) {
      if (!alive().length) B.over = 'win';
      else if (H.hp <= 0) B.over = 'lose';
    }
    if (H.hp <= 0 && !B.over && !busy) B.over = 'lose';
  };
  return B;
}

// ---- состав этапа: 10 этапов в ряду; 1–2 — двое, 3–4 — трое, 5 — Страж тропы со свитой, 6–7 — трое, 8–9 — четверо, 10 — Палач Бездны со свитой
export const CHAPTER_POOLS = [
  ['ghoul', 'skel_warrior', 'skel_archer', 'skel_mage'],
  ['beast', 'ghoul', 'skel_archer', 'skel_warrior'],
  ['skel_warrior', 'beast', 'skel_mage', 'ghoul'],
  ['elite_guard', 'beast', 'skel_mage', 'ghoul'],
];
const KIND = {   // множители к «обычному врагу» этапа
  ghoul: { name: 'Упырь', hp: 0.8, dmg: 0.8, aps: 1.2 },
  skel_warrior: { name: 'Скелет-воин', hp: 1, dmg: 1, aps: 0.9 },
  skel_archer: { name: 'Скелет-лучник', hp: 0.75, dmg: 0.9, aps: 0.85, ranged: true },
  skel_mage: { name: 'Костяной колдун', hp: 0.8, dmg: 1.2, aps: 0.7, ranged: true },
  beast: { name: 'Пещерный зверь', hp: 1.6, dmg: 1.3, aps: 0.7, big: true },
  elite_guard: { name: 'Страж тропы', hp: 1.8, dmg: 1.3, aps: 0.8, big: true },
  guard_boss: { type: 'elite_guard', name: 'Страж тропы', hp: 3.0, dmg: 2.4, aps: 0.75, big: true, boss: true },
  boss: { name: 'Палач Бездны', hp: 4.2, dmg: 2.8, aps: 0.7, big: true, boss: true },
};
const COUNT = [2, 2, 3, 3, 2, 3, 3, 4, 4, 3];
export const HW_TUNE = { hp0: 20, hpK: 1.15, dmg0: 3.6, dmgK: 1.12 };
export function stageFoes(s) {
  const ci = Math.min(CHAPTER_POOLS.length - 1, Math.floor((s - 1) / 30)), pool = CHAPTER_POOLS[ci], k = (s - 1) % 10;
  const a = Math.min(s, 30) - 1, b = Math.max(0, s - 30), T = HW_TUNE;
  const hpM = T.hp0 * Math.pow(T.hpK, a) * Math.pow(1.095, b), dmgM = T.dmg0 * Math.pow(T.dmgK, a) * Math.pow(1.075, b);
  const kinds = [];
  if (k === 4) kinds.push('guard_boss'); if (k === 9) kinds.push('boss');
  for (let i = kinds.length; i < COUNT[k]; i++) kinds.push(pool[(s + i * 3) % pool.length]);
  return kinds.map(id => { const K = KIND[id]; return { type: K.type || id, name: K.name, lvl: 1 + Math.floor(s * 0.6) + (K.boss ? 2 : 0), hp: Math.round(hpM * K.hp), dmg: dmgM * K.dmg, aps: K.aps, ranged: !!K.ranged, big: !!K.big, boss: !!K.boss }; });
}

// ---- вид на арену (общий для 3D-камеры и 2D-слоя): ортографическая камера под углом THETA, x ∈ ±HALF_X влезает по ширине,
// глубина ±DEPTH занимает полосу пола FLOOR кадра (доли высоты). toScreen: мир (м) → пиксели.
const THETA = 32 * Math.PI / 180, HALF_X = 8.6, DEPTH = 3.3, FLOOR = [0.44, 0.97];
export function arenaView(w, h) {
  const span = 2 * DEPTH * Math.sin(THETA);
  const halfH = Math.max(span / (2 * (FLOOR[1] - FLOOR[0])), HALF_X * h / w), halfW = halfH * w / h;
  const yc = (FLOOR[0] + FLOOR[1]) / 2, ty = (yc - 0.5) * 2 * halfH / Math.cos(THETA);
  const c = Math.cos(THETA), sn = Math.sin(THETA);
  return {
    theta: THETA, halfW, halfH, ty, horizon: Math.max(0.3, yc - DEPTH * sn / (2 * halfH) - 0.05),
    toScreen: (x, y, z) => [(x / halfW + 1) / 2 * w, (1 - ((y - ty) * c - z * sn) / halfH) / 2 * h],
    pxPerM: h / (2 * halfH),
  };
}
