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
export const sfx = {
  setMuted(m) { muted = m; },
  // звезда: чем длиннее серия подряд, тем выше нота
  star(combo = 0) { const f = 880 * 2 ** (Math.min(combo, 12) / 12); tone(f, f * 1.5, 0.16, { type: 'triangle', vol: 0.1 }); tone(f * 1.5, f * 2, 0.12, { type: 'sine', vol: 0.05, delay: 0.05 }); },
  gate(ok) { if (ok) tone(660, 990, 0.12, { type: 'triangle', vol: 0.07 }); else tone(220, 140, 0.25, { type: 'sawtooth', vol: 0.05 }); },
  fall() { tone(300, 90, 0.35, { type: 'sawtooth', vol: 0.05 }); },
  finish() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.22, { type: 'triangle', vol: 0.09, delay: i * 0.1 })); },
};
