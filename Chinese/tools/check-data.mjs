// Проверка материала курса: node check-data.mjs (после gen-py.mjs).
import { LESSONS, MORE, UNITS } from '../js/data.js';
import { PY } from '../js/py.js';
import { checkText, tilesOf, speechScore } from '../js/check.js';
import { RULES } from '../js/rules.js';
let bad = 0;
const err = (...a) => { bad++; console.log('✗', ...a); };
const ids = new Set();
for (const L of LESSONS) {
  if (ids.has(L.id)) err('дубль id', L.id); ids.add(L.id);
  if (!UNITS.find(u => u.id === L.unit)) err(L.id, 'нет юнита');
  if (L.words.length < 6) err(L.id, 'мало слов');
  for (const d of L.drills) {
    if (d.o && !(d.a >= 0 && d.a < d.o.length)) err(L.id, 'ответ вне вариантов', d.q);
    if (d.g && !d.g.includes('___')) err(L.id, 'нет ___', d.g);
  }
  for (const [zh, ru, alts] of [...L.sents, ...(MORE[L.id] || [])]) {
    for (const t of tilesOf(zh)) if (!PY[t]) err(L.id, 'нет пиньиня', t, 'в', zh);
    if (!checkText(zh, [zh]).ok) err(L.id, 'не проходит сам себя', zh);
    if (!checkText(zh.replace(/\s/g, ''), [zh]).ok) err(L.id, 'иероглифы без пробелов не проходят', zh);
    if (speechScore(zh.replace(/\s/g, ''), zh).score < 1) err(L.id, 'распознавание', zh);
    for (const a of (alts || '').split(';').filter(Boolean)) if (!checkText(a, [a]).ok) err(L.id, 'альтернатива', a);
    if (!ru) err(L.id, 'нет перевода', zh);
  }
  if (!MORE[L.id]) err(L.id, 'нет MORE');
}
for (const k in MORE) if (!ids.has(k)) err('MORE без урока', k);
console.log(LESSONS.length, 'уроков,', Object.keys(RULES).length, 'правил,', bad ? bad + ' ошибок' : 'всё в порядке');
process.exit(bad ? 1 : 0);
