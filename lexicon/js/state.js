// Save state: words you met, your notes, confirmed pages, quest flags, inventory, progress.
import { WORDS, PAGES } from './words.js';

const KEY = 'lexicon-game-v1';
export const S = {};
export const fresh = () => ({
  v: 1, words: {}, pages: {}, flags: {}, inv: {}, zone: 'village', pos: null, xp: 0, lvl: 1, hints: 2,
  mode: 'pairs', autoVoice: false, voice: '', lines: [], goal: null, stats: { echo: 0, echoOk: 0, guessed: 0, met: 0 }, started: Date.now(),
});
export function load() {
  let d = null; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
  Object.assign(S, fresh(), d || {});
  return !!d;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked: play without saving */ } }
export function reset() { try { localStorage.removeItem(KEY); } catch (e) {} for (const k of Object.keys(S)) delete S[k]; Object.assign(S, fresh()); }

export const W = id => (S.words[id] ||= { seen: 0, note: '', conf: false, peek: false, lvl: 0, due: 0 });
export const isConf = id => !!(S.words[id] && S.words[id].conf);
export const seen = id => (S.words[id] ? S.words[id].seen : 0);
export const pageDone = id => !!(S.pages[id] && S.pages[id].done);
export const pageReady = p => !pageDone(p.id) && p.words.every(w => seen(w) > 0);

// ---- XP & ranks
export const RANKS = ['Чужак', 'Слушатель', 'Ученик', 'Подмастерье слов', 'Толмач', 'Знаток', 'Мудрец', 'Хранитель слов', 'Голос Стиллфорда'];
export const xpFor = l => Math.round(40 * Math.pow(l, 1.45));
export const rank = () => RANKS[Math.min(RANKS.length - 1, S.lvl - 1)];
let onLevel = null; export const setOnLevel = f => { onLevel = f; };
export function addXP(n) {
  S.xp += n; let up = false;
  while (S.xp >= xpFor(S.lvl)) { S.xp -= xpFor(S.lvl); S.lvl++; S.hints++; up = true; }
  if (up && onLevel) onLevel(S.lvl);
}
// ---- inventory
export const has = (id, n = 1) => (S.inv[id] || 0) >= n;
export const give = (id, n = 1) => { S.inv[id] = (S.inv[id] || 0) + n; };
export const takeAway = (id, n = 999) => { S.inv[id] = Math.max(0, (S.inv[id] || 0) - n); if (!S.inv[id]) delete S.inv[id]; };
// ---- spaced repetition (minutes)
const STEPS = [1, 8, 45, 240, 1440, 4320, 10080];
export function srs(id, ok) {
  const w = W(id);
  if (ok) { w.lvl = Math.min(STEPS.length, w.lvl + 1); w.due = Date.now() + STEPS[w.lvl - 1] * 60000; }
  else { w.lvl = Math.max(0, w.lvl - 2); w.due = Date.now() + 60000; }
}
export const progress = () => {
  const all = Object.keys(WORDS).length; const conf = Object.keys(WORDS).filter(isConf).length;
  const met = Object.keys(WORDS).filter(id => seen(id) > 0).length;
  return { all, conf, met, pages: PAGES.filter(p => pageDone(p.id)).length, pagesAll: PAGES.length };
};
