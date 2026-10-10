// Музыка синтезом WebAudio (черновик к сборке 60, пока только для превью): тёмная тема деревни и тяжёлая боевая тема Летописи битв.
// Ориентир — Diablo / Path of Exile: акустическая гитара (модель струны Карплуса — Стронга), низкий гул, колокол вдали,
// тяжёлые барабаны в большом зале, мрачные медные кластеры; всё тонет в длинной тёмной реверберации.
// song(ac, out, t0, bars, rnd) раскладывает ноты на bars тактов вперёд и возвращает длительность, с.
import { VOW, noiseBuf } from './voices.js';

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const G = (ac, v = 1) => { const g = ac.createGain(); g.gain.value = v; return g; };
function biq(ac, type, f, q = 0.7, gain = 0) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = gain; return b; }
function osc(ac, type, f, t, end, det = 0) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(end); return o; }

// ---------- зал: длинный тёмный хвост (собор/подземелье) ----------
export function hall(ac, sec = 4.5, dark = 0.82) {
  const n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1, k = i / n; lp = lp * dark + w * (1 - dark); d[i] = lp * Math.pow(1 - k, 2.4) * (i < 400 ? i / 400 : 1); } }
  const cv = ac.createConvolver(); cv.buffer = b; return cv;
}

// ---------- струна: Карплус — Стронг, считается в JS один раз на ноту ----------
const KS = new WeakMap();
function string(ac, m, sec = 3, damp = 0.996, bright = 0.5) {
  let c = KS.get(ac); if (!c) KS.set(ac, c = {}); const key = m + ':' + sec + ':' + damp + ':' + bright; if (c[key]) return c[key];
  const sr = ac.sampleRate, n = Math.floor(sr * sec), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0);
  const P = sr / hz(m), L = Math.floor(P), frac = P - L, buf = new Float32Array(L + 2);
  let lp = 0; for (let i = 0; i < buf.length; i++) { const w = Math.random() * 2 - 1; lp = lp * (1 - bright) + w * bright; buf[i] = lp; }   // возбуждение: мягкий «щипок» пальцем
  let idx = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const a = buf[idx], bb = buf[(idx + 1) % L];
    const y = damp * (a * (1 - frac) + bb * frac + prev) * 0.5; prev = a * (1 - frac) + bb * frac;
    d[i] = buf[idx]; buf[idx] = y; idx = (idx + 1) % L;
  }
  return c[key] = b;
}
// гитара: две струны рядом (как у 12-струнной), корпус — резонанс 110 и 230 Гц, верх приглушён
function guitar(ac, out, t, m, v = 0.3, sec = 3, pan = 0) {
  const g = G(ac, v), body = biq(ac, 'peaking', 230, 1.2, 5), body2 = biq(ac, 'peaking', 110, 1.5, 4), lp = biq(ac, 'lowpass', 3800, 0.5);
  for (const [det, k] of [[0, 1], [m >= 55 ? 12 : 0, 0.35]]) {
    const s = ac.createBufferSource(); s.buffer = string(ac, m + det, sec, m < 50 ? 0.998 : 0.996, 0.55); s.detune.value = (Math.random() - 0.5) * 8;
    const sg = G(ac, k); s.connect(sg); sg.connect(body); s.start(t); s.stop(t + sec);
  }
  body.connect(body2); body2.connect(lp); lp.connect(g);
  if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(out); } else g.connect(out);
}
// низкий гул (виолончели/контрабасы под сурдиной): расстроенные пилы → низкий фильтр, медленно дышит
function drone(ac, out, t, ms, d, v = 0.06, cut = 380) {
  const g = G(ac, 0), lp = biq(ac, 'lowpass', cut, 0.6), l = osc(ac, 'sine', 0.13, t, t + d + 1), lg = G(ac, cut * 0.35);
  l.connect(lg); lg.connect(lp.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + Math.min(3, d * 0.4)); g.gain.setValueAtTime(v, t + d - 1.5); g.gain.linearRampToValueAtTime(0, t + d + 0.5);
  for (const m of ms) for (const det of [-11, -3, 6, 12]) osc(ac, 'sawtooth', hz(m), t, t + d + 1, det).connect(lp);
  lp.connect(g); g.connect(out);
}
// хор вдали «о-о»: пилы через форманты, медленная атака
function choir(ac, out, t, ms, d, v = 0.03, vowel = 'o') {
  const g = G(ac, 0), sum = G(ac), lp = biq(ac, 'lowpass', 2200, 0.5);
  for (const [f, q, a] of VOW[vowel]) { const b = biq(ac, 'bandpass', f, q * 0.7), ga = G(ac, a * 2.5); sum.connect(b); b.connect(ga); ga.connect(lp); }
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * 0.45); g.gain.linearRampToValueAtTime(0, t + d + 0.8);
  for (const m of ms) for (const det of [-14, -4, 5, 15]) { const o = osc(ac, 'sawtooth', hz(m), t, t + d + 1, det), vb = osc(ac, 'sine', 4.6 + Math.random(), t, t + d + 1), vg = G(ac, 6); vb.connect(vg); vg.connect(o.detune); o.connect(sum); }
  lp.connect(g); g.connect(out);
}
// колокол вдали: негармонические обертоны
function bell(ac, out, t, m, v = 0.05, d = 5) {
  const f = hz(m);
  for (const [k, a, dd] of [[1, 1, 1], [2.0, 0.5, 0.7], [2.76, 0.4, 0.5], [5.4, 0.2, 0.3], [0.5, 0.35, 1.1]]) {
    const g = G(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * a, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + d * dd);
    osc(ac, 'sine', f * k, t, t + d * dd + 0.1).connect(g); g.connect(out);
  }
}
// медь в сурдине: тёмные пилы, фильтр открывается медленно — «стон» оркестра
function horn(ac, out, t, ms, d, v = 0.05, open = 900) {
  const g = G(ac, 0), lp = biq(ac, 'lowpass', 200, 0.9);
  lp.frequency.setValueAtTime(200, t); lp.frequency.linearRampToValueAtTime(open, t + d * 0.5); lp.frequency.linearRampToValueAtTime(260, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * 0.4); g.gain.linearRampToValueAtTime(0, t + d + 0.2);
  for (const m of ms) for (const det of [-8, 0, 7]) osc(ac, 'sawtooth', hz(m), t, t + d + 0.3, det).connect(lp);
  lp.connect(g); g.connect(out);
}
// виолончели маркато: короткий тёмный смычковый удар
function cello(ac, out, t, m, d, v = 0.07) {
  const g = G(ac, 0), lp = biq(ac, 'lowpass', 300, 1); lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(420, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.025); g.gain.exponentialRampToValueAtTime(v * 0.4, t + d * 0.6); g.gain.linearRampToValueAtTime(0, t + d);
  for (const det of [-10, 0, 9]) osc(ac, 'sawtooth', hz(m), t, t + d + 0.05, det).connect(lp);
  const n = ac.createBufferSource(); n.buffer = noiseBuf(ac, 'pink'); n.loop = true; const nb = biq(ac, 'bandpass', hz(m) * 4, 1), ng = G(ac, 0.25); n.connect(nb); nb.connect(ng); ng.connect(lp); n.start(t, Math.random()); n.stop(t + d + 0.05);   // канифоль
  lp.connect(g); g.connect(out);
}
// большой барабан в зале: мембрана + низ + шлепок
function taiko(ac, out, t, v = 0.8, f0 = 85, d = 1.1) {
  const g = G(ac, 0), o = osc(ac, 'sine', f0, t, t + d + 0.05); o.frequency.setValueAtTime(f0 * 1.6, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.04); o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(out);
  noiseHit(ac, out, t, 0.12, 500, v * 0.5, 'lowpass', 0.5); noiseHit(ac, out, t, 0.03, 2500, v * 0.12, 'bandpass', 1);
}
function noiseHit(ac, out, t, d, f, v, type = 'bandpass', q = 0.8, kind = 'white') {
  const n = ac.createBufferSource(); n.buffer = noiseBuf(ac, kind); n.loop = true; const b = biq(ac, type, f, q), g = G(ac, 0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d); n.connect(b); b.connect(g); g.connect(out); n.start(t, Math.random() * 2); n.stop(t + d + 0.05);
}
// металлический удар (цепь/наковальня в темноте)
function clang(ac, out, t, v = 0.12) { for (const [k, a] of [[1, 1], [2.31, 0.7], [3.7, 0.5], [5.1, 0.4], [7.3, 0.25]]) { const g = G(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * a, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / k); osc(ac, 'sine', 310 * k, t, t + 1.7).connect(g); g.connect(out); } noiseHit(ac, out, t, 0.05, 4000, v, 'highpass'); }
// воздух подземелья: тёмный шум, едва слышный
function air(ac, out, t, d, v = 0.03) { const n = ac.createBufferSource(); n.buffer = noiseBuf(ac, 'brown'); n.loop = true; const b = biq(ac, 'lowpass', 300, 0.5), g = G(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 3); g.gain.setValueAtTime(v, t + d - 2); g.gain.linearRampToValueAtTime(0, t + d); n.connect(b); b.connect(g); g.connect(out); n.start(t); n.stop(t + d + 0.1); }

// общий выход: сухой сигнал + много зала
function bus(ac, out, wet = 0.55, sec = 4.5) {
  const dry = G(ac, 1), rv = hall(ac, sec), wg = G(ac, wet), mix = G(ac, 0.9);
  dry.connect(mix); dry.connect(rv); rv.connect(wg); wg.connect(mix); mix.connect(out); return dry;
}

// ---------- деревня: гитарный перебор в ми миноре, как Тристрам — грустно, но тепло ----------
// аккорды (бас, затем струны перебора): Em — C — G — D / Em — Am — C — B — минор без резких диссонансов
const V_CH = [[40, [52, 59, 64, 67]], [36, [52, 60, 64, 67]], [43, [55, 59, 62, 67]], [38, [54, 57, 62, 66]], [40, [52, 59, 64, 67]], [45, [52, 57, 60, 64]], [36, [52, 60, 64, 67]], [35, [51, 54, 59, 63]]];
const V_MEL = [[[0, 76], [3, 74]], [[0, 72], [2, 76]], [[0, 74], [2, 71]], [[0, 69]], [[0, 76], [1.5, 79], [3, 78]], [[0, 76], [2, 72]], [[0, 72], [2, 76]], [[0, 75]]];   // [доля, MIDI]
const V_BAR = 60 / 64 * 4;
// o — выход с залом (bus); from — номер первого такта (в игре тема играется кусками без конца)
function villageBars(ac, o, t0, bars, r, from = 0) {
  const b = 60 / 64, bar = b * 4;
  for (let n = 0; n < bars; n++) {
    const i = from + n, t = t0 + n * bar, [bass, up] = V_CH[i % 8], round = Math.floor(i / 8);
    guitar(ac, o, t, bass, 0.5, 4, -0.1);
    // перебор восьмыми, «живой» — каждая нота чуть мимо сетки
    const pick = [0, 1, 2, 3, 2, 1, 2, 3];
    pick.forEach((k, j) => guitar(ac, o, t + j * b / 2 + (r() - 0.5) * 0.025 + (j % 2 ? 0.015 : 0), up[k], j % 2 ? 0.17 : 0.22, 3, (k - 1.5) * 0.25));
    if (i % 4 === 0) drone(ac, o, t, [28 + (i % 8 === 4 ? 0 : 0), 40], bar * 4, 0.035, 300);   // гул на тонике под четыре такта
    if (round > 0 || i >= 4) for (const [at, m] of V_MEL[i % 8]) guitar(ac, o, t + at * b, m, 0.28, 4, 0.3);   // мелодия высоко на струнах — со второй четвёрки
    if (round > 0 && i % 8 === 0) choir(ac, o, t, [64, 71], bar * 4, 0.018, 'o');
    if (i % 8 === 3 || i % 8 === 7) bell(ac, o, t + 2 * b, 64, 0.025, 6);   // колокол где-то над деревней
  }
  return bars * bar;
}
export function village(ac, out, t0, bars = 16, r = Math.random) { const o = bus(ac, out, 0.6, 4.5); air(ac, o, t0, bars * V_BAR + 2, 0.05); return villageBars(ac, o, t0, bars, r); }

// ---------- бой Летописи: тёмный, но бодрый и не давящий — ре минор, 104 уд/мин, Dm — Bb — F — C / Dm — Bb — C — A ----------
const B_CH = [[38, 3], [34, 4], [41, 4], [36, 4], [38, 3], [34, 4], [36, 4], [33, 4]];   // [бас, терция: 3 — минор, 4 — мажор]
const B_BAR = 60 / 104 * 4;
function battleBars(ac, o, t0, bars, r, from = 0) {
  const b = 60 / 104, bar = b * 4, s = b / 4;
  for (let n = 0; n < bars; n++) {
    const i = from + n, t = t0 + n * bar, [root, third] = B_CH[i % 8], sec = i < 8 ? 0 : 1 + Math.floor(i / 8) % 2;   // вступление, дальше по кругу: полный бой ↔ кульминация
    // барабаны: шаг «БУМ . . бум БУМ . . .», к середине гуще, но без грохота
    const kit = sec === 0 ? [[0, 1], [6, 0.5], [8, 0.8]] : [[0, 1], [3, 0.4], [6, 0.55], [8, 0.85], [11, 0.4], [14, 0.5]];
    for (const [k, v] of kit) taiko(ac, o, t + k * s, v * 0.6, k % 8 ? 100 : 75, 0.8);
    if (sec >= 1) for (const k of [4, 12]) noiseHit(ac, o, t + k * s, 0.25, 1100, 0.12, 'bandpass', 0.6, 'pink');
    // виолончели: упругое остинато восьмыми по нотам аккорда (тоника, квинта, октава)
    const pat = [0, 0, 7, 0, 12, 0, 7, third];
    pat.forEach((iv, k) => cello(ac, o, t + k * b / 2, root + 12 + iv, b * 0.42, k % 4 ? 0.04 : 0.055));
    if (i % 2 === 0) drone(ac, o, t, [root], bar * 2, 0.03, 240);
    // медь: чистые трезвучия, не кластеры — героично, а не страшно
    if (sec >= 1) horn(ac, o, t, [root + 12, root + 12 + third, root + 19], bar * 0.95, sec === 2 ? 0.04 : 0.028, 1100);
    if (sec === 2) choir(ac, o, t, [root + 24, root + 24 + third], bar, 0.02, 'a');
    // гитарная тема поверх (как перебор деревни, но жёстче) — во второй половине
    if (sec >= 1) [0, 2, 3, 6].forEach((k, j) => guitar(ac, o, t + k * b / 2, root + 24 + [0, 7, third, 12][j], 0.16, 2, 0.25));
    if (i % 8 === 7) for (let k = 0; k < 4; k++) taiko(ac, o, t + (12 + k) * s, 0.3 + k * 0.08, 120 - k * 8, 0.6);   // сбивка в конце фразы
  }
  return bars * bar;
}
export function battle(ac, out, t0, bars = 24, r = Math.random) {
  const lvl = G(ac, 0.6); lvl.connect(out); const o = bus(ac, lvl, 0.4, 3.2);
  const d = battleBars(ac, o, t0, bars, r); taiko(ac, o, t0 + d, 0.7, 60, 2); return d + 2;
}

// ---------- в игре: тема играет бесконечно, ноты раскладываются на 3 с вперёд ----------
const THEMES = {
  town: { bars: villageBars, bar: V_BAR, wet: 0.6, rev: 4.5, air: 0.05, gain: 1 },
  battle: { bars: battleBars, bar: B_BAR, wet: 0.4, rev: 3.2, air: 0, gain: 0.6 },
};
export const hasTheme = name => !!THEMES[name];
let cur = null;
export function playTheme(ac, dest, name) {
  stopTheme(); const T = THEMES[name]; if (!T) return;
  const now = ac.currentTime, out = G(ac, 0); out.gain.setValueAtTime(0, now); out.gain.linearRampToValueAtTime(T.gain, now + 2.5); out.connect(dest);
  const o = bus(ac, out, T.wet, T.rev), st = { out, o, bar: 0, t: now + 0.3, timer: 0, nodes: [] };
  if (T.air) { const n = ac.createBufferSource(); n.buffer = noiseBuf(ac, 'brown'); n.loop = true; const f = biq(ac, 'lowpass', 300, 0.5), g = G(ac, T.air); n.connect(f); f.connect(g); g.connect(o); n.start(now); st.nodes.push(n); }
  const pump = () => {
    if (cur !== st) return;
    if (st.t < ac.currentTime) st.t = ac.currentTime + 0.1;   // вкладка спала — не догонять пропущенное
    while (st.t < ac.currentTime + 3) { try { T.bars(ac, o, st.t, 1, Math.random, st.bar); } catch (e) { console.warn('music', e); } st.t += T.bar; st.bar++; }
    st.timer = setTimeout(pump, 700);
  };
  cur = st; pump();
}
export function stopTheme(fade = 2) {
  const st = cur; if (!st) return; cur = null; clearTimeout(st.timer);
  const t = st.out.context.currentTime; st.out.gain.cancelScheduledValues(t); st.out.gain.setValueAtTime(st.out.gain.value, t); st.out.gain.linearRampToValueAtTime(0, t + fade);
  for (const n of st.nodes) { try { n.stop(t + fade + 0.1); } catch { } }
  setTimeout(() => { try { st.out.disconnect(); } catch { } }, (fade + 5) * 1000);
}
