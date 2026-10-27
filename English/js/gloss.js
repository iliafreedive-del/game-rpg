// Словарик по нажатию на слово: перевод, что это за форма и почему оно стоит именно здесь.
import { LESSONS } from './data.js';

const LW = new Map();   // слово урока (англ, в нижнем регистре) -> перевод
for (const L of LESSONS) for (const [en, ru] of L.words) if (!LW.has(en.toLowerCase())) LW.set(en.toLowerCase(), ru);

const BE_RULE = 'be_form';
// Служебные слова: перевод, пояснение и правило (ключ из RULES в explain.js).
const F = {
  i: ['я', 'Подлежащее «я». Всегда пишется с большой буквы: I.'],
  you: ['ты / вы', 'Подлежащее «ты» или «вы» — в английском это одно слово. Глагол с ним: you are, you work.'],
  he: ['он', 'Подлежащее «он». С ним: he is, глагол с -s (he works), does / doesn\'t.', 'third_s'],
  she: ['она', 'Подлежащее «она». С ним: she is, глагол с -s (she works), does / doesn\'t.', 'third_s'],
  it: ['оно, это', 'Подлежащее для предметов и животных. Ещё <b>It</b> ставят, когда по-русски подлежащего нет: «Холодно» → It is cold, «Идёт дождь» → It is raining.', 'subject'],
  we: ['мы', 'Подлежащее «мы». С ним: we are, we were, глагол без -s.'],
  they: ['они', 'Подлежащее «они». С ним: they are, they were, глагол без -s.'],
  me: ['меня, мне', 'Форма «я» после глагола или предлога: help me, with me. В начале предложения — только I.'],
  him: ['его, ему', 'Форма «он» после глагола: call him, see him.'],
  my: ['мой', '«Чей?» — мой. Стоит перед существительным: my friend.', 'possessive'],
  your: ['твой, ваш', '«Чей?» — твой / ваш: your name.', 'possessive'],
  his: ['его', '«Чей?» — его (о мужчине): his name.', 'possessive'],
  her: ['её', '«Чей?» — её: her husband. Ещё «её / ей» после глагола: I see her.', 'possessive'],
  our: ['наш', '«Чей?» — наш: our house.', 'possessive'],
  their: ['их', '«Чей?» — их: their son. Не путай с there (там) и they (они).', 'possessive'],
  its: ['его, её (о предмете)', '«Чей?» о предмете или животном. Без апострофа (it\'s = it is).', 'possessive'],
  be: ['быть', 'Начальная форма глагола to be. Его формы: am, is, are (сейчас), was, were (в прошлом).', BE_RULE],
  a: ['(какой-то, один)', 'Артикль <b>a</b>: «один из», «какой-то». Ставится перед существительным в единственном числе, когда упоминаем впервые или называем профессию. Перед гласным звуком — an.', 'article'],
  an: ['(какой-то, один)', 'Тот же артикль, что a, но перед гласным <i>звуком</i>: an apple, an engineer.', 'an_vowel'],
  the: ['(тот самый)', 'Артикль <b>the</b>: конкретный предмет, о котором оба знают (the door — та самая дверь), или единственный в своём роде (the sun).', 'article'],
  at: ['в, на (в точке)', '<b>at</b> — место как точка: at home (дома), at work (на работе), at school, at the station. И точное время: at 7 o\'clock.', 'prep'],
  in: ['в, внутри', '<b>in</b> — внутри чего-то: in the room, in the box, in Moscow. Время: in May, in 2025, in the morning.', 'prep'],
  on: ['на', '<b>on</b> — на поверхности: on the table, on the wall. Дни: on Monday, on Sunday.', 'prep'],
  to: ['к, в (направление); частица', 'Направление: go <b>to</b> school (в школу). Перед глаголом — частица: want <b>to</b> travel, going <b>to</b> buy, have <b>to</b> work.'],
  for: ['для, (ждать) кого', 'wait <b>for</b> the bus — ждать автобус. Ещё «для»: for you.'],
  of: ['(родительный падеж)', '«чего / кого»: the best day <b>of</b> my life — лучший день моей жизни.'],
  next: ['следующий; рядом', '<b>next to</b> — рядом с. <b>next week</b> — на следующей неделе.', 'prep'],
  under: ['под', 'Место: under the bed — под кроватью.', 'prep'],
  from: ['из, от', 'work from home — работать из дома.'],
  do: ['делать; помощник', 'Как помощник <b>do</b> строит вопрос и отрицание (Do you…? I don\'t…) и сам ничего не значит. Как обычный глагол — «делать»: What do you do?', 'aux_do'],
  does: ['помощник для he / she / it', '<b>Does</b> — помощник вопроса и отрицания для he / she / it. После него глагол без -s: Does she work?', 'do_does'],
  did: ['помощник прошлого; сделал', '<b>Did</b> — помощник вопроса и отрицания в прошлом. После него глагол в начальной форме: Did you see? I didn\'t go.', 'bare'],
  not: ['не', 'Отрицание. Ставится после am / is / are, после помощника (do not, did not) или после can / will.'],
  "don't": ['не (= do not)', 'Отрицание для I / you / we / they в настоящем: I don\'t know.', 'aux_do'],
  "doesn't": ['не (= does not)', 'Отрицание для he / she / it. После него глагол без -s: She doesn\'t like.', 'do_does'],
  "didn't": ['не (в прошлом)', 'Отрицание в прошлом для всех лиц. Глагол после него — начальная форма: I didn\'t go.', 'bare'],
  "isn't": ['не (= is not)', 'is + not.', BE_RULE],
  "aren't": ['не (= are not)', 'are + not.', BE_RULE],
  "can't": ['не могу, не умею', 'can + not. Глагол после него в начальной форме: I can\'t hear.', 'modal_to'],
  "couldn't": ['не мог', 'Прошедшее от can\'t: I couldn\'t sleep.', 'modal_to'],
  "won't": ['не буду (= will not)', 'Отрицание будущего: We won\'t tell.', 'future'],
  can: ['могу, умею', '<b>can</b> + глагол без to, одна форма для всех: she can speak.', 'modal_to'],
  could: ['мог; не могли бы…', 'Прошедшее от can или вежливая просьба: Could you help me?', 'modal_to'],
  will: ['(будущее время)', '<b>will</b> + глагол = будущее: I will help — я помогу. Одна форма для всех лиц.', 'future'],
  should: ['стоит, следует', 'Совет: You should rest — тебе стоит отдохнуть. Глагол после него без to.', 'modal_to'],
  must: ['должен', 'Сильное «должен», правило. must not — нельзя.', 'modal_to'],
  have: ['иметь; have to — надо', '«У меня есть» = I have. <b>have to</b> + глагол — «приходится, надо».', 'have'],
  has: ['имеет (he / she / it)', 'Форма have для he / she / it: She has a cat — у неё есть кошка.', 'have'],
  had: ['имел; (поел, провёл)', 'Прошедшее от have: We had dinner — мы поужинали.', 'irregular'],
  going: ['собираюсь (going to)', '<b>am / is / are going to</b> + глагол — план на будущее: I am going to buy.', 'future'],
  there: ['там; есть', 'В начале фразы <b>There is / There are</b> значит «есть, находится»: There is milk in the fridge. Иначе — «там».', 'there'],
  this: ['этот, это', 'Рядом со мной, один предмет. Много — these.', 'this'],
  that: ['тот, то', 'Далеко, один предмет. Много — those.', 'this'],
  these: ['эти', 'Рядом, много предметов. После него are.', 'this'],
  those: ['те', 'Далеко, много предметов. После него are.', 'this'],
  what: ['что, какой', 'Вопросительное слово — в начале вопроса: What is your name?', 'question'],
  where: ['где, куда', 'Вопросительное слово — в начале: Where do you live?', 'question'],
  when: ['когда', 'В начале вопроса (When does it start?) или связка «когда» (Call me when you are free).', 'question'],
  why: ['почему', 'В начале вопроса: Why are you late?', 'question'],
  how: ['как', 'How are you? How old (сколько лет), How much (сколько стоит).', 'question'],
  who: ['кто', 'Если who — сам «кто делает», помощник do не нужен: Who lives here?', 'question'],
  much: ['много; how much — сколько', 'How much is it? — Сколько это стоит?'],
  many: ['много', 'С исчисляемыми во множественном числе: many people.'],
  any: ['какие-нибудь; (ни одного)', 'В вопросах и отрицаниях: Are there any questions? There isn\'t any milk.'],
  and: ['и', 'Соединяет слова и предложения.'],
  but: ['но', 'Противопоставление: tired but happy.'],
  or: ['или', 'Tea or coffee?'],
  so: ['поэтому', 'Следствие: It was cold, so we stayed at home.'],
  because: ['потому что', 'Причина: I stayed at home because I was sick.'],
  than: ['чем', 'В сравнениях: bigger than London. Не путай с then (потом).', 'compare'],
  more: ['более', 'Сравнение длинных слов: more interesting — интереснее.', 'compare'],
  most: ['самый', 'the most beautiful — самый красивый.', 'compare'],
  "o'clock": ['часов (ровно)', 'at seven o\'clock — в семь часов.'],
  one: ['один; (этот) вот', 'this one — вот этот (чтобы не повторять существительное).'],
  every: ['каждый', 'every day — каждый день.'],
  day: ['день', ''], morning: ['утро', 'in the morning — утром.'], evening: ['вечер', 'in the evening — вечером.'],
  night: ['ночь, вечер', 'last night — вчера вечером / ночью.'], last: ['прошлый, последний', 'last week — на прошлой неделе.'],
  week: ['неделя', ''], year: ['год', ''], today: ['сегодня', 'Обычно в конце или в начале фразы.'],
  up: ['вверх', 'get up — вставать.'], get: ['получать; (get up) вставать', ''], take: ['брать, (ехать на)', 'take a taxi — поехать на такси.'],
  come: ['приходить', ''], buy: ['покупать', ''], meet: ['встречать(ся)', ''], marry: ['жениться, выйти замуж', ''],
  black: ['чёрный', ''], small: ['маленький', ''], girl: ['девушка, девочка', ''], cake: ['торт', ''], pizza: ['пицца', ''],
  picture: ['картина', ''], bank: ['банк', ''], medicine: ['медицина', ''], english: ['английский', 'Названия языков пишутся с большой буквы.'],
  russian: ['русский', 'Названия языков — с большой буквы.'], tom: ['Том', 'Имя — без артикля.'], london: ['Лондон', 'Города без артикля.'],
  moscow: ['Москва', 'Города без артикля.'], tv: ['телевизор', ''], two: ['два', ''], three: ['три', ''], seven: ['семь', ''],
  eight: ['восемь', ''], ten: ['десять', ''], yes: ['да', ''], no: ['нет', ''], home: ['дом', 'at home — дома, go home — идти домой (без to!).'],
  work: ['работать; работа', 'at work — на работе.'], school: ['школа', 'at school — в школе, go to school — ходить в школу.'],
};
const BE_FORMS = { am: 'I', is: 'he / she / it', are: 'you / we / they', was: 'I / he / she / it (прошлое)', were: 'you / we / they (прошлое)' };
const PAST = { went: 'go', saw: 'see', came: 'come', bought: 'buy', ate: 'eat', took: 'take', made: 'make', met: 'meet', said: 'say', got: 'get', forgot: 'forget', left: 'leave', told: 'tell', thought: 'think', knew: 'know', gave: 'give', found: 'find', drank: 'drink', wrote: 'write', ran: 'run', swam: 'swim', slept: 'sleep', brought: 'bring', lost: 'lose', had: 'have', did: 'do' };
const PRON = ['i', 'you', 'he', 'she', 'it', 'we', 'they'];

const look = w => (F[w] && F[w][0]) || LW.get(w);
function stem(w) {
  // возвращает [основа, пояснение формы]
  if (PAST[w]) return [PAST[w], `прошедшее время от <b>${PAST[w]}</b> (неправильный глагол)`, 'irregular'];
  const tries = [
    [/ies$/, 'y', 'форма с -s (he / she / it) или множественное число', 'third_s'],
    [/(ss|sh|ch|x|o)es$/, '$1', 'форма с -es (he / she / it) или множественное число', 'third_s'],
    [/ied$/, 'y', 'прошедшее время (-ed)', 'past'],
    [/([^aeiou])\1ed$/, '$1', 'прошедшее время (-ed)', 'past'],
    [/ed$/, '', 'прошедшее время (-ed)', 'past'], [/d$/, '', 'прошедшее время (-ed)', 'past'],
    [/([^aeiou])\1ing$/, '$1', 'форма -ing (действие идёт сейчас)', 'continuous'],
    [/ing$/, '', 'форма -ing (действие идёт сейчас)', 'continuous'], [/ing$/, 'e', 'форма -ing (действие идёт сейчас)', 'continuous'],
    [/ier$/, 'y', 'сравнительная степень («более»)', 'compare'], [/([^aeiou])\1er$/, '$1', 'сравнительная степень («более»)', 'compare'],
    [/er$/, '', 'сравнительная степень («более»)', 'compare'], [/est$/, '', 'превосходная степень («самый»)', 'compare'],
    [/s$/, '', 'форма с -s (he / she / it) или множественное число', 'third_s'],
  ];
  for (const [re, rep, note, rule] of tries) if (re.test(w)) { const b = w.replace(re, rep); if (look(b)) return [b, note, rule]; }
  return null;
}

// tokens — слова фразы как написаны, i — индекс нажатого.
export function gloss(tokens, i) {
  const low = tokens.map(t => t.toLowerCase().replace(/[.,!?;:«»"]/g, '').replace(/’/g, "'"));
  const w = low[i];
  const res = { word: tokens[i].replace(/[.,!?;:]/g, ''), ru: '', note: '', rule: null, phrase: null };
  // выражения из уроков (at home, every day, in the morning…), в которые входит слово
  for (const key of LW.keys()) {
    if (!key.includes(' ')) continue;
    const kw = key.split(' ');
    for (let s = Math.max(0, i - kw.length + 1); s <= i; s++) if (kw.every((k, j) => low[s + j] === k)) res.phrase = [key, LW.get(key)];
  }
  if (BE_FORMS[w] || /^(isn't|aren't|wasn't|weren't)$/.test(w)) {
    const be = w.replace("n't", '');
    const isQ = i === 0 || PRON.includes(low[i + 1]) && !PRON.includes(low[i - 1]);
    let subj = null;
    for (let k = i - 1; k >= 0 && !subj; k--) if (PRON.includes(low[k]) || look(low[k]) && !F[low[k]]) subj = low[k];
    if (isQ) subj = low.slice(i + 1).find(x => PRON.includes(x) || (look(x) && !F[x])) || subj;
    res.ru = be.startsWith('w') ? 'был(и) / была' : '(есть, является)';
    const ing = (low[i + 1] && /ing$/.test(low[i + 1])) || (low[i + 2] && /ing$/.test(low[i + 2]) && low[i + 1] === 'not');
    const going = low[i + 1] === 'going' || low[i + 2] === 'going';
    res.note = `Форма глагола <b>to be</b> («быть») для ${BE_FORMS[be]}${subj ? ` — здесь подлежащее <b>${subj === 'i' ? 'I' : subj}</b>, поэтому <b>${be}</b>` : ''}.`
      + (going ? ' Вместе с going to это план на будущее.'
        : ing ? ' Вместе с глаголом на -ing это «прямо сейчас»: ' + (low[i + 1] === 'not' ? low[i + 2] : low[i + 1]) + '.'
          : ' По-русски здесь глагола нет («Мы дома», «Она врач»), а в английском он обязателен.')
      + (isQ ? ' Стоит первым, потому что это вопрос.' : '');
    res.rule = ing ? 'continuous' : isQ ? 'question' : 'be_missing';
    return res;
  }
  if (w === 'it' && i === 0 && /^(is|was|will)$/.test(low[1] || '') && !/^(a|an|the|my|your)$/.test(low[2] || '')) {
    res.ru = '(формальное подлежащее)';
    res.note = 'Здесь <b>it</b> ничего не значит: по-русски «Холодно» / «Идёт дождь» без подлежащего, а в английском оно обязано быть, поэтому ставят It.';
    res.rule = 'subject';
    return res;
  }
  if (w === 'do' && i > 0 && low[i - 1] === 'you' && low[0] === 'what') { res.ru = 'делать'; res.note = 'Здесь do — обычный глагол «делать». Первый do/did в вопросе — помощник.'; return res; }
  if (w === 'to' && /^(go|goes|went|walk|come)$/.test(low[i - 1] || '')) { res.ru = 'в, на (куда)'; res.note = 'Направление движения: go to school — идти в школу.'; return res; }
  if (w === 'have' && low[i + 1] === 'to' || w === 'has' && low[i + 1] === 'to') { res.ru = 'надо, приходится'; res.note = '<b>have to / has to</b> + глагол — «приходится, надо».'; res.rule = 'modal_to'; return res; }
  if (F[w]) { [res.ru, res.note, res.rule] = F[w]; return res; }
  if (PAST[w]) { res.ru = LW.get(w) || look(PAST[w]); res.note = `<b>${w}</b> — прошедшее время от <b>${PAST[w]}</b>. Это неправильный глагол: -ed к нему не добавляют.`; res.rule = 'irregular'; return res; }
  if (LW.has(w)) { res.ru = LW.get(w); return res; }
  const st = stem(w);
  if (st) { res.ru = look(st[0]); res.note = `<b>${w}</b> — ${st[1]} от <b>${st[0]}</b>.`; res.rule = st[2]; return res; }
  if (/'s$/.test(w)) { res.ru = 'чей-то (принадлежность)'; res.note = '\'s — «чей»: Tom\'s car — машина Тома.'; return res; }
  res.ru = '—';
  return res;
}
