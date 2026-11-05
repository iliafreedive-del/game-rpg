// Озвучка (speechSynthesis) и распознавание речи (Web Speech API), плюс короткие звуки.
import { S } from './store.js';

const synth = window.speechSynthesis;
export const ttsSupported = !!synth;
let voices = [];
const listeners = new Set();
function loadVoices() {
  voices = (synth?.getVoices() || []).filter(v => /^en[-_]/i.test(v.lang));
  listeners.forEach(f => f());
}
if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }
export const onVoices = f => listeners.add(f);

// Качество голоса: нейросетевые (Natural / Neural / Online), «улучшенные» (Enhanced / Premium) и Google — лучше всего.
// Встроенные «игрушечные» голоса macOS / iOS и сжатые (compact) — в самый низ.
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|wobble|zarvox|trinoids|whisper|jester|organ|superstar|ralph|fred|junior|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|good news|hysterical|pipe|deranged/i;
export function voiceScore(v) {
  let s = 0;
  if (/natural|neural|online/i.test(v.name)) s += 10;
  if (/premium/i.test(v.name)) s += 8;
  if (/enhanced|улучш/i.test(v.name)) s += 7;
  if (/google/i.test(v.name)) s += 6;
  if (/aria|jenny|guy|ava|emma|andrew|brian|michelle|samantha|allison|susan|tom|evan|nathan|zoe|joelle|noelle|serena/i.test(v.name)) s += 2;
  if (/en[-_]US/i.test(v.lang)) s += 2; else if (/en[-_]GB/i.test(v.lang)) s += 1;
  if (/compact/i.test(v.name) || v.voiceURI?.includes('compact')) s -= 6;
  if (NOVELTY.test(v.name)) s -= 20;
  return s;
}
export const englishVoices = () => [...voices].sort((a, b) => voiceScore(b) - voiceScore(a));

function pickVoice() {
  if (S.settings.voice) { const v = voices.find(v => v.name === S.settings.voice); if (v) return v; }
  return englishVoices()[0];
}
export const currentVoice = () => pickVoice();

export function speak(text, rate) {
  if (!synth) return Promise.resolve();
  synth.cancel();
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || 'en-US';
    // нейросетевые голоса звучат естественно на обычной скорости, простые — чуть медленнее
    const natural = v && voiceScore(v) >= 6;
    u.rate = (rate || S.settings.rate) * (natural ? 1 : 0.95);
    u.pitch = natural ? 1 : 1.05;
    u.onend = u.onerror = () => res();
    synth.speak(u);
    // Chrome иногда «засыпает» на паузе — будим
    if (synth.paused) synth.resume();
    setTimeout(res, 8000 + text.length * 120); // на случай, если onend не придёт
  });
}

// ── Распознавание речи ──
// Один активный сеанс. Новый запуск ждёт, пока предыдущий действительно закончится (иначе Chrome молча не стартует),
// а если сеанс завис — сбрасываем по таймауту.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const srSupported = !!SR;
let rec = null;
let ending = null; // промис завершения текущего сеанса

const wait = ms => new Promise(r => setTimeout(r, ms));

// Слушает одну фразу. onInterim(текст) — промежуточный результат, onStart() — микрофон реально включился.
// Возвращает массив вариантов распознавания (может быть пустым).
export async function listen(onInterim, onStart) {
  if (!SR) throw new Error('unsupported');
  synth?.cancel();
  if (rec) { abortListening(); await Promise.race([ending, wait(700)]); rec = null; }
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await once(onInterim, onStart); } catch (e) {
      // «уже запущено» / «aborted» при быстром повторном нажатии — пробуем ещё раз после паузы
      if (attempt === 0 && /InvalidState|already|aborted/i.test(e.name + e.message)) { await wait(400); continue; }
      throw e;
    }
  }
  return [];
}

function once(onInterim, onStart) {
  return new Promise((resolve, reject) => {
    const r = rec = new SR();
    r.lang = 'en-US';
    r.interimResults = true;
    r.maxAlternatives = 5;
    r.continuous = false;
    let finals = [], last = '', started = false, err = null, lastAt = 0;
    let done, over = false;
    ending = new Promise(d => { done = d; });
    const timers = [];
    const finish = () => {
      if (over) return;
      over = true;
      timers.forEach(t => { clearTimeout(t); clearInterval(t); });
      if (rec === r) rec = null;
      done();
      if (err) reject(err); else resolve(finals.length ? finals : last ? [last] : []);
    };
    r.onstart = r.onaudiostart = () => { if (!started) { started = true; onStart?.(); } };
    r.onresult = e => {
      const res = e.results[e.results.length - 1];
      last = Array.from(e.results, x => x[0].transcript).join(' ').trim();
      lastAt = Date.now();
      onInterim?.(last);
      if (res.isFinal) finals = Array.from(res, a => a.transcript);
    };
    r.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') err = new Error(e.error); };
    r.onend = finish;
    // не включился за 4 с — что-то мешает (разрешение, другой сеанс)
    timers.push(setTimeout(() => { if (!started) { err = new Error('not-started'); try { r.abort(); } catch { /* */ } setTimeout(finish, 300); } }, 4000));
    // Safari может не останавливаться сам: после 1,5 с тишины после речи — стоп; и не дольше 12 с
    const tick = setInterval(() => { if (lastAt && Date.now() - lastAt > 1500) { try { r.stop(); } catch { /* */ } } }, 300);
    timers.push(tick);
    timers.push(setTimeout(() => { try { r.stop(); } catch { /* */ } }, 12000));
    timers.push(setTimeout(finish, 15000)); // onend так и не пришёл
    try { r.start(); } catch (e) { err = e; finish(); }
  });
}

export function stopListening() { try { rec?.stop(); } catch { /* уже остановлен */ } }
export function abortListening() { try { rec?.abort(); } catch { /* уже остановлен */ } }
export const isListening = () => !!rec;

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
