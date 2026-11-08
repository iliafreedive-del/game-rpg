// The story: who says what, what each place does, the puzzles that gate the way. All in-world speech is English.
import { S, has, give, takeAway, addXP, save } from './state.js';
import { say, sign, narrate, choose, compose, answerIs, toast, speakers, ui, openEcho, tokensHTML } from './ui.js';
import { sfx } from './speech.js';
import { G, charFor } from './world.js';
import * as X from './gfx.js';

export const ITEMS = {
  water: { pic: '💧', en: 'water' }, bread: { pic: '🍞', en: 'bread' }, fish: { pic: '🐟', en: 'fish' },
  apple_r: { pic: '🍎', en: 'red apple' }, apple_g: { pic: '🍏', en: 'green apple' },
  wood_big: { pic: '🪵', en: 'wood' }, wood_small: { pic: '🪵', en: 'wood' },
  key: { pic: '🗝️', en: 'key' }, fire: { pic: '🔥', en: 'fire' }, key2: { pic: '🔑', en: 'old key' },
  goldstone: { pic: '🟡', en: 'gold stone' }, gold: { pic: '🪙', en: 'gold' },
};
ui.items = ITEMS;
speakers({
  bram: { name: 'Bram', icon: '👴' }, mira: { name: 'Mira', icon: '👩' }, osric: { name: 'Osric', icon: '🔨' }, owen: { name: 'Owen', icon: '🕯️' },
  skel: { name: '???', icon: '💀', cls: 'scary' }, tarik: { name: 'Tarik', icon: '🐪' }, nan: { name: 'Nan', icon: '🔮' }, guard: { name: 'Guard', icon: '🛡️', cls: 'scary' }, king: { name: 'The King', icon: '👑', cls: 'royal' },
  voice: { name: 'Голос из тьмы', icon: '🌑', cls: 'scary' },
});
const fl = () => S.flags;
const rnd = a => a[Math.floor(Math.random() * a.length)];
const B = (en, ru, g) => say('bram', en, ru, g), M = (en, ru, g) => say('mira', en, ru, g), O = (en, ru, g) => say('osric', en, ru, g), Wn = (en, ru, g) => say('owen', en, ru, g);
const K = (en, ru, g) => say('king', en, ru, g), GD = (en, ru, g) => say('guard', en, ru, g);
const invLabel = (id, n) => `${ITEMS[id].pic}${n > 1 ? ` ×${n}` : ''}`;

// pick something from the bag to hand over; returns item id or null
async function offer(title = 'Что отдать?') {
  const opts = Object.entries(S.inv).filter(([k]) => ITEMS[k] && k !== 'fire').map(([k, n]) => ({ label: `Отдать ${invLabel(k, n)}`, value: k }));
  if (!opts.length) return null;
  return choose([...opts, { label: 'Ничего', value: null, cls: 'ghost' }], title);
}
const reward = (xp, text) => { addXP(xp); if (text) toast(text); if (G.player) G.fx.push({ x: G.player.x, y: G.player.y, text: `+${xp} ✦`, t: 0, dur: 1.6 }); sfx('ok'); };

// ================================================================ VILLAGE · STILLFORD
async function bram() {
  const f = fl();
  if (!f.met_bram) {
    f.met_bram = 1;
    await B('Hello! Hello, stranger!', 'Привет! Здравствуй, странник!', '👋');
    await B('I am Bram. Bram.', 'Я Брам. Брам.', '🙋');
    await B('You are a stranger. I am a friend. A friend.', 'Ты чужак. А я друг. Друг.', '🤝');
    await B('Water. I need water.', 'Вода. Мне нужна вода.', '💧');
    await B('Please, bring me water. The well is here.', 'Пожалуйста, принеси мне воды. Колодец здесь.', '🪣👈');
    f.q_water = 1; return;
  }
  if (f.q_water && !f.water_done) {
    const it = has('water') ? await offer() : null;
    if (it === 'water') {
      takeAway('water'); f.water_done = 1; sfx('item');
      await B('Water! Thank you, stranger. Good water.', 'Вода! Спасибо, странник. Хорошая вода.', '😊');
      await B('You are a good friend.', 'Ты хороший друг.', '🤝');
      await B('Now I am hungry. I want bread.', 'А теперь я голоден. Я хочу хлеба.', '🍞');
      await B('Mira has bread. Mira is there, near the small house.', 'У Миры есть хлеб. Мира там, у маленького дома.', '👉🏠');
      f.q_bread = 1; reward(20); return;
    }
    if (it) return wrongItem('bram', it, 'water');
    return B('Water, please. The well is here, near me.', 'Воды, пожалуйста. Колодец здесь, рядом со мной.', '💧🪣');
  }
  if (f.q_bread && !f.bread_done) {
    const it = Object.keys(S.inv).some(k => k !== 'fire') ? await offer() : null;
    if (it === 'bread') {
      takeAway('bread', 1); f.bread_done = 1; sfx('item');
      await B('Bread! Thank you. Good bread.', 'Хлеб! Спасибо. Хороший хлеб.', '🍞😊');
      await B('I am not hungry now.', 'Теперь я не голоден.', '😌');
      await B('Where is Osric? Osric is there, near the fire. He is the smith.', 'Где Осрик? Осрик там, у огня. Он кузнец.', '🔨🔥👉');
      await B('Osric can make a key. A key for the old door.', 'Осрик может сделать ключ. Ключ для старой двери.', '🗝️🚪'); reward(20); return;
    }
    if (it) return wrongItem('bram', it, 'bread');
    return B('I am hungry. Bread, please. Mira has bread.', 'Я голоден. Хлеба, пожалуйста. У Миры есть хлеб.', '🍞');
  }
  if (f.king_done) return chatter('bram', [
    ['You are here again! Hello, friend!', 'Ты снова здесь! Привет, друг!'], ['The king can speak now. You are a good friend.', 'Король теперь может говорить. Ты хороший друг.'],
    ['Now you know many words. Look at the stone again and again.', 'Теперь ты знаешь много слов. Смотри на камень снова и снова.'], ['The day is here. The night is not dark now.', 'Настал день. Ночь теперь не тёмная.'],
    ['I am old, but I know a new word: friend!', 'Я старый, но я знаю новое слово: друг!']]);
  return chatter('bram', [
    ['Hello, friend! The water is good. Thank you.', 'Привет, друг! Вода хорошая. Спасибо.'], ['My name is Bram. What is your name? You do not know? No name...', 'Меня зовут Брам. А как тебя зовут? Не знаешь? Нет имени...'],
    ['One well, two houses, many trees. This is Stillford.', 'Один колодец, два дома, много деревьев. Это Стиллфорд.'], ['I am old. My house is small, but it is good.', 'Я старый. Мой дом маленький, но хороший.'],
    ['Mira has bread and fish. Mira is a good woman.', 'У Миры есть хлеб и рыба. Мира — хорошая женщина.'],
    [f.door_open ? 'The old door is open. It is dark there. Take fire!' : 'The old door is there. It is black and old.', f.door_open ? 'Старая дверь открыта. Там темно. Возьми огонь!' : 'Старая дверь там. Она чёрная и старая.'],
    [has('key') || f.door_open ? 'You have the key. Good! Go to Owen.' : 'Where is the key? Osric can make a key.', has('key') || f.door_open ? 'У тебя есть ключ. Хорошо! Иди к Оуэну.' : 'Где ключ? Осрик может сделать ключ.']]);
}
async function wrongItem(who, it, want) {
  const name = ITEMS[it].en, wn = ITEMS[want].en;
  await say(who, `No, no. This is ${/apple/.test(it) ? 'an apple' : it === 'key' || it === 'key2' ? 'a key' : name}. I want ${wn}.`, `Нет-нет. Это не то. Я хочу ${{ water: 'воды', bread: 'хлеба', wood_big: 'дров', gold: 'золота' }[want] || wn}.`, '🙅');
}
async function chatter(who, lines) {
  const a = rnd(lines); let b = rnd(lines); if (lines.length > 1) while (b === a) b = rnd(lines);
  await say(who, a[0], a[1]); if (lines.length > 1) await say(who, b[0], b[1]);
}

async function mira() {
  const f = fl();
  if (!f.met_mira) {
    f.met_mira = 1;
    await M('Hello, stranger! I am Mira.', 'Привет, странник! Я Мира.', '👋');
    await M('I have white bread and black bread. And fish!', 'У меня есть белый хлеб и чёрный хлеб. И рыба!', '🍞🐟');
    await M('You want bread? Take one. It is here.', 'Хочешь хлеба? Возьми один. Он здесь.', '🍞☝️');
  }
  if (!f.q_apples) {
    await M('And please, I need apples. Three red apples.', 'И, пожалуйста, мне нужны яблоки. Три красных яблока.', '🍎🍎🍎');
    await M('The apple tree is there. Many apples: red and green.', 'Яблоня там. Много яблок: красные и зелёные.', '🌳👉');
    await M('Not green! Green apples are bad. I want red.', 'Не зелёные! Зелёные яблоки плохие. Я хочу красные.', '🍏👎');
    f.q_apples = 1; 
  }
  if (!f.apples_done) {
    const it = (has('apple_r') || has('apple_g')) ? await offer() : null;
    if (it === 'apple_r' && S.inv.apple_r === 3) {
      takeAway('apple_r'); f.apples_done = 1; sfx('item');
      await M('One, two, three! Three red apples. Thank you, friend!', 'Раз, два, три! Три красных яблока. Спасибо, друг!', '🍎🍎🍎😊');
      await M('Take this. It is for you.', 'Возьми это. Это тебе.', '🎁');
      S.hints++; reward(25, '🕯️ +1 свеча · +25 опыта'); return;
    }
    if (it === 'apple_g') { await M('No! These apples are green. Green apples are bad.', 'Нет! Эти яблоки зелёные. Зелёные яблоки плохие.', '🍏👎'); return M('I want red apples. Red!', 'Я хочу красные яблоки. Красные!', '🍎'); }
    if (it === 'apple_r') { const n = S.inv.apple_r; return M(n === 1 ? 'One apple? No. I need three red apples.' : 'One, two... no. I need three red apples. Three!', n === 1 ? 'Одно яблоко? Нет. Мне нужно три красных яблока.' : 'Раз, два... нет. Мне нужно три красных яблока. Три!', '🤟'); }
    if (it) return M('No. I do not want this. I want three red apples.', 'Нет. Я не хочу это. Я хочу три красных яблока.', '🙅');
    return M('Three red apples, please. The tree is there.', 'Три красных яблока, пожалуйста. Дерево там.', '🍎🍎🍎👉');
  }
  return chatter('mira', [
    ['My bread is good. My fish is good too.', 'Мой хлеб хороший. Моя рыба тоже хорошая.'], ['Bram is old. He is my friend.', 'Брам старый. Он мой друг.'],
    ['The tree is big. Many apples are red, many are green.', 'Дерево большое. Много яблок красные, много зелёные.'], ['Osric is a big man. He can make a key, a door, a box.', 'Осрик большой мужчина. Он может сделать ключ, дверь, ящик.'],
    ['You want fish? Take one. It is for you.', 'Хочешь рыбы? Возьми одну. Это тебе.'], ['You give me apples, I give you bread. Good!', 'Ты даёшь мне яблоки, я даю тебе хлеб. Хорошо!'], ...(f.king_done ? [['The king can speak! You are a good friend, stranger.', 'Король может говорить! Ты хороший друг, странник.']] : [])]);
}
async function stall() {
  await sign('White bread, black bread and fish. Take one.', 'Белый хлеб, чёрный хлеб и рыба. Бери одно.', 'Прилавок Миры');
  const v = await choose([{ label: 'Взять 🍞', value: 'bread' }, { label: 'Взять 🐟', value: 'fish' }, { label: 'Уйти', value: null, cls: 'ghost' }]);
  if (v) { if (has(v)) toast('У тебя это уже есть'); else { give(v); sfx('item'); } }
}
async function appleTree() {
  const opts = [];
  for (const [id, pic] of [['apple_r', '🍎'], ['apple_g', '🍏']]) for (const n of [1, 2, 3]) opts.push({ label: pic.repeat(n), value: [id, n] });
  const v = await choose([...opts, { label: 'Уйти', value: null, cls: 'ghost' }], 'Яблоня. Сколько сорвать?');
  if (v) { takeAway('apple_r'); takeAway('apple_g'); give(v[0], v[1]); sfx('item'); }
}
async function well() {
  await sign('The well. Good water here.', 'Колодец. Здесь хорошая вода.', 'Колодец');
  const v = await choose([{ label: 'Набрать 💧', value: 1 }, { label: 'Уйти', value: 0, cls: 'ghost' }]);
  if (v) { if (!has('water')) { give('water'); sfx('item'); } else toast('Вода у тебя уже есть'); }
}
async function woodPile(kind) {
  const v = await choose([{ label: 'Взять 🪵', value: 1 }, { label: 'Уйти', value: 0, cls: 'ghost' }], kind === 'big' ? 'Поленница у большого дома' : 'Поленница у маленького дома');
  if (v) { takeAway('wood_big'); takeAway('wood_small'); give('wood_' + kind); sfx('item'); }
}
async function osric() {
  const f = fl();
  if (!f.met_osric) {
    f.met_osric = 1;
    await O('Hello, stranger. My name is Osric. I am the smith.', 'Привет, странник. Меня зовут Осрик. Я кузнец.', '🔨');
    await O('I can make a key, a door, a box...', 'Я могу сделать ключ, дверь, ящик...', '🗝️🚪📦');
    await O('But look, can you see? My fire is small. A small fire is bad.', 'Но смотри, видишь? Мой огонь маленький. Маленький огонь — плохо.', '🔥🐭');
    await O('I need wood. Please, bring me wood.', 'Мне нужны дрова. Пожалуйста, принеси мне дров.', '🪵');
    await O('The wood is near the big house. The big house is there, near my fire.', 'Дрова у большого дома. Большой дом там, рядом с моим огнём.', '🏠👉');
    f.q_wood = 1; return;
  }
  if (!f.wood_done) {
    const it = Object.keys(S.inv).some(k => k !== 'fire') ? await offer() : null;
    if (it === 'wood_big') {
      takeAway('wood_big'); f.wood_done = 1; sfx('item');
      await O('Good wood! Thank you, friend.', 'Хорошие дрова! Спасибо, друг.', '🪵👍');
      await O('Now my fire is big. Wait...', 'Теперь мой огонь большой. Подожди...', '🔥🐘');
      await narrate('<i>Осрик бьёт молотом. Летят искры. Металл шипит в воде…</i>');
      await O('Here. A new key. Take it.', 'Вот. Новый ключ. Возьми его.', '🗝️✨');
      give('key'); sfx('item');
      await O('The key can open the old door. The old door is there.', 'Этот ключ может открыть старую дверь. Старая дверь там.', '🚪👉');
      await O('But it is dark there. Go to Owen first. Owen knows the old door.', 'Но там темно. Сначала иди к Оуэну. Оуэн знает старую дверь.', '🌑🕯️'); reward(30); return;
    }
    if (it === 'wood_small') { await O('No. This wood is from the small house. It is old and bad.', 'Нет. Эти дрова от маленького дома. Они старые и плохие.', '🪵👎'); return O('I need the wood near the big house.', 'Мне нужны дрова у большого дома.', '🏠'); }
    if (it) return wrongItem('osric', it, 'wood_big');
    return O('Wood, please. The wood near the big house.', 'Дров, пожалуйста. Дрова у большого дома.', '🪵🏠');
  }
  return chatter('osric', [
    ['My fire is big now. Thank you!', 'Мой огонь теперь большой. Спасибо!'], ['I make keys. I make doors. I make boxes.', 'Я делаю ключи. Я делаю двери. Я делаю ящики.'],
    ['The night is dark, but my fire is light.', 'Ночь тёмная, но мой огонь — свет.'], ['A small fire is bad. A big fire is good.', 'Маленький огонь — плохо. Большой огонь — хорошо.'],
    ['Do you have the key? Good. Do not give it to an enemy.', 'Ключ у тебя? Хорошо. Не отдавай его врагу.']]);
}
const QUIZ = [
  ['Is water red?', false, 'Вода красная?'], ['Is fire red?', true, 'Огонь красный?'], ['Is an apple a fish?', false, 'Яблоко — это рыба?'],
  ['Is Bram old?', true, 'Брам старый?'], ['Is Mira a woman?', true, 'Мира — женщина?'], ['Is Osric a child?', false, 'Осрик — ребёнок?'],
  ['Is bread good?', true, 'Хлеб хороший?'], ['Is a tree green?', true, 'Дерево зелёное?'], ['Is a child big?', false, 'Ребёнок большой?'],
  ['Can Osric make a key?', true, 'Осрик может сделать ключ?'], ['Can a fish make a key?', false, 'Рыба может сделать ключ?'], ['Is the well near Bram?', true, 'Колодец рядом с Брамом?'],
  ['Is a green apple red?', false, 'Зелёное яблоко красное?'], ['Is Owen a man?', true, 'Оуэн — мужчина?'], ['Is a small house big?', false, 'Маленький дом большой?'], ['Is two three?', false, 'Два — это три?'], ['Is one apple many apples?', false, 'Одно яблоко — это много яблок?'], ['Can you hear me?', true, 'Ты меня слышишь?'], ['Is white bread black?', false, 'Белый хлеб чёрный?'],
];
const yesNo = () => choose([{ label: tokensHTML('Yes'), value: true }, { label: tokensHTML('No'), value: false }]);
async function owen() {
  const f = fl();
  if (!f.met_owen) {
    f.met_owen = 1;
    await Wn('Hello, stranger. My name is Owen.', 'Здравствуй, странник. Меня зовут Оуэн.', '🕯️');
    await Wn('Look: this is the stone of words. It can speak.', 'Смотри: это камень слов. Он умеет говорить.', '🪨💬');
    await Wn('Look at the stone again and again. The stone knows all words.', 'Смотри на камень снова и снова. Камень знает все слова.', '🔁');
    f.echo = 1; toast('🔁 Открыт Эхо-камень — повторяй с ним расшифрованные слова', 'page');
  }
  if (f.quiz_done) return chatter('owen', [
    ['The stone knows all words. Look at it again.', 'Камень знает все слова. Посмотри на него снова.'], ['The dark is not bad. The dark is a door.', 'Тьма — не зло. Тьма — это дверь.'],
    ['You know many words now. Good!', 'Ты теперь знаешь много слов. Хорошо!'], ['A word is a key. Many words, many doors.', 'Слово — это ключ. Много слов — много дверей.'],
    ['The old door is black and big. Take fire, stranger.', 'Старая дверь чёрная и большая. Возьми огонь, странник.'], ['Where is the old door? It is there, near the trees.', 'Где старая дверь? Она там, у деревьев.'],
    ['A wall can hear. A stone can answer. Look and hear, stranger.', 'Стена может слышать. Камень может ответить. Смотри и слушай, странник.']]);
  if (!has('key')) return Wn('You want the old door? First, go to Osric. He can make a key.', 'Хочешь к старой двери? Сначала иди к Осрику. Он может сделать ключ.', '🔨🗝️');
  await Wn('You have the key. Good.', 'У тебя есть ключ. Хорошо.', '🗝️');
  await Wn('But the old door is dark. First, answer me. Yes or no?', 'Но за старой дверью темно. Сначала ответь мне. Да или нет?', '❔');
  const qs = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, 3);
  for (const [q, a, ru] of qs) {
    await Wn(q, ru, '❔');
    const v = await yesNo();
    if (v !== a) { sfx('bad'); await Wn('No... Not good. Look and see again.', 'Нет... Неверно. Присмотрись и подумай ещё.', '🙅'); return Wn('Speak with me again, stranger.', 'Поговори со мной снова, странник.'); }
    sfx('ok');
  }
  f.quiz_done = 1;
  await Wn('Yes! You know the words. You can go.', 'Да! Ты знаешь слова. Ты можешь идти.', '👍');
  await Wn('Take this fire. It is for the dark.', 'Возьми этот огонь. Он для тьмы.', '🔥');
  give('fire'); sfx('item');
  await Wn('Go to the old door. It is there, near the trees.', 'Иди к старой двери. Она там, у деревьев.', '🚪🌳'); reward(30);
}
async function shrine() {
  if (!fl().echo) return sign('The stone of words.', 'Камень слов.', 'Камень');
  openEcho();
}
async function oldDoor() {
  const f = fl();
  if (f.door_open) { const v = await choose([{ label: 'Спуститься вниз ⬇', value: 1 }, { label: 'Остаться', value: 0, cls: 'ghost' }], 'Старая дверь открыта. Из темноты тянет холодом.'); if (v) return 'go:deep'; return; }
  await sign('The old door. Do not open! It is dark there.', 'Старая дверь. Не открывать! Там темно.', 'Старая дверь');
  if (has('key') && f.quiz_done) {
    const v = await choose([{ label: 'Открыть ключом 🗝️', value: 1 }, { label: 'Уйти', value: 0, cls: 'ghost' }]);
    if (!v) return; takeAway('key'); f.door_open = 1; sfx('door');
    await narrate('Ключ скрипит в замке. Дверь медленно открывается — за ней ступени уходят в темноту.');
    reward(20); return;
  }
  if (has('key')) return narrate('Ключ подходит… но за дверью кромешная тьма. Без огня туда не пройти. Кто-то в деревне знает, что делать.');
  return narrate('Дверь заперта. Нужен ключ.');
}

// ================================================================ THE DEEP
async function deepIntro() {
  if (fl().deep_seen) return; fl().deep_seen = 1;
  await narrate('Портал выносит тебя в древние руины под песком. Ночь, холод, запах камня и пыли. Твой огонь дрожит…');
}
async function brazier() {
  if (has('fire')) return narrate('Огонь жаровни горит ровно. Твой факел тоже горит.');
  give('fire'); sfx('item'); await narrate('Ты зажигаешь факел от жаровни. Тьма отступает.');
}
const SARC = [
  ['Here sleeps a child.', 'Здесь спит ребёнок.'], ['Here sleeps a woman. She has no gold.', 'Здесь спит женщина. У неё нет золота.'],
  ['Here sleeps an old man. He is not a king.', 'Здесь спит старик. Он не король.'], ['Here sleeps the old king.', 'Здесь спит старый король.'],
];
async function sarc(i) {
  const f = fl();
  await sign(SARC[i][0], SARC[i][1], 'Надпись на гробнице');
  if ((f.sarc || {})[i]) return;
  const v = await choose([{ label: 'Сдвинуть крышку ⚰️', value: 1 }, { label: 'Уйти', value: 0, cls: 'ghost' }]);
  if (!v) return;
  if (i === 3) {
    (f.sarc ||= {})[3] = 1; sfx('door');
    await narrate('Крышка со скрежетом сдвигается. На груди короля лежит старый ключ.');
    give('key2'); sfx('item'); reward(30); return;
  }
  f.wrong = (f.wrong || 0) + 1; sfx('scare');
  const pos = [[22.5, 5.5], [22.5, 9.5], [30.5, 5.5], [30.5, 9.5]][i];
  const sk = charFor('skel_' + Date.now(), 'skel_warrior_m', { glow: 0x3a80ff, glowK: 0.7 });
  if (sk) { sk.root.position.set(pos[0] + 1.1, 0, pos[1] + 0.2); sk.root.rotation.y = Math.atan2(G.player.x - pos[0], G.player.y - pos[1]); sk.state = 'talk'; G.zone.group.add(sk.root); G.zone.actors.push(sk); }
  await say('skel', 'STOP! Do not open! This is not the king!', 'СТОЙ! Не открывай! Это не король!', '💀✋');
  await say('skel', 'Go! Go now!', 'Уходи! Уходи сейчас же!', '👉');
  if (sk) { G.zone.group.remove(sk.root); G.zone.actors = G.zone.actors.filter(a => a !== sk); } takeAway('fire');
  await narrate('Ледяной вихрь гасит твой огонь и отбрасывает тебя назад, ко входу.');
  return 'tp:entry';
}
async function kingDoor() {
  const f = fl(); if (f.door2) return;
  await sign('The door of the king. The old key can open it.', 'Дверь короля. Старый ключ может её открыть.', 'Дверь');
  if (has('key2')) { const v = await choose([{ label: 'Открыть 🔑', value: 1 }, { label: 'Уйти', value: 0, cls: 'ghost' }]); if (v) { takeAway('key2'); f.door2 = 1; sfx('door'); reward(15); } }
}
async function altarStone() {
  const f = fl(); if (f.stone) return narrate('Алтарь пуст.');
  await sign('Here is the gold stone. Take it. Put the gold stone in the black door.', 'Здесь золотой камень. Возьми его. Вставь золотой камень в чёрную дверь.', 'Алтарь');
  const v = await choose([{ label: 'Взять 🟡', value: 1 }, { label: 'Уйти', value: 0, cls: 'ghost' }]);
  if (v) { f.stone = 1; give('goldstone'); sfx('item'); reward(20); }
}
async function galleryFire(i) {
  const f = fl(); f.lit ||= [0, 0, 0, 0, 0, 0]; if (f.goldbox) return narrate('Огонь горит.');
  if (f.lit[i]) { const v = await choose([{ label: 'Погасить', value: 1 }, { label: 'Оставить', value: 0, cls: 'ghost' }], 'Жаровня горит.'); if (v) f.lit[i] = 0; return; }
  if (!has('fire')) return narrate('Жаровня холодная. Зажечь её нечем — нужен огонь.');
  const v = await choose([{ label: 'Зажечь 🔥', value: 1 }, { label: 'Уйти', value: 0, cls: 'ghost' }], 'Холодная жаровня');
  if (!v) return; f.lit[i] = 1; sfx('tap');
  const n = f.lit.filter(Boolean).length;
  if (n > 4) { f.lit = [0, 0, 0, 0, 0, 0]; sfx('scare'); await say('voice', n === 5 ? 'No! Not five! Four. Again.' : 'No! Not six!', n === 5 ? 'Нет! Не пять! Четыре. Снова.' : 'Нет! Не шесть!', '🌬️'); await narrate('Порыв ветра гасит все жаровни.'); }
}
async function goldBox() {
  const f = fl(); if (f.goldbox) return narrate('Сундук пуст.');
  const n = (f.lit || []).filter(Boolean).length;
  if (n === 4) { f.goldbox = 1; sfx('door'); give('gold'); S.hints++; await narrate('Четыре огня — и крышка сундука поднимается сама. Внутри золото и свеча.'); reward(30, '🪙 золото · 🕯️ +1 свеча · +30 опыта'); return; }
  await narrate(n ? `Сундук не открывается. Горит жаровен: ${n}.` : 'Сундук заперт. Замка нет — только знак огня на крышке.');
}
async function crack() {
  const f = fl(); if (f.secret) return;
  const a = await compose('...', ['open', 'stop', 'go', 'fire', 'hello', 'please', 'light', 'water'], null, 'voice');
  if (a == null) return;
  if (answerIs(a, ['open', 'open please', 'please open'])) { f.secret = 1; sfx('door'); await narrate('Ты произносишь слово — и камни стены беззвучно расходятся.'); reward(25); return; }
  sfx('bad'); await narrate('Стена молчит.');
}
async function secretBox() {
  const f = fl(); if (f.secretbox) return narrate('Сундук пуст.');
  f.secretbox = 1; S.hints += 2; sfx('page'); await narrate('В сундуке — две свечи и старая записка.'); reward(40, '🕯️ +2 свечи · +40 опыта');
  await sign('You know the words. You are a friend of the stone.', 'Ты знаешь слова. Ты друг камня.', 'Записка');
}
const GUARD_OK = ['i am a friend', 'i am friend', 'a friend', 'friend', 'i am a stranger', 'a stranger', 'i am not a enemy', 'i am not enemy'];
async function guard() {
  const f = fl();
  if (f.guard_ok) return chatter('guard', [['The king waits. Go, friend.', 'Король ждёт. Иди, друг.'], ['I am the guard. I hear all, I see all.', 'Я стражник. Я всё слышу, всё вижу.'], ['The last king is there. Speak, and he can answer.', 'Последний король там. Говори — и он сможет ответить.'], ['The black door is there. The gold stone can open it.', 'Чёрная дверь там. Золотой камень может её открыть.']]);
  if (!f.guard_q) {
    await GD('Stop! Stop, stranger! I am the guard.', 'Стой! Стой, странник! Я стражник.', '✋');
    await GD('Answer me. I can hear you.', 'Ответь мне. Я тебя слышу.', '👂');
    for (;;) {
      const a = await compose('Who are you? Say: a friend or an enemy?', ['I', 'am', 'a', 'friend', 'enemy', 'you', 'king', 'not', 'the'], null, 'guard');
      if (a == null) return;
      if (answerIs(a, GUARD_OK)) break;
      sfx('bad');
      if (/enemy/i.test(a) && !/not/i.test(a)) { await GD('An enemy?! Go! Go now!', 'Враг?! Уходи! Уходи сейчас же!', '⚔️'); return; }
      if (/king/i.test(a)) await GD('You are not the king! Say again.', 'Ты не король! Скажи ещё раз.', '🙅');
      else await GD('What? I do not know this. Say again.', 'Что? Я этого не понимаю. Скажи ещё раз.', '❔');
    }
    f.guard_q = 1; sfx('ok');
    await GD('A friend. Good.', 'Друг. Хорошо.', '🤝');
  }
  await GD('What do you have, friend? Give me gold.', 'Что у тебя есть, друг? Дай мне золото.', '🪙');
  const it = Object.keys(S.inv).some(k => k !== 'fire') ? await offer() : null;
  if (it === 'gold') {
    takeAway('gold'); f.guard_ok = 1; sfx('item');
    await GD('Gold! Good. I can see you are a friend.', 'Золото! Хорошо. Я вижу, ты друг.', '👍');
    await GD('The king waits. The black door is there. Put the gold stone in the door.', 'Король ждёт. Чёрная дверь там. Вставь в дверь золотой камень.', '🚪🟡'); reward(30); return 'rebuild';
  }
  if (it) return GD('No. This is not gold. I want gold.', 'Нет. Это не золото. Я хочу золото.', '🙅');
  await GD('No gold? Find gold. Look: six fires, one box.', 'Нет золота? Найди золото. Смотри: шесть огней, один ящик.', '🔥📦');
}
async function blackDoor() {
  const f = fl(); if (f.gate) return;
  await sign('The black door. Put the gold stone here.', 'Чёрная дверь. Вставь сюда золотой камень.', 'Чёрная дверь');
  if (!has('goldstone')) return narrate('В двери — круглое углубление. Чего-то не хватает.');
  const v = await choose([{ label: 'Вставить 🟡', value: 1 }, { label: 'Уйти', value: 0, cls: 'ghost' }]);
  if (v) { takeAway('goldstone'); f.gate = 1; sfx('door'); await narrate('Камень входит в углубление. Чёрная дверь бесшумно отворяется.'); reward(20); }
}
async function ask(q, ru, chips, accept, g, wrong) {
  for (;;) {
    await K(q, ru, g);
    const a = await compose(q, chips, null, 'king');
    if (a == null) return false;
    if (answerIs(a, accept)) { sfx('ok'); return true; }
    sfx('bad'); await K(...(wrong || ['No... I do not know this. Say again.', 'Нет... я этого не понимаю. Скажи ещё раз.']));
  }
}
async function king() {
  const f = fl();
  if (f.king_done) return chatter('king', [['Thank you, friend. Now I can speak.', 'Спасибо, друг. Теперь я могу говорить.'], ['I am the last king. But now I am not a dead king.', 'Я последний король. Но теперь я не мёртвый король.'], ['Go to Stillford. Say hello to Bram.', 'Иди в Стиллфорд. Передай привет Браму.'], ['All words are free now.', 'Все слова теперь свободны.']]);
  if (!f.king_met) {
    await K('Who... who is here?', 'Кто... кто здесь?', '👁️');
    await K('A stranger. A stranger with fire.', 'Странник. Странник с огнём.', '🔥');
    await K('I am the king. The last king of Stillford.', 'Я король. Последний король Стиллфорда.', '👑');
    await K('I know... no. I do not know words now. All my words sleep.', 'Я знаю... нет. Я больше не знаю слов. Все мои слова спят.', '💤');
    await K('A king with no words is a dead king.', 'Король без слов — мёртвый король.', '💀');
    f.king_met = 1;
  }
  const steps = [
    ['You can speak. Please, say a word. The first word of a friend.', 'Ты умеешь говорить. Пожалуйста, скажи слово. Первое слово друга.', ['hello', 'stop', 'go', 'enemy', 'dark', 'no', 'please'], ['hello', 'hello king', 'hello friend'], '🗣️', ['No... not this word. The first word of a friend. Again.', 'Нет... не это слово. Первое слово друга. Ещё раз.']],
    ['Hello... Hello! I know this word! Now: what is this?', 'Привет... Привет! Я знаю это слово! А теперь: что это?', ['fire', 'water', 'stone', 'bread', 'it', 'is', 'this'], ['fire', 'it is fire', 'this is fire'], '🔥👈'],
    ['Fire... fire is light. Again! Who am I?', 'Огонь... огонь — это свет. Ещё! Кто я?', ['you', 'are', 'the', 'king', 'friend', 'stranger', 'i', 'am', 'dead'], ['you are the king', 'the king', 'king', 'you are king'], '👑❔'],
    ['The king. Yes! And who are you?', 'Король. Да! А кто ты?', ['i', 'am', 'a', 'the', 'friend', 'enemy', 'king', 'stranger', 'you'], ['i am a friend', 'i am a stranger', 'a friend', 'a stranger', 'friend', 'stranger', 'i am friend'], '🫵❔'],
    ['A friend... The last word, friend. What do you want?', 'Друг... Последнее слово, друг. Чего ты хочешь?', ['i', 'want', 'the', 'light', 'day', 'dark', 'gold', 'night'], ['i want light', 'i want the light', 'light', 'the light', 'i want the day', 'the day', 'day', 'i want day'], '❓'],
  ];
  for (let k = f.kstep || 0; k < steps.length; k++) {
    const [q, ru, chips, acc, g, wr] = steps[k];
    if (!(await ask(q, ru, chips, acc, g, wr))) return;
    f.kstep = k + 1; save();
  }
  await K('Light... The day...', 'Свет... День...', '☀️');
  await narrate('Слова возвращаются к королю одно за другим. Жаровни вспыхивают, и свет поднимается вверх — к деревне.');
  await K('Thank you, friend. My words are free now. All words are free.', 'Спасибо, друг. Мои слова теперь свободны. Все слова свободны.', '✨');
  await K('Go now. Stillford waits for you. Say hello to Bram.', 'Иди же. Стиллфорд ждёт тебя. Передай привет Браму.', '👋');
  f.king_done = 1; S.hints += 2; reward(100, '👑 +100 опыта · 🕯️ +2 свечи');
  return 'rebuild';
}
async function ending() {
  if (fl().end_seen) return; fl().end_seen = 1;
  await narrate('<b>Конец главы.</b> В Стиллфорде снова звучат слова — и теперь ты понимаешь их.');
  await narrate('Расшифровывай оставшиеся страницы журнала, возвращайся к Эхо-камню и разговаривай с жителями: каждый раз они говорят новыми сочетаниями знакомых слов.');
}


// current objective, derived from progress (shown on top in English)
export function goal() {
  const f = fl(), d = S.zone !== 'village';
  if (!f.met_bram) return ['Go to the old man near the well.', 'Подойди к старику у колодца.'];
  if (!f.water_done) return ['Bring water to Bram.', 'Принеси воду Браму.'];
  if (!f.bread_done) return ['Bring bread to Bram. Mira has bread.', 'Принеси хлеб Браму. Хлеб есть у Миры.'];
  if (!f.wood_done) return f.met_osric ? ['Bring wood from the big house to Osric.', 'Принеси Осрику дрова от большого дома.'] : ['Go to Osric. He can make a key.', 'Иди к Осрику. Он может сделать ключ.'];
  if (!f.quiz_done) return ['Go to Owen first. Owen knows the old door.', 'Сначала иди к Оуэну. Оуэн знает старую дверь.'];
  if (!f.door_open) return ['Open the old door with the key.', 'Открой старую дверь ключом.'];
  if (!f.deep_seen) return ['Go in the dark. Take the fire.', 'Иди во тьму. Возьми огонь.'];
  if (d && !has('fire')) return ['Take fire. The dark is bad.', 'Возьми огонь. Тьма опасна.'];
  if (!(f.sarc || {})[3]) return ['Find the king. The king has the key.', 'Найди короля. У короля ключ.'];
  if (!f.door2) return ['Open the door of the king with the old key.', 'Открой дверь короля старым ключом.'];
  if (!f.stone) return ['Find the gold stone.', 'Найди золотой камень.'];
  if (!f.guard_ok) return f.guard_q && !has('gold') ? ['Find gold for the guard. Six fires, one box.', 'Найди золото для стражника. Шесть огней, один ящик.'] : ['Find the black door. The guard waits there.', 'Найди чёрную дверь. Там ждёт стражник.'];
  if (!f.gate) return ['Open the black door with the gold stone.', 'Открой чёрную дверь золотым камнем.'];
  if (!f.king_done) return ['Go to the king.', 'Иди к королю.'];
  if (!f.end_seen) return ['Go to Stillford. Say hello to Bram.', 'Возвращайся в Стиллфорд. Передай привет Браму.'];
  if (f.q_apples && !f.apples_done) return ['Bring three red apples to Mira.', 'Принеси Мире три красных яблока.'];
  return ['Look at the stone again and again.', 'Возвращайся к камню снова и снова.'];
}
ui.goalFn = goal;

// ================================================================ placement (3D)
const P3 = (name, o) => () => X.prop(name, 0, 0, o);
const plaque = (x, y, en, ru, title = 'Надпись', rot = 0) => ({ x, y, mk: () => X.plaque(), rot, r: 0.45, icon: '📜', iconH: 1.9, use: () => sign(en, ru, title) });
const NAMES3 = { bram: 'Bram', mira: 'Mira', osric: 'Osric', owen: 'Owen', tarik: 'Tarik', nan: 'Nan' };
const npc = (id, model, x, y, fn, dir = 0, extra = {}) => ({ id, x, y, actor: { model, name: NAMES3[id], dir, marker: null, ...extra }, btn: '💬', use: fn, ir: 2.1 });
export function marker(id) {
  const f = fl();
  switch (id) {
    case 'bram': return !f.met_bram || (f.q_water && !f.water_done && has('water')) || (f.q_bread && !f.bread_done && has('bread')) || (f.king_done && !f.bram_end) ? '!' : null;
    case 'mira': return !f.met_mira || !f.q_apples || (!f.apples_done && has('apple_r', 3)) ? '!' : null;
    case 'osric': return (f.water_done && !f.met_osric) || (f.q_wood && !f.wood_done && (has('wood_big') || has('wood_small'))) ? '!' : null;
    case 'owen': return !f.met_owen || (has('key') && !f.quiz_done) ? '!' : null;
    case 'nan': return !f.met_nan ? '!' : null;
    case 'tarik': return !f.met_tarik ? '!' : null;
    case 'guard': return !f.guard_ok ? '!' : null;
    case 'king': return !f.king_done ? '!' : null;
  }
  return null;
}
async function tarik() {
  const f = fl();
  if (!f.met_tarik) {
    f.met_tarik = 1;
    await say('tarik', 'Hello! I am Tarik. I am a stranger too.', 'Привет! Я Тарик. Я тоже чужак.', '👋🧳');
    await say('tarik', 'My house is not here. My house is far... I go and go.', 'Мой дом не здесь. Мой дом далеко... Я иду и иду.', '🚶');
    return say('tarik', 'Stillford is good. Good water, good bread, good people. Good friends!', 'Стиллфорд хороший. Хорошая вода, хороший хлеб, хорошие люди. Хорошие друзья!', '😊');
  }
  return chatter('tarik', [
    ['I have many fish. One, two, three... many!', 'У меня много рыбы. Раз, два, три... много!'], ['Where is my friend? There, near the fire.', 'Где мой друг? Там, у огня.'],
    ['Day is hot. Night is black and cold.', 'День жаркий. Ночь чёрная и холодная.'], ['You are a stranger? I am a stranger too. Hello, friend!', 'Ты чужак? Я тоже чужак. Привет, друг!'],
    ['Look: a white dog and a red... no, a black dog!', 'Смотри: белая собака и красная... нет, чёрная собака!'], ['I can see the old door. Do not go there in the night!', 'Я вижу старую дверь. Не ходи туда ночью!']]);
}
async function nan() {
  const f = fl();
  if (!f.met_nan) {
    f.met_nan = 1;
    await say('nan', 'Stop, stranger. Look at me. I am Nan.', 'Стой, странник. Посмотри на меня. Я Нэн.', '🔮');
    await say('nan', 'I can see... I see a big door. A black door.', 'Я вижу... Я вижу большую дверь. Чёрную дверь.', '👁️🚪');
    return say('nan', 'And I see a king. A king with no words.', 'И я вижу короля. Короля без слов.', '👑');
  }
  return chatter('nan', [
    ['I see a key. An old key, with the king.', 'Я вижу ключ. Старый ключ, у короля.'], ['I see fire. Four fires, not six.', 'Я вижу огонь. Четыре огня, не шесть.'],
    ['A wall can hear you. Say the word!', 'Стена может тебя слышать. Скажи слово!'], ['The guard wants gold. Do you have gold?', 'Стражник хочет золото. У тебя есть золото?'],
    ['The dead sleep. Do not open the box of a child.', 'Мёртвые спят. Не открывай ящик ребёнка.'], ['I know: you can speak. Again and again.', 'Я знаю: ты можешь говорить. Снова и снова.']]);
}
export function objects(zone) {
  const f = fl(), out = [];
  if (zone === 'village') {
    out.push(npc('bram', 'npc_elder', 24.8, 20.6, async () => { await bram(); if (fl().king_done) fl().bram_end = 1; }, -0.6));
    out.push(npc('mira', 'npc_merchant', 13, 23.9, mira, 0.2));
    out.push(npc('osric', 'npc_smith', 30.6, 14.4, osric, 0.6));
    out.push(npc('owen', 'npc_trainer', 29.3, 31.2, owen, 0.8));
    out.push(npc('tarik', 'npc_caravan', 33.5, 27.6, tarik, -2.2));
    out.push(npc('nan', 'npc_fortune', 18.6, 16.2, nan, 0.9));
    out.push({ x: 23, y: 22, mk: X.well, r: 1.2, icon: '🪣', iconH: 3.2, use: well, ir: 2.4 });
    out.push({ x: 13, y: 25.5, mk: X.stall, box: [1.2, 0.6], icon: '🍞', iconH: 2.6, use: stall, ir: 2.3 });
    out.push({ x: 18, y: 30, mk: () => X.appleTree(X.prop('tree_acacia_b', 0, 0, { s: 0.85 })), r: 0.5, icon: '🍎', iconH: 3.6, use: appleTree, ir: 2.4 });
    out.push({ x: 29.6, y: 12.2, mk: () => X.woodpile(9), r: 0.6, icon: '🪵', iconH: 1.4, use: () => woodPile('big'), ir: 1.8 });
    out.push({ x: 10.9, y: 20.3, mk: () => X.woodpile(5), r: 0.5, icon: '🪵', iconH: 1.2, use: () => woodPile('small'), ir: 1.8 });
    out.push({ x: 31, y: 30, mk: P3('altar_chronicle', { h: 1.6 }), r: 0.7, icon: '🔁', iconH: 2.4, use: shrine });
    out.push({ x: 19.4, y: 18.6, mk: P3('war_banner', { s: 0.75 }), r: 0.3, icon: '📜', iconH: 2.9, use: () => sign('STILLFORD. Here is the well. Bram is near the well. The old door is there.', 'СТИЛЛФОРД. Здесь колодец. Брам у колодца. Старая дверь там.', 'Знамя деревни') });
    out.push({ x: 36.5, y: 37.5, icon: '🪦', iconH: 1.5, use: () => sign('Here sleeps Tom. A good man. A good friend.', 'Здесь спит Том. Хороший человек. Хороший друг.', 'Могила') });
    out.push({ x: 38.5, y: 38.5, icon: '🪦', iconH: 1.5, use: () => sign('Here sleeps a child. Small and good.', 'Здесь спит ребёнок. Маленький и добрый.', 'Могила') });
    out.push({ x: 36.8, y: 40.5, icon: '🪦', iconH: 1.5, use: () => sign('Here sleeps an old woman. Now she has a new house.', 'Здесь спит старая женщина. Теперь у неё новый дом.', 'Могила') });
    out.push({ id: 'olddoor', x: 9, y: 8.2, mk: f.door_open ? () => { const g = new X.THREE.Group(); g.add(X.prop('portal_sun', 0, 0, { h: 3.2, glow: 0xffb050, glowK: 0.5 })); g.add(X.glowDisc(0xffb050, 1.6)); return g; } : () => X.prop('sand_rock_c', 0, 0, { s: 2.2 }), rot: Math.PI / 4, r: f.door_open ? 0.3 : 0.9, icon: f.door_open ? '⬇️' : '🚪', iconH: 3.8, use: oldDoor, ir: 2.4 });
  } else {
    const lit = f.lit || [];
    out.push({ x: 8.5, y: 5.6, mk: () => { const g = new X.THREE.Group(); g.add(X.prop('portal_sun', 0, 0, { h: 3.0, glow: 0xffb050, glowK: 0.5 })); g.add(X.glowDisc(0xffb050, 1.4)); return g; }, r: 0.4, icon: '⬆️', iconH: 3.6, ir: 2.0, use: async () => { const v = await choose([{ label: 'Подняться в деревню ⬆', value: 1 }, { label: 'Остаться', value: 0, cls: 'ghost' }]); if (v) return 'go:village'; } });
    for (const [x, y] of [[6, 10.5], [11, 10.5]]) out.push({ x, y, mk: () => X.brazier(true), r: 0.35, icon: '🔥', iconH: 2.0, use: brazier });
    out.push(plaque(8.5, 11.8, 'Stranger, stop! Here is the night, not the day. The dead sleep here. Bones, many bones. Take fire and look.', 'Странник, стой! Здесь ночь, а не день. Здесь спят мёртвые. Кости, много костей. Возьми огонь и смотри.'));
    out.push(plaque(25.5, 11.8, 'Four boxes. Four dead. The king has the key. Find the king and open his box.', 'Четыре ящика. Четверо мёртвых. У короля ключ. Найди короля и открой его ящик.'));
    [[22.5, 5.5], [22.5, 9.5], [30.5, 5.5], [30.5, 9.5]].forEach(([x, y], i) => out.push({ x, y, mk: () => X.sarcophagus(!!(f.sarc || {})[i]), box: [0.5, 1.05], icon: '⚰️', iconH: 1.6, ir: 1.9, use: () => sarc(i) }));
    out.push({ x: 36.5, y: 26.5, mk: f.door2 ? null : () => X.prop('wall_b', 0, 0, { h: 2.2, tint: 0x8a6a50 }), rot: Math.PI / 2, tiles: [[36, 26]], solid: !f.door2, icon: f.door2 ? null : '🚪', iconH: 2.8, ir: 1.9, use: kingDoor });
    out.push({ x: 46.0, y: 23.5, mk: P3('altar_power', { h: 1.5, glow: f.stone ? null : 0xffc040, glowK: 0.5 }), r: 0.6, icon: f.stone ? null : '🟡', iconH: 2.3, use: altarStone });
    out.push(plaque(40.4, 10.5, 'Look: six fires. Light four fires. Not five, not six. Then the box can open.', 'Смотри: шесть огней. Зажги четыре огня. Не пять, не шесть. Тогда ящик откроется.', 'Надпись', Math.PI / 2));
    [[44.5, 7.6], [48.5, 7.6], [52.0, 8.2], [44.5, 11.4], [48.5, 11.4], [52.0, 10.8]].forEach(([x, y], i) => out.push({ x, y, mk: () => X.brazier(!!(lit[i] || f.goldbox)), r: 0.35, icon: lit[i] || f.goldbox ? null : '🕳️', iconH: 1.9, ir: 1.6, use: () => galleryFire(i) }));
    out.push({ x: 51.5, y: 4.5, mk: P3(f.goldbox ? 'chest_open' : 'chest', { h: 0.9 }), r: 0.55, icon: f.goldbox ? null : '📦', iconH: 1.5, use: goldBox });
    out.push(plaque(11.5, 32.6, 'This wall can hear. Say the word, and the wall can open.', 'Эта стена слышит. Скажи слово — и стена откроется.'));
    if (!f.secret) out.push({ x: 9.9, y: 37.6, mk: () => X.prop('ruin_wall_a', 0, 0, { s: 0.7 }), icon: '🧱', iconH: 2.2, ir: 1.7, use: crack });
    out.push({ x: 0, y: 0, tiles: [[9, 38], [10, 38]], solid: !f.secret });
    out.push({ x: 9.5, y: 45, mk: P3(f.secretbox ? 'chest_open' : 'chest', { h: 0.9 }), r: 0.55, icon: f.secretbox ? null : '📦', iconH: 1.5, use: secretBox });
    out.push(plaque(21.8, 21.8, 'Here all sleep. Bones, bones, bones. The door of the king is there. The guard waits there. Do not be an enemy.', 'Здесь все спят. Кости, кости, кости. Дверь короля там. Стражник ждёт там. Не будь врагом.'));
    const gp = f.guard_ok ? [33.0, 41.5] : [35.5, 43.5];
    out.push({ id: 'guard', x: gp[0], y: gp[1], actor: { model: 'elite_guard_m', name: 'Guard', dir: f.guard_ok ? 0 : -Math.PI / 2 }, btn: '💬', ir: 2.1, use: guard });
    out.push({ x: 37.5, y: 43.5, mk: f.gate ? null : () => X.prop('portal_skull', 0, 0, { h: 2.6, glow: 0x7a40ff, glowK: 0.6 }), rot: -Math.PI / 2, tiles: [[37, 43]], solid: !f.gate, icon: f.gate ? null : '🚪', iconH: 3.0, ir: 2.1, use: blackDoor });
    out.push({ id: 'king', x: 49.5, y: 46.5, actor: { model: 't_mb_king_m', name: 'The King', dir: 0.6, pose: 'king', scale: 1.25, glow: f.king_done ? 0x6a5020 : 0x3a2a80, glowK: f.king_done ? 0.25 : 0.6 }, btn: '👑', ir: 2.8, use: king });
    if (f.king_done) out.push({ x: 49.5, y: 52.3, mk: () => { const g = new X.THREE.Group(); g.add(X.prop('portal_verdant', 0, 0, { h: 3.2, glow: 0x80ff90, glowK: 0.4 })); g.add(X.glowDisc(0x80ff90, 1.5)); return g; }, r: 0.4, icon: '⬆️', iconH: 3.6, use: async () => 'go:village' });
  }
  for (const o of out) if (o.actor && o.id) o.actor.marker = marker(o.id);
  return out;
}
export const START = { village: [23, 38], deep: [8.5, 8.6], entry: [8.5, 8.6], fromDeep: [10.6, 10.4] };
export async function onEnter(zone) {
  if (zone === 'deep') await deepIntro();
  if (zone === 'village' && fl().king_done) await ending();
}
export async function intro() {
  await narrate('Ты приходишь в себя посреди пустыни, у края оазиса. Память в тумане. Впереди — деревня из костей и шкур, и люди в ней говорят на языке, которого ты не знаешь…');
  await narrate('Это английский. Слушай, смотри на жесты 👋 и <b>нажимай на слова</b>: под каждым можно записать свою догадку по-русски. Она будет подписана везде, где слово встретится снова.');
  await narrate('Встретив все четыре слова страницы журнала 📖, ты сможешь её расшифровать — сопоставить слова с рисунками. Тогда слова откроются по-настоящему.', 'Начать ▶');
}
