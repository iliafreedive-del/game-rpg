// Настройки языка курса. Здесь — английский; китайская версия (Chinese/js/lang.js) подставляется
// через importmap в Chinese/index.html вместе со своими data / check / explain / gloss.
export const LANG = {
  code: 'en',
  key: 'english-course-v1',   // ключ прогресса в localStorage
  file: 'english',            // имя файла при сохранении прогресса
  na: 'на английский',
  po: 'по-английски',
  tts: 'en-US',
  sr: 'en-US',
  voiceRe: /^en[-_]/i,
  voiceBad: null,
  region: /en[-_]US/i,
  voiceNames: /aria|jenny|guy|ava|emma|andrew|brian|michelle|samantha|allison|susan|tom|evan|nathan|zoe|joelle|noelle|serena/i,
  hello: "Hi! I'm your English teacher. Let's practice together, step by step.",
  placeholder: 'Напиши по-английски…',
  say: null,   // как превратить текст фразы в текст для озвучки
  tap: null,   // своя разметка фразы со словами по нажатию (null — по пробелам)
  show: null,  // своя разметка текста на изучаемом языке (null — как есть)
  voiceHint(ua) {
    if (/iPhone|iPad|Mac/.test(ua)) return 'На iPhone / Mac голоса лучше скачать: Настройки → Универсальный доступ → Устный контент → Голоса → English → например «Ava (улучшенный)» или «Zoe (улучшенный)», затем выбери его здесь.';
    if (/Android/.test(ua)) return 'На Android: Настройки → Синтез речи → Google → Установить голосовые данные → English (US) — выбери голос «высокого качества».';
    if (/Edg\//.test(ua)) return 'В Edge есть очень живые голоса «Natural» — например Aria или Jenny.';
    return 'Самые живые голоса — в браузере Edge (Natural) и в Chrome (Google US English).';
  },
  noVoice: '',
};
