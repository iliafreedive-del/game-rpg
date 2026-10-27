// Разбор ошибки: сравниваем ответ с правильным по словам, находим типичные ошибки и подбираем правило с примерами.
import { words } from './check.js';

export const RULES = {
  subject: {
    title: 'Нужно подлежащее (кто / что)',
    text: 'В английском у каждого предложения есть подлежащее. Где по-русски его нет — «Холодно», «Поздно», «Идёт дождь» — ставят формальное <b>It</b>. Без него фраза звучит как обрывок.',
    ex: [['It is cold.', 'Холодно.'], ['It is late.', 'Поздно.'], ['It is raining.', 'Идёт дождь.']],
  },
  subject_pron: {
    title: 'Без «кто» нельзя: I, you, he, she…',
    text: 'По-русски подлежащее часто опускают: «Не уверен», «Работаю», «Устал». В английском так нельзя — <b>подлежащее есть всегда</b>: I am not sure, I work, I am tired.',
    ex: [['I am not sure.', 'Не уверен.'], ['I work at home.', 'Работаю дома.'], ['She is tired.', 'Устала.']],
  },
  there: {
    title: 'There is / There are',
    text: 'Когда сообщаем, что что-то где-то <b>есть</b>, начинаем с There is (одно) / There are (много). Место — в конце.',
    ex: [['There is a table in the room.', 'В комнате есть стол.'], ['There are two cats.', 'Есть две кошки.']],
  },
  be_missing: {
    title: 'Нет глагола: нужен am / is / are',
    text: 'В английском предложении обязан быть глагол. Если действия нет («Я студент», «Она дома», «Холодно»), ставим глагол to be: <b>am / is / are</b> (в прошлом <b>was / were</b>).',
    ex: [['I am a student.', 'Я студент.'], ['She is at home.', 'Она дома.'], ['We were tired.', 'Мы устали.']],
  },
  be_form: {
    title: 'Форма am / is / are зависит от «кто»',
    text: '<b>I → am</b>; <b>he / she / it</b> и один предмет → <b>is</b>; <b>you / we / they</b> и много предметов → <b>are</b>. В прошлом: I / he / she / it → <b>was</b>, you / we / they → <b>were</b>.',
    ex: [['I am tired.', 'Я устал.'], ['She is a doctor.', 'Она врач.'], ['They are friends.', 'Они друзья.']],
  },
  be_extra: {
    title: 'am / is / are не ставят перед обычным глаголом',
    text: 'Либо to be + кто/какой (I am tired), либо просто глагол (I work). «I am work» — ошибка. Если действие прямо сейчас — am / is / are + глагол с <b>-ing</b>.',
    ex: [['I work every day.', 'Я работаю каждый день.'], ['I am working now.', 'Я сейчас работаю.'], ['I am tired.', 'Я устал.']],
  },
  third_s: {
    title: 'He / she / it → глагол с -s',
    text: 'В настоящем времени с <b>he / she / it</b> (и с одним человеком: Tom, my mom) к глаголу добавляют <b>-s</b>: works, goes, watches, studies, has.',
    ex: [['She works every day.', 'Она работает каждый день.'], ['He goes to school.', 'Он ходит в школу.'], ['My mom has a car.', 'У мамы есть машина.']],
  },
  no_s: {
    title: '-s только для he / she / it',
    text: 'С <b>I / you / we / they</b> глагол без окончания: I work, they live, we like.',
    ex: [['I work at home.', 'Я работаю дома.'], ['They live in Moscow.', 'Они живут в Москве.']],
  },
  bare: {
    title: 'После do / does / did, can, will, to — начальная форма',
    text: 'Время и лицо уже «сидят» в помощнике, поэтому сам глагол — без -s, без -ed и без второй формы.',
    ex: [['She doesn\'t like coffee.', 'Она не любит кофе.'], ['Did you see the film?', 'Ты посмотрел фильм?'], ['He can swim.', 'Он умеет плавать.']],
  },
  modal_to: {
    title: 'После can / must / should — без to',
    text: '<b>can, must, should, will</b> + глагол сразу: I can swim (не can to swim). Но <b>have to</b> и <b>going to</b> — с to.',
    ex: [['I can swim.', 'Я умею плавать.'], ['You should rest.', 'Тебе стоит отдохнуть.'], ['I have to go.', 'Мне надо идти.']],
  },
  article: {
    title: 'Артикли a / an / the',
    text: 'Перед существительным в единственном числе нужен артикль: <b>a / an</b> — какой-то, один из (впервые, профессия); <b>the</b> — конкретный, известный обоим. Во множественном и перед именами a / an не ставится.',
    ex: [['I have a dog. The dog is big.', 'У меня собака. Собака большая.'], ['He is an engineer.', 'Он инженер.']],
  },
  an_vowel: {
    title: 'a или an',
    text: '<b>an</b> — перед гласным <i>звуком</i> (an apple, an engineer, an hour), <b>a</b> — перед согласным (a book, a car).',
    ex: [['It is an apple.', 'Это яблоко.'], ['This is a book.', 'Это книга.']],
  },
  aux_do: {
    title: 'Вопрос и «не» — через do / does / did',
    text: 'С обычными глаголами вопрос и отрицание строят с помощником: <b>do / does</b> (настоящее), <b>did</b> (прошлое). Просто «not» или интонация не работают.',
    ex: [['Do you like coffee?', 'Ты любишь кофе?'], ['I don\'t know.', 'Я не знаю.'], ['Did you call her?', 'Ты ей звонил?']],
  },
  do_does: {
    title: 'do или does',
    text: '<b>does / doesn\'t</b> — для he / she / it, <b>do / don\'t</b> — для I / you / we / they.',
    ex: [['Does she work here?', 'Она здесь работает?'], ['Do they live here?', 'Они здесь живут?'], ['He doesn\'t smoke.', 'Он не курит.']],
  },
  question: {
    title: 'В вопросе помощник идёт первым',
    text: 'По-русски вопрос — это интонация. В английском <b>меняется порядок</b>: am / is / are, do / does / did, can, will выходят перед подлежащим. Вопросительное слово — в самое начало.',
    ex: [['Are you ready?', 'Ты готов?'], ['Where do you live?', 'Где ты живёшь?'], ['Can you help me?', 'Ты можешь помочь?']],
  },
  freq: {
    title: 'Где стоят always, never, often…',
    text: '<b>Перед</b> обычным глаголом (I always drink tea), но <b>после</b> am / is / are (She is always late).',
    ex: [['I always drink tea.', 'Я всегда пью чай.'], ['She is always late.', 'Она всегда опаздывает.']],
  },
  order: {
    title: 'Порядок слов жёсткий',
    text: '<b>Кто → делает → что → где → когда.</b> По-русски слова можно переставлять, а в английском от порядка зависит смысл. Прилагательное — перед существительным (a new car).',
    ex: [['I drink coffee at home in the morning.', 'Утром я пью кофе дома.'], ['He has a new car.', 'У него новая машина.']],
  },
  irregular: {
    title: 'Неправильный глагол',
    text: 'У неправильных глаголов своя форма прошедшего, -ed к ним не добавляют: go → <b>went</b>, see → <b>saw</b>, buy → <b>bought</b>, eat → <b>ate</b>, make → <b>made</b>.',
    ex: [['I went to the shop.', 'Я сходил в магазин.'], ['She saw a big dog.', 'Она увидела большую собаку.']],
  },
  past: {
    title: 'Прошлое время: глагол меняется',
    text: 'Если действие было в прошлом, глагол ставят в прошедшую форму: правильные + <b>-ed</b> (worked, called), неправильные — особая форма (went, had). Одна форма для всех лиц.',
    ex: [['I worked yesterday.', 'Я работал вчера.'], ['We had dinner at home.', 'Мы поужинали дома.']],
  },
  continuous: {
    title: 'Прямо сейчас: am / is / are + -ing',
    text: 'Действие, которое идёт в момент речи: <b>am / is / are + глагол-ing</b>. Простая форма (I work) — про привычки и факты.',
    ex: [['I am working now.', 'Я сейчас работаю.'], ['It is raining.', 'Идёт дождь.']],
  },
  future: {
    title: 'Будущее: will / going to',
    text: '<b>will + глагол</b> — решение сейчас, обещание, прогноз. <b>am / is / are going to + глагол</b> — уже есть план.',
    ex: [['I will help you.', 'Я тебе помогу.'], ['I am going to buy a car.', 'Я собираюсь купить машину.']],
  },
  prep: {
    title: 'in / on / at',
    text: 'Место: <b>in</b> — внутри (in the box, in Moscow), <b>on</b> — на поверхности (on the table), <b>at</b> — в точке (at home, at work). Время: <b>at</b> 7 o\'clock, <b>on</b> Monday, <b>in</b> May / in the morning.',
    ex: [['The keys are on the table.', 'Ключи на столе.'], ['I am at work.', 'Я на работе.'], ['We meet on Monday.', 'Мы встречаемся в понедельник.']],
  },
  this: {
    title: 'this / that / these / those',
    text: 'Рядом: <b>this</b> (этот) → <b>these</b> (эти). Далеко: <b>that</b> (тот) → <b>those</b> (те). После these / those — множественное число и are.',
    ex: [['This is my phone.', 'Это мой телефон.'], ['These are my keys.', 'Это мои ключи.']],
  },
  possessive: {
    title: 'Чей: my / your / his / her / our / their',
    text: '<b>his</b> — его, <b>her</b> — её, <b>their</b> — их (не путай с <b>there</b> — «там» и <b>they</b> — «они»). Мой — <b>my</b>, а не I / me.',
    ex: [['His name is Tom.', 'Его зовут Том.'], ['Their son lives in London.', 'Их сын живёт в Лондоне.']],
  },
  have: {
    title: '«У меня есть» = I have',
    text: 'По-английски не «у меня есть», а «я имею»: <b>I have</b>, с he / she / it — <b>has</b>. Нет — <b>don\'t / doesn\'t have</b>.',
    ex: [['I have a brother.', 'У меня есть брат.'], ['She has two children.', 'У неё двое детей.']],
  },
  compare: {
    title: 'Сравнение: -er / more, than',
    text: 'Короткие слова: + <b>-er</b> (bigger), длинные: <b>more</b> + слово (more interesting). «Чем» — <b>than</b>. Исключения: good → better, bad → worse.',
    ex: [['Moscow is bigger than London.', 'Москва больше Лондона.'], ['This book is more interesting.', 'Эта книга интереснее.']],
  },
};

const PRON = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const BE = new Set(['am', 'is', 'are', 'was', 'were']);
const AUX = new Set(['am', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'will', 'should', 'must', 'have', 'has']);
const DO = new Set(['do', 'does', 'did']);
const MODAL = new Set(['can', 'could', 'must', 'should', 'will', 'would']);
const ART = new Set(['a', 'an', 'the']);
const PREP = new Set(['in', 'on', 'at', 'under', 'to', 'for', 'of', 'next', 'from']);
const FREQ = new Set(['always', 'usually', 'often', 'sometimes', 'never']);
const DEM = new Set(['this', 'that', 'these', 'those']);
const POSS = new Set(['my', 'your', 'his', 'her', 'its', 'our', 'their', 'there', 'they', 'he', 'she', 'i', 'me']);
const IRR = {
  go: 'went', have: 'had', do: 'did', see: 'saw', come: 'came', buy: 'bought', eat: 'ate', take: 'took', make: 'made',
  meet: 'met', say: 'said', get: 'got', forget: 'forgot', leave: 'left', tell: 'told', think: 'thought', know: 'knew',
  give: 'gave', find: 'found', drink: 'drank', write: 'wrote', run: 'ran', swim: 'swam', sleep: 'slept', bring: 'brought',
  lose: 'lost', can: 'could', is: 'was', are: 'were', am: 'was',
};
const PAST2BASE = Object.fromEntries(Object.entries(IRR).map(([a, b]) => [b, a]));

const sForm = w => /(s|sh|ch|x|o)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w === 'have' ? 'has' : w + 's';
const edForm = w => /e$/.test(w) ? w + 'd' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ied' : w + 'ed';
const baseOf = w => {
  if (PAST2BASE[w]) return PAST2BASE[w];
  if (w === 'has') return 'have';
  if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (/(ss|sh|ch|x|o)es$/.test(w)) return w.slice(0, -2);
  if (/ied$/.test(w)) return w.slice(0, -3) + 'y';
  if (/ed$/.test(w)) return w.slice(0, -2);
  if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
  return w;
};
const sameBase = (a, b) => {
  const x = baseOf(a), y = baseOf(b);
  return x === y || x + 'e' === y || x === y + 'e' || x.replace(/(.)\1$/, '$1') === y || x === y.replace(/(.)\1$/, '$1');
};

// Выравнивание по LCS: какие слова совпали, какие пропущены, какие лишние, какие заменены.
function align(u, t) {
  const dp = Array.from({ length: u.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = u.length - 1; i >= 0; i--)
    for (let j = t.length - 1; j >= 0; j--)
      dp[i][j] = u[i] === t[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < u.length || j < t.length) {
    if (i < u.length && j < t.length && u[i] === t[j]) { ops.push({ op: 'eq', u: u[i], t: t[j], ti: j }); i++; j++; }
    else if (j < t.length && (i >= u.length || dp[i][j + 1] >= dp[i + 1][j])) { ops.push({ op: 'miss', t: t[j], ti: j }); j++; }
    else { ops.push({ op: 'extra', u: u[i] }); i++; }
  }
  // соседние «пропущено + лишнее» — это замена одного слова другим
  const out = [];
  for (let k = 0; k < ops.length; k++) {
    const a = ops[k], b = ops[k + 1];
    if (b && ((a.op === 'miss' && b.op === 'extra') || (a.op === 'extra' && b.op === 'miss'))) {
      const m = a.op === 'miss' ? a : b, e = a.op === 'extra' ? a : b;
      out.push({ op: 'sub', u: e.u, t: m.t, ti: m.ti }); k++;
    } else out.push(a);
  }
  return { ops: out, lcs: dp[0][0] };
}

function subjectOf(t, ti) {
  for (let k = ti - 1; k >= 0; k--) if (PRON.has(t[k]) || /^(tom|anna|mom|people|children)$/.test(t[k])) return t[k];
  for (let k = ti + 1; k < t.length; k++) if (PRON.has(t[k])) return t[k];
  return null;
}
const beFor = s => s === 'i' ? 'am' : ['you', 'we', 'they', 'people', 'children'].includes(s) ? 'are' : 'is';

// user, variants — строки. Возвращает {diffU, diffT, points, rules}.
export function explain(user, variants) {
  const u = words(user);
  let best = null;
  for (const v of variants) {
    const t = words(v);
    const a = align(u, t);
    if (!best || a.lcs / Math.max(t.length, 1) > best.score) best = { ...a, t, v, score: a.lcs / Math.max(t.length, 1) };
  }
  const { ops, t } = best;
  const points = [], rules = new Set();
  const add = (rule, text) => { if (rule) rules.add(rule); if (text && !points.includes(text)) points.push(text); };
  const miss = ops.filter(o => o.op === 'miss'), extra = ops.filter(o => o.op === 'extra'), subs = ops.filter(o => o.op === 'sub');
  const isQ = /\?\s*$/.test(best.v);
  const sorted = a => [...a].sort().join(' ');

  if (!u.length) return { ops, points: ['Ответ пустой.'], rules: [] };

  // те же слова, другой порядок
  if (sorted(u) === sorted(t) && u.join(' ') !== t.join(' ')) {
    if (isQ && AUX.has(t[0]) || (isQ && AUX.has(t[1]) && /^(what|where|when|why|how|who)$/.test(t[0]))) {
      add('question', 'Слова верные, но это вопрос: помощник (' + (AUX.has(t[0]) ? t[0] : t[1]) + ') должен стоять перед подлежащим.');
    } else if ([...FREQ].some(f => u.includes(f) && u.indexOf(f) !== t.indexOf(f))) {
      add('freq', 'Слова верные, но always / never / often стоят в другом месте.');
    } else add('order', 'Все слова верные, но порядок другой.');
    return { ops: align(u, t).ops, points, rules: [...rules], target: best.v };
  }

  for (const o of miss) {
    const w = o.t;
    if (w === 'it' && o.ti === 0 || (w === 'it' && isQ && o.ti === 1)) add('subject', '«Холодно», «Поздно» — по-русски без подлежащего, а в английском нужно <b>It</b>.');
    else if (w === 'there') add('there', 'Нужно начать с <b>There</b>: There is / There are.');
    else if (PRON.has(w) && (o.ti === 0 || (isQ && o.ti <= 2))) add('subject_pron', `Пропущено подлежащее <b>${w}</b> — кто делает действие.`);
    else if (BE.has(w) && !u.some(x => BE.has(x))) {
      const nextIng = /ing$/.test(t[o.ti + 1] || '');
      add(nextIng ? 'continuous' : 'be_missing', nextIng ? `Нужен <b>${w}</b> перед глаголом с -ing.` : `Пропущен глагол <b>${w}</b>: без него в английском предложения нет.`);
    }
    else if (ART.has(w)) add('article', `Пропущен артикль <b>${w}</b>.`);
    else if (DO.has(w) || w === 'not' && DO.has(t[o.ti - 1])) add('aux_do', `Нужен помощник <b>${w}</b>.`);
    else if (w === 'will') add('future', 'Это будущее — нужен <b>will</b>.');
    else if (w === 'going' || (w === 'to' && t[o.ti - 1] === 'going')) add('future', 'План на будущее: <b>going to</b> + глагол.');
    else if (w === 'than') add('compare', 'В сравнении нужно <b>than</b> (чем).');
    else if (w === 'more' || w === 'most') add('compare', `Для длинных прилагательных нужно <b>${w}</b>.`);
    else if (PREP.has(w)) add('prep', `Пропущен предлог <b>${w}</b>.`);
    else if (w === 'not') add(null, 'Пропущено <b>not</b> — фраза отрицательная.');
    else if (w === 'have' || w === 'has') add('have', `«У меня есть» = <b>${w}</b>.`);
    else add(null, `Пропущено слово <b>${w}</b>.`);
  }

  for (const o of extra) {
    const w = o.u;
    if (BE.has(w) && !t.some(x => BE.has(x))) add('be_extra', `Лишнее <b>${w}</b>: перед обычным глаголом am / is / are не ставят.`);
    else if (BE.has(w)) add('be_form', `Лишнее <b>${w}</b>.`);
    else if (ART.has(w)) add('article', `Лишний артикль <b>${w}</b>${t.includes('children') || t.includes('people') ? ' — во множественном числе a / an не ставят' : ''}.`);
    else if (w === 'to' && MODAL.has(u[u.indexOf('to') - 1])) add('modal_to', `После <b>${u[u.indexOf('to') - 1]}</b> не нужно to.`);
    else if (DO.has(w)) add('aux_do', `Лишнее <b>${w}</b>${t.some(x => BE.has(x)) ? ': с am / is / are помощник do не нужен' : ''}.`);
    else if (w === 'not' && u.includes('never')) add('freq', '<b>never</b> уже значит «не», второе отрицание не нужно.');
    else add(null, `Лишнее слово <b>${w}</b>.`);
  }

  for (const o of subs) {
    const [x, y] = [o.u, o.t]; // ты написал x, нужно y
    const prev = t[o.ti - 1];
    if (BE.has(x) && BE.has(y)) {
      const s = subjectOf(t, o.ti);
      if ((x === 'was' || x === 'were') !== (y === 'was' || y === 'were')) add('past', `Здесь ${y === 'was' || y === 'were' ? 'прошлое' : 'настоящее'} время: <b>${y}</b>, а не ${x}.`);
      else add('be_form', s ? `С <b>${s}</b> нужно <b>${y}</b>, а не ${x}.` : `Нужно <b>${y}</b>, а не ${x}.`);
    }
    else if (ART.has(x) && ART.has(y)) add((x === 'a' && y === 'an') || (x === 'an' && y === 'a') ? 'an_vowel' : 'article', `Артикль <b>${y}</b>, а не ${x}.`);
    else if (DO.has(x) && DO.has(y)) {
      if (x === 'did' || y === 'did') add('past', `Нужно <b>${y}</b>, а не ${x}: ${y === 'did' ? 'действие в прошлом' : 'настоящее время'}.`);
      else add('do_does', `С <b>${subjectOf(t, o.ti) || 'этим подлежащим'}</b> — <b>${y}</b>.`);
    }
    else if (DEM.has(x) && DEM.has(y)) add('this', `<b>${y}</b>, а не ${x}.`);
    else if (PREP.has(x) && PREP.has(y)) add('prep', `Предлог <b>${y}</b>, а не ${x}.`);
    else if (POSS.has(x) && POSS.has(y)) add('possessive', `<b>${y}</b>, а не ${x}.`);
    else if (sameBase(x, y) || IRR[x] === y || PAST2BASE[x] === y || IRR[baseOf(x)] === y) {
      // та же основа, другая форма глагола
      const p2 = t[o.ti - 2];
      const helper = DO.has(prev) || MODAL.has(prev) || prev === 'to' ? prev
        : (prev === 'not' || PRON.has(prev)) && (DO.has(p2) || MODAL.has(p2)) ? p2 : null;
      if (/er$|est$/.test(y) && y.startsWith(x.slice(0, -1))) add('compare', `Для сравнения нужна форма <b>${y}</b>, а не ${x}.`);
      else if (helper) add('bare', `После <b>${helper}</b> — начальная форма: <b>${y}</b>, а не ${x}.`);
      else if (/ing$/.test(y)) add('continuous', `Действие сейчас: <b>${y}</b>.`);
      else if (y === sForm(x) || y === 'has' && x === 'have') add('third_s', `С <b>${subjectOf(t, o.ti) || 'he / she / it'}</b> глагол с окончанием: <b>${y}</b>, а не ${x}.`);
      else if (x === sForm(y) || x === 'has' && y === 'have') add('no_s', `С <b>${subjectOf(t, o.ti) || 'этим подлежащим'}</b> — без -s: <b>${y}</b>.`);
      else if (x === edForm(baseOf(y)) && PAST2BASE[y]) add('irregular', `<b>${baseOf(y)}</b> — неправильный глагол: прошедшее <b>${y}</b>, а не ${x}.`);
      else if (PAST2BASE[y] || /ed$/.test(y)) add('past', `Действие в прошлом: <b>${y}</b>, а не ${x}.`);
      else if (/er$/.test(y) || /est$/.test(y)) add('compare', `Нужна форма <b>${y}</b>.`);
      else add(null, `Нужна форма <b>${y}</b>, а не ${x}.`);
    }
    else if (/(er|est)$/.test(y) && (y.startsWith(x) || y.startsWith(x.replace(/y$/, 'i')))) add('compare', `Для сравнения нужна форма <b>${y}</b>, а не ${x}.`);
    else if (MODAL.has(y) && x === 'to') add('modal_to', `Нужно <b>${y}</b>.`);
    else if (y === 'than' && x === 'then') add('compare', '«чем» — <b>than</b> (then — «потом»).');
    else add(null, `<b>${y}</b>, а не «${x}».`);
  }
  return { ops, points, rules: [...rules], target: best.v, low: best.score < 0.5 && t.length > 2 };
}

// Для вариантов вида «go → ?» и отдельных слов — сравниваем как слова.
export function explainWord(user, right) {
  return explain(user, [right]);
}
