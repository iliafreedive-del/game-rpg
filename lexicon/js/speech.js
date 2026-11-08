// English voice (speechSynthesis) and tiny WebAudio chimes.
import { S } from './state.js';

const synth = window.speechSynthesis;
let voices = [];
function loadVoices() { voices = (synth ? synth.getVoices() : []).filter(v => /^en/i.test(v.lang)); }
if (synth) { loadVoices(); synth.addEventListener && synth.addEventListener('voiceschanged', loadVoices); }
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|wobble|zarvox|trinoids|whisper|jester|organ|superstar|ralph|fred|junior|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|good news|hysterical|pipe|deranged/i;
function score(v) {
  let s = 0;
  if (/natural|neural|online/i.test(v.name)) s += 10; if (/premium/i.test(v.name)) s += 8; if (/enhanced/i.test(v.name)) s += 7;
  if (/google/i.test(v.name)) s += 6; if (/en[-_]US/i.test(v.lang)) s += 2; else if (/en[-_]GB/i.test(v.lang)) s += 1;
  if (/compact/i.test(v.name)) s -= 6; if (NOVELTY.test(v.name)) s -= 20; return s;
}
export const voiceList = () => [...voices].sort((a, b) => score(b) - score(a));
export const canSpeak = () => !!synth;
export function speak(text, rate = 0.9) {
  if (!synth || !text) return;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[«»"]/g, ''));
    const v = (S.voice && voices.find(v => v.name === S.voice)) || voiceList()[0];
    if (v) u.voice = v; u.lang = v ? v.lang : 'en-US'; u.rate = rate;
    synth.speak(u);
  } catch (e) { /* no voice on this device */ }
}

let ac = null;
function tone(f, t0, dur, type = 'sine', vol = 0.08) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, ac.currentTime + t0); g.gain.linearRampToValueAtTime(vol, ac.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + dur); o.connect(g).connect(ac.destination);
  o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dur + 0.05);
}
export function sfx(kind) {
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { return; }
  if (kind === 'tap') tone(660, 0, 0.08, 'triangle', 0.04);
  else if (kind === 'note') { tone(520, 0, 0.12, 'triangle', 0.05); tone(780, 0.07, 0.15, 'triangle', 0.05); }
  else if (kind === 'ok') { tone(523, 0, 0.18); tone(659, 0.1, 0.18); tone(784, 0.2, 0.3); }
  else if (kind === 'page') { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.09, 0.45, 'sine', 0.07)); }
  else if (kind === 'bad') { tone(220, 0, 0.2, 'sawtooth', 0.04); tone(180, 0.12, 0.25, 'sawtooth', 0.04); }
  else if (kind === 'item') { tone(880, 0, 0.1, 'square', 0.03); tone(1175, 0.08, 0.16, 'square', 0.03); }
  else if (kind === 'level') { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.5, 'triangle', 0.07)); }
  else if (kind === 'door') { tone(110, 0, 0.6, 'sawtooth', 0.05); tone(82, 0.2, 0.8, 'sine', 0.08); }
  else if (kind === 'scare') { tone(140, 0, 0.5, 'sawtooth', 0.07); tone(95, 0.15, 0.7, 'square', 0.05); }
}
