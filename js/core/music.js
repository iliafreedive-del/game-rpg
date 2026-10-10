// Музыка синтезом WebAudio (черновик к сборке 60, пока только для превью): спокойная тема деревни и боевая тема Летописи битв.
// song(ac, out, t0, bars, rnd) раскладывает ноты на bars тактов вперёд и возвращает длительность в секундах.
// В игре будет играться кусками (по 4–8 тактов вперёд), в превью — целиком (tools/audio/render.html).
import { VOW, noiseBuf } from './voices.js';

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const G = (ac, v = 1) => { const g = ac.createGain(); g.gain.value = v; return g; };
function biq(ac, type, f, q = 0.7) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function osc(ac, type, f, t, end, det = 0) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(end); return o; }

// ---------- инструменты ----------
// щипковый (лютня/арфа): пила+треугольник, фильтр быстро закрывается — «щипок», затем мягкое затухание
function pluck(ac, out, t, m, v = 0.3, d = 1.6, bright = 3200) {
  const f = hz(m), end = t + d + 0.05, g = G(ac, 0), lp = biq(ac, 'lowpass', bright, 1.5);
  lp.frequency.setValueAtTime(bright, t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + 0.25);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(v * 0.3, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  osc(ac, 'sawtooth', f, t, end).connect(lp); const tr = osc(ac, 'triangle', f * 2, t, end, 4), tg = G(ac, 0.3); tr.connect(tg); tg.connect(lp);
  lp.connect(g); g.connect(out);
}
// подушка (струнные/хор вдали): расстроенные пилы, мягкий фильтр, медленная атака
function pad(ac, out, t, ms, d, v = 0.08, cut = 900, vowel) {
  const g = G(ac, 0), lp = biq(ac, 'lowpass', cut, 0.5); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * 0.35); g.gain.setValueAtTime(v, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d + 0.4);
  let head = lp;
  if (vowel) { head = G(ac); for (const [f, q, a] of VOW[vowel]) { const b = biq(ac, 'bandpass', f, q * 0.6), ga = G(ac, a * 2.2); head.connect(b); b.connect(ga); ga.connect(lp); } }
  for (const m of ms) for (const det of [-9, 0, 8]) { const o = osc(ac, 'sawtooth', hz(m), t, t + d + 0.5, det + Math.random() * 3); const l = osc(ac, 'sine', 4.5 + Math.random(), t, t + d + 0.5), lg = G(ac, 4); l.connect(lg); lg.connect(o.detune); o.connect(head); }
  lp.connect(g); g.connect(out);
}
// флейта: синус с дыханием и вибрато, вибрато вступает к середине ноты
function flute(ac, out, t, m, d, v = 0.12) {
  const f = hz(m), end = t + d + 0.1, g = G(ac, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.06); g.gain.setValueAtTime(v * 0.9, t + d * 0.8); g.gain.linearRampToValueAtTime(0, t + d);
  const o = osc(ac, 'sine', f, t, end), l = osc(ac, 'sine', 5.2, t, end), lg = G(ac, 0); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + d * 0.6); l.connect(lg); lg.connect(o.frequency);
  const h = osc(ac, 'triangle', f * 2, t, end), hg = G(ac, 0.08); h.connect(hg); hg.connect(g); o.connect(g);
  const n = ac.createBufferSource(); n.buffer = noiseBuf(ac, 'white'); n.loop = true; const nb = biq(ac, 'bandpass', f * 2, 2), ng = G(ac, 0.05); n.connect(nb); nb.connect(ng); ng.connect(g); n.start(t, Math.random()); n.stop(end);
  g.connect(out);
}
// бас/медь: две расстроенные пилы, фильтр открывается на атаке
function brass(ac, out, t, m, d, v = 0.15, open = 1800) {
  const f = hz(m), end = t + d + 0.1, g = G(ac, 0), lp = biq(ac, 'lowpass', 300, 1.2);
  lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(open, t + 0.12); lp.frequency.linearRampToValueAtTime(open * 0.6, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.05); g.gain.setValueAtTime(v * 0.85, t + d * 0.85); g.gain.linearRampToValueAtTime(0, t + d);
  for (const det of [-7, 7]) osc(ac, 'sawtooth', f, t, end, det).connect(lp);
  lp.connect(g); g.connect(out);
}
// короткая нота струнных (остинато): пила, короткая огибающая
function stab(ac, out, t, m, d, v = 0.08, cut = 2200) {
  const g = G(ac, 0), lp = biq(ac, 'lowpass', cut, 1); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  for (const det of [-6, 6]) osc(ac, 'sawtooth', hz(m), t, t + d + 0.05, det).connect(lp); lp.connect(g); g.connect(out);
}
// большой барабан (тайко): синус с падением высоты + удар шума
function drum(ac, out, t, v = 0.7, f0 = 130, d = 0.5) {
  const g = G(ac, 0), o = osc(ac, 'sine', f0, t, t + d + 0.05); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(42, t + d * 0.6);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(out);
  hit(ac, out, t, 0.05, 900, v * 0.35, 'lowpass');
}
// шумовой удар (малый барабан, тарелка, хлопок)
function hit(ac, out, t, d, f, v, type = 'bandpass', q = 0.8) {
  const n = ac.createBufferSource(); n.buffer = noiseBuf(ac, 'white'); n.loop = true; const b = biq(ac, type, f, q), g = G(ac, 0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d); n.connect(b); b.connect(g); g.connect(out); n.start(t, Math.random() * 2); n.stop(t + d + 0.05);
}
function swell(ac, out, t, d, v) {   // нарастание тарелки к сильной доле
  const n = ac.createBufferSource(); n.buffer = noiseBuf(ac, 'white'); n.loop = true; const b = biq(ac, 'highpass', 5000, 0.5), g = G(ac, 0);
  g.gain.setValueAtTime(0, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.01); g.gain.exponentialRampToValueAtTime(v, t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.05);
  n.connect(b); b.connect(g); g.connect(out); n.start(t); n.stop(t + d + 0.1);
}

// ---------- деревня: 76 уд/мин, ре дорийский, лютня + подушка + флейта ----------
// аккорды по тактам (MIDI): Dm — C — Bb — C, во второй половине Dm — Am — Bb — C
const V_CH = [[50, 57, 62, 65], [48, 55, 60, 64], [46, 53, 58, 62], [48, 55, 60, 64], [50, 57, 62, 65], [45, 52, 57, 60], [46, 53, 58, 62], [48, 55, 60, 67]];
const V_MEL = [   // мелодия флейты: [доля от начала такта, MIDI, длина в долях]; null — такт молчит
  [[0, 74, 1.5], [1.5, 72, 0.5], [2, 69, 2]], null, [[0, 70, 1], [1, 72, 1], [2, 74, 1.5], [3.5, 72, 0.5]], [[0, 76, 3]],
  [[0, 77, 1.5], [1.5, 76, 0.5], [2, 74, 1], [3, 72, 1]], [[0, 69, 3]], [[0, 70, 1], [1, 69, 1], [2, 67, 1], [3, 69, 1]], [[0, 74, 4]],
];
export function village(ac, out, t0, bars = 16, r = Math.random) {
  const b = 60 / 76, bar = b * 4, mix = G(ac, 0.9); mix.connect(out);
  for (let i = 0; i < bars; i++) {
    const t = t0 + i * bar, ch = V_CH[i % 8], round = Math.floor(i / 8);
    pad(ac, mix, t, ch.slice(1), bar, 0.035, 1100);
    pluck(ac, mix, t, ch[0] - 12, 0.22, bar * 0.9, 900);   // бас — длинный щипок на сильную долю
    const arp = [ch[1], ch[2], ch[3], ch[2] + 12, ch[3], ch[2], ch[1] + 12, ch[2]];   // арпеджио восьмыми
    arp.forEach((m, k) => pluck(ac, mix, t + k * b / 2 + (r() - 0.5) * 0.012, m, k % 2 ? 0.07 : 0.1, 1.4, 2600));
    const mel = round > 0 ? V_MEL[i % 8] : (i % 8 >= 4 ? V_MEL[i % 8] : null);   // первые 4 такта — без флейты, вступление
    if (mel) for (const [at, m, d] of mel) flute(ac, mix, t + at * b, m, d * b * 0.95, 0.09);
  }
  return bars * bar;
}

// ---------- бой Летописи: 132 уд/мин, ре минор, тайко + остинато струнных + медь + хор ----------
const B_CH = [[38, 50, 53, 57], [34, 46, 50, 53], [36, 48, 52, 55], [33, 45, 49, 52]];   // Dm — Bb — C — A
const B_TH = [[[62, 1.5], [65, 0.5], [64, 1], [62, 1]], [[62, 1.5], [65, 0.5], [67, 1], [65, 1]], [[64, 1.5], [67, 0.5], [65, 1], [64, 1]], [[61, 2], [64, 1], [69, 1]]];   // медная тема кульминации
export function battle(ac, out, t0, bars = 24, r = Math.random) {
  const b = 60 / 132, bar = b * 4, s = b / 4, mix = G(ac, 0.85); mix.connect(out);
  for (let i = 0; i < bars; i++) {
    const t = t0 + i * bar, ch = B_CH[i % 4], sec = Math.floor(i / 8);   // 3 части по 8 тактов: вступление, полный бой, кульминация
    // барабаны: тайко «бум-бум . бум» + малый на 2 и 4
    for (const [k, v] of [[0, 0.8], [3, 0.5], [6, 0.6], [8, 0.8], [11, 0.45], [12, 0.6], [14, 0.5]]) drum(ac, mix, t + k * s, v * (sec ? 1 : 0.8), k % 8 ? 110 : 140);
    if (sec >= 1) for (const k of [4, 12]) hit(ac, mix, t + k * s, 0.18, 1800, 0.22, 'bandpass', 0.7);
    if (sec >= 1) for (let k = 0; k < 16; k += 2) hit(ac, mix, t + k * s, 0.04, 8000, k % 4 ? 0.03 : 0.05, 'highpass');
    // остинато шестнадцатыми: тоника-тоника-терция-тоника…
    const pat = [0, 0, 12, 0, 7, 0, 12, 0, 0, 0, 12, 0, 8, 7, 5, 3];
    const root = ch[1];
    pat.forEach((iv, k) => stab(ac, mix, t + k * s, root + (ch === B_CH[3] && iv === 3 ? 4 : iv), s * 0.9, k % 4 ? 0.04 : 0.07, sec ? 2600 : 1600));
    // бас и медь: длинные ноты аккорда
    brass(ac, mix, t, ch[0], bar * 0.95, 0.16, 900);
    if (sec >= 1) { brass(ac, mix, t, ch[2], bar * 0.48, 0.08, 1800); brass(ac, mix, t + bar / 2, ch[3], bar * 0.45, 0.07, 1800); }
    // хор «а-а» — с середины
    if (sec >= 1) pad(ac, mix, t, [ch[1] + 12, ch[2] + 12, ch[3] + 12], bar, sec === 2 ? 0.05 : 0.035, 2600, 'a');
    // кульминация: медная тема
    if (sec === 2) { let at = 0; for (const [m, d] of B_TH[i % 4]) { brass(ac, mix, t + at * b, m, d * b * 0.95, 0.07, 2600); at += d; } }
    if (i % 8 === 7) swell(ac, mix, t + bar - b * 2, b * 2, 0.12);
  }
  return bars * bar;
}
