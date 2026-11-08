// Разбор ошибки в китайском: выравниваем ответ с эталоном по словам (в ключах пиньиня),
// находим типичные ошибки русскоговорящих и подбираем правило с примерами.
import { units, pyOf, hanOfKey, HAN } from './check.js';
export { RULES } from './rules.js';

const MEASURE = new Set(['个', '本', '杯', '只', '张', '次', '位', '件']);
const QW = new Set(['什么', '谁', '哪儿', '哪里', '哪', '几', '多少', '什么时候', '为什么', '怎么', '多大', '多少钱']);
const TIME = new Set(['今天', '明天', '昨天', '现在', '每天', '早上', '晚上', '星期一', '星期天', '星期六', '星期', '点', '什么时候', '八点', '三点']);
const PLACE = new Set(['家', '学校', '银行', '医院', '公司', '公园', '北京', '上海', '中国', '商店', '房间', '哪儿', '这儿', '外面']);
const MODAL = new Set(['想', '要', '会', '能', '可以']);
const NEG = new Set(['不', '没', '没有']);

const zp = w => `<b>${w}</b> ${pyOf(w)}`;

function align(u, t) {
  const dp = Array.from({ length: u.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = u.length - 1; i >= 0; i--)
    for (let j = t.length - 1; j >= 0; j--)
      dp[i][j] = u[i].k === t[j].k ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < u.length || j < t.length) {
    if (i < u.length && j < t.length && u[i].k === t[j].k) { ops.push({ op: 'eq', u: u[i].d, t: t[j].d, ti: j }); i++; j++; }
    else if (j < t.length && (i >= u.length || dp[i][j + 1] >= dp[i + 1][j])) { ops.push({ op: 'miss', t: t[j].d, ti: j }); j++; }
    else { ops.push({ op: 'extra', u: u[i].d, uk: u[i].k }); i++; }
  }
  const out = [];
  for (let k = 0; k < ops.length; k++) {
    const a = ops[k], b = ops[k + 1];
    if (b && ((a.op === 'miss' && b.op === 'extra') || (a.op === 'extra' && b.op === 'miss'))) {
      const m = a.op === 'miss' ? a : b, e = a.op === 'extra' ? a : b;
      out.push({ op: 'sub', u: e.u, uk: e.uk, t: m.t, ti: m.ti }); k++;
    } else out.push(a);
  }
  return { ops: out, lcs: dp[0][0] };
}

// Пользователь мог написать пиньинем — узнаём, какое это слово курса (по ключу).
const asHan = (o, tu) => HAN.test(o.u) ? o.u : tu.find(x => x.k === o.uk)?.d || hanOfKey(o.uk) || o.u;

export function explain(user, variants) {
  let best = null;
  for (const v of variants) {
    const tu = units(v), uu = units(user, tu);
    const a = align(uu, tu);
    const score = a.lcs / Math.max(tu.length, 1);
    if (!best || score > best.score) best = { ...a, tu, uu, v, score };
  }
  const { ops, tu, uu } = best;
  const T = tu.map(x => x.d), U = uu.map(x => x.d);
  const points = [], rules = new Set();
  const add = (rule, text) => { if (rule) rules.add(rule); if (text && !points.includes(text)) points.push(text); };
  if (!uu.length) return { ops, points: ['Ответ пустой.'], rules: [] };
  const has = (arr, set) => arr.some(x => set.has ? set.has(x) : x === set);
  const tHasQ = has(T, QW) || T.includes('还是') || T.some((x, i) => T[i + 1] === '不' && T[i + 2] === x) || T.includes('是不是');

  // те же слова в другом порядке
  const sorted = a => a.map(x => x.k).sort().join(' ');
  if (sorted(uu) === sorted(tu) && uu.map(x => x.k).join(' ') !== tu.map(x => x.k).join(' ')) {
    const moved = tu.filter((x, i) => uu.findIndex(y => y.k === x.k) !== i).map(x => x.d);
    if (moved.some(x => TIME.has(x))) add('time_order', 'Слова верные, но время стоит не там: оно идёт <b>перед глаголом</b> (или в самом начале).');
    else if (moved.includes('在') || moved.some(x => PLACE.has(x))) add('zai_place', 'Слова верные, но <b>在 + место</b> должно стоять перед глаголом.');
    else if (moved.some(x => QW.has(x))) add('qword', 'Вопросительное слово не переносят в начало — оно стоит на месте ответа.');
    else if (moved.some(x => x === '也' || x === '都')) add('ye_dou', '<b>也 / 都</b> ставятся прямо перед глаголом.');
    else if (moved.includes('跟') || moved.includes('和') || moved.includes('一起')) add('order', '«С кем» и «вместе» стоят перед глаголом.');
    else if (moved.includes('的')) add('de', 'Сначала чей, потом что: владелец + 的 + вещь.');
    else add('order', 'Все слова верные, но порядок другой. Формула: кто — когда — где — делает — что.');
    return { ops, points, rules: [...rules], target: best.v };
  }

  for (const o of ops.filter(o => o.op === 'miss')) {
    const w = o.t;
    if (w === '很') add(U.includes('是') ? 'shi_adj' : 'hen', U.includes('是') ? 'Перед прилагательным нужно <b>很</b>, а не 是.' : `Пропущена связка ${zp('很')} перед прилагательным.`);
    else if (w === '是') add('shi', `Пропущен глагол ${zp('是')}: «кто — кто» связывают через 是.`);
    else if (w === '吗') add('ma', `Это вопрос «да / нет» — в конце нужно ${zp('吗')}.`);
    else if (w === '的') add('de', `Пропущено ${zp('的')} — «чей».`);
    else if (MEASURE.has(w)) add('measure', `Между числом (или 这 / 那) и предметом нужно счётное слово ${zp(w)}.`);
    else if (w === '了') add('le', `Действие совершилось — нужно ${zp('了')}.`);
    else if (w === '过') add('guo', `Это про опыт («бывал, пробовал») — нужно ${zp('过')}.`);
    else if (w === '在') add(PLACE.has(T[o.ti + 1]) ? 'zai' : 'zai_prog', PLACE.has(T[o.ti + 1]) ? `Нужно ${zp('在')} — «находиться в».` : `Действие идёт сейчас — нужно ${zp('在')} перед глаголом.`);
    else if (w === '也' || w === '都') add('ye_dou', `Пропущено ${zp(w)}.`);
    else if (w === '比') add('bi', `Сравнение строится с ${zp('比')}.`);
    else if (w === '岁') add('age', `Возраст: число + ${zp('岁')}.`);
    else if (NEG.has(w)) add('bu_mei', `Пропущено отрицание ${zp(w)}.`);
    else if (QW.has(w)) add('qword', `Нужно вопросительное слово ${zp(w)}.`);
    else if (MODAL.has(w)) add('modal', `Нужно ${zp(w)} перед глаголом.`);
    else if (w === '们') add(null, `Пропущено ${zp('们')} — тут «много людей».`);
    else add(null, `Пропущено слово ${zp(w)}.`);
  }

  for (const o of ops.filter(o => o.op === 'extra')) {
    const w = asHan(o, tu);
    if (w === '有' && (T.includes('没有') || T.includes('没'))) add('mei_you', null);
    else if (w === '是' && T.includes('很')) add('shi_adj', 'Лишнее <b>是</b>: перед прилагательным ставят 很, а не 是.');
    else if (w === '是' && T.includes('岁')) add('age', 'Лишнее <b>是</b>: возраст говорят без него — 我二十岁.');
    else if (w === '吗' && tHasQ) add('ma_extra', 'Лишнее <b>吗</b>: в вопросе уже есть вопросительное слово или выбор — 吗 не нужен.');
    else if (w === '很' && T.includes('比')) add('bi', 'Лишнее <b>很</b>: с 比 его не ставят.');
    else if (w === '很' && (T.includes('不') || T.includes('吗'))) add('hen', 'Лишнее <b>很</b>: с 不 и в вопросе с 吗 связка не нужна.');
    else if (w === '了' && (T.includes('没') || T.includes('没有'))) add('le', 'Лишнее <b>了</b>: после 没 его убирают — 我没吃.');
    else if (w === '了' && T.includes('过')) add('guo', 'Лишнее <b>了</b>: опыт выражает 过.');
    else if (w === '的') add('de', 'Лишнее <b>的</b>.');
    else if (MEASURE.has(w)) add('measure', `Лишнее счётное слово <b>${w}</b>.`);
    else add(null, `Лишнее слово <b>${w}</b>.`);
  }

  for (const o of ops.filter(o => o.op === 'sub')) {
    const x = asHan(o, tu), y = o.t;
    const pair = (a, b) => (x === a && y === b) || (x === b && y === a);
    if (x === '不' && (y === '没' || y === '没有') && T[o.ti + 1] === '有' || x === '不' && y === '没有') add('mei_you', `<b>有</b> отрицается только через 没: ${zp('没有')}.`);
    else if (NEG.has(x) && NEG.has(y)) add('bu_mei', y === '不' ? `Нужно ${zp('不')}: это «не» сейчас / вообще, а не «не сделал».` : `Нужно ${zp(y)}: ${T.includes('有') ? 'отрицание к 有' : 'действие не совершилось (в прошлом)'}.`);
    else if (pair('二', '两')) add('liang', `Перед счётным словом — ${zp('两')}, в числах — 二.`);
    else if (MEASURE.has(x) && MEASURE.has(y)) add('measure', `Счётное слово здесь — ${zp(y)}, а не ${x}.`);
    else if (pair('是', '很')) add('shi_adj', y === '很' ? 'Перед прилагательным — <b>很</b>, а не 是.' : 'Между двумя существительными — <b>是</b>, а не 很.');
    else if ((x === '是' || x === '有') && y === '在') add('zai', `«Находиться где-то» — ${zp('在')}.`);
    else if (pair('是', '有')) add(y === '有' ? 'mei_you' : 'shi', y === '有' ? `«У кого-то есть / где-то есть» — ${zp('有')}.` : `«Кто — кто» — ${zp('是')}.`);
    else if (['这', '那', '哪'].includes(x) && ['这', '那', '哪'].includes(y)) add('zhe_na', `${zp(y)}, а не ${x} ${pyOf(x)}.`);
    else if (pair('还是', '或者') || (x === '和' && y === '还是')) add('haishi', `В вопросе с выбором «или» — ${zp('还是')}.`);
    else if (MODAL.has(x) && MODAL.has(y)) add('modal', y === '会' ? `Умение (научился) — ${zp('会')}.` : y === '能' ? `Возможность — ${zp('能')}.` : y === '可以' ? `Разрешение — ${zp('可以')}.` : `Здесь — ${zp(y)}.`);
    else if (pair('了', '过')) add('guo', y === '过' ? `Опыт («бывал, пробовал») — ${zp('过')}.` : `Конкретное совершённое действие — ${zp('了')}.`);
    else if (pair('吗', '呢')) add(y === '呢' ? 'ne' : 'ma', y === '呢' ? `«А ты?» — ${zp('呢')}.` : `Вопрос «да / нет» — ${zp('吗')}.`);
    else if (pair('也', '都') || pair('和', '也')) add('ye_dou', `${zp(y)}, а не ${x}.`);
    else if (QW.has(x) && QW.has(y)) add('qword', `Здесь нужно ${zp(y)}, а не ${x}.`);
    else if (pair('他', '她') || pair('的', '得')) add(null, `${zp(y)} (звучит так же, но пишется иначе).`);
    else add(null, `${zp(y)}, а не «${x}».`);
  }
  if (!points.length && best.score < 1) add(null, 'Сравни с правильным вариантом ниже.');
  return { ops, points, rules: [...rules], target: best.v, low: best.score < 0.5 && tu.length > 2 };
}

export const explainWord = (user, right) => explain(user, [right]);
