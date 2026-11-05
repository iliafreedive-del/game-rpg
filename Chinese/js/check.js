// Проверка ответов для китайского. Всё сравнивается в «ключах» — пиньинь без тонов:
// ответ можно написать иероглифами, пиньинем с тонами (nǐ hǎo), цифрами (ni3 hao3) или без тонов (ni hao), с пробелами или без.
// Омофоны (他 / 她 / 它 — tā) засчитываются: на слух их не различить.
import { PY, PYX, CH } from './py.js';

export const HAN = /\p{Script=Han}/u;
export const PUNCT = /[\s，。？！、：；“”‘’「」『』（）《》,.?!:;"'()«»…—–-]+/;

// иероглиф → пиньинь с тоном (первое, самое частое чтение)
const CHMAP = new Map();
for (const g of CH.split(' ')) {
  const m = g.match(/^([^\p{Script=Han}]+)(.*)$/u);
  if (m) for (const c of m[2]) CHMAP.set(c, m[1]);
}

const MARKS = { ā: 'a', á: 'a', ǎ: 'a', à: 'a', ē: 'e', é: 'e', ě: 'e', è: 'e', ī: 'i', í: 'i', ǐ: 'i', ì: 'i', ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', ǖ: 'u', ǘ: 'u', ǚ: 'u', ǜ: 'u', ü: 'u', ń: 'n', ň: 'n', ǹ: 'n', ḿ: 'm' };
// пиньинь → ключ: без тонов, ü = u = v, без пробелов
export const toneless = s => s.toLowerCase().normalize('NFC').replace(/u:/g, 'u').replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ]/g, c => MARKS[c])
  .replace(/([a-z])[0-5]/g, '$1').replace(/v/g, 'u').replace(/[^a-z]/g, '');

const TONES = { 1: /[āēīōūǖ]/, 2: /[áéíóúǘń]/, 3: /[ǎěǐǒǔǚň]/, 4: /[àèìòùǜǹ]/ };
export const toneOf = syl => +(Object.keys(TONES).find(t => TONES[t].test(syl)) || 0);

// Пиньинь слова для показа: слоги слитно (xuésheng). Незнакомое слово — по иероглифам.
export function pyOf(t) {
  const p = PY[t] || PYX[t];
  if (p) return p.replace(/ /g, '');
  return [...t].map(c => CHMAP.get(c) || '').join('');
}
export const sylsOf = t => (PY[t] || PYX[t] || [...t].map(c => CHMAP.get(c) || '').join(' ')).split(' ');

// Ключи всех слов курса: иероглифы → ключ и ключ → иероглифы (для разбивки ответа на слова)
const HKEY = new Map();
for (const [w, p] of Object.entries(PY)) HKEY.set(w, toneless(p));
const KEYS = new Set(HKEY.values());
const K2H = new Map([...'是有不没吗了很在的他也都和个我你要想会能过呢吧比'].map(c => [HKEY.get(c), c]));
for (const [w, k] of HKEY) if (!K2H.has(k) || w.length < K2H.get(k).length) K2H.set(k, w);
export const hanOfKey = k => K2H.get(k);
const SYL = new Set([...CHMAP.values()].map(toneless));
SYL.add('r');

const keyOfHan = w => HKEY.get(w) || [...w].map((c, i) => c === '儿' && i > 0 ? 'r' : toneless(CHMAP.get(c) || c)).join('');

const DIG = '零一二三四五六七八九';
const MW = '个本杯只张次位件条块岁';
function num2han(n, next = '') {
  n = +n;
  if (n === 2 && MW.includes(next)) return '两';
  if (n < 10) return DIG[n];
  if (n < 20) return '十' + (n % 10 ? DIG[n % 10] : '');
  if (n < 100) return DIG[Math.floor(n / 10)] + '十' + (n % 10 ? DIG[n % 10] : '');
  return [...String(n)].map(d => DIG[d]).join('');
}

// Жадная разбивка: сначала слова из guide (эталона), потом слова курса, потом слоги.
function segHan(run, guide) {
  const out = [];
  for (let p = 0; p < run.length;) {
    let len = 1;
    // сначала слова эталона, потом остальные слова курса
    for (const set of [guide.han, HKEY]) {
      for (let L = Math.min(6, run.length - p); L > 1; L--) if (set.has(run.slice(p, p + L))) { len = L; break; }
      if (len > 1 || guide.han.has(run[p])) break;
    }
    // знаки, которых нет среди слов курса и эталона, — по одному
    const w = run.slice(p, p + len);
    out.push({ k: len === 1 && w === '儿' && out.length ? 'r' : keyOfHan(w), d: w });
    p += len;
  }
  // эризация: «这 儿» → одно слово
  for (let i = out.length - 1; i > 0; i--) if (out[i].k === 'r') { out[i - 1].k += 'r'; out[i - 1].d += out[i].d; out.splice(i, 1); }
  return out;
}
function segLat(run, guide) {
  const out = [];
  for (let p = 0; p < run.length;) {
    let len = 0;
    for (const set of [guide.keys, KEYS, SYL]) {
      for (let L = Math.min(set === SYL ? 6 : 16, run.length - p); L > 0; L--) if (set.has(run.slice(p, p + L))) { len = L; break; }
      if (len) break;
    }
    len ||= 1;
    out.push({ k: run.slice(p, p + len), d: run.slice(p, p + len) });
    p += len;
  }
  return out;
}

// Строка → слова-единицы {k: ключ, d: как написано}. guide — единицы эталона: ими разбиваем в первую очередь.
export function units(s, guide = []) {
  const g = { han: new Set(guide.map(u => u.d).filter(d => HAN.test(d))), keys: new Set(guide.map(u => u.k)) };
  const out = [];
  for (const piece of String(s).replace(/<[^>]+>/g, ' ').split(PUNCT)) {
    if (!piece) continue;
    if (HKEY.has(piece)) { out.push({ k: HKEY.get(piece), d: piece }); continue; }
    // цифры → иероглифы, дальше куски «иероглифы» и «латиница»
    const p = piece.replace(/(?<![a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü:])\d+/g, (m, i, str) => num2han(m, str[i + m.length] || ''));
    for (const run of p.match(/\p{Script=Han}+|[^\p{Script=Han}]+/gu) || []) {
      if (HAN.test(run)) out.push(...segHan(run, g));
      else { const t = toneless(run); if (t) out.push(...segLat(t, g)); }
    }
  }
  return out;
}

export const normalize = s => units(s).map(u => u.k).join('');
export const words = s => units(s).map(u => u.k);

// Слова для плиток и подсказок: как написаны, без знаков препинания.
export const tilesOf = s => String(s).split(PUNCT).filter(Boolean);

export function lev(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

const keyOf = (s, guide) => units(s, guide).map(u => u.k).join('');

// Возвращает {ok, typo}. variants — все верные ответы.
export function checkText(input, variants) {
  if (!String(input).trim()) return { ok: false };
  const strip = s => String(s).replace(new RegExp(PUNCT.source, 'g'), '');
  for (const v of variants) if (strip(v) === strip(input)) return { ok: true };
  for (const v of variants) if (keyOf(input, units(v)) === keyOf(v)) return { ok: true };
  // опечатка в одну букву пиньиня в длинной фразе
  for (const v of variants) {
    const a = keyOf(input, units(v)), b = keyOf(v);
    const d = lev(a, b), swap = d === 2 && [...a].sort().join('') === [...b].sort().join('');
    if (b.length >= 8 && (d === 1 || swap) && !HAN.test(input)) return { ok: true, typo: true };
  }
  return { ok: false };
}

// Сказанное вслух: сколько слов эталона распознано по порядку (LCS по ключам — тоны и омофоны не мешают).
export function speechScore(heard, target) {
  const tu = units(target);
  const hu = units(heard, tu);
  const t = tu.map(u => u.k), h = hu.map(u => u.k);
  const dp = Array.from({ length: t.length + 1 }, () => new Array(h.length + 1).fill(0));
  for (let i = 1; i <= t.length; i++)
    for (let j = 1; j <= h.length; j++)
      dp[i][j] = t[i - 1] === h[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const hit = new Array(t.length).fill(false);
  for (let i = t.length, j = h.length; i > 0 && j > 0;) {
    if (t[i - 1] === h[j - 1]) { hit[i - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
  }
  // слово распознано частично (один слог из двух) — сравним ещё и по слогам, чтобы не быть слишком строгими
  const ts = t.join(''), hs = h.join('');
  const sylScore = ts.length ? 1 - lev(ts, hs) / Math.max(ts.length, hs.length) : 0;
  const lcs = dp[t.length][h.length];
  const score = Math.max(t.length ? lcs / Math.max(t.length, h.length) : 0, sylScore >= 0.9 ? sylScore : 0);
  return { score, hit, t: tu.map(u => u.d) };
}

export const speechOk = (score, n) => score >= (n <= 3 ? 0.99 : n <= 5 ? 0.79 : 0.74);
