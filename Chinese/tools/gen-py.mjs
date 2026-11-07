// Генерирует js/py.js — словарь пиньиня для всех слов курса и таблицу «иероглиф → пиньинь».
// Запуск:  cd Chinese/tools && npm i --no-save pinyin-pro@3 && node gen-py.mjs
// Запускать после любого изменения js/data.js или js/rules.js (проверка: node check-data.mjs).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { LESSONS, MORE } from '../js/data.js';
import { RULES } from '../js/rules.js';

const { pinyin } = createRequire(import.meta.url)('pinyin-pro');
const HAN = /\p{Script=Han}/u;
const CYR = /[а-яё]/i;
const split = s => String(s).replace(/<[^>]+>/g, ' ').replace(/___/g, ' ').split(/[\s，。？！、：；“”「」（）,.?!:;()…+\-—]+/).filter(t => HAN.test(t));

// Лёгкий (нейтральный) тон и эризация — как в словарях, а не как у pinyin-pro по умолчанию.
const FIX = {
  谢谢: 'xiè xie', 朋友: 'péng you', 学生: 'xué sheng', 客气: 'kè qi', 不客气: 'bú kè qi', 关系: 'guān xi', 没关系: 'méi guān xi',
  对不起: 'duì bu qǐ', 月亮: 'yuè liang', 名字: 'míng zi', 晚上: 'wǎn shang', 早上: 'zǎo shang', 时候: 'shí hou', 什么时候: 'shén me shí hou',
  东西: 'dōng xi', 这儿: 'zhèr', 哪儿: 'nǎr', 那儿: 'nàr', 一点儿: 'yì diǎnr', 有意思: 'yǒu yì si', 意思: 'yì si', 知道: 'zhī dao',
  还是: 'hái shi', 进来: 'jìn lai', 外面: 'wài mian', 这个: 'zhè ge', 那个: 'nà ge', 一个: 'yí ge', 学过: 'xué guo', 多了: 'duō le',
  过: 'guo', 了: 'le', 的: 'de', 吗: 'ma', 呢: 'ne', 吧: 'ba', 们: 'men', 上: 'shàng', 里: 'lǐ', 得: 'de', 个: 'gè', 一: 'yī', 不: 'bù',
  俄罗斯人: 'é luó sī rén', 漂亮: 'piào liang', 先生: 'xiān sheng', 衣服: 'yī fu', 便宜: 'pián yi', 喜欢: 'xǐ huan', 认识: 'rèn shi',
  休息: 'xiū xi', 孩子: 'hái zi', 桌子: 'zhuō zi', 大夫: 'dài fu', 哥哥: 'gē ge', 姐姐: 'jiě jie', 妈妈: 'mā ma', 爸爸: 'bà ba',
  拜拜: 'bái bai', 怎么样: 'zěn me yàng', 什么: 'shén me', 怎么: 'zěn me', 为什么: 'wèi shén me', 多少: 'duō shao', 多少钱: 'duō shao qián',
  我们俩: 'wǒ men liǎ', 是不是: 'shì bu shì', 喜不喜欢: 'xǐ bu xǐ huan', 忙不忙: 'máng bu máng', 不用: 'bú yòng', 不要: 'bú yào',
  不想: 'bù xiǎng', 不是: 'bú shì', 只: 'zhī', 都: 'dōu', 还: 'hái', 好: 'hǎo', 长: 'cháng', 行: 'xíng', 乐: 'lè', 觉: 'jiào', 地: 'dì',
};

const strs = { clean: [], extra: [] };
const add = (s, clean = !CYR.test(s)) => (clean ? strs.clean : strs.extra).push(String(s));
for (const L of LESSONS) {
  for (const t of L.theory) {
    if (t[0] === 'ex') add(t[1]);
    else if (t[0] === 't') t[1].flat().forEach(c => add(c, false));
    else add(t[1], false);
  }
  for (const w of L.words) add(w[0]);
  for (const d of L.drills) {
    if (d.q) add(d.q); if (d.g) add(d.g); if (d.ex) add(d.ex, false);
    (d.o || []).forEach(o => add(o)); (Array.isArray(d.a) ? d.a : []).forEach(a => add(a));
  }
  for (const s of L.sents) { add(s[0]); if (s[2]) s[2].split(';').forEach(x => add(x)); }
  (L.distract || []).forEach(x => add(x));
}
for (const k in MORE) for (const s of MORE[k]) { add(s[0]); if (s[2]) s[2].split(';').forEach(x => add(x)); }
for (const r of Object.values(RULES)) { r.ex.forEach(([z]) => add(z)); add(r.text, false); }

const py = t => FIX[t] || pinyin(t, { type: 'array', toneSandhi: false }).join(' ');
const PY = {}, PYX = {};
for (const s of strs.clean) for (const t of split(s)) PY[t] ||= py(t);
for (const s of strs.extra) for (const t of split(s)) if (!PY[t]) PYX[t] ||= py(t);

// Таблица иероглифов: все знаки GB2312 (6763 самых употребительных) + всё, что есть в курсе.
const dec = new TextDecoder('gbk');
const chars = new Set();
for (let a = 0xB0; a <= 0xF7; a++) for (let b = 0xA1; b <= 0xFE; b++) {
  const c = dec.decode(new Uint8Array([a, b]));
  if (HAN.test(c) && c.length === 1) chars.add(c);
}
for (const s of [...strs.clean, ...strs.extra]) for (const c of s) if (HAN.test(c)) chars.add(c);
const bySyl = {};
for (const c of chars) {
  const p = FIX[c] || pinyin(c, { toneSandhi: false });
  if (!p || HAN.test(p)) continue;
  (bySyl[p] ||= []).push(c);
}
const CH = Object.entries(bySyl).map(([p, cs]) => p + cs.join('')).join(' ');

writeFileSync(new URL('../js/py.js', import.meta.url), `// Сгенерировано tools/gen-py.mjs — не редактировать руками.
// PY: слово курса → пиньинь по слогам. PYX: прочие куски текста (только для показа).
// CH: «пиньинь+иероглифы» через пробел — пиньинь любого из ${chars.size} употребительных иероглифов.
export const PY = ${JSON.stringify(PY)};
export const PYX = ${JSON.stringify(PYX)};
export const CH = ${JSON.stringify(CH)};
`);
console.log('words', Object.keys(PY).length, 'extra', Object.keys(PYX).length, 'chars', chars.size, 'bytes', CH.length);
