// Генерация заданий из материалов урока и из карточек повторения.
import { LESSONS, lessonById } from './data.js';
import { tilesOf } from './check.js';
import { S } from './store.js';
import { srSupported } from './speech.js';
import { MORE } from './drills.js';
import { words } from './check.js';

export const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// «Не могу говорить сейчас» — выключает голосовые задания на час.
let micPausedUntil = 0;
export const pauseMic = () => { micPausedUntil = Date.now() + 3600e3; };
export const micOn = () => srSupported && S.settings.mic && Date.now() > micPausedUntil;

const sentence = (L, i) => {
  const [en, ru, alts] = L.sents[i];
  return { en, ru, variants: [en, ...(alts ? alts.split(';') : [])], key: `s:${L.id}:${i}`, lid: L.id };
};
const word = (L, i) => ({ en: L.words[i][0], ru: L.words[i][1], key: `w:${L.id}:${i}`, lid: L.id });

const allWords = () => LESSONS.flatMap(L => L.words.map(w => w[1]));
const allRu = () => LESSONS.flatMap(L => L.sents.map(s => s[1]));

function options(right, own, global, n = 4) {
  const pool = shuffle([...new Set(own.filter(x => x !== right))]);
  const extra = shuffle(global.filter(x => x !== right && !pool.includes(x)));
  const opts = shuffle([right, ...[...pool, ...extra].slice(0, n - 1)]);
  return { opts, a: opts.indexOf(right) };
}

export function build(s, listen = false) {
  const L = lessonById[s.lid];
  const target = tilesOf(s.en);
  const lower = new Set(target.map(t => t.toLowerCase()));
  const extra = shuffle((L.distract || []).filter(d => !lower.has(d.toLowerCase()))).slice(0, target.length > 6 ? 3 : 2);
  return { type: listen ? 'listen' : 'build', ...s, tiles: shuffle([...target, ...extra]) };
}
export const translate = s => ({ type: 'translate', ...s });
export const speakEx = s => ({ type: 'speak', ...s });
export function chooseRu(s) {
  const L = lessonById[s.lid];
  return { type: 'choose_ru', ...s, ...options(s.ru, L.sents.map(x => x[1]), allRu()) };
}
export function wordChoose(w) {
  const L = lessonById[w.lid];
  return { type: 'word', ...w, ...options(w.ru, L.words.map(x => x[1]), allWords()) };
}
export const wordType = w => ({ type: 'word_type', ...w });
export const match = (L, ws) => ({ type: 'match', lid: L.id, pairs: ws.map(w => [w.en, w.ru]) });
export const drill = (L, d) => ({ type: d.g ? 'gap' : 'mc', lid: L.id, ...d });

const orSpeak = s => (micOn() ? speakEx(s) : translate(s));

// Урок: разминка словами, грамматика, затем предложения от простого (собрать) к сложному (перевести, сказать).
export function lessonExercises(L) {
  const sents = shuffle(L.sents.map((_, i) => sentence(L, i)));
  const ws = shuffle(L.words.map((_, i) => word(L, i)));
  const drills = shuffle(L.drills).map(d => drill(L, d));
  const plan = [s => build(s), chooseRu, s => build(s, true), s => build(s), translate, orSpeak, s => build(s, true), translate, orSpeak, s => build(s)];
  const sx = sents.map((s, i) => plan[i % plan.length](s));
  const out = [match(L, ws.slice(0, 5))];
  if (ws[5]) out.push(wordChoose(ws[5]));
  // грамматика вперемешку с первыми предложениями, перевод и речь — в конце
  const early = sx.slice(0, 4), late = sx.slice(4);
  drills.forEach((d, i) => { out.push(d); if (early[i]) out.push(early[i]); });
  out.push(...early.slice(drills.length), ...late);
  return out;
}

// Задание для карточки повторения: чем лучше знаешь, тем сложнее формат.
export function fromKey(key) {
  const [kind, lid, idx] = key.split(':');
  const L = lessonById[lid];
  if (!L) return null;
  const box = S.srs[key]?.box || 0;
  if (kind === 'w') {
    if (!L.words[idx]) return null;
    const w = word(L, +idx);
    return box <= 1 ? wordChoose(w) : pick([wordChoose, wordType, wordType])(w);
  }
  if (!L.sents[idx]) return null;
  const s = sentence(L, +idx);
  const kinds = box <= 1 ? [build, chooseRu, s => build(s, true)]
    : box <= 3 ? [build, s => build(s, true), translate, orSpeak]
      : [translate, orSpeak, s => build(s, true)];
  return { ...pick(kinds)(s), srsKey: key };
}

export function lessonKeys(L) {
  return [...L.sents.map((_, i) => `s:${L.id}:${i}`), ...L.words.map((_, i) => `w:${L.id}:${i}`)];
}

// Свободная практика по пройденным урокам: сначала слабые карточки.
export function practiceKeys(n, exclude = new Set()) {
  const keys = Object.entries(S.srs).filter(([k]) => !exclude.has(k));
  const weighted = keys.map(([k, c]) => [k, c.box + Math.random() * 3 - (c.bad > c.ok ? 2 : 0)]);
  return weighted.sort((a, b) => a[1] - b[1]).slice(0, n).map(([k]) => k);
}

// ── Отработка после ошибки: похожие фразы того же урока тем же типом задания ──
const asSent = (L, [en, ru, alts]) => ({ en, ru, variants: [en, ...(alts ? alts.split(';') : [])], lid: L.id });
const sameType = (type, s) => type === 'listen' ? build(s, true) : type === 'translate' ? translate(s)
  : type === 'speak' ? orSpeak(s) : type === 'choose_ru' ? chooseRu(s) : build(s);

// focus — слова, на которых была ошибка: фразы с ними идут первыми.
export function makeDrill(ex, focus = []) {
  const L = lessonById[ex.lid];
  if (!L) return null;
  const again = ex.type === 'build' || ex.type === 'listen' ? build(ex, ex.type === 'listen') : { ...ex };
  let pool;
  if (ex.type === 'word' || ex.type === 'word_type') {
    pool = shuffle(L.words.map((_, i) => word(L, i)).filter(w => w.en !== ex.en)).map(w => ex.type === 'word' ? wordChoose(w) : wordType(w));
  } else if (ex.type === 'mc' || ex.type === 'gap') {
    const ds = shuffle(L.drills.filter(d => (d.q || d.g) !== (ex.q || ex.g))).map(d => drill(L, d));
    const ss = shuffle([...L.sents, ...(MORE[L.id] || [])].map(x => asSent(L, x))).map(s => build(s));
    pool = ds.flatMap((d, i) => [d, ss[i]].filter(Boolean)).concat(ss.slice(ds.length));
  } else {
    const base = new Set(words(ex.en || ''));
    const f = new Set(focus);
    pool = [...L.sents, ...(MORE[L.id] || [])].filter(x => x[0] !== ex.en).map(x => asSent(L, x))
      .map(s => { const w = words(s.en); return [s, w.filter(x => base.has(x)).length + 3 * w.filter(x => f.has(x)).length + Math.random()]; })
      .sort((a, b) => b[1] - a[1]).map(([s]) => sameType(ex.type, s));
  }
  return { items: [again, ...pool.slice(0, 9), again], k: 0, streak: 0, need: 3, done: 0, max: 15, pool };
}
export function drillItem(d) {
  const it = d.k < d.items.length ? d.items[d.k] : d.pool[(d.k - d.items.length) % Math.max(1, d.pool.length)] || d.items[0];
  d.k++;
  return it.type === 'build' || it.type === 'listen' ? build(it, it.type === 'listen') : it;
}
