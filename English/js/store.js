// Прогресс, настройки и интервальное повторение — всё в localStorage этого браузера.
const KEY = 'english-course-v1';
const DEFAULTS = {
  xp: 0,
  lessons: {},   // id -> {stars, best, times}
  srs: {},       // ключ карточки -> {box, due, ok, bad}
  days: {},      // 'YYYY-MM-DD' -> {sec, xp, n, ok, focus}
  settings: { rate: 0.9, voice: '', mic: true, sfx: true, autoplay: true, unlockAll: false, focusMin: 15 },
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...structuredClone(DEFAULTS), ...raw, settings: { ...DEFAULTS.settings, ...(raw.settings || {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export const S = load();
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* приватный режим */ }
}
export function reset() {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, structuredClone(DEFAULTS));
  save();
}
export function importData(json) {
  const d = JSON.parse(json);
  if (typeof d !== 'object' || !d.lessons) throw new Error('bad');
  Object.assign(S, { ...structuredClone(DEFAULTS), ...d, settings: { ...DEFAULTS.settings, ...(d.settings || {}) } });
  save();
}

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => (S.days[dayKey()] ||= { sec: 0, xp: 0, n: 0, ok: 0, focus: 0 });

export const goalSec = () => S.settings.focusMin * 60;
export function addSec(n) { today().sec += n; }
export function addXP(n) { S.xp += n; today().xp += n; }
export function countAnswer(ok) { const t = today(); t.n++; if (ok) t.ok++; }

// Дни подряд, когда выполнена норма минут. Сегодняшний день не рвёт серию, пока не кончился.
export function streak() {
  const met = d => (S.days[dayKey(d)]?.sec || 0) >= goalSec();
  let n = 0;
  const d = new Date();
  if (!met(d)) d.setDate(d.getDate() - 1);
  while (met(d)) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ── Интервальное повторение (коробки Лейтнера) ──
const DAY = 864e5;
const INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64].map(d => d * DAY);

export function srsAnswer(key, ok) {
  const c = (S.srs[key] ||= { box: 0, due: 0, ok: 0, bad: 0 });
  if (ok) { c.ok++; c.box = Math.min(c.box + 1, INTERVALS.length - 1); }
  else { c.bad++; c.box = Math.max(1, Math.floor(c.box / 2)); }
  c.due = Date.now() + (ok ? INTERVALS[c.box] : 10 * 60e3);
}
export function srsAdd(key) { S.srs[key] ||= { box: 1, due: Date.now() + DAY, ok: 0, bad: 0 }; }
export const dueKeys = () => Object.entries(S.srs).filter(([, c]) => c.due <= Date.now())
  .sort((a, b) => a[1].box - b[1].box || a[1].due - b[1].due).map(([k]) => k);
export const nextDue = () => Math.min(...Object.values(S.srs).map(c => c.due));
