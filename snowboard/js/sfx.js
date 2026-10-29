// Короткие звуки без файлов (WebAudio): звезда, ворота, финиш, падение. Громкость скромная,
// звук можно выключить в меню. Контекст создаётся по первому звуку — после нажатия кнопки.
let ctx = null, muted = false;
const ac = () => {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};
function tone(f0, f1, dur, { type = 'sine', vol = 0.12, delay = 0 } = {}) {
  const c = muted ? null : ac();
  if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
// Шорох снега: петля белого шума через полосовой фильтр. Юз — низкий густой шорох, карвинг — тонкое шипение,
// громкость растёт со скоростью. Звук создаётся только после первого касания (unlock), иначе браузер его не пустит.
let slideN = null;
function slideNode(c) {
  if (slideN) return slideN;
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < len; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = (Math.random() * 2 - 1) * 0.6 + b * 4; } // шум + «бурый» гул
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
  const g = c.createGain(); g.gain.value = 0;
  src.connect(f).connect(g).connect(c.destination); src.start();
  return (slideN = { f, g });
}
export const sfx = {
  setMuted(m) { muted = m; if (m) this.slide(0); },
  unlock() { if (!muted) ac(); },
  // v — скорость, м/с; slip 0…1 — доля юза; grip 0…1 — карвинг; off — тишина
  slide(v, slip = 0, grip = 0, on = true) {
    if (!ctx || ctx.state !== 'running') return;
    if (!slideN && (!on || muted || v < 0.5)) return;
    const n = slideNode(ctx), t = ctx.currentTime;
    const vol = on && !muted ? Math.min(1, v / 12) * (0.05 + 0.07 * slip) * (1 - 0.4 * grip) : 0;
    n.g.gain.setTargetAtTime(vol, t, 0.08);
    n.f.frequency.setTargetAtTime(grip > 0.5 ? 2600 + v * 60 : 600 + v * 40 + 500 * (1 - slip), t, 0.1);
    n.f.Q.setTargetAtTime(grip > 0.5 ? 2.2 : 0.7, t, 0.1);
  },
  // звезда: чем длиннее серия подряд, тем выше нота
  star(combo = 0) { const f = 880 * 2 ** (Math.min(combo, 12) / 12); tone(f, f * 1.5, 0.16, { type: 'triangle', vol: 0.1 }); tone(f * 1.5, f * 2, 0.12, { type: 'sine', vol: 0.05, delay: 0.05 }); },
  gate(ok) { if (ok) tone(660, 990, 0.12, { type: 'triangle', vol: 0.07 }); else tone(220, 140, 0.25, { type: 'sawtooth', vol: 0.05 }); },
  fall() { tone(300, 90, 0.35, { type: 'sawtooth', vol: 0.05 }); },
  finish() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.22, { type: 'triangle', vol: 0.09, delay: i * 0.1 })); },
};
