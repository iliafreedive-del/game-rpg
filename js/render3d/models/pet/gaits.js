// Походки питомцев из Meshy (сборка 60): чистые функции над костями (без three.js — их же гоняет проверка растяжения
// tools/qa/pet_stretch.mjs). Кость в покое — нулевой поворот, оси модели: +Z вперёд, +Y вверх, +X — левый бок зверька.
// Поворот вокруг X: «−» выносит опущенную вниз кость вперёд. Вокруг Z: «+» поднимает левое крыло/лапу (+X), у правых — «−».
// Повадки взяты у настоящих зверей (см. отчёт сборки 60):
//  quad   — лиса/собака: шаг в «боковой последовательности» ЛЗ→ЛП→ПЗ→ПП (по ¼ цикла), на бегу — рысь (диагональные пары);
//           в переносе передняя лапа сгибает локоть и запястье (лапа уходит назад-вверх), задняя — колено и скакательный сустав.
//  sprawl — ящерица: лапы в стороны, шаг диагональными парами, корпус и хвост изгибаются волной из стороны в сторону.
//  scorp  — скорпион: «чередующиеся четвёрки» — 1-я и 3-я лапы одной стороны со 2-й и 4-й другой; клешни покачиваются.
//  biped  — голем: тяжёлый шаг, руки маятником навстречу ногам, корпус переваливается с ноги на ногу, хвост волочится.
//  bird   — ворон: взмах ≈3,5 Гц (врановые 3–4 Гц), чередует взмахи и парение; на подъёме крыло чуть складывается в кисти.
//  bat    — летучая мышь: на подъёме крыло складывается в локте и запястье, вниз — раскрыто; взмах чаще, чем у ворона.
//  wisp   — дух: парит и покачивается, «хвост» снизу вьётся, ручки плывут.
const TAU = Math.PI * 2;
const sm = x => x * x * (3 - 2 * x);
const bite = k => Math.sin(Math.min(1, Math.max(0, k ?? 0)) * Math.PI);
function R(B, n, x = 0, y = 0, z = 0) { const b = B[n]; if (b) { b.rotation.x += x; b.rotation.y += y; b.rotation.z += z; } }
function P(B, n, x = 0, y = 0, z = 0) { const b = B[n]; if (b) { b.position.x += x; b.position.y += y; b.position.z += z; } }
// фаза ноги p (0..1): опора (лапа идёт спереди назад, s 1 → −1), затем перенос (назад → вперёд, lift — подъём)
function leg(p, duty) {
  p = ((p % 1) + 1) % 1;
  if (p < duty) return { s: 1 - 2 * p / duty, lift: 0 };
  const q = (p - duty) / (1 - duty); return { s: -1 + 2 * sm(q), lift: Math.sin(Math.PI * q) };
}
const SIDES = [['L', 1], ['R', -1]];

// ---- четвероногие (фенек, костяной пёс)
function quad(B, a, st, o) {
  const run = Math.min(1, Math.max(0, ((a.speed || 0) - o.trot) / 1.5)), A = o.swing ?? 0.34;
  const walk = a.mode === 'walk', ph = st.ph;
  if (walk) {
    // боковая последовательность ЛЗ 0, ЛП ¼, ПЗ ½, ПП ¾ → рысь: ЛЗ+ПП 0, ПЗ+ЛП ½
    const off = { hL: 0, fL: 0.25 + 0.25 * run, hR: 0.5, fR: 0.75 - 0.75 * run }, duty = 0.62 - 0.17 * run;
    for (const [sf] of SIDES) {
      const f = leg(ph + off['f' + sf], duty), h = leg(ph + off['h' + sf], duty);
      R(B, 'fsh' + sf, -A * f.s); R(B, 'fel' + sf, -0.45 * f.lift); R(B, 'fwr' + sf, 1.1 * f.lift + 0.35 * f.lift * f.s);
      R(B, 'hhip' + sf, -A * 0.9 * h.s); R(B, 'hkn' + sf, 0.55 * h.lift); R(B, 'hho' + sf, -0.8 * h.lift);
    }
    const bob = Math.cos(ph * TAU * 2);
    P(B, o.root, 0, -0.012 * (1 + run) * (bob * 0.5 + 0.5), 0);
    R(B, o.root, 0.02 * Math.sin(ph * TAU * 2), 0.05 * Math.sin(ph * TAU), 0);
    R(B, 'spine', 0, -0.06 * Math.sin(ph * TAU), 0);
    R(B, 'neck', 0.05 * bob - 0.08 * run); R(B, 'head', -0.04 * bob);
    for (let i = 1; i <= 3; i++) R(B, 'tail' + i, 0.05 * Math.sin(ph * TAU * 2 - i), 0.18 * Math.sin(ph * TAU - i * 0.7), 0);
    R(B, 'tail1', -0.15 * run);
  } else {
    // покой: дыхание грудью, хвост медленно метёт, голова оглядывается, уши вздрагивают
    const t = a.t, br = Math.sin(t * 2.2);
    R(B, 'spine', 0.012 * br); P(B, 'spine', 0, 0.003 * br, 0);
    R(B, 'neck', 0.03 * Math.sin(t * 0.7)); R(B, 'head', 0.04 * Math.sin(t * 0.9 + 1), 0.25 * Math.sin(t * 0.45) * sm(Math.min(1, Math.abs(Math.sin(t * 0.45)) * 1.4)), 0);
    for (let i = 1; i <= 3; i++) R(B, 'tail' + i, 0.04 * Math.sin(t * 1.1 - i), 0.22 * Math.sin(t * 1.3 - i * 0.6), 0);
    const tw = Math.max(0, Math.sin(t * 1.7) - 0.85) * 4;
    R(B, 'earL', 0, 0, 0.25 * tw); R(B, 'earR', 0, 0, -0.25 * Math.max(0, Math.sin(t * 1.3 + 2) - 0.85) * 4);
  }
  attackQuad(B, a, o);
}
function attackQuad(B, a, o) {
  if (a.mode === 'attack') { const k = bite(a.k); P(B, o.root, 0, -0.02 * k, 0.07 * k); R(B, o.root, 0.12 * k); R(B, 'neck', 0.3 * k); R(B, 'head', -0.25 * k); R(B, 'fshL', 0.2 * k); R(B, 'fshR', 0.2 * k); }
  if (a.mode === 'hit') R(B, o.root, -0.15);
  if (a.mode === 'death') { R(B, o.root, 0, 0, 1.45); P(B, o.root, 0, -o.rootY * 0.6, 0); }
}

// ---- ящерица (василиск): лапы в стороны, корпус волной
function sprawl(B, a, st, o) {
  const walk = a.mode === 'walk', ph = st.ph, A = o.swing ?? 0.42;
  if (walk) {
    // диагональные пары с небольшим сдвигом: ПП 0, ЛЗ 0.1, ЛП ½, ПЗ 0.6
    const off = { fR: 0, hL: 0.1, fL: 0.5, hR: 0.6 };
    for (const [sf, s] of SIDES) {
      const f = leg(ph + off['f' + sf], 0.6), h = leg(ph + off['h' + sf], 0.6);
      R(B, 'fsh' + sf, 0, -s * A * f.s, s * 0.35 * f.lift); R(B, 'fel' + sf, 0, 0, -s * 0.25 * f.lift);
      R(B, 'hhip' + sf, 0, -s * A * h.s, s * 0.35 * h.lift); R(B, 'hkn' + sf, 0, 0, -s * 0.25 * h.lift);
    }
    const u = Math.sin(ph * TAU);
    R(B, 'spine', 0, 0.1 * u, 0); R(B, o.root, 0, -0.06 * u, 0); R(B, 'neck', 0, -0.1 * u, 0); R(B, 'head', 0, -0.05 * u, 0);
    for (let i = 1; i <= 3; i++) R(B, 'tail' + i, 0, 0.22 * Math.sin(ph * TAU - 1 - i * 0.8), 0);
    P(B, o.root, 0, 0.006 * Math.abs(Math.cos(ph * TAU)), 0);
  } else {
    const t = a.t, br = Math.sin(t * 1.6);
    R(B, 'spine', 0.015 * br); P(B, 'spine', 0, 0.004 * br, 0);
    R(B, 'head', 0.06 * Math.sin(t * 0.6), 0.2 * Math.sin(t * 0.35), 0); R(B, 'neck', 0.04 * Math.sin(t * 0.5));
    for (let i = 1; i <= 3; i++) R(B, 'tail' + i, 0, 0.12 * Math.sin(t * 0.9 - i * 0.7), 0);
  }
  if (a.mode === 'attack') { const k = bite(a.k); P(B, o.root, 0, 0.02 * k, 0.08 * k); R(B, 'neck', -0.2 * k); R(B, 'head', -0.25 * k); }
  if (a.mode === 'hit') R(B, o.root, -0.12);
  if (a.mode === 'death') { R(B, o.root, 0, 0, Math.PI * 0.95); P(B, o.root, 0, o.rootY * 0.9, 0); }
}

// ---- скорпион: чередующиеся четвёрки
function scorp(B, a, st, o) {
  const walk = a.mode === 'walk', ph = st.ph, t = a.t;
  for (const [sf, s] of SIDES) for (let i = 1; i <= 4; i++) {
    const n = 'leg' + i + sf; if (!B[n]) continue;
    const grp = (i % 2 === 1) === (s > 0) ? 0 : 0.5;
    if (walk) { const g = leg(ph + grp, 0.55); R(B, n, 0, -s * 0.4 * g.s, s * 0.45 * g.lift); R(B, 'knee' + i + sf, 0, 0, -s * 0.3 * g.lift); }
    else R(B, n, 0, 0, s * 0.03 * Math.sin(t * 2 + i));
  }
  // клешни покачиваются, хвост чуть ходит; на ходу — корпус дрожит мелко
  for (const [sf, s] of SIDES) { R(B, 'palp' + sf, 0, s * 0.12 * Math.sin(t * 1.5 + s), 0); R(B, 'claw' + sf, 0, 0, s * 0.15 * Math.max(0, Math.sin(t * 2.3 + s * 2))); }
  for (let i = 1; i <= 6; i++) R(B, 'tl' + i, 0.04 * Math.sin(t * 1.4 - i * 0.5), 0.03 * Math.sin(t * 0.9 - i * 0.4), 0);
  if (walk) P(B, o.root, 0, 0.004 * Math.abs(Math.sin(ph * TAU * 2)), 0);
  if (a.mode === 'attack') { const k = bite(a.k); for (let i = 1; i <= 6; i++) R(B, 'tl' + i, 0.22 * k); R(B, 'palpL', 0, -0.3 * k, 0); R(B, 'palpR', 0, 0.3 * k, 0); }
  if (a.mode === 'hit') R(B, o.root, -0.1);
  if (a.mode === 'death') { R(B, o.root, 0, 0, Math.PI * 0.95); P(B, o.root, 0, o.rootY * 0.9, 0); }
}

// ---- голем: тяжёлый двуногий шаг
function biped(B, a, st, o) {
  const walk = a.mode === 'walk', ph = st.ph, t = a.t;
  if (walk) {
    for (const [sf, s] of SIDES) {
      const g = leg(ph + (s > 0 ? 0 : 0.5), 0.6), arm = Math.sin((ph + (s > 0 ? 0.5 : 0)) * TAU);
      R(B, 'lhip' + sf, -0.28 * g.s); P(B, 'lhip' + sf, 0, 0.04 * g.lift, 0);   // каменные ноги почти не гнутся: шаг от бедра, нога приподнимается
      R(B, 'ash' + sf, -0.35 * arm); R(B, 'ael' + sf, -0.2 - 0.15 * arm);
    }
    const sw = Math.sin(ph * TAU);
    R(B, o.root, 0.04, 0.07 * sw, 0.06 * sw); P(B, o.root, 0.02 * sw, -0.03 * Math.abs(Math.cos(ph * TAU)), 0);
    R(B, 'spine', 0, -0.1 * sw, -0.05 * sw);
    for (let i = 1; i <= 3; i++) R(B, 'tail' + i, 0, 0.15 * Math.sin(ph * TAU - i * 0.7), 0);
  } else {
    const br = Math.sin(t * 1.4);
    R(B, 'spine', 0.02 * br); R(B, 'ashL', 0, 0, 0.03 * br); R(B, 'ashR', 0, 0, -0.03 * br);
    R(B, 'head', 0, 0.3 * Math.sin(t * 0.4), 0);
    for (let i = 1; i <= 3; i++) R(B, 'tail' + i, 0, 0.1 * Math.sin(t * 0.8 - i * 0.6), 0);
  }
  if (a.mode === 'attack') { const k = bite(a.k); for (const sf of ['L', 'R']) { R(B, 'ash' + sf, -0.9 * k); R(B, 'ael' + sf, -0.5 * k); } R(B, 'spine', 0.06 * k); }
  if (a.mode === 'hit') R(B, 'spine', -0.15);
  if (a.mode === 'death') { R(B, o.root, -1.35); P(B, o.root, 0, -o.rootY * 0.7, 0); }
}

// ---- крылатые: ворон и летучая мышь
function flyer(B, a, st, o, bat) {
  const t = a.t, walk = a.mode === 'walk', f = bat ? (walk ? 5.5 : 4.5) : (walk ? 3.6 : 2.8);
  // ворон: взмахи сериями, между ними — парение (крылья чуть приподняты); мышь машет без пауз
  let amp = 1;
  if (!bat && !walk) { const c = (t * 0.45) % 1; amp = c < 0.6 ? 1 : 0.15 + 0.85 * sm(Math.abs(c - 0.8) / 0.2); }
  st.wp = (st.wp || 0) + (a.dt || 0) * f * (0.4 + 0.6 * amp);
  const w = Math.sin(st.wp * TAU), up = Math.max(0, Math.cos(st.wp * TAU));   // up: крыло идёт вверх — складывается
  const A = (bat ? 0.5 : 0.5) * amp, glide = (1 - amp) * 0.2;
  for (const [sf, s] of SIDES) {
    R(B, 'wsh' + sf, 0, 0, s * (A * w + glide));
    R(B, 'wel' + sf, 0, s * (bat ? 0.18 : 0.12) * up * amp, s * 0.15 * A * w);
    R(B, 'wwr' + sf, 0, s * (bat ? 0.3 : 0.2) * up * amp, s * 0.2 * A * w);
    // лапы в полёте поджаты назад: у ворона «пятка» складывается, у мыши лапки висят и чуть болтаются
    if (bat) { R(B, 'leg' + sf, 0.12 + 0.05 * Math.sin(t * 3 + s), 0, 0); R(B, 'kn' + sf, 0.1); }
    else R(B, 'leg' + sf, 0.3);
    R(B, 'ear' + sf, 0, 0, -s * 0.1 * Math.max(0, w));
  }
  P(B, o.root, 0, o.lift - 0.05 * A * w + 0.05 * Math.sin(t * 1.3), 0);
  R(B, o.root, walk ? 0.3 : 0.08 * Math.sin(t * 0.9), 0, 0.05 * Math.sin(t * 0.7));
  R(B, 'head', walk ? -0.25 : 0.1 * Math.sin(t * 0.8), 0.25 * Math.sin(t * 0.5) * (walk ? 0.2 : 1), 0);
  R(B, 'tail1', -0.1 * w * amp + (walk ? -0.2 : 0)); R(B, 'tail2', 0.05 * Math.sin(t * 2));
  if (a.mode === 'attack') { const k = bite(a.k); P(B, o.root, 0, -0.25 * k, 0.15 * k); R(B, o.root, 0.4 * k); R(B, 'head', 0.15 * k); }
  if (a.mode === 'hit') R(B, o.root, -0.2);
  if (a.mode === 'death') { P(B, o.root, 0, -o.lift, 0); R(B, o.root, 0, 0, 1.4); }
}

// ---- огонёк: парит
function wisp(B, a, st, o) {
  const t = a.t, walk = a.mode === 'walk';
  P(B, o.root, 0, o.lift + 0.06 * Math.sin(t * 2.1), 0);
  R(B, o.root, walk ? 0.25 : 0.05 * Math.sin(t * 1.2), 0.15 * Math.sin(t * 0.6), 0.06 * Math.sin(t * 1.5));
  R(B, 'tailw', 0.25 * Math.sin(t * 2.6) + (walk ? -0.35 : 0), 0, 0.3 * Math.sin(t * 3.1));
  R(B, 'head', 0.06 * Math.sin(t * 1.7) - (walk ? 0.2 : 0), 0.2 * Math.sin(t * 0.7), 0);
  for (const [sf, s] of SIDES) {
    const sw = Math.sin(t * 1.9 + (s > 0 ? 0 : 1.3));
    R(B, 'ash' + sf, walk ? 0.4 : 0.15 * sw, 0, s * 0.15 * sw); R(B, 'ael' + sf, 0, 0, s * 0.2 * Math.sin(t * 2.3 + s));
  }
  if (a.mode === 'attack') { const k = bite(a.k); R(B, 'ashL', -0.6 * k); R(B, 'ashR', -0.6 * k); R(B, 'ael' + 'L', -0.4 * k); R(B, 'aelR', -0.4 * k); }
  if (a.mode === 'hit') R(B, o.root, -0.25);
  if (a.mode === 'death') { P(B, o.root, 0, -o.lift * 0.9, 0); R(B, o.root, 0, 0, 1.2); }
}

export const GAITS = { quad, sprawl, scorp, biped, bird: (B, a, st, o) => flyer(B, a, st, o, false), bat: (B, a, st, o) => flyer(B, a, st, o, true), wisp };

// поза на кадр: сбросить кости в покой и наложить походку. B — кости по имени (у каждой userData.rest — позиция покоя)
export function posePet(B, gait, a, st, o) {
  for (const n in B) { const b = B[n]; b.rotation.set(0, 0, 0); b.position.copy(b.userData.rest); }
  if (a.mode === 'walk') st.ph = (st.ph || 0) + (a.dt || 0) * Math.min(o.fmax || 3.2, Math.max(0.6, a.speed || 0) / o.stride);   // быстрее — шаг длиннее, а не чаще
  GAITS[gait](B, a, st, o);
}
