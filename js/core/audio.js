// Procedural WebAudio SFX + generative dungeon/town ambience. No audio files needed (tiny bundle).
let ac = null, master, sfxG, musG, muted = false, paused = false, vol = { sfx: 0.7, music: 0.5 };
let musicZone = null, musicNodes = [];
export function initAudio() {
  const unlock = () => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
      master = ac.createGain(); master.connect(ac.destination);
      sfxG = ac.createGain(); sfxG.connect(master); musG = ac.createGain(); musG.connect(master); apply();
      if (musicZone) startMusic(musicZone, true); }
    if (ac.state === 'suspended') ac.resume();
  };
  addEventListener('pointerdown', unlock, { passive: true }); addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));
}
function apply() { if (!ac) return; sfxG.gain.value = vol.sfx; musG.gain.value = vol.music * 0.35; master.gain.value = (muted || paused) ? 0 : 1; }
export function setVolumes(s, m) { vol.sfx = s; vol.music = m; apply(); }
export function setPaused(p) { paused = p; apply(); }
let noiseBuf = null;
function noise() { if (noiseBuf) return noiseBuf; const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return noiseBuf = b; }
function env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(type, f0, f1, dur, peak = 0.3, delay = 0) {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, 0.005, dur, peak); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + 0.05);
}
function nz(dur, freq, q = 1, peak = 0.3, type = 'bandpass', delay = 0, f1) {
  const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise(); f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q;
  env(g, t, 0.004, dur, peak); s.connect(f); f.connect(g); g.connect(sfxG); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
const last = {};
const SFX = {
  swing: () => nz(0.16, 1800, 0.8, 0.22, 'bandpass', 0, 600),
  swingE: () => nz(0.18, 1200, 0.8, 0.18, 'bandpass', 0, 500),
  hit: () => { nz(0.08, 900, 1, 0.35); tone('square', 180, 60, 0.08, 0.12); },
  heavy: () => { nz(0.3, 300, 0.7, 0.45, 'lowpass'); tone('sine', 90, 40, 0.3, 0.35); },
  hurt: () => { tone('sawtooth', 220, 110, 0.15, 0.12); nz(0.1, 700, 1, 0.2); },
  bones: () => { for (let i = 0; i < 4; i++) nz(0.05, 2400 + i * 300, 4, 0.18, 'bandpass', i * 0.045); },
  death: () => { tone('sawtooth', 160, 50, 0.4, 0.14); nz(0.3, 400, 1, 0.2, 'lowpass'); },
  bow: () => { tone('triangle', 520, 180, 0.12, 0.15); nz(0.1, 3000, 2, 0.08); },
  cast: () => { tone('sine', 400, 900, 0.18, 0.12); },
  fire: () => { nz(0.35, 700, 0.5, 0.3, 'lowpass', 0, 200); tone('sine', 200, 90, 0.25, 0.1); },
  ice: () => { tone('sine', 1600, 2400, 0.12, 0.08); nz(0.15, 5000, 3, 0.12, 'highpass'); },
  zap: () => { for (let i = 0; i < 3; i++) tone('square', 1200 - i * 250, 300, 0.07, 0.08, i * 0.04); nz(0.2, 4000, 1, 0.1, 'highpass'); },
  thunder: () => { nz(0.9, 200, 0.5, 0.5, 'lowpass', 0, 60); tone('sawtooth', 80, 30, 0.6, 0.2); },
  boom: () => { nz(0.5, 500, 0.5, 0.45, 'lowpass', 0, 80); tone('sine', 110, 35, 0.4, 0.35); },
  whirl: () => nz(0.4, 900, 1.2, 0.3, 'bandpass', 0, 2200),
  freeze: () => { tone('triangle', 2000, 800, 0.3, 0.1); nz(0.25, 6000, 2, 0.1, 'highpass'); },
  coin: () => { tone('square', 1320, 1320, 0.05, 0.05); tone('square', 1760, 1760, 0.08, 0.05, 0.05); },
  pickup: () => { tone('triangle', 500, 800, 0.1, 0.12); },
  potionPick: () => tone('sine', 700, 1000, 0.12, 0.12),
  potion: () => { for (let i = 0; i < 3; i++) tone('sine', 300 + i * 90, 380 + i * 90, 0.08, 0.1, i * 0.07); },
  rareDrop: () => { tone('triangle', 880, 880, 0.15, 0.12); tone('triangle', 1175, 1175, 0.25, 0.12, 0.1); },
  epicDrop: () => { [660, 880, 1100, 1320].forEach((f, i) => tone('triangle', f, f, 0.3, 0.13, i * 0.09)); },
  equip: () => { nz(0.08, 2500, 3, 0.15); tone('square', 300, 200, 0.06, 0.06); },
  deny: () => tone('square', 160, 120, 0.12, 0.08),
  levelup: () => { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.35, 0.14, i * 0.1)); },
  quest: () => { [392, 523, 659].forEach((f, i) => tone('triangle', f, f, 0.3, 0.14, i * 0.12)); },
  learn: () => { tone('sine', 600, 1200, 0.25, 0.12); },
  chest: () => { nz(0.25, 400, 1, 0.25, 'lowpass'); tone('triangle', 660, 990, 0.3, 0.1, 0.15); },
  door: () => { nz(0.6, 200, 0.6, 0.35, 'lowpass', 0, 90); },
  // кузнец бьёт по наковальне (сборка 56): звонкий удар стали о сталь — негармонические обертоны бруска (1 : 2,76 : 5,4), щелчок и глухой стук; k — громкость по расстоянию
  forge: (k = 1) => { const f = 1150 + Math.random() * 90; [[1, 0.13, 0.9], [2.76, 0.07, 0.55], [5.4, 0.035, 0.3], [0.5, 0.05, 0.22]].forEach(([m, p, d]) => tone('sine', f * m, f * m * 0.996, d, p * k)); nz(0.035, 4500, 1.5, 0.22 * k); nz(0.09, 240, 0.8, 0.2 * k, 'lowpass'); },
  anvil: () => { tone('square', 1400, 1300, 0.25, 0.12); tone('sine', 2800, 2700, 0.4, 0.08); nz(0.05, 3000, 2, 0.2); },
  dodge: () => nz(0.2, 1200, 0.8, 0.18, 'bandpass', 0, 400),
  block: () => { tone('square', 900, 700, 0.08, 0.12); nz(0.06, 3000, 2, 0.2); },
  blink: () => tone('sine', 1400, 300, 0.2, 0.1),
  roar: () => { tone('sawtooth', 110, 60, 0.9, 0.25); nz(0.9, 300, 0.5, 0.25, 'lowpass'); },
  portal: () => { tone('sine', 200, 800, 0.6, 0.15); tone('sine', 300, 1200, 0.6, 0.08, 0.1); },
  click: () => tone('triangle', 900, 700, 0.04, 0.06),
};
export function sfx(name, k) {   // k — громкость 0..1 (если звук её понимает)
  if (!ac || muted || paused || !SFX[name]) return;
  const now = performance.now(); if (last[name] && now - last[name] < 35) return; last[name] = now;
  try { SFX[name](k); } catch { }
}
// generative ambience: drone + sparse bell notes (minor mode); town is warmer and brighter
export function startMusic(zone, force) {
  if (musicZone === zone && !force) return; musicZone = zone; if (!ac) return;
  for (const n of musicNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch { } } musicNodes = [];
  const base = zone === 'town' ? 110 : 73.4;
  for (const [m, t] of [[1, 'sine'], [1.5, 'sine'], [2.01, 'triangle']]) {
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = t; o.frequency.value = base * m; g.gain.value = zone === 'town' ? 0.05 : 0.07; lfo.frequency.value = 0.07 * m; lg.gain.value = 0.03;
    lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(musG); o.start(); lfo.start(); musicNodes.push(o, lfo);
  }
  const scale = zone === 'town' ? [0, 3, 5, 7, 10, 12, 15] : [0, 1, 5, 7, 8, 12];
  const bell = () => {
    if (musicZone !== zone || !ac) return;
    if (!paused) { const f = base * 4 * Math.pow(2, scale[Math.floor(Math.random() * scale.length)] / 12); const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; env(g, t, 0.02, 2.5, 0.06); o.connect(g); g.connect(musG); o.start(t); o.stop(t + 2.6); }
    setTimeout(bell, 1800 + Math.random() * 3500);
  };
  setTimeout(bell, 1500);
}
