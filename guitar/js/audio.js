// Звук: синтез струны, метроном, микрофон (сам анализ — в dsp.js).
import { CHORDS, chordMidis } from './data.js';
import { S } from './store.js';
import { PitchTracker, OnsetDetector, Spectrum, freqToMidi as dspF2M, midiToFreq as dspM2F } from './dsp.js';

let _ctx = null;
export function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ---- Синтез (Карплус — Стронг) ----
const bufCache = new Map();
function pluckBuffer(midi) {
  if (bufCache.has(midi)) return bufCache.get(midi);
  const c = ctx(), sr = c.sampleRate, f = 440 * 2 ** ((midi - 69) / 12);
  const len = Math.floor(sr * 2.2), N = Math.round(sr / f);
  const buf = c.createBuffer(1, len, sr), out = buf.getChannelData(0);
  const ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  const decay = 0.996 - (midi - 40) * 0.00004;
  let p = 0, prev = 0;
  for (let i = 0; i < len; i++) {
    const cur = ring[p];
    const nxt = ring[(p + 1) % N];
    ring[p] = decay * 0.5 * (cur + nxt);
    out[i] = 0.7 * cur + 0.3 * prev; // лёгкое сглаживание
    prev = cur;
    p = (p + 1) % N;
  }
  bufCache.set(midi, buf);
  return buf;
}

let master = null;
function out() {
  const c = ctx();
  if (!master) { master = c.createGain(); master.gain.value = 0.5; master.connect(c.destination); }
  return master;
}

export function playNote(midi, when = 0, gain = 0.6, dur = 2) {
  const c = ctx(), t = Math.max(when, c.currentTime);
  mic.mute(t + dur + 0.3);
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = pluckBuffer(midi);
  g.gain.setValueAtTime(gain, t);
  g.gain.setTargetAtTime(0, t + dur, 0.08);
  src.connect(g).connect(out());
  src.start(t);
  src.stop(t + dur + 0.5);
}

// dir: 'D' вниз (с 6-й к 1-й), 'U' вверх (только тонкие), 'X' глушение
export function strum(chord, dir = 'D', when = 0) {
  const c = ctx(), t0 = Math.max(when, c.currentTime);
  if (dir === 'X') return mutedHit(t0);
  const midis = (typeof chord === 'string' ? chordMidis(CHORDS[chord]) : chord).map((m, i) => ({ m, i })).filter(o => o.m != null);
  let list = dir === 'U' ? midis.slice(-4).reverse() : dir === 'B' ? midis.slice(0, 1) : midis;
  list.forEach((o, k) => playNote(o.m, t0 + k * 0.012, dir === 'U' ? 0.22 : dir === 'B' ? 0.42 : 0.28, 1.6));
}
// аккорд по одной струне, от баса к тонкой
export function arpeggio(name, gap = 0.42) {
  const c = ctx(), t0 = c.currentTime + 0.05;
  chordMidis(CHORDS[name]).filter(m => m != null).forEach((m, k) => playNote(m, t0 + k * gap, 0.5, 1.4));
}

function mutedHit(t) {
  const c = ctx(), len = Math.floor(c.sampleRate * 0.06);
  const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8; g.gain.value = 0.9;
  s.buffer = b; s.connect(f).connect(g).connect(out()); s.start(t);
}

export function click(when, accent = false) {
  const c = ctx(), t = Math.max(when, c.currentTime);
  const o = c.createOscillator(), g = c.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(accent ? 0.6 : 0.35, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g).connect(out());
  o.start(t); o.stop(t + 0.06);
}

export function beep(freq = 880, dur = 0.25) {
  const c = ctx(), t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out()); o.start(t); o.stop(t + dur + 0.05);
}

// ---- Планировщик: вызывает cb(time, step) заранее, шаг = восьмая ----
export class Clock {
  constructor(bpm, cb, stepsPerBeat = 2) {
    this.bpm = bpm; this.cb = cb; this.spb = stepsPerBeat; this.timer = null;
  }
  get stepDur() { return 60 / this.bpm / this.spb; }
  start(delay = 0.15) {
    const c = ctx();
    this.t0 = c.currentTime + delay; this.next = this.t0; this.step = 0;
    const tick = () => {
      while (this.next < c.currentTime + 0.12) {
        this.cb(this.next, this.step);
        this.step++;
        this.next = this.t0 + this.step * this.stepDur;
      }
    };
    tick();
    this.timer = setInterval(tick, 25);
    return this.t0;
  }
  setBpm(bpm) {
    // продолжаем с текущего шага без скачка
    const c = ctx(); this.bpm = bpm;
    this.t0 = this.next - this.step * this.stepDur;
    if (this.next < c.currentTime) this.t0 = c.currentTime - this.step * this.stepDur + 0.05;
  }
  stop() { clearInterval(this.timer); this.timer = null; }
}

// ---- Микрофон ----
// Звук забираем «как есть» маленькими кусками (AudioWorklet), складываем в кольцевой буфер
// и каждые ~20 мс прогоняем через dsp.js: атаки, слежение за нотой, спектр для аккордов.
const TAP = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(1024); this.n = 0; this.t0 = 0; this.ch = 0; this.e = [0, 0]; }
  process(inputs) {
    const inp = inputs[0];
    if (!inp || !inp.length) return true;
    // Один канал, а не сумма: у встроенных микрофонов ноутбуков каналы бывают в противофазе
    // и при сведении в моно гасят друг друга. Из двух берём более громкий.
    if (inp.length > 1) {
      for (let c = 0; c < 2; c++) { let s = 0; const x = inp[c]; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; this.e[c] = this.e[c] * 0.995 + s; }
      if (this.e[1 - this.ch] > this.e[this.ch] * 2) this.ch = 1 - this.ch;
    }
    const x = inp[Math.min(this.ch, inp.length - 1)];
    for (let i = 0; i < x.length;) {
      if (this.n === 0) this.t0 = currentTime + i / sampleRate;
      const k = Math.min(x.length - i, this.buf.length - this.n);
      this.buf.set(x.subarray(i, i + k), this.n); this.n += k; i += k;
      if (this.n === this.buf.length) { this.port.postMessage({ t0: this.t0, x: this.buf }, [this.buf.buffer]); this.buf = new Float32Array(1024); this.n = 0; }
    }
    return true;
  }
}
registerProcessor('tap', Tap);`;

class Mic {
  constructor() {
    this.subs = new Set(); this.onsetSubs = new Set(); this.waits = [];
    this.stream = null; this.users = 0; this.level = 0; this.last = null;
  }
  // каждый виджет берёт микрофон и потом отдаёт; выключается, когда не нужен никому
  async start() {
    this.users++;
    if (this.stream) return this;
    if (this.starting) { await this.starting; return this; }
    this.starting = this.open();
    try { await this.starting; } catch (err) { this.users = 0; throw err; } finally { this.starting = null; }
    return this;
  }
  async open() {
    const c = ctx();
    // Без channelCount: браузер сам свёл бы каналы в моно (см. выше), выбираем канал сами
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    this.stream = stream;
    const sr = this.sr = c.sampleRate;
    this.ring = new Float32Array(1 << 15); this.written = 0;
    this.tracker = new PitchTracker(sr, { fmin: 60, fmax: 1100, hop: 1024 });
    this.onsets = new OnsetDetector(sr, { sens: S.settings.sens });
    this.win = new Float32Array(Math.max(this.tracker.size, 4096));
    this.spec = new Spectrum(sr, 8192);
    this.raw = c.createMediaStreamSource(stream);
    const sink = c.createGain(); sink.gain.value = 0; sink.connect(c.destination); this.sink = sink;
    try {
      if (!Mic.workletReady) {
        const url = URL.createObjectURL(new Blob([TAP], { type: 'application/javascript' }));
        await c.audioWorklet.addModule(url);
        Mic.workletReady = true;
      }
      this.node = new AudioWorkletNode(c, 'tap', { numberOfOutputs: 1, outputChannelCount: [1] });
      this.node.port.onmessage = e => this.feed(e.data.t0, e.data.x);
    } catch (err) {
      // старые браузеры: ScriptProcessor работает так же, только с большей задержкой
      console.warn('AudioWorklet недоступен', err);
      this.node = c.createScriptProcessor(2048, 2, 1);
      let ch = 0;
      this.node.onaudioprocess = e => {
        const b = e.inputBuffer, xs = [...Array(b.numberOfChannels)].map((_, k) => b.getChannelData(k));
        if (xs.length > 1) { const en = xs.map(x => x.reduce((a, v) => a + v * v, 0)); if (en[1 - ch] > en[ch] * 2) ch = 1 - ch; }
        this.feed(c.currentTime - b.length / sr, xs[Math.min(ch, xs.length - 1)].slice());
      };
    }
    this.raw.connect(this.node); this.node.connect(sink); // узел должен быть подключён к выходу, иначе Safari его усыпит
  }
  // пока приложение само играет ноту, анализ молчит, иначе проверка «услышит» эталон
  mute(until) { this.muteUntil = Math.max(this.muteUntil || 0, until); }
  feed(t0, x) {
    const { ring, sr } = this, M = ring.length - 1, base = this.written;
    for (let i = 0; i < x.length; i++) ring[(base + i) & M] = x[i];
    this.written += x.length;
    let e = 0; for (let i = 0; i < x.length; i++) e += x[i] * x[i];
    const rms = Math.sqrt(e / x.length);
    this.level = Math.max(rms, this.level * 0.85);
    const muted = t0 < (this.muteUntil || 0);
    if (muted !== this.wasMuted) { this.wasMuted = muted; this.tracker.release(); this.tracker.ringing = []; this.waits = []; }
    // атаки: время удара в шкале AudioContext (для проверки ритма)
    const start = this.onsets.sampleIndex, ons = this.onsets.push(x);
    if (muted) return;
    if (ons.length) {
      this.tracker.onset();
      for (const idx of ons) { const t = t0 + (idx - start) / sr; this.onsetSubs.forEach(fn => fn(t)); }
    }
    // нота
    const W = this.win, n = W.length, end = this.written;
    if (end >= n) {
      for (let i = 0; i < n; i++) W[i] = ring[(end - n + i) & M];
      const res = this.tracker.process(W);
      res.t = t0 + x.length / sr;
      this.last = res;
      this.subs.forEach(fn => fn(res));
    }
    // спектр по заказу: «через столько-то секунд после удара»
    if (this.waits.length) {
      const ready = this.waits.filter(w => end >= w.at), N = this.spec.n;
      this.waits = this.waits.filter(w => end < w.at);
      for (const w of ready) {
        const buf = new Float32Array(N);
        for (let i = 0; i < N; i++) buf[i] = ring[(w.at - N + i) & M];
        this.spec.compute(buf);
        w.cb(this.spec);
      }
    }
  }
  // fn(res) — результат слежения за нотой каждые ~20 мс (см. PitchTracker.process)
  listen(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  onOnset(fn) { this.onsetSubs.add(fn); return () => this.onsetSubs.delete(fn); }
  // спектр окна, которое начинается через delay секунд после текущего момента
  spectrumIn(delay, cb) { this.waits.push({ at: this.written + Math.round(delay * this.sr) + this.spec.n, cb }); }
  setSens(v) { if (this.onsets) this.onsets.sens = v; }
  stop(force = false) {
    this.users = force ? 0 : Math.max(0, this.users - 1);
    if (this.users || !this.stream) return;
    this.stream.getTracks().forEach(t => t.stop());
    try { this.raw.disconnect(); this.node.disconnect(); this.sink.disconnect(); } catch { /* уже отключено */ }
    if (this.node.port) this.node.port.onmessage = null; else this.node.onaudioprocess = null;
    this.stream = null; this.node = null; this.last = null; this.level = 0;
    this.subs.clear(); this.onsetSubs.clear(); this.waits = [];
  }
}
export const mic = new Mic();

export function micErrorText(err) {
  if (!navigator.mediaDevices) return 'Браузер не даёт доступ к микрофону. Откройте приложение по https-ссылке в Chrome или Safari.';
  if (err && err.name === 'NotAllowedError') return 'Доступ к микрофону запрещён. Разрешите его в настройках сайта (значок замка или «аА» в адресной строке) и попробуйте снова.';
  if (err && err.name === 'NotFoundError') return 'Микрофон не найден. Подключите его или откройте приложение на телефоне.';
  if (err && err.name === 'NotReadableError') return 'Микрофон занят другой программой (звонок, запись). Закройте её и попробуйте снова.';
  return 'Не удалось включить микрофон: ' + (err && err.message || err);
}

export const freqToMidi = (f, a4 = S.settings.a4) => dspF2M(f, a4);
export const midiToFreq = (m, a4 = S.settings.a4) => dspM2F(m, a4);

// Не даём экрану гаснуть во время занятий
let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* не поддерживается */ }
}
