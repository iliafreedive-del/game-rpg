// Хранилище прогресса в localStorage. Любая ошибка доступа — работаем без сохранения.
const KEY = 'freedive-school-v1';
const DEF = {
  pb: 60, level: 'novice', sound: true, vibro: true, voice: false, seenIntro: false,
  lessons: {}, // id → {done, score}
  tables: { custom: [] },
  history: [], // {date, kind, title, details}
  workouts: { done: 0, days: [] }, // days: ['2026-11-07', ...]
};
let mem = null;
export function load() {
  if (mem) return mem;
  try { mem = { ...structuredClone(DEF), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { mem = structuredClone(DEF); }
  return mem;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* приватный режим */ } }
export function set(k, v) { load()[k] = v; save(); }
export function reset() { mem = structuredClone(DEF); save(); }
export const today = (d = new Date()) => d.toISOString().slice(0, 10);
export function markDay() {
  const s = load(); const t = today();
  if (!s.workouts.days.includes(t)) s.workouts.days.push(t);
  save();
}
export function streak() {
  const s = load(); const set_ = new Set(s.workouts.days);
  let n = 0; const d = new Date();
  if (!set_.has(today(d))) d.setDate(d.getDate() - 1); // серия не рвётся, пока сегодняшний день не закончился
  while (set_.has(today(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function addHistory(kind, title, details = {}) { const s = load(); s.history.unshift({ date: new Date().toISOString(), kind, title, details }); s.history = s.history.slice(0, 200); save(); }
