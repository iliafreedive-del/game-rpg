// Библиотека движений. Каждое движение — ключевые позы с плавной интерполяцией (Катмулл-Ром по каждому суставу)
// и перемещение тела, которое зависит от фазы гребка: разгон после толчка и затухание в скольжении.
import { clamp, lerp, smooth, TAU } from './kit.js';

// ---------------------------------------------------------------- построитель позы
export function P(extra = {}) {
  return { pos: [0, -1.8, 0], pitch: 0, roll: 0, yaw: 0, j: {}, aim: {}, belly: 0, ribs: 0, hands: { L: 'relax', R: 'relax' }, snorkel: false, mask: true, ...extra };
}
const sg = (L) => (L === 'L' ? 1 : -1);
// плечо: flex — вперёд/вверх (π — рука над головой), abd — в сторону, rot — внутренняя ротация
export function arm(p, L, flex, abd = 0, rot = 0) { p.j['arm' + L] = [-flex, -sg(L) * rot, sg(L) * abd]; return p; }
export function elbow(p, L, bend) { p.j['fore' + L] = [-bend, 0, 0]; return p; }
// кисть: pron — поворот ладони назад (π/2 — ладонь смотрит назад/вниз), flex — сгиб к ладони
// кисть: turn — поворот ладони (0 — ладонь к телу, π/2 — ладонь туда, куда сгибается локоть), flex — сгиб к ладони
export function wrist(p, L, turn = 0, flex = 0, dev = 0) { p.j['hand' + L] = [dev, sg(L) * turn, -sg(L) * flex]; return p; }
// рука по направлению: d — куда смотрит плечо [наружу, к голове, к животу], b — куда сгибается локоть
export function A(p, L, d, b = [0, 0, 1], bend = 0, turn = 0, flex = 0) { p.aim['arm' + L] = [...d, ...b]; elbow(p, L, bend); wrist(p, L, turn, flex); return p; }
export const A2 = (p, ...a) => { A(p, 'L', ...a); A(p, 'R', ...a); return p; };
export function clav(p, L, up = 0, fwd = 0) { p.j['clav' + L] = [-fwd, 0, sg(L) * up]; return p; }
// бедро: flex — к животу, abd — в сторону, ext — разворот наружу
export function leg(p, L, flex, abd = 0, ext = 0) { p.j['thigh' + L] = [-flex, sg(L) * ext, sg(L) * abd]; return p; }
export function knee(p, L, bend) { p.j['shin' + L] = [bend, 0, 0]; return p; }
// голеностоп: плюс — носок вытянут
export function ankle(p, L, plantar, ev = 0) { p.j['foot' + L] = [plantar, 0, sg(L) * ev]; return p; }
export function spine(p, flex = 0, side = 0, twist = 0) { p.j.spine = [flex, twist, side]; return p; }
export function chest(p, flex = 0, side = 0, twist = 0) { p.j.chest = [flex, twist, side]; return p; }
// голова: плюс — подбородок к груди, минус — голова задрана
export function head(p, nod = 0, turn = 0, tilt = 0) { p.j.head = [nod * 0.6, turn * 0.6, tilt * 0.5]; p.j.neck = [nod * 0.4, turn * 0.4, tilt * 0.5]; return p; }
const both = (fn, p, ...a) => { fn(p, 'L', ...a); fn(p, 'R', ...a); return p; };

// стрела: руки вытянуты вперёд, ладонь на ладони, голова между рук
export function streamline(p, { headUp = 0 } = {}) {
  A2(p, [-0.15, 1, 0.07], [0, 0, 1], 0.03, 1.57, 0.05);
  clav(p, 'L', 0.18); clav(p, 'R', 0.18);
  head(p, 0.12 - headUp);
  p.hands = { L: 'flat', R: 'flat' };
  return p;
}
export function armsAlong(p) { A2(p, [0.07, -1, -0.04], [0, 0, 1], 0.06, 0.1, 0); p.hands = { L: 'flat', R: 'flat' }; return p; }
export function legsStraight(p, plantar = 1.3) { both(leg, p, 0.0, 0.015); both(knee, p, 0.05); both(ankle, p, plantar); return p; }

// ---------------------------------------------------------------- интерполяция
function lerpArr(a, b, t) { const o = []; for (let i = 0; i < 3; i++) o.push(lerp((a && a[i]) || 0, (b && b[i]) || 0, t)); return o; }
function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
const SCAL = ['pitch', 'roll', 'yaw', 'belly', 'ribs'];
export function blend4(a, b, c, d, t) {
  const o = P();
  for (const k of SCAL) o[k] = cr(a[k] || 0, b[k] || 0, c[k] || 0, d[k] || 0, t);
  o.pos = [0, 1, 2].map((i) => cr(a.pos[i], b.pos[i], c.pos[i], d.pos[i], t));
  const names = new Set([...Object.keys(a.j), ...Object.keys(b.j), ...Object.keys(c.j), ...Object.keys(d.j)]);
  for (const n of names) { const z = [0, 0, 0]; const A = a.j[n] || z, B = b.j[n] || z, C = c.j[n] || z, D = d.j[n] || z; o.j[n] = [0, 1, 2].map((i) => cr(A[i], B[i], C[i], D[i], t)); }
  const an = new Set([...Object.keys(a.aim || {}), ...Object.keys(b.aim || {}), ...Object.keys(c.aim || {}), ...Object.keys(d.aim || {})]);
  for (const n of an) { const z = [0, -1, 0, 0, 0, 1]; const A_ = (a.aim || {})[n] || z, B_ = (b.aim || {})[n] || z, C_ = (c.aim || {})[n] || z, D_ = (d.aim || {})[n] || z; o.aim[n] = [0, 1, 2, 3, 4, 5].map((i) => cr(A_[i], B_[i], C_[i], D_[i], t)); }
  const near = t < 0.5 ? b : c;
  o.hands = { ...near.hands }; o.snorkel = near.snorkel; o.mask = near.mask; o.cap = near.cap; o.fx = near.fx;
  return o;
}
export function mix(a, b, t) {
  const o = P();
  for (const k of SCAL) o[k] = lerp(a[k] || 0, b[k] || 0, t);
  o.pos = lerpArr(a.pos, b.pos, t);
  const names = new Set([...Object.keys(a.j), ...Object.keys(b.j)]);
  for (const n of names) o.j[n] = lerpArr(a.j[n], b.j[n], t);
  const an = new Set([...Object.keys(a.aim || {}), ...Object.keys(b.aim || {})]);
  for (const n of an) { const z = [0, -1, 0, 0, 0, 1]; const A_ = (a.aim || {})[n] || z, B_ = (b.aim || {})[n] || z; o.aim[n] = A_.map((v, i) => lerp(v, B_[i], t)); }
  const near = t < 0.5 ? a : b; o.hands = { ...near.hands }; o.snorkel = near.snorkel; o.mask = near.mask;
  return o;
}
// ключевые кадры [{t, pose}], t — секунды; loop — по кругу
export function keyed(frames, loop) {
  const T = frames[frames.length - 1].t;
  return (time) => {
    let t = loop ? ((time % T) + T) % T : clamp(time, 0, T);
    let i = 0; while (i < frames.length - 2 && t > frames[i + 1].t) i++;
    const n = frames.length;
    const at = (k) => {
      if (loop) { // последний кадр совпадает с первым
        const m = n - 1; return frames[((k % m) + m) % m].pose;
      }
      return frames[clamp(k, 0, n - 1)].pose;
    };
    const f1 = frames[i], f2 = frames[i + 1];
    const u = clamp((t - f1.t) / (f2.t - f1.t || 1), 0, 1);
    const e = f1.ease === 'linear' ? u : u; // Катмулл-Ром уже даёт плавность
    return blend4(at(i - 1), at(i), at(i + 1), at(i + 2), e);
  };
}

// ---------------------------------------------------------------- движения
// Каждое: { name, loop, dur, speed(t) — скорость вперёд м/с, sample(t, o) → поза, fx(t, dt) → события }
const breathe = (t, rate = 0.16) => { const ph = (t * rate) % 1; return ph < 0.33 ? smooth(0, 0.33, ph) : 1 - smooth(0.33, 1, ph); };

// 1. Лежать на поверхности с трубкой и раздышиваться
function floatAnim(o = {}) {
  return {
    name: 'float', loop: true, dur: 10, speed: () => 0,
    sample(t) {
      const p = P({ pos: [0, -0.16, 0], snorkel: true });
      const b = breathe(t, o.rate || 0.12);
      p.belly = b; p.ribs = b * 0.25;
      p.pitch = -0.04 + Math.sin(t * 0.7) * 0.015;
      p.pos[1] = -0.17 + Math.sin(t * 0.9) * 0.01 - b * 0.012;
      A2(p, [0.3, 0.8, 0.5], [0, 0, 1], 0.45, 1.3, 0.15);
      p.hands = { L: 'relax', R: 'relax' };
      if (o.armsDown) { A2(p, [0.25, -0.9, 0.3], [0, 0, 1], 0.3, 0.3); }
      head(p, 0.25 - (o.headUp || 0));
      both(leg, p, 0.08, 0.06); both(knee, p, 0.18); both(ankle, p, 1.15);
      leg(p, 'L', 0.06 + Math.sin(t * 0.5) * 0.02, 0.06);
      spine(p, -0.03); chest(p, 0.0);
      p.cap = b > 0.5 ? 'inhale' : 'exhale';
      if (o.tense) { A2(p, [0.1, 1, 0.2], [0, 0, 1], 0.05, 1.2); p.hands = { L: 'fist', R: 'fist' }; head(p, -0.5); spine(p, -0.12); }
      return p;
    },
  };
}

// 2. Ласты (бифины): удар от бедра, колени почти прямые, стопы вытянуты
function finKick(o = {}) {
  const f = o.freq || 1.05;
  const hipA = o.bicycle ? 0.55 : o.wide ? 0.42 : 0.24;
  const kneeA = o.bicycle ? 1.25 : 0.32;
  return {
    name: 'finkick', loop: true, dur: 1 / f,
    speed: (t) => (o.bicycle ? 0.55 : 0.95) + 0.12 * Math.sin(t * TAU * f * 2),
    sample(t) {
      const p = P();
      const ph = t * TAU * f;
      if (o.armsAlong) armsAlong(p); else streamline(p, { headUp: o.headUp || 0 });
      for (const [L, off] of [['L', 0], ['R', Math.PI]]) {
        const s = Math.sin(ph + off);
        // удар вниз (к животу) — рабочий; колено чуть сгибается в начале удара и выпрямляется хлыстом
        leg(p, L, 0.08 + hipA * s, 0.02);
        knee(p, L, 0.06 + kneeA * Math.max(0, Math.sin(ph + off + 1.9)) * (o.bicycle ? 1 : 0.8));
        ankle(p, L, 1.3 + 0.08 * Math.sin(ph + off + 0.6));
      }
      spine(p, 0.02 * Math.sin(ph * 2)); chest(p, -0.01);
      p.pitch = 0.0 + 0.012 * Math.sin(ph * 2);
      if (o.headUp) { head(p, -0.75); spine(p, -0.12); }
      p.pos[1] = -1.8 + 0.01 * Math.sin(ph * 2);
      p.roll = o.bicycle ? 0.04 * Math.sin(ph) : 0;
      p.cap = Math.sin(ph) > 0 ? 'down' : 'up';
      return p;
    },
  };
}

// 3. Моноласта: волна от груди к стопам
function dolphin(o = {}) {
  const f = o.freq || 0.85;
  return {
    name: 'dolphin', loop: true, dur: 1 / f,
    speed: (t) => 1.25 + 0.2 * Math.sin(t * TAU * f - 1.0),
    sample(t) {
      const p = P();
      const ph = t * TAU * f;
      streamline(p);
      chest(p, 0.07 * Math.sin(ph));
      spine(p, 0.12 * Math.sin(ph - 0.7));
      both(leg, p, 0.12 + 0.32 * Math.sin(ph - 1.5), -0.01);
      both(knee, p, 0.05 + 0.55 * Math.max(0, Math.sin(ph - 0.2)));
      both(ankle, p, 1.35 + 0.1 * Math.sin(ph - 2.2));
      head(p, 0.12 + 0.05 * Math.sin(ph + 0.5));
      p.pitch = 0.06 * Math.sin(ph + 0.4);
      p.pos[1] = -1.8 + 0.05 * Math.sin(ph + 1.2);
      return p;
    },
  };
}

// 4. Брас под водой (DNF): гребок до бёдер → скольжение → руки к груди и подтянуть ноги → выброс рук и толчок ногами → скольжение стрелой
function dnf(o = {}) {
  const k = (t, fn) => ({ t, pose: fn(P()) });
  const legsFrog = (p, a) => { both(leg, p, 0.95 * a, 0.32 * a, 0.55 * a); both(knee, p, 2.15 * a); both(ankle, p, 1.3 - 1.25 * a, -0.25 * a); return p; };
  const kick = (p, a) => { both(leg, p, 0.25 * a, 0.5 * a, 0.45 * a); both(knee, p, 0.6 * a); both(ankle, p, 0.6 + 0.7 * (1 - a), -0.3 * a); return p; };
  const frames = [
    k(0.0, (p) => { streamline(p); legsStraight(p); return p; }),
    // захват: ладони наружу, локти высоко
    k(0.35, (p) => { A2(p, [0.6, 0.8, 0.12], [0, 0, 1], 0.35, 2.3, 0.1); legsStraight(p); head(p, 0.12); p.hands = { L: 'cup', R: 'cup' }; p.cap = 'catch'; return p; }),
    // тяга: предплечья вертикально — «весло»
    k(0.8, (p) => { A2(p, [1, 0.12, 0.25], [0, -0.2, 1], 1.45, 1.8, 0.1); legsStraight(p); head(p, 0.12); p.hands = { L: 'cup', R: 'cup' }; p.cap = 'pull'; return p; }),
    // толчок к бёдрам
    k(1.15, (p) => { A2(p, [0.35, -0.92, 0.12], [0, 0, 1], 0.25, 1.2, -0.1); legsStraight(p); head(p, 0.12); p.hands = { L: 'flat', R: 'flat' }; p.cap = 'push'; return p; }),
    // скольжение с руками у бёдер
    k(1.35, (p) => { armsAlong(p); legsStraight(p); head(p, 0.12); p.cap = 'glide1'; return p; }),
    k(2.4, (p) => { armsAlong(p); legsStraight(p); head(p, 0.12); p.cap = 'glide1'; return p; }),
    // руки близко к телу скользят к груди, ноги подтягиваются
    k(2.95, (p) => { A2(p, [0.55, -0.6, 0.5], [0, 1, 0], 2.2, 1.57, 0.2); legsFrog(p, 0.8); head(p, 0.15); p.hands = { L: 'flat', R: 'flat' }; p.cap = 'recover'; return p; }),
    k(3.2, (p) => { A2(p, [0.4, -0.15, 0.85], [-0.2, 1, 0], 2.3, 1.57, 0.1); legsFrog(p, 1); head(p, 0.15); p.hands = { L: 'flat', R: 'flat' }; p.cap = 'recover'; return p; }),
    // выброс рук и толчок ногами («хлыст»)
    k(3.5, (p) => { A2(p, [-0.05, 0.95, 0.35], [0, 0, 1], 0.45, 1.57, 0.05); kick(p, 1); head(p, 0.12); p.hands = { L: 'flat', R: 'flat' }; p.cap = 'kick'; return p; }),
    k(3.8, (p) => { streamline(p); legsStraight(p); p.cap = 'glide2'; return p; }),
    k(4.9, (p) => { streamline(p); legsStraight(p); p.cap = 'glide2'; return p; }),
  ];
  const s = keyed(frames, true);
  const T = 4.9;
  // скорость: пик после гребка руками и после толчка ногами
  const speed = (t) => { const u = t % T; return 0.35 + 0.95 * Math.exp(-Math.max(0, u - 1.1) * 1.3) * smooth(0.5, 1.1, u) + 0.85 * Math.exp(-Math.max(0, u - 3.6) * 1.2) * smooth(3.3, 3.6, u) + (u < 0.5 ? 0.6 * Math.exp(-(u + T - 3.6) * 1.2) : 0); };
  return {
    name: 'dnf', loop: true, dur: T, speed,
    sample(t) { const p = s(t); p.pos = [0, -1.8, 0]; if (o.headUp) head(p, -0.7); if (o.wideKick) { const u = t % T; if (u > 3.2 && u < 3.7) { both(leg, p, 0.6, 0.9, 0.2); both(knee, p, 1.4); } } return p; },
  };
}

// 5. Кроль на поверхности: попеременные гребки, вращение корпуса, вдох в сторону на каждый третий гребок
function crawl(o = {}) {
  const T = 1.5; // полный цикл двух рук
  const armCycle = (p, L, u) => {
    // u 0..1: вход → захват (высокий локоть) → тяга → толчок → выход → пронос над водой
    const key = [
      [0.00, [0.12, 1, 0.12], [0, 0, 1], 0.15, 1.5],
      [0.15, [0.12, 0.85, 0.55], [0, 0, 1], 0.6, 1.6],
      [0.35, [0.2, 0.35, 0.95], [0, -0.4, 1], 1.5, 1.6],
      [0.52, [0.12, -0.8, 0.45], [0, 0, 1], 0.5, 1.3],
      [0.62, [0.3, -0.9, -0.25], [0, 0, 1], 0.7, 0.6],
      [0.82, [0.85, 0.25, -0.45], [0, 0.6, 0.8], 1.7, 0.4],
      [1.00, [0.12, 1, 0.12], [0, 0, 1], 0.15, 1.5],
    ];
    let i = 0; while (i < key.length - 2 && u > key[i + 1][0]) i++;
    const a = key[i], b = key[i + 1], w = smooth(0, 1, (u - a[0]) / (b[0] - a[0]));
    const lv = (x, y) => x.map((v, k) => lerp(v, y[k], w));
    A(p, L, lv(a[1], b[1]), lv(a[2], b[2]), lerp(a[3], b[3], w), lerp(a[4], b[4], w), 0.1);
  };
  return {
    name: 'crawl', loop: true, dur: T * 3, speed: () => 1.05,
    sample(t) {
      const p = P({ pos: [0, -0.1, 0] });
      const u = (t % T) / T;
      armCycle(p, 'L', u); armCycle(p, 'R', (u + 0.5) % 1);
      p.hands = { L: 'cup', R: 'cup' };
      const roll = 0.55 * Math.sin(u * TAU + 1.2);
      p.roll = roll;
      // вдох на каждые три гребка: голова поворачивается вслед за корпусом
      const c = (t % (T * 1.5)) / (T * 1.5);
      const br = smooth(0.55, 0.68, c) * (1 - smooth(0.8, 0.92, c));
      head(p, 0.2, br * -1.1 * Math.sign(roll || 1));
      // ноги: шесть ударов на цикл, от бедра
      for (const [L, off] of [['L', 0], ['R', Math.PI]]) { const s = Math.sin(u * TAU * 3 + off); leg(p, L, 0.05 + 0.2 * s, 0.02); knee(p, L, 0.1 + 0.25 * Math.max(0, Math.sin(u * TAU * 3 + off + 1.8))); ankle(p, L, 1.25); }
      p.cap = br > 0.3 ? 'breath' : u < 0.35 ? 'catch' : u < 0.62 ? 'push' : 'recover';
      p.mask = true;
      return p;
    },
  };
}

// 6. Брас на поверхности: короткий гребок до плеч, вдох на гребке, ноги «лягушкой», скольжение
function breaststroke() {
  const k = (t, fn) => ({ t, pose: fn(P({ pos: [0, -0.22, 0] })) });
  const frames = [
    k(0.0, (p) => { streamline(p); legsStraight(p, 1.2); return p; }),
    k(0.35, (p) => { A2(p, [0.65, 0.75, 0.2], [0, 0, 1], 0.5, 2.2, 0.1); legsStraight(p, 1.2); head(p, 0.0); p.hands = { L: 'cup', R: 'cup' }; p.cap = 'pull'; return p; }),
    k(0.7, (p) => { A2(p, [0.75, 0.25, 0.55], [-0.3, 0.3, 1], 1.7, 1.7, 0.2); head(p, -0.55); chest(p, -0.18); spine(p, -0.08); p.pitch = 0.12; p.pos[1] = -0.12; both(leg, p, 0.6, 0.25, 0.4); both(knee, p, 1.5); both(ankle, p, 0.5); p.hands = { L: 'cup', R: 'cup' }; p.cap = 'breath'; return p; }),
    k(0.95, (p) => { A2(p, [0.2, 0.6, 0.75], [0, 1, 0], 1.3, 1.57); head(p, 0.0); both(leg, p, 0.95, 0.35, 0.6); both(knee, p, 2.1); both(ankle, p, 0.1, -0.3); p.hands = { L: 'flat', R: 'flat' }; p.cap = 'recover'; return p; }),
    k(1.2, (p) => { streamline(p); both(leg, p, 0.25, 0.5, 0.45); both(knee, p, 0.6); both(ankle, p, 0.6, -0.3); p.cap = 'kick'; return p; }),
    k(1.5, (p) => { streamline(p); legsStraight(p, 1.2); p.cap = 'glide'; return p; }),
    k(2.2, (p) => { streamline(p); legsStraight(p, 1.2); p.cap = 'glide'; return p; }),
  ];
  const s = keyed(frames, true);
  return { name: 'breast', loop: true, dur: 2.2, speed: (t) => { const u = t % 2.2; return 0.4 + 0.8 * Math.exp(-Math.max(0, u - 1.2) * 1.5) * smooth(1.0, 1.2, u) + (u < 1.0 ? 0.35 * Math.exp(-(u + 1.0) * 1.5) : 0); }, sample: (t) => s(t) };
}

// 7. Скуллинг (гребок ладонями «восьмёркой»): руки у бёдер, ладони поворачиваются на каждом проходе
function scull(o = {}) {
  return {
    name: 'scull', loop: true, dur: 1.2, speed: () => (o.still ? 0 : 0.28),
    sample(t) {
      const p = P({ pos: [0, -1.4, 0] });
      const ph = t * TAU / 1.2, s = Math.sin(ph);
      legsStraight(p, 1.3);
      for (const L of ['L', 'R']) {
        // ладонь всегда под углом к движению — как лопасть винта
        A(p, L, [0.28 + 0.12 * s, -0.9, 0.3], [0, 0, 1], 0.9 - 0.35 * s, 1.57 + 0.6 * Math.cos(ph), 0.2 * Math.cos(ph));
      }
      p.hands = { L: 'flat', R: 'flat' };
      head(p, 0.12);
      p.cap = s > 0 ? 'out' : 'in';
      return p;
    },
  };
}

// 8. Уход с поверхности (дак-дайв) — для бассейна: выход на горизонталь на глубине ~2 м
function duckDive(o = {}) {
  const k = (t, fn) => ({ t, pose: fn(P()) });
  const frames = [
    k(0.0, (p) => { p.pos = [0, -0.16, 0]; streamline(p); A2(p, [0.3, 0.85, 0.4], [0, 0, 1], 0.4, 1.4); legsStraight(p, 1.1); both(knee, p, 0.15); head(p, 0.2); p.snorkel = false; p.cap = 'prep'; return p; }),
    k(0.9, (p) => { p.pos = [0.25, -0.16, 0]; streamline(p); legsStraight(p, 1.2); head(p, 0.3); p.cap = 'glide'; return p; }),
    // сгиб в тазу 90°, руки тянут вниз-назад
    k(1.5, (p) => { p.pos = [0.55, -0.3, 0]; p.pitch = -1.15; leg(p, 'L', 1.1); leg(p, 'R', 1.1); both(knee, p, 0.1); both(ankle, p, 1.2); A2(p, [0.55, 0.7, 0.45], [0, 0, 1], 0.5, 2.0); head(p, 0.35); p.hands = { L: 'cup', R: 'cup' }; p.cap = 'pike'; return p; }),
    k(1.9, (p) => { p.pos = [0.62, -0.45, 0]; p.pitch = -1.5; leg(p, 'L', 1.45); leg(p, 'R', 1.45); both(knee, p, 0.08); both(ankle, p, 1.25); A2(p, [0.9, -0.2, 0.45], [0, 0, 1], 1.2, 1.8); head(p, 0.3); p.hands = { L: 'cup', R: 'cup' }; p.cap = 'pike'; return p; }),
    // ноги вертикально вверх — их вес толкает вниз
    k(2.5, (p) => { p.pos = [0.62, -0.95, 0]; p.pitch = -1.55; legsStraight(p, 1.3); both(leg, p, 0.06); armsAlong(p); head(p, 0.2); p.cap = 'legs'; return p; }),
    k(3.1, (p) => { p.pos = [0.62, -1.6, 0]; p.pitch = -1.52; legsStraight(p, 1.3); streamline(p); p.cap = 'sink'; return p; }),
    // первые удары, когда ласты под водой; плавный выход на горизонталь
    k(3.8, (p) => { p.pos = [0.75, -2.15, 0]; p.pitch = -1.0; legsStraight(p, 1.3); leg(p, 'L', 0.3); leg(p, 'R', -0.15); streamline(p); p.cap = 'kick'; return p; }),
    k(4.5, (p) => { p.pos = [1.25, -2.45, 0]; p.pitch = -0.45; legsStraight(p, 1.3); leg(p, 'L', -0.1); leg(p, 'R', 0.3); streamline(p); p.cap = 'level'; return p; }),
    k(5.3, (p) => { p.pos = [2.05, -2.55, 0]; p.pitch = -0.05; legsStraight(p, 1.3); leg(p, 'L', 0.3); leg(p, 'R', -0.1); streamline(p); p.cap = 'level'; return p; }),
    k(6.0, (p) => { p.pos = [2.75, -2.55, 0]; p.pitch = 0; legsStraight(p, 1.3); streamline(p); p.cap = 'level'; return p; }),
  ];
  // ошибки: сгиб слишком поздно и ласты бьют по воздуху; голова задрана
  if (o.early) {
    frames[4].pose.cap = 'air'; frames[4].pose.pitch = -1.15; leg(frames[4].pose, 'L', 0.9); leg(frames[4].pose, 'R', 0.2); both(knee, frames[4].pose, 0.7);
    frames[5].pose.pitch = -1.0; leg(frames[5].pose, 'L', 0.1); leg(frames[5].pose, 'R', 0.8); both(knee, frames[5].pose, 0.8);
    frames[3].pose.pos = [0.62, -0.32, 0];
    frames[4].pose.pos = [0.7, -0.5, 0];
  }
  if (o.headUp) for (const f of frames.slice(2)) head(f.pose, -0.6);
  const s = keyed(frames, false);
  return { name: 'duck', loop: false, dur: 6.0, speed: () => 0, sample: (t) => { const p = s(t); if (t > 3.4) { const ph = (t - 3.4) * TAU * 1.0; leg(p, 'L', 0.08 + 0.22 * Math.sin(ph)); leg(p, 'R', 0.08 - 0.22 * Math.sin(ph)); } return p; }, travel: true };
}

// 9. Всплытие и протокол на поверхности: держаться за бортик, восстановительное дыхание, знак «ОК»
function surfacing(o = {}) {
  const k = (t, fn) => ({ t, pose: fn(P()) });
  const atWall = 24.72;
  const frames = [
    k(0.0, (p) => { p.pos = [atWall - 2.6, -1.9, 0]; p.pitch = 0.0; streamline(p); legsStraight(p); p.cap = 'swim'; return p; }),
    // смотреть вперёд, не вверх; одна рука вперёд к стенке
    k(1.4, (p) => { p.pos = [atWall - 1.6, -1.4, 0]; p.pitch = 0.45; streamline(p); legsStraight(p); p.cap = 'up'; return p; }),
    k(2.6, (p) => { p.pos = [atWall - 0.7, -0.75, 0]; p.pitch = 1.15; A(p, 'L', [0.1, 0.9, 0.4], [0, 0, 1], 0.3, 1.57); A(p, 'R', [0.1, -1, 0.1], [0, 0, 1], 0.2, 0.2); legsStraight(p); head(p, 0.15); p.cap = 'up'; return p; }),
    // голова над водой, рука на бортике
    k(3.4, (p) => { p.pos = [atWall - 0.32, -0.62, 0]; p.pitch = 1.35; A2(p, [0.35, 0.6, 0.72], [0, 0.2, 1], 1.0, 1.57, -0.3); both(leg, p, 0.3); both(knee, p, 0.5); both(ankle, p, 1.0); head(p, -0.05); p.hands = { L: 'cup', R: 'cup' }; p.mask = true; p.cap = 'grab'; return p; }),
  ];
  // восстановительное дыхание ×3: выдох — вдох — задержать с давлением 1–2 с
  let t = 3.4;
  for (let i = 0; i < 3; i++) {
    const base = (fn) => (p) => { p.pos = [atWall - 0.32, -0.62, 0]; p.pitch = 1.35; A2(p, [0.35, 0.6, 0.72], [0, 0.2, 1], 1.0, 1.57, -0.3); both(leg, p, 0.3); both(knee, p, 0.5); both(ankle, p, 1.0); head(p, -0.05); p.hands = { L: 'cup', R: 'cup' }; fn(p); return p; };
    frames.push(k(t + 0.4, base((p) => { p.belly = -0.3; p.ribs = -0.2; p.cap = 'hookOut'; })));
    frames.push(k(t + 1.2, base((p) => { p.belly = 1; p.ribs = 0.9; head(p, -0.12); p.cap = 'hookIn'; })));
    frames.push(k(t + 2.7, base((p) => { p.belly = 0.95; p.ribs = 0.85; chest(p, 0.04); p.cap = 'hookHold'; })));
    t += 2.9;
  }
  // знак «ОК» правой рукой и слова «я в порядке»
  frames.push(k(t + 0.6, (p) => { p.pos = [atWall - 0.32, -0.62, 0]; p.pitch = 1.38; A(p, 'L', [0.35, 0.6, 0.72], [0, 0.2, 1], 1.0, 1.57, -0.3); A(p, 'R', [0.85, 0.1, 0.5], [0, 1, 0.2], 2.0, 1.4, 0); both(leg, p, 0.3); both(knee, p, 0.5); both(ankle, p, 1.0); head(p, -0.1, -0.3); p.hands = { L: 'cup', R: 'ok' }; p.belly = 0.4; p.cap = 'ok'; return p; }));
  frames.push(k(t + 2.8, (p) => { const q = frames[frames.length - 1].pose; Object.assign(p, JSON.parse(JSON.stringify(q))); p.belly = 0.6; return p; }));
  const s = keyed(frames, false);
  const T = frames[frames.length - 1].t;
  return { name: 'surface', loop: false, dur: T, speed: () => 0, sample: (tt) => { const p = s(tt); if (tt < 1.4) { const ph = tt * TAU; leg(p, 'L', 0.08 + 0.2 * Math.sin(ph)); leg(p, 'R', 0.08 - 0.2 * Math.sin(ph)); } if (o.noHook && tt > 3.4) { p.belly = 0.3 * Math.sin(tt * 6); p.ribs = 0.2 * Math.sin(tt * 6); p.cap = 'pant'; } if (o.exhaleEarly && tt > 1.2 && tt < 3.0) p.fx = 'exhale'; return p; }, travel: true };
}

// 10. Статика: лицом вниз, полное расслабление; позывы — толчки диафрагмы
function staticAnim(o = {}) {
  return {
    name: 'static', loop: true, dur: 12, speed: () => 0,
    sample(t) {
      const p = P({ pos: [0, -0.14, 0], snorkel: false });
      p.pitch = -0.03 + Math.sin(t * 0.4) * 0.01;
      A2(p, [0.4, 0.75, 0.5], [0, 0, 1], 0.6, 1.3, 0.3);
      head(p, 0.35);
      both(leg, p, 0.1, 0.05); both(knee, p, 0.2); both(ankle, p, 1.0);
      if (o.contractions) { const c = Math.max(0, Math.sin(t * 2.4)) ** 6; p.belly = -0.4 * c; spine(p, 0.06 * c); }
      return p;
    },
  };
}

// 11. Стоять на бортике (сухая разминка)
function dry(kind = 'stand') {
  return {
    name: 'dry-' + kind, loop: true, dur: 8, speed: () => 0, dry: true,
    sample(t) {
      const p = P({ pos: [-1.2, 0.3 + 1.0, 0], pitch: Math.PI / 2, mask: false, snorkel: false });
      p.yaw = -Math.PI / 3;
      A2(p, [0.1, -1, 0.02], [0, 0, 1], 0.15, 0.1);
      const b = breathe(t, 0.18);
      p.belly = b * 0.8; p.ribs = b * 0.4;
      if (kind === 'side') { const s = Math.sin(t * 0.8); chest(p, 0, 0.35 * s); spine(p, 0, 0.25 * s); A(p, s > 0 ? 'R' : 'L', [-0.25, 1, 0.05], [0, 0, 1], 0.2, 0.3); p.cap = 'side'; }
      if (kind === 'twist') { const s = Math.sin(t * 0.7); chest(p, 0, 0, 0.5 * s); spine(p, 0, 0, 0.3 * s); A2(p, [0.45, -0.35, 0.82], [-1, 0, 0], 1.7, 1.0); p.cap = 'twist'; }
      if (kind === 'neck') { head(p, 0.6 * Math.sin(t * 0.6), 0.9 * Math.sin(t * 0.3)); p.cap = 'neck'; }
      if (kind === 'overhead') { A2(p, [-0.15, 1, 0.05], [0, 0, 1], 0.05, 1.57); p.ribs = 0.6 + b * 0.4; chest(p, -0.1); p.cap = 'overhead'; p.hands = { L: 'flat', R: 'flat' }; }
      if (kind === 'uddiyana') { const c = smooth(0, 0.3, (t % 8) / 8) * (1 - smooth(0.75, 0.95, (t % 8) / 8)); spine(p, 0.55); chest(p, 0.25); both(leg, p, 0.6); both(knee, p, 0.85); both(ankle, p, -0.4); A2(p, [0.15, -0.6, 0.78], [0, 0, 1], 0.2, 0.3); p.pos[1] = 1.12; p.belly = -1.0 * c; p.ribs = 0.5 * c; p.cap = 'uddiyana'; }
      if (kind === 'frenzel') { A(p, 'R', [0.35, -0.55, 0.75], [-0.3, 1, 0], 2.45, 0.6, 0.3); p.hands.R = 'pinch'; p.cap = 'frenzel'; }
      return p;
    },
  };
}

export const ANIMS = {
  float: floatAnim, finkick: finKick, dolphin, dnf, crawl, breast: breaststroke, scull, duck: duckDive, surface: surfacing, static: staticAnim, dry,
};

// Проигрыватель: время, перемещение по дорожке, перезапуск у стенки
export class Player {
  constructor(name, opts = {}, start = 3) {
    this.set(name, opts, start);
  }
  set(name, opts = {}, start = 3) {
    this.name = name; this.opts = opts;
    this.anim = name === 'dry' ? ANIMS.dry(opts.kind) : ANIMS[name](opts);
    this.t = 0; this.x = start; this.start = start; this.wrapped = false;
  }
  update(dt, rate = 1) {
    const d = dt * rate;
    this.t += d;
    this.x += this.anim.speed(this.t) * d;
    this.wrapped = false;
    if (this.x > 21.5) { this.x = this.start; this.wrapped = true; }
    if (!this.anim.loop && this.t > this.anim.dur) this.t = this.anim.dur;
    const p = this.anim.sample(this.t);
    if (this.anim.travel || this.anim.dry) { if (!this.anim.dry) p.pos[0] += this.start; }
    else p.pos[0] += this.x;
    return p;
  }
  get done() { return !this.anim.loop && this.t >= this.anim.dur; }
}
