// Имя героя (сборка 73): проверка при создании персонажа — длина, допустимые знаки и фильтр мата (русский и английский).
// Обходы ловятся: латиница вместо кириллицы и наоборот (xyй, пиzда, fuсk), цифры (3ае6ал, f4ck, sh1t), повторы букв (хууууй),
// пробелы, точки, дефисы между буквами (х.у.й, f-u-c-k), транслит (blyat, pizdec, nahui).
export const NAME_MIN = 2, NAME_MAX = 16;
import { CYR, LAT, PART, WHOLE } from '../data/badwords.js';

const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const alts = ch => { const m = CYR[ch] || LAT[ch]; return m ? [ch, ...m] : [ch]; };
const group = list => '(?:' + [...new Set(list)].sort((a, b) => b.length - a.length).map(reEsc).join('|') + ')';
// корень → регулярка: каждая буква — «она или её замены, сколько угодно раз подряд»; [абв] — любая из букв; ^ $ ( ) | ? — как есть
function R(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '[') { const j = src.indexOf(']', i); out += group([...src.slice(i + 1, j)].flatMap(alts)) + '+'; i = j; }
    else if ('^$()|?'.includes(c)) out += c;
    else out += group(alts(c)) + '+';
  }
  return out;
}
const PART_RE = PART.map(p => new RegExp(R(p)));
const WHOLE_RE = new RegExp('^(?:' + WHOLE.map(R).join('|') + ')$');

// приводит к виду для проверки: нижний регистр, ё→е, без пробелов, точек, дефисов и т. п. (но цифры и @$! остаются — это замены букв)
const squash = s => s.toLowerCase().replace(/ё/g, String.fromCharCode(1077)).replace(/[^\p{L}\p{N}@$!|'"+(]/gu, '');
export function isProfane(name) {
  const s = String(name || '');
  const all = squash(s); if (!all) return false;
  if (PART_RE.some(re => re.test(all))) return true;
  const words = s.split(/[\s\-_.,]+/).map(squash).filter(Boolean);
  return [all, ...words].some(w => WHOLE_RE.test(w));
}
// пробелы по краям и двойные — убрать
export const cleanName = s => String(s || '').replace(/\s+/g, ' ').trim();
// null — имя годится, иначе текст причины
export function nameProblem(raw) {
  const s = cleanName(raw);
  if (!s) return 'Введите имя';
  if ([...s].length < NAME_MIN) return `Имя — от ${NAME_MIN} букв`;
  if ([...s].length > NAME_MAX) return `Имя — не длиннее ${NAME_MAX} знаков`;
  if (!/^[\p{L}\p{M}\p{N} '\-]+$/u.test(s)) return 'Только буквы, цифры, пробел и дефис';
  if (!/\p{L}/u.test(s)) return 'В имени нужна хотя бы одна буква';
  if (isProfane(s)) return 'Такое имя нельзя: выберите другое';
  return null;
}
