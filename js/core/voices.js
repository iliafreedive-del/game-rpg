// Голоса живности и природы (сборка 60): звери, мобы, птицы, насекомые, ветер, волны, капель — всё синтезом WebAudio, без файлов.
// Чистые функции: (ac, out, t, p, rnd) → длительность в секундах. ac — AudioContext или OfflineAudioContext, out — куда играть,
// t — время старта (ac.currentTime + …), p — множитель высоты (крупнее зверь — ниже голос), rnd — генератор 0..1.
// Работают и в игре (core/nature.js), и в офлайн-рендере превью (tools/audio/render.html).

// ---------- шумы (кэш на контекст) ----------
const NB = new WeakMap();
export function noiseBuf(ac, kind = 'white') {
  let m = NB.get(ac); if (!m) NB.set(ac, m = {});
  if (m[kind]) return m[kind];
  const sec = 4, n = ac.sampleRate * sec, b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else d[i] = w;
    }
    // шов петли: плавный переход конца в начало
    const fade = 2000; for (let i = 0; i < fade; i++) { const k = i / fade; d[n - fade + i] = d[n - fade + i] * (1 - k) + d[i] * k; }
  }
  return m[kind] = b;
}
function noiseSrc(ac, kind, t, dur, loop) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf(ac, kind); s.loop = true;
  s.start(t, Math.random() * 3); if (!loop) s.stop(t + dur + 0.05); return s;
}
// огибающая: [[время от t, значение], …], линейные отрезки от 0
function env(param, t, pts, from = 0) { param.setValueAtTime(from, t); for (const [dt, v] of pts) param.linearRampToValueAtTime(v, t + dt); }
// контур высоты: экспоненциальные отрезки
function glide(param, t, pts) { param.setValueAtTime(pts[0][1], t); for (let i = 1; i < pts.length; i++) param.exponentialRampToValueAtTime(Math.max(1, pts[i][1]), t + pts[i][0]); }
const G = (ac, v = 1) => { const g = ac.createGain(); g.gain.value = v; return g; };
function biq(ac, type, f, q = 1) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }

// Гласные (форманты, Гц): по ним голос «говорит» а/о/у/э — рык, мычание, крик
export const VOW = {
  a: [[730, 6, 1], [1090, 7, 0.55], [2440, 9, 0.22]],
  o: [[500, 6, 1], [850, 7, 0.5], [2400, 9, 0.15]],
  u: [[320, 6, 1], [800, 7, 0.35], [2240, 9, 0.12]],
  e: [[530, 6, 1], [1840, 8, 0.5], [2480, 9, 0.3]],
  i: [[300, 6, 0.8], [2300, 9, 0.6], [3000, 10, 0.35]],
};

// Голосовой тракт: осциллятор (+ дыхание) → «шершавость» (АМ) → форманты → огибающая.
// o: { d, f: [[t,Гц]…], type, amp: [[t,v]…], form, fs (сдвиг формант), rough: [Гц, глубина], vib: [Гц, Гц], n (шум), nf (тип шума), lp, gain }
export function voc(ac, out, t, o) {
  const d = o.d, end = t + d + 0.08, out1 = G(ac, 0);
  env(out1.gain, t, o.amp || [[Math.min(0.03, d * 0.2), 1], [d * 0.75, 0.75], [d, 0]]);
  let tail = out1;
  if (o.lp) { const l = biq(ac, 'lowpass', o.lp, 0.7); out1.connect(l); tail = l; }
  const fin = G(ac, o.gain ?? 1); tail.connect(fin); fin.connect(out);
  const sum = G(ac);
  if (o.form) for (const [f, q, a] of o.form) { const bp = biq(ac, 'bandpass', f * (o.fs || 1), q), ga = G(ac, a * Math.sqrt(q) * 0.9); sum.connect(bp); bp.connect(ga); ga.connect(out1); }
  else sum.connect(out1);
  const nodes = [];
  if (o.f) {
    const os = ac.createOscillator(); os.type = o.type || 'sawtooth'; glide(os.frequency, t, o.f); nodes.push(os);
    if (o.vib) { const l = ac.createOscillator(), lg = G(ac, o.vib[1]); l.frequency.value = o.vib[0]; l.connect(lg); lg.connect(os.frequency); nodes.push(l); }
    let src = os;
    if (o.rough) {   // хрип/рык: амплитудная модуляция 20–80 Гц
      const am = G(ac, 1 - o.rough[1] * 0.5), l = ac.createOscillator(), lg = G(ac, o.rough[1] * 0.5);
      l.type = 'triangle'; l.frequency.setValueAtTime(o.rough[0], t); l.frequency.linearRampToValueAtTime(o.rough[0] * (0.8 + Math.random() * 0.4), t + d);
      l.connect(lg); lg.connect(am.gain); os.connect(am); src = am; nodes.push(l);
    }
    const og = G(ac, o.og ?? 0.5); src.connect(og); og.connect(sum);
    if (o.sub) { const s2 = ac.createOscillator(), sg = G(ac, o.sub); s2.type = 'sine'; glide(s2.frequency, t, o.f.map(([a, b]) => [a, b / 2])); s2.connect(sg); sg.connect(out1); nodes.push(s2); }
  }
  if (o.n) { const ns = noiseSrc(ac, o.nf || 'white', t, d); const ng = G(ac, o.n); ns.connect(ng); ng.connect(sum); }
  for (const n of nodes) { n.start(t); n.stop(end); }
  return d;
}
// чистый тон (птицы, сверчки, капли): синус + тихая вторая гармоника
export function pip(ac, out, t, f, d, a = 1, o = {}) {
  const g = G(ac, 0); env(g.gain, t, o.amp || [[Math.min(0.012, d * 0.25), a], [d * 0.6, a * 0.7], [d, 0]]); g.connect(out);
  const os = ac.createOscillator(); glide(os.frequency, t, Array.isArray(f) ? f : [[0, f]]); os.connect(g);
  const h = ac.createOscillator(), hg = G(ac, o.h ?? 0.12); h.type = 'sine'; glide(h.frequency, t, (Array.isArray(f) ? f : [[0, f]]).map(([x, y]) => [x, y * 2])); h.connect(hg); hg.connect(g);
  const ns = [os, h];
  if (o.fm) { const l = ac.createOscillator(), lg = G(ac, o.fm[1]); l.frequency.value = o.fm[0]; l.connect(lg); lg.connect(os.frequency); lg.connect(h.frequency); ns.push(l); }
  for (const n of ns) { n.start(t); n.stop(t + d + 0.03); }
  return d;
}
// шумовой всплеск через фильтр (щелчки, хруст, шипение, шорох)
export function burst(ac, out, t, d, f, q = 1, a = 1, type = 'bandpass', kind = 'white', f1) {
  const s = noiseSrc(ac, kind, t, d), b = biq(ac, type, f, q), g = G(ac, 0);
  if (f1) b.frequency.exponentialRampToValueAtTime(f1, t + d);
  env(g.gain, t, [[Math.min(0.004, d * 0.2), a], [d, 0]]); s.connect(b); b.connect(g); g.connect(out); return d;
}
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];

// ================= МОБЫ И ЗВЕРИ =================
// у каждого голоса: idle (бродит), alert (заметил героя / атакует), death; p — высота
export const MOB = {
  wolf: {
    idle: (ac, o, t, p, r) => {   // вой: плавный подъём, вибрато, спад
      const d = 1.9 + r() * 0.9, f = (330 + r() * 40) * p;
      return voc(ac, o, t, { d, type: 'triangle', f: [[0, f], [0.4, f * 1.42], [d * 0.7, f * 1.36], [d, f * 0.9]], vib: [5.5, 5 * p], form: VOW.u, fs: 1.2, n: 0.03, og: 0.9, lp: 1800, amp: [[0.3, 1], [d * 0.8, 0.85], [d, 0]], gain: 0.5 });
    },
    alert: (ac, o, t, p, r) => {   // рычание и оскал
      const d = 0.75 + r() * 0.3;
      voc(ac, o, t, { d, f: [[0, 85 * p], [d * 0.6, 98 * p], [d, 82 * p]], rough: [28 + r() * 8, 0.9], form: [[300, 3, 1], [800, 4, 0.7], [2200, 5, 0.3]], n: 0.3, nf: 'pink', gain: 1.1 });
      voc(ac, o, t + d - 0.05, { d: 0.18, f: [[0, 260 * p], [0.04, 340 * p], [0.18, 200 * p]], rough: [50, 0.5], form: VOW.a, fs: 0.8, n: 0.4, amp: [[0.01, 1], [0.08, 0.6], [0.18, 0]], gain: 0.9 });
      return d + 0.15;
    },
    death: (ac, o, t, p, r) => { for (let i = 0; i < 2; i++) voc(ac, o, t + i * 0.24, { d: 0.22, type: 'sawtooth', f: [[0, 700 * p], [0.05, 1250 * p], [0.22, 480 * p]], form: [[1200, 2, 1], [2500, 3, 0.4]], n: 0.05, gain: 0.7 - i * 0.25 }); return 0.5; },
  },
  dog: {
    idle: (ac, o, t, p, r) => {   // лай: «гав», 1–3 раза
      const n = 1 + Math.floor(r() * 3); let at = 0;
      for (let i = 0; i < n; i++) { const k = p * (1 + (r() - 0.5) * 0.08); voc(ac, o, t + at, { d: 0.16, f: [[0, 380 * k], [0.03, 540 * k], [0.15, 250 * k]], rough: [60, 0.3], form: [[600, 3, 1], [1300, 4, 0.7], [2600, 5, 0.3]], n: 0.35, amp: [[0.008, 1], [0.06, 0.75], [0.16, 0]], gain: 1.2 }); at += 0.24 + r() * 0.12; }
      return at;
    },
  },
  chicken: {
    idle: (ac, o, t, p, r) => {   // «ко-ко-ко… ко-КО!»
      const n = 3 + Math.floor(r() * 4); let at = 0;
      for (let i = 0; i < n; i++) { const k = p * (1 + (r() - 0.5) * 0.1); voc(ac, o, t + at, { d: 0.07, f: [[0, 340 * k], [0.06, 285 * k]], form: [[800, 4, 1], [1900, 5, 0.5]], n: 0.12, amp: [[0.006, 1], [0.03, 0.8], [0.07, 0]] }); at += 0.16 + r() * 0.12; }
      if (r() < 0.4) { at += 0.08; voc(ac, o, t + at, { d: 0.38, f: [[0, 460 * p], [0.07, 720 * p], [0.38, 560 * p]], rough: [45, 0.35], form: [[1000, 3, 1], [2200, 4, 0.6]], n: 0.1, gain: 0.9 }); at += 0.4; }
      return at;
    },
  },
  boar: {
    idle: (ac, o, t, p, r) => {   // хрюканье
      const n = 2 + Math.floor(r() * 3); let at = 0;
      for (let i = 0; i < n; i++) { const d = 0.13 + r() * 0.08; voc(ac, o, t + at, { d, f: [[0, 115 * p], [d, 85 * p]], rough: [42, 0.75], form: [[350, 3, 1], [900, 4, 0.5]], n: 0.45, nf: 'pink', amp: [[0.015, 1], [d * 0.5, 0.8], [d, 0]], gain: 1.1 }); at += d + 0.08 + r() * 0.12; }
      return at;
    },
    alert: (ac, o, t, p, r) => { const d = 0.5 + r() * 0.15; return voc(ac, o, t, { d, f: [[0, 650 * p], [0.12, 1100 * p], [d, 780 * p]], rough: [55, 0.55], vib: [9, 25 * p], form: [[1400, 3, 1], [2800, 4, 0.6]], n: 0.2, gain: 0.8 }); },
    death: (ac, o, t, p, r) => voc(ac, o, t, { d: 0.9, f: [[0, 1000 * p], [0.2, 1150 * p], [0.9, 420 * p]], rough: [50, 0.6], form: [[1300, 3, 1], [2600, 4, 0.5]], n: 0.2, gain: 0.75 }),
  },
  bear: {
    idle: (ac, o, t, p, r) => {   // фырканье и ворчание
      burst(ac, o, t, 0.25, 500, 1.5, 0.6, 'bandpass', 'pink'); burst(ac, o, t + 0.35, 0.22, 450, 1.5, 0.5, 'bandpass', 'pink');
      voc(ac, o, t + 0.7, { d: 0.9, f: [[0, 75 * p], [0.5, 85 * p], [0.9, 68 * p]], rough: [26, 0.9], form: VOW.o, fs: 0.8, n: 0.25, nf: 'pink', gain: 1.1 }); return 1.6;
    },
    alert: (ac, o, t, p, r) => { const d = 1.2 + r() * 0.3; return voc(ac, o, t, { d, f: [[0, 90 * p], [0.25, 150 * p], [d * 0.7, 135 * p], [d, 80 * p]], rough: [32, 0.85], form: [[350, 2.5, 1], [750, 3, 0.8], [1600, 4, 0.4]], n: 0.5, nf: 'pink', sub: 0.25, amp: [[0.12, 1], [d * 0.7, 0.85], [d, 0]], gain: 1.2 }); },
    death: (ac, o, t, p, r) => voc(ac, o, t, { d: 1.3, f: [[0, 120 * p], [1.3, 60 * p]], rough: [24, 0.9], form: VOW.u, fs: 0.9, n: 0.35, nf: 'pink', gain: 1.1 }),
  },
  lion: {
    idle: (ac, o, t, p, r) => { let at = 0; for (let i = 0; i < 4; i++) { voc(ac, o, t + at, { d: 0.3, f: [[0, 110 * p], [0.3, 80 * p]], rough: [30, 0.8], form: VOW.u, n: 0.35, nf: 'pink', gain: 1.1 - i * 0.18 }); at += 0.55 + i * 0.06; } return at; },
    alert: (ac, o, t, p, r) => { const d = 1.6; return voc(ac, o, t, { d, f: [[0, 100 * p], [0.35, 190 * p], [1.0, 160 * p], [d, 95 * p]], rough: [34, 0.85], form: VOW.a, fs: 0.7, n: 0.45, nf: 'pink', sub: 0.3, amp: [[0.15, 1], [1.1, 0.9], [d, 0]], gain: 1.2 }); },
    death: (ac, o, t, p, r) => MOB.bear.death(ac, o, t, p, r),
  },
  stag: {   // трубный рёв оленя/быка
    idle: (ac, o, t, p, r) => { const d = 1.4; return voc(ac, o, t, { d, f: [[0, 140 * p], [0.3, 240 * p], [1.0, 205 * p], [d, 120 * p]], rough: [25, 0.5], form: VOW.o, n: 0.2, vib: [5, 4 * p], gain: 1 }); },
    alert: (ac, o, t, p, r) => voc(ac, o, t, { d: 0.6, f: [[0, 160 * p], [0.15, 230 * p], [0.6, 140 * p]], rough: [35, 0.8], form: VOW.a, fs: 0.8, n: 0.5, nf: 'pink', gain: 1.1 }),
    death: (ac, o, t, p, r) => voc(ac, o, t, { d: 1.0, f: [[0, 200 * p], [1.0, 90 * p]], rough: [25, 0.7], form: VOW.u, n: 0.3, gain: 1 }),
  },
  hyena: {
    idle: (ac, o, t, p, r) => { for (let i = 0; i < 2; i++) voc(ac, o, t + i * 0.85, { d: 0.7, type: 'triangle', f: [[0, 330 * p], [0.55, 950 * p], [0.7, 880 * p]], vib: [7, 15 * p], form: [[1100, 2, 1], [2400, 3, 0.4]], og: 0.9, n: 0.03, gain: 0.9 }); return 1.6; },
    alert: (ac, o, t, p, r) => {   // «смех»
      const n = 6 + Math.floor(r() * 4); let at = 0;
      for (let i = 0; i < n; i++) { const f = (i % 2 ? 860 : 980) * p * (1 - i * 0.015); voc(ac, o, t + at, { d: 0.075, f: [[0, f], [0.075, f * 0.85]], rough: [70, 0.4], form: [[1000, 3, 1], [2600, 4, 0.5]], n: 0.12, amp: [[0.008, 1], [0.04, 0.7], [0.075, 0]], gain: 0.85 }); at += 0.11 + r() * 0.02; }
      return at;
    },
    death: (ac, o, t, p, r) => voc(ac, o, t, { d: 0.8, type: 'triangle', f: [[0, 900 * p], [0.8, 380 * p]], vib: [8, 30 * p], form: [[1100, 2, 1], [2400, 3, 0.3]], og: 0.9, gain: 0.8 }),
  },
  scorpion: {
    idle: (ac, o, t, p, r) => { const n = 3 + Math.floor(r() * 5); for (let i = 0; i < n; i++) burst(ac, o, t + i * (0.025 + r() * 0.02), 0.012, 3000 + r() * 3000, 4, 0.7, 'bandpass'); return n * 0.04; },
    alert: (ac, o, t, p, r) => { burst(ac, o, t, 0.5, 4200, 0.8, 0.45, 'highpass'); for (let i = 0; i < 8; i++) burst(ac, o, t + 0.15 + i * 0.03, 0.012, 3500 + r() * 2500, 4, 0.7); return 0.6; },
    death: (ac, o, t, p, r) => { for (let i = 0; i < 5; i++) burst(ac, o, t + i * 0.05 + r() * 0.03, 0.05, 900 + r() * 900, 1.5, 0.7, 'bandpass'); return 0.35; },
  },
  ghoul: {
    idle: (ac, o, t, p, r) => voc(ac, o, t, { d: 0.9, rough: [25, 0.8], form: [[900, 4, 1], [1700, 5, 0.5]], n: 0.9, nf: 'pink', amp: [[0.3, 0.8], [0.45, 0.3], [0.7, 0.9], [0.9, 0]], gain: 0.9 }),   // хриплое дыхание
    alert: (ac, o, t, p, r) => voc(ac, o, t, { d: 0.6, f: [[0, 500 * p], [0.15, 1350 * p], [0.6, 980 * p]], rough: [40, 0.6], form: [[1800, 3, 1], [2800, 4, 0.6], [900, 3, 0.4]], n: 0.55, gain: 0.8 }),   // визг
    death: (ac, o, t, p, r) => voc(ac, o, t, { d: 0.8, f: [[0, 160 * p], [0.8, 70 * p]], rough: [18, 0.9], form: VOW.o, n: 0.6, nf: 'pink', gain: 1 }),   // бульканье
  },
  beast: {   // пещерный зверь — глухое рычание
    idle: (ac, o, t, p, r) => voc(ac, o, t, { d: 1.0, f: [[0, 70 * p], [0.6, 80 * p], [1, 65 * p]], rough: [24, 0.9], form: VOW.o, fs: 0.7, n: 0.3, nf: 'pink', gain: 1.2 }),
    alert: (ac, o, t, p, r) => MOB.bear.alert(ac, o, t, p * 0.9, r),
    death: (ac, o, t, p, r) => MOB.bear.death(ac, o, t, p, r),
  },
  skeleton: {   // кости не кричат — стучат
    idle: (ac, o, t, p, r) => { const n = 5 + Math.floor(r() * 6); let at = 0; for (let i = 0; i < n; i++) { burst(ac, o, t + at, 0.025, 1400 + r() * 2200, 6, 0.8); at += 0.03 + r() * 0.06; } return at; },
    alert: (ac, o, t, p, r) => { MOB.skeleton.idle(ac, o, t, p, r); for (let i = 0; i < 6; i++) burst(ac, o, t + 0.05 + i * 0.045, 0.02, 900 + i * 60, 8, 0.6); return 0.4; },   // клацанье челюстью
  },
  draugr: {   // стон мертвеца
    idle: (ac, o, t, p, r) => { const d = 1.6; return voc(ac, o, t, { d, f: [[0, 110 * p], [0.6, 126 * p], [d, 92 * p]], form: VOW.u, vib: [4, 3], n: 0.2, nf: 'pink', amp: [[0.4, 1], [1.2, 0.8], [d, 0]], gain: 1.1 }); },
    alert: (ac, o, t, p, r) => voc(ac, o, t, { d: 0.9, f: [[0, 120 * p], [0.25, 170 * p], [0.9, 100 * p]], rough: [30, 0.6], form: VOW.o, n: 0.35, nf: 'pink', gain: 1.1 }),
    death: (ac, o, t, p, r) => voc(ac, o, t, { d: 1.2, f: [[0, 120 * p], [1.2, 60 * p]], form: VOW.u, n: 0.5, nf: 'pink', gain: 1 }),
  },
  human: {   // боевой клич «Ха!», «Ра!», «Эй!»; смерть — стон
    alert: (ac, o, t, p, r) => { const v = pick(['a', 'a', 'o', 'e'], r), d = 0.3 + r() * 0.12; return voc(ac, o, t, { d, f: [[0, 150 * p], [0.07, 195 * p], [d, 125 * p]], form: VOW[v], n: 0.18, rough: [30, 0.25], amp: [[0.02, 1], [d * 0.6, 0.8], [d, 0]], gain: 1.1 }); },
    death: (ac, o, t, p, r) => voc(ac, o, t, { d: 0.6, f: [[0, 160 * p], [0.6, 85 * p]], form: VOW.u, n: 0.25, gain: 1 }),
  },
  berserk: {
    alert: (ac, o, t, p, r) => voc(ac, o, t, { d: 0.85, f: [[0, 120 * p], [0.15, 175 * p], [0.85, 110 * p]], form: VOW.a, rough: [34, 0.8], n: 0.4, sub: 0.15, gain: 1.15 }),
    death: (ac, o, t, p, r) => MOB.human.death(ac, o, t, p * 0.85, r),
  },
  hag: {   // ведьма/шаман: шёпот и хихиканье
    idle: (ac, o, t, p, r) => { let at = 0; for (let i = 0; i < 4; i++) { voc(ac, o, t + at, { d: 0.3, form: [[2400 + r() * 1500, 5, 1], [5000, 3, 0.5]], n: 0.9, amp: [[0.1, 0.7], [0.3, 0]], gain: 0.7 }); at += 0.32; } return at; },
    alert: (ac, o, t, p, r) => { let at = 0; for (let i = 0; i < 7; i++) { const f = (520 - i * 22) * p; voc(ac, o, t + at, { d: 0.09, f: [[0, f], [0.09, f * 0.9]], form: VOW.e, fs: 1.2, n: 0.25, amp: [[0.01, 1], [0.05, 0.6], [0.09, 0]], gain: 0.9 }); at += 0.12; } return at; },
    death: (ac, o, t, p, r) => voc(ac, o, t, { d: 1.0, f: [[0, 600 * p], [1.0, 200 * p]], vib: [6, 20], form: VOW.i, n: 0.3, gain: 0.85 }),
  },
  leshy: {   // скрип живого дерева и шорох листвы
    idle: (ac, o, t, p, r) => { const d = 1.2; voc(ac, o, t, { d, f: [[0, 28 * p], [0.5, 45 * p], [d, 32 * p]], form: [[650, 8, 1], [1300, 9, 0.6], [300, 6, 0.6]], og: 1, amp: [[0.1, 1], [d * 0.8, 0.9], [d, 0]], gain: 0.55 }); burst(ac, o, t + 0.2, 0.9, 5000, 0.7, 0.18, 'highpass'); return d; },
    alert: (ac, o, t, p, r) => { const d = 1.1; voc(ac, o, t, { d, f: [[0, 70 * p], [0.3, 95 * p], [d, 60 * p]], rough: [20, 0.7], form: VOW.o, fs: 0.8, n: 0.3, nf: 'brown', gain: 1.2 }); for (let i = 0; i < 6; i++) burst(ac, o, t + r() * d, 0.03, 1500 + r() * 1500, 3, 0.6); return d; },
    death: (ac, o, t, p, r) => { for (let i = 0; i < 8; i++) burst(ac, o, t + i * 0.06 + r() * 0.04, 0.05, 700 + r() * 1800, 2, 0.8); return MOB.leshy.idle(ac, o, t + 0.3, p * 0.8, r) + 0.3; },
  },
  spirit: {   // дух ветра: свистящий вихрь
    idle: (ac, o, t, p, r) => { const d = 1.6; const s = noiseSrc(ac, 'white', t, d), b = biq(ac, 'bandpass', 600 * p, 22), g = G(ac, 0); glide(b.frequency, t, [[0, 600 * p], [0.7, 1250 * p], [d, 700 * p]]); env(g.gain, t, [[0.5, 1.6], [1.1, 1.3], [d, 0]]); s.connect(b); b.connect(g); g.connect(o); return d; },
    alert: (ac, o, t, p, r) => MOB.spirit.idle(ac, o, t, p * 1.4, r),
    death: (ac, o, t, p, r) => { const d = 1.2; const s = noiseSrc(ac, 'white', t, d), b = biq(ac, 'bandpass', 1500 * p, 14), g = G(ac, 0); glide(b.frequency, t, [[0, 1500 * p], [d, 300 * p]]); env(g.gain, t, [[0.05, 1.4], [d, 0]]); s.connect(b); b.connect(g); g.connect(o); return d; },
  },
  stone: {   // каменные: скрежет, гул, осыпь
    idle: (ac, o, t, p, r) => { burst(ac, o, t, 0.9, 260 * p, 1.2, 1.2, 'bandpass', 'brown'); for (let i = 0; i < 10; i++) burst(ac, o, t + r() * 0.85, 0.015, 600 + r() * 900, 2, 0.35); return 0.9; },
    alert: (ac, o, t, p, r) => { burst(ac, o, t, 1.0, 140 * p, 0.8, 1.6, 'lowpass', 'brown'); MOB.stone.idle(ac, o, t + 0.1, p, r); return 1.0; },
    death: (ac, o, t, p, r) => { for (let i = 0; i < 9; i++) burst(ac, o, t + r() * 0.7, 0.08 + r() * 0.08, 300 + r() * 500, 1, 0.8, 'lowpass', 'brown'); pip(ac, o, t, [[0, 70], [0.4, 40]], 0.4, 0.6, { h: 0.3 }); return 0.8; },
  },
  giant: {   // ётун, голем, хозяин чащи — громадный рёв
    idle: (ac, o, t, p, r) => voc(ac, o, t, { d: 1.2, f: [[0, 55 * p], [0.6, 62 * p], [1.2, 50 * p]], rough: [20, 0.9], form: VOW.o, fs: 0.65, n: 0.35, nf: 'brown', sub: 0.4, gain: 1.3 }),
    alert: (ac, o, t, p, r) => MOB.bear.alert(ac, o, t, p * 0.62, r),
    death: (ac, o, t, p, r) => MOB.bear.death(ac, o, t, p * 0.6, r),
  },
  boss: {
    idle: (ac, o, t, p, r) => MOB.giant.idle(ac, o, t, p * 0.9, r),
    alert: (ac, o, t, p, r) => { const d = 1.8; return voc(ac, o, t, { d, f: [[0, 60 * p], [0.3, 95 * p], [1.2, 85 * p], [d, 50 * p]], rough: [28, 0.95], form: VOW.a, fs: 0.6, n: 0.55, nf: 'brown', sub: 0.5, amp: [[0.2, 1], [1.3, 0.9], [d, 0]], gain: 1.3 }); },
    death: (ac, o, t, p, r) => MOB.bear.death(ac, o, t, p * 0.5, r),
  },
};

// ================= ПТИЦЫ, НАСЕКОМЫЕ, ВОДА =================
// k — сдвиг высоты конкретной птицы, чтобы стая не пела одним голосом
export const BIRD = {
  tit: (ac, o, t, k, r) => {   // большая синица: «ти-ню, ти-ню, ти-ню»
    const n = 3 + Math.floor(r() * 3); let at = 0;
    for (let i = 0; i < n; i++) { pip(ac, o, t + at, [[0, 5300 * k], [0.07, 5000 * k]], 0.07, 0.5); pip(ac, o, t + at + 0.1, [[0, 3600 * k], [0.09, 3400 * k]], 0.09, 0.45); at += 0.32; }
    return at;
  },
  chaffinch: (ac, o, t, k, r) => {   // зяблик: ускоряющаяся трель вниз и росчерк в конце
    const n = 9 + Math.floor(r() * 4); let at = 0, gap = 0.1;
    for (let i = 0; i < n; i++) { const f = (5200 - i * 140) * k; pip(ac, o, t + at, [[0, f], [0.045, f * 0.72]], 0.045, 0.4 + i * 0.02); at += gap; gap = Math.max(0.055, gap * 0.93); }
    at += 0.04; for (const [f0, f1, d] of [[2600, 4800, 0.06], [5200, 3000, 0.08], [3400, 2200, 0.12]]) { pip(ac, o, t + at, [[0, f0 * k], [d, f1 * k]], d, 0.5); at += d + 0.015; }
    return at;
  },
  warbler: (ac, o, t, k, r) => {   // славка/зарянка: переливы, у каждого звука своя форма
    const n = 7 + Math.floor(r() * 6); let at = 0;
    for (let i = 0; i < n; i++) {
      const f = (2600 + r() * 4200) * k, d = 0.04 + r() * 0.1, kind = Math.floor(r() * 4);
      if (kind === 0) pip(ac, o, t + at, [[0, f * 0.7], [d, f]], d, 0.4);
      else if (kind === 1) pip(ac, o, t + at, [[0, f], [d, f * 0.65]], d, 0.4);
      else if (kind === 2) pip(ac, o, t + at, f, d, 0.35, { fm: [35 + r() * 30, f * 0.08] });
      else for (let j = 0; j < 3; j++) pip(ac, o, t + at + j * (d / 3), [[0, f], [d / 4, f * 1.15]], d / 4, 0.35);
      at += d + 0.02 + r() * 0.06;
    }
    return at;
  },
  blackbird: (ac, o, t, k, r) => {   // чёрный дрозд: флейта в нижнем регистре и щебет в конце
    const n = 3 + Math.floor(r() * 3); let at = 0;
    for (let i = 0; i < n; i++) { const f = (1700 + r() * 1300) * k, d = 0.14 + r() * 0.16; pip(ac, o, t + at, [[0, f], [d * 0.3, f * (1.05 + r() * 0.1)], [d, f * (0.85 + r() * 0.2)]], d, 0.55, { fm: [6, f * 0.012], h: 0.2 }); at += d + 0.03; }
    for (let i = 0; i < 5; i++) { const f = (5000 + r() * 2500) * k; pip(ac, o, t + at, [[0, f], [0.03, f * 0.8]], 0.03, 0.22); at += 0.045; }
    return at;
  },
  sparrow: (ac, o, t, k, r) => {   // воробей: «чирик» — короткие шершавые щелчки
    const n = 2 + Math.floor(r() * 4); let at = 0;
    for (let i = 0; i < n; i++) { const f = (3300 + r() * 700) * k, d = 0.06 + r() * 0.04; pip(ac, o, t + at, [[0, f], [d * 0.35, f * 1.3], [d, f * 0.85]], d, 0.45, { fm: [180, 300], h: 0.35 }); at += d + 0.06 + r() * 0.15; }
    return at;
  },
  cuckoo: (ac, o, t, k, r) => {   // кукушка вдали: «ку-ку» 3–6 раз
    const n = 3 + Math.floor(r() * 4); let at = 0;
    for (let i = 0; i < n; i++) { pip(ac, o, t + at, [[0, 690 * k], [0.2, 665 * k]], 0.2, 0.7, { h: 0.06 }); pip(ac, o, t + at + 0.32, [[0, 552 * k], [0.32, 535 * k]], 0.32, 0.65, { h: 0.06 }); at += 0.95 + r() * 0.1; }
    return at;
  },
  gull: (ac, o, t, k, r) => {   // чайка: протяжный крик и «смех»
    voc(ac, o, t, { d: 0.42, f: [[0, 900 * k], [0.06, 1550 * k], [0.42, 1100 * k]], form: [[1500, 3, 1], [3000, 4, 0.5]], n: 0.05, gain: 0.6 });
    const n = 3 + Math.floor(r() * 4); let at = 0.55, gap = 0.2;
    for (let i = 0; i < n; i++) { const f = (1350 - i * 25) * k; voc(ac, o, t + at, { d: 0.11, f: [[0, f], [0.03, f * 1.12], [0.11, f * 0.85]], form: [[1500, 3, 1], [3000, 4, 0.5]], n: 0.05, amp: [[0.01, 1], [0.06, 0.7], [0.11, 0]], gain: 0.55 }); at += gap; gap *= 0.9; }
    return at;
  },
  crow: (ac, o, t, k, r) => {   // ворон: «кра-а»
    const n = 1 + Math.floor(r() * 3); let at = 0;
    for (let i = 0; i < n; i++) { voc(ac, o, t + at, { d: 0.32, f: [[0, 520 * k], [0.05, 610 * k], [0.32, 470 * k]], rough: [42, 0.5], form: [[1200, 3, 1], [2400, 4, 0.5], [620, 3, 0.35]], n: 0.3, gain: 0.7 }); at += 0.5 + r() * 0.2; }
    return at;
  },
  hawk: (ac, o, t, k, r) => voc(ac, o, t, { d: 1.0, f: [[0, 2700 * k], [0.12, 3200 * k], [1.0, 2000 * k]], vib: [38, 120 * k], form: [[3000, 2, 1], [6000, 3, 0.3]], n: 0.2, amp: [[0.05, 1], [0.6, 0.7], [1.0, 0]], gain: 0.5 }),   // ястреб: «кии-эээр»
  owl: (ac, o, t, k, r) => { pip(ac, o, t, [[0, 420 * k], [0.25, 400 * k]], 0.25, 0.6, { h: 0.03 }); pip(ac, o, t + 0.55, [[0, 440 * k], [0.08, 460 * k], [0.7, 380 * k]], 0.7, 0.6, { h: 0.03, fm: [8, 6] }); return 1.3; },   // сова: «у-ху-у»
};
export const BUG = {
  crickets: (ac, o, t, k, r) => {   // сверчки: тройные импульсы ~4,4 кГц
    const n = 5 + Math.floor(r() * 6), f = 4300 * k; let at = 0;
    for (let i = 0; i < n; i++) { for (let j = 0; j < 3; j++) pip(ac, o, t + at + j * 0.032, f, 0.018, 0.22, { h: 0.04, amp: [[0.003, 0.22], [0.012, 0.15], [0.018, 0]] }); at += 0.45 + r() * 0.1; }
    return at;
  },
  cicada: (ac, o, t, k, r) => {   // цикада в жаре пустошей: жужжащая волна
    const d = 3 + r() * 2, s = noiseSrc(ac, 'white', t, d), b = biq(ac, 'bandpass', 5600 * k, 5), am = G(ac, 0.5), l = ac.createOscillator(), lg = G(ac, 0.5), g = G(ac, 0);
    l.frequency.value = 110 + r() * 40; l.connect(lg); lg.connect(am.gain); env(g.gain, t, [[d * 0.35, 0.5], [d * 0.8, 0.45], [d, 0]]);
    s.connect(b); b.connect(am); am.connect(g); g.connect(o); l.start(t); l.stop(t + d + 0.05); return d;
  },
  drip: (ac, o, t, k, r) => pip(ac, o, t, [[0, 850 * k], [0.06, 1750 * k]], 0.07, 0.7, { h: 0.05, amp: [[0.002, 0.7], [0.015, 0.3], [0.07, 0]] }),   // капля в пещере
};

// ================= РЕВЕРБ =================
// импульс: затухающий стерео-шум; sec — длина хвоста, dark — сколько глушить верх (пещера гулкая и тёмная)
export function makeReverb(ac, sec = 1.6, decay = 3, dark = 0.5) {
  const n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; lp = lp * dark + w * (1 - dark); d[i] = lp * Math.pow(1 - i / n, decay); } }
  const cv = ac.createConvolver(); cv.buffer = b; return cv;
}

// ================= ВЕТЕР / ВОЛНЫ / ГУЛ — бесконечные слои =================
// preset: { lvl, lp: [мин, макс], q, whistle: { f: [мин, макс], q, g }, leaves, waves, cave }
// schedule(from, to) раскладывает порывы заранее — в игре его зовут раз в пару секунд, в офлайн-превью один раз на весь отрезок
export class Bed {
  constructor(ac, out, P, rnd = Math.random) {
    this.ac = ac; this.P = P; this.r = rnd; this.until = 0; this.nodes = [];
    this.out = G(ac, 0); this.out.connect(out);
    const t = ac.currentTime;
    this.out.gain.setValueAtTime(0, t); this.out.gain.linearRampToValueAtTime(1, t + 2.5);   // плавный вход при смене зоны
    const src = (kind) => { const s = ac.createBufferSource(); s.buffer = noiseBuf(ac, kind); s.loop = true; s.start(t, rnd() * 3); this.nodes.push(s); return s; };
    // основной ветер: коричневый шум → НЧ-фильтр, частота и громкость плавают порывами
    this.lp = biq(ac, 'lowpass', P.lp[0], P.q ?? 0.7); this.wg = G(ac, 0.0001);
    src('brown').connect(this.lp); this.lp.connect(this.wg); this.wg.connect(this.out);
    if (P.whistle) {   // свист в щелях/скалах — узкая полоса, гуляющая по высоте
      this.bp = biq(ac, 'bandpass', P.whistle.f[0], P.whistle.q); this.bg = G(ac, 0.0001);
      src('pink').connect(this.bp); this.bp.connect(this.bg); this.bg.connect(this.out);
    }
    if (P.leaves) {   // шелест листвы — высокий шум, качается вместе с порывами
      this.hp = biq(ac, 'highpass', 1800, 0.5); this.lg = G(ac, 0.0001); const lp2 = biq(ac, 'lowpass', 6500, 0.5);
      src('pink').connect(this.hp); this.hp.connect(lp2); lp2.connect(this.lg); this.lg.connect(this.out);
    }
    if (P.waves) { this.vlp = biq(ac, 'lowpass', 500, 0.5); this.vg = G(ac, 0.0001); src('pink').connect(this.vlp); this.vlp.connect(this.vg); this.vg.connect(this.out); this.nextWave = t; }
  }
  schedule(to) {
    const { ac, P, r } = this; let t = Math.max(this.until, ac.currentTime);
    while (t < to) {
      const d = 1.5 + r() * 3.5, s = r(), s2 = s * s, at = t + d;   // сила порыва 0..1 (чаще слабые)
      const ramp = (param, v) => param.linearRampToValueAtTime(v, at);
      ramp(this.lp.frequency, P.lp[0] + (P.lp[1] - P.lp[0]) * s2);
      ramp(this.wg.gain, P.lvl * (0.45 + 0.55 * s));
      if (this.bp) { ramp(this.bp.frequency, P.whistle.f[0] + (P.whistle.f[1] - P.whistle.f[0]) * (0.3 * r() + 0.7 * s)); ramp(this.bg.gain, P.whistle.g * s2); }
      if (this.lg) ramp(this.lg.gain, P.leaves * (0.15 + 0.85 * s2));
      t = at;
    }
    if (this.vg) {   // накат волны: подъём 2–3 с, отход 3–5 с
      let w = Math.max(this.nextWave, ac.currentTime);
      while (w < to) { const up = 2 + r() * 1.2, dn = 3 + r() * 2, a = P.waves * (0.6 + r() * 0.4);
        this.vg.gain.setTargetAtTime(a, w, up / 3); this.vlp.frequency.setTargetAtTime(700 + r() * 500, w, up / 3);
        this.vg.gain.setTargetAtTime(a * 0.15, w + up, dn / 3); this.vlp.frequency.setTargetAtTime(350, w + up, dn / 3); w += up + dn; }
      this.nextWave = w;
    }
    this.until = t;
  }
  stop(fade = 1.5) {
    const t = this.ac.currentTime; this.out.gain.cancelScheduledValues(t); this.out.gain.setValueAtTime(this.out.gain.value, t); this.out.gain.linearRampToValueAtTime(0, t + fade);
    for (const n of this.nodes) { try { n.stop(t + fade + 0.1); } catch { } }
    setTimeout(() => { try { this.out.disconnect(); } catch { } }, (fade + 0.3) * 1000);
  }
}
// пресеты ветра по местам
export const BEDS = {
  town: { lvl: 0.22, lp: [250, 650], leaves: 0.08 },
  forest: { lvl: 0.25, lp: [280, 800], leaves: 0.16 },
  fjord: { lvl: 0.42, lp: [350, 1300], q: 1, whistle: { f: [420, 1100], q: 9, g: 0.5 }, waves: 0.3 },
  bones: { lvl: 0.32, lp: [300, 1100], whistle: { f: [700, 1600], q: 6, g: 0.18 } },
  temple: { lvl: 0.3, lp: [280, 950], whistle: { f: [500, 1300], q: 12, g: 0.3 }, leaves: 0.04 },
  cave: { lvl: 0.35, lp: [90, 220], q: 1.2, whistle: { f: [180, 320], q: 14, g: 0.25 } },
};
