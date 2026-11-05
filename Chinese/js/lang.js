// Настройки языка курса: китайский. Английская версия этого файла — English/js/lang.js.
import { tilesOf, pyOf, sylsOf, toneOf, HAN, PUNCT as P } from './check.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PUNCT = new RegExp(`(${P.source})`);
const NUM = /^[零一二三四五六七八九十百两]+$/;

// Пиньинь слова с учётом соседей: 不 и 一 меняют тон перед следующим слогом.
function pyIn(tok, prev, next) {
  if (tok === '不' || tok === '一') {
    const nt = next ? toneOf(sylsOf(next)[0]) : 0;
    if (tok === '不') return nt === 4 ? 'bú' : 'bù';
    if (!next || NUM.test(next) || (prev && NUM.test(prev))) return 'yī';
    return nt === 4 ? 'yí' : nt ? 'yì' : 'yī';
  }
  return pyOf(tok);
}
// Тоны раскрашены (как в учебниках): 1 — красный, 2 — зелёный, 3 — синий, 4 — фиолетовый.
const tonePy = (tok, prev, next) => {
  const syl = tok === '不' || tok === '一' ? [pyIn(tok, prev, next)] : sylsOf(tok);
  return syl.map(s => `<i class="t${toneOf(s)}">${esc(s)}</i>`).join('');
};
const ruby = (tok, prev, next) => `<ruby>${esc(tok)}<rt>${tonePy(tok, prev, next)}</rt></ruby>`;

// Текст с пиньинем над словами. Куски без иероглифов (русский текст, ___) — как есть.
function render(s, word) {
  const parts = String(s).split(PUNCT);
  const toks = parts.filter((p, i) => i % 2 === 0 && p && HAN.test(p) && !/[^\p{Script=Han}]/u.test(p));
  const spaced = /[a-zа-яё]/i.test(s); // в русском тексте и пиньине пробелы оставляем
  let k = 0, n = 0;
  return parts.map((p, i) => {
    if (i % 2) return esc(spaced ? p : p.replace(/\s+/g, ''));
    if (!p) return '';
    if (!HAN.test(p) || /[^\p{Script=Han}]/u.test(p)) {
      // смешанный кусок: иероглифы внутри русского текста
      if (!HAN.test(p)) { n += tilesOf(p).length; return esc(p); }
      return p.split(/(\p{Script=Han}+)/u).map(x => HAN.test(x) ? ruby(x) : esc(x)).join('');
    }
    const j = toks.indexOf(p, k); k = j + 1;
    const html = ruby(p, toks[j - 1], toks[j + 1]);
    return word ? word(html, n++) : html;
  }).join('');
}

export const LANG = {
  code: 'zh',
  key: 'chinese-course-v1',
  file: 'chinese',
  na: 'на китайский',
  po: 'по-китайски',
  tts: 'zh-CN',
  sr: 'zh-CN',
  // путунхуа: zh-CN / zh-TW / cmn; кантонский (zh-HK, yue) — не подходит
  voiceRe: /^(zh|cmn)(?![-_](HK|MO))/i,
  voiceBad: /yue|cantonese|粤|HK/i,
  region: /zh[-_](CN|Hans)/i,
  voiceNames: /xiaoxiao|xiaoyi|yunxi|yunjian|yunyang|xiaochen|xiaohan|tingting|lili|yu-shu|meijia|huihui|yaoyao|kangkang|普通话|mandarin/i,
  hello: '你好！我是你的中文老师。我们一起学习吧！',
  placeholder: 'Пиньинь (ni hao) или иероглифы…',
  say: s => String(s).replace(/\s+/g, ''),
  // фраза, где каждое слово можно нажать; mark — классы по индексу слова
  tap: (s, mark = {}) => `<span class="tap zh" data-s="${esc(s)}">${render(s, (html, i) => `<span class="w ${mark[i] || ''}" data-i="${i}">${html}</span>`)}</span>`,
  show: s => `<span class="zh">${render(s)}</span>`,
  voiceHint(ua) {
    if (/iPhone|iPad|Mac/.test(ua)) return 'На iPhone / Mac: Настройки → Универсальный доступ → Устный контент → Голоса → Китайский (материковый Китай) → скачай «Tingting (улучшенный)» или «Lili», затем выбери его здесь.';
    if (/Android/.test(ua)) return 'На Android: Настройки → Синтез речи → Google → Установить голосовые данные → 中文 (中国) — голос «высокого качества».';
    if (/Edg\//.test(ua)) return 'В Edge есть очень живые голоса «Natural» — Xiaoxiao или Yunxi.';
    return 'Самые живые китайские голоса — в Edge (Xiaoxiao, Yunxi Natural) и в Chrome (Google 普通话).';
  },
  noVoice: 'Китайского голоса на устройстве нет — установи его (подсказка ниже), иначе фразы не озвучатся.',
};
