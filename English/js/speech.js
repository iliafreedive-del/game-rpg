// Озвучка (speechSynthesis) и распознавание речи (Web Speech API), плюс короткие звуки.
import { S } from './store.js';

const synth = window.speechSynthesis;
export const ttsSupported = !!synth;
let voices = [];
function loadVoices() {
  voices = (synth?.getVoices() || []).filter(v => /^en[-_]/i.test(v.lang));
}
if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }

export const englishVoices = () => voices;

function pickVoice() {
  if (S.settings.voice) { const v = voices.find(v => v.name === S.settings.voice); if (v) return v; }
  const score = v => (/en[-_]US/i.test(v.lang) ? 2 : /en[-_]GB/i.test(v.lang) ? 1 : 0)
    + (/google|samantha|natural|neural|premium|enhanced|aria|jenny|daniel/i.test(v.name) ? 3 : 0) + (v.localService ? 0.5 : 0);
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

export function speak(text, rate) {
  if (!synth) return Promise.resolve();
  synth.cancel();
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || 'en-US';
    u.rate = rate || S.settings.rate;
    u.onend = u.onerror = () => res();
    synth.speak(u);
    setTimeout(res, 8000 + text.length * 120); // на случай, если onend не придёт
  });
}

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const srSupported = !!SR;
let rec = null;

// Слушает одну фразу. onInterim(текст) — промежуточный результат. Возвращает массив вариантов.
export function listen(onInterim) {
  if (!SR) return Promise.reject(new Error('unsupported'));
  stopListening();
  synth?.cancel();
  return new Promise((resolve, reject) => {
    const r = rec = new SR();
    r.lang = 'en-US';
    r.interimResults = true;
    r.maxAlternatives = 5;
    r.continuous = false;
    let finals = [];
    let last = '';
    r.onresult = e => {
      const res = e.results[e.results.length - 1];
      last = res[0].transcript;
      onInterim?.(last);
      if (res.isFinal) finals = Array.from(res, a => a.transcript);
    };
    r.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') reject(new Error(e.error)); };
    r.onend = () => { rec = null; resolve(finals.length ? finals : last ? [last] : []); };
    try { r.start(); } catch (e) { reject(e); }
  });
}
export function stopListening() { try { rec?.stop(); } catch { /* уже остановлен */ } }

// ── Звуки ──
let ctx;
export function beep(kind) {
  if (!S.settings.sfx) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok: [660, 880], bad: [220, 180], done: [523, 659, 784, 1047], tick: [880] }[kind];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      const t = ctx.currentTime + i * 0.09;
      o.type = kind === 'bad' ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.2);
    });
  } catch { /* без звука */ }
}
