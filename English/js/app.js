import { UNITS, LESSONS, lessonById } from './data.js';
import { S, save, reset, importData, dayKey, today, goalSec, addSec, addXP, countAnswer, streak, srsAnswer, srsAdd, dueKeys, nextDue } from './store.js';
import { speak, listen, stopListening, srSupported, ttsSupported, englishVoices, beep } from './speech.js';
import { checkText, speechScore, speechOk, words as normWords, tilesOf } from './check.js';
import * as X from './exercises.js';
import { explain, RULES } from './explain.js';
import { gloss } from './gloss.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const plural = (n, a, b, c) => { const m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };
const sayBtn = (text, cls = '') => `<button class="say ${cls}" data-say="${esc(text)}" aria-label="Озвучить">🔊</button>`;

const main = $('#main');
const runEl = $('#run');

function toast(msg, ms = 2600) {
  const t = h(`<div class="toast">${msg}</div>`);
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

// Любая кнопка 🔊 озвучивает свой текст; долгое нажатие не нужно — второй клик медленнее.
let lastSaid = { t: '', at: 0 };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-say]');
  if (!b) return;
  e.preventDefault();
  const t = b.dataset.say;
  const slow = lastSaid.t === t && Date.now() - lastSaid.at < 4000;
  lastSaid = { t, at: slow ? 0 : Date.now() };
  speak(t, slow ? 0.6 : undefined);
});

// ─────────────── Слова по нажатию ───────────────
// Английская фраза, в которой каждое слово можно нажать: перевод, форма и правило.
const tapText = (s, mark = {}) => `<span class="tap" data-s="${esc(s)}">${tilesOf(s).map((w, i) =>
  `<span class="w ${mark[i] || ''}" data-i="${i}">${esc(w)}</span>`).join(' ')}${esc((s.match(/[.!?]+$/) || [''])[0])}</span>`;

function ruleCard(key, open = false) {
  const r = RULES[key];
  if (!r) return '';
  return `<details class="rule" ${open ? 'open' : ''}><summary>📘 ${r.title}</summary><p>${r.text}</p>
    ${r.ex.map(([en, ru]) => `<div class="example">${sayBtn(en, 'sm')}<div><b>${tapText(en)}</b><small>${esc(ru)}</small></div></div>`).join('')}</details>`;
}

function openGloss(tokens, i) {
  const g = gloss(tokens, i);
  document.querySelector('.sheet')?.remove();
  const sheet = h(`<div class="sheet"><div class="sheet-card">
    <div class="sheet-head">${sayBtn(g.word)}<div><b class="sheet-word">${esc(g.word)}</b><div class="sheet-ru">${esc(g.ru || '')}</div></div><button class="x sheet-x" aria-label="Закрыть">✕</button></div>
    ${g.phrase ? `<p>Входит в выражение <b>${esc(g.phrase[0])}</b> — ${esc(g.phrase[1])}.</p>` : ''}
    ${g.note ? `<p>${g.note}</p>` : ''}
    <p class="muted small">Во фразе: ${tokens.map((t, k) => k === i ? `<b>${esc(t)}</b>` : esc(t)).join(' ')}</p>
    ${g.rule ? ruleCard(g.rule) : ''}
  </div></div>`);
  sheet.onclick = e => { if (e.target === sheet || e.target.closest('.sheet-x')) sheet.remove(); };
  document.body.append(sheet);
  speak(g.word);
}
document.addEventListener('click', e => {
  const w = e.target.closest('.tap .w');
  if (!w) return;
  e.preventDefault();
  openGloss(tilesOf(w.closest('.tap').dataset.s), +w.dataset.i);
});

// ─────────────── Статус в шапке ───────────────
function header() {
  $('#streak').textContent = `🔥 ${streak()}`;
  $('#xp').textContent = `⭐ ${S.xp}`;
}

const isDone = L => !!S.lessons[L.id];
const isOpen = (L, i) => S.settings.unlockAll || i === 0 || isDone(L) || isDone(LESSONS[i - 1]);
const nextLesson = () => LESSONS.find(L => !isDone(L));

// ─────────────── Экраны ───────────────
const views = { course, review, ref, progress, settings };

function route() {
  const v = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'course';
  const view = views[v] || course;
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.v === (views[v] ? v : 'course')));
  main.innerHTML = '';
  view();
  header();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

function ring(frac, label, sub) {
  const r = 34, c = 2 * Math.PI * r, f = Math.min(1, frac);
  return `<div class="ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" class="ring-bg"/><circle cx="40" cy="40" r="${r}" class="ring-fg ${f >= 1 ? 'full' : ''}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}"/></svg><div><b>${label}</b><small>${sub}</small></div></div>`;
}

function course() {
  const t = today(), goal = goalSec(), min = S.settings.focusMin;
  const met = t.sec >= goal;
  const nl = nextLesson();
  const due = dueKeys().length;
  const el = h(`<div>
    <section class="hero card">
      ${ring(t.sec / goal, `${Math.floor(t.sec / 60)}/${min}`, 'мин сегодня')}
      <div class="hero-text">
        <h1>${met ? 'Норма на сегодня есть ✅' : `${min} минут без перерыва`}</h1>
        <p>${met ? 'Хочешь ещё — запускай: лишняя сессия закрепит материал.' : 'Включается таймер, дальше просто занимайся: новый урок, повторение и речь идут сами одно за другим.'}</p>
      </div>
      <button class="btn big primary" id="go">▶ Начать ${min} минут</button>
      <div class="hero-sub">${nl ? `Следующий урок: <b>${esc(nl.title)}</b>` : 'Все уроки пройдены — сессия будет из повторения 💪'}${due ? ` · к повторению: <b>${due}</b>` : ''}</div>
    </section>
    <div id="units"></div>
  </div>`);
  main.append(el);
  $('#go', el).onclick = () => startRun('focus');
  const units = $('#units', el);
  let idx = 0;
  for (const U of UNITS) {
    const ls = LESSONS.filter(L => L.unit === U.id);
    const done = ls.filter(isDone).length;
    const sec = h(`<section class="unit"><h2><span>${U.icon}</span>${esc(U.title)}<small>${done}/${ls.length}</small></h2><div class="lessons"></div></section>`);
    for (const L of ls) {
      const i = idx++;
      const open = isOpen(L, i), st = S.lessons[L.id];
      const cur = L === nl;
      const card = h(`<button class="lesson ${st ? 'done' : ''} ${open ? '' : 'locked'} ${cur ? 'current' : ''}">
        <span class="num">${open ? i + 1 : '🔒'}</span>
        <span class="lt"><b>${esc(L.title)}</b><small>${esc(L.sub)}</small></span>
        <span class="stars">${st ? '★'.repeat(st.stars) + '☆'.repeat(3 - st.stars) : cur ? 'Начать' : ''}</span>
      </button>`);
      card.onclick = () => open ? startRun('lesson', L) : toast('Сначала пройди предыдущий урок. Открыть всё можно в настройках.');
      $('.lessons', sec).append(card);
    }
    units.append(sec);
  }
}

function review() {
  const due = dueKeys().length;
  const known = Object.keys(S.srs).length;
  const hard = Object.entries(S.srs).filter(([k, c]) => k[0] === 's' && c.bad > 0).sort((a, b) => b[1].bad - a[1].bad).slice(0, 15);
  const nd = known && !due ? nextDue() : 0;
  const el = h(`<div>
    <section class="card">
      <h1>🔁 Повторение</h1>
      <p class="muted">Фразы из пройденных уроков возвращаются через 1, 2, 4, 8… дней — ровно тогда, когда начинают забываться.</p>
      ${known ? `<div class="big-num">${due}<small>${plural(due, 'карточка ждёт', 'карточки ждут', 'карточек ждут')}</small></div>` : '<p>Пройди первый урок — и здесь появятся карточки.</p>'}
      ${due ? '<button class="btn primary big" id="rev">Повторить</button>' : known ? `<p class="muted">Всё повторено! Следующие карточки: ${new Date(nd).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.</p>` : ''}
      ${known ? '<button class="btn" id="prac">Свободная практика (без таймера)</button>' : ''}
    </section>
    ${hard.length ? `<section class="card"><h2>Трудные фразы</h2><ul class="phrases">${hard.map(([k, c]) => {
      const [, lid, i] = k.split(':'); const s = lessonById[lid]?.sents[i]; if (!s) return '';
      return `<li>${sayBtn(s[0])}<div><b>${esc(s[0])}</b><small>${esc(s[1])}</small></div><span class="bad-n">✗${c.bad}</span></li>`;
    }).join('')}</ul></section>` : ''}
  </div>`);
  main.append(el);
  $('#rev', el)?.addEventListener('click', () => startRun('review'));
  $('#prac', el)?.addEventListener('click', () => startRun('practice'));
}

function theoryHTML(L) {
  return L.theory.map(([k, a, b]) => {
    if (k === 'p') return `<p>${a}</p>`;
    if (k === 'tip') return `<div class="tip">💡 ${a}</div>`;
    if (k === 'f') return `<div class="formula">${a.split('\n').map(esc).join('<br>')}</div>`;
    if (k === 'ex') return `<div class="example">${sayBtn(a)}<div><b>${tapText(a)}</b><small>${esc(b)}</small></div></div>`;
    if (k === 't') return `<table class="tbl">${a.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    return '';
  }).join('');
}

function ref() {
  const el = h(`<div><section class="card"><h1>📖 Шпаргалка</h1><p class="muted">Все правила курса в одном месте. Нажми на тему, чтобы раскрыть. 🔊 — послушать пример, второй раз подряд — медленнее.</p></section></div>`);
  for (const U of UNITS) {
    const sec = h(`<section class="card ref-unit"><h2>${U.icon} ${esc(U.title)}</h2></section>`);
    for (const L of LESSONS.filter(L => L.unit === U.id)) {
      sec.append(h(`<details class="ref"><summary><b>${esc(L.title)}</b> <small>${esc(L.sub)}</small></summary><div class="theory">${theoryHTML(L)}
        <h4>Слова урока</h4><div class="wordlist">${L.words.map(([en, ru]) => `<span>${sayBtn(en, 'sm')}<b>${esc(en)}</b> — ${esc(ru)}</span>`).join('')}</div></div></details>`));
    }
    el.append(sec);
  }
  main.append(el);
}

function progress() {
  const days = Object.values(S.days);
  const totalSec = days.reduce((a, d) => a + d.sec, 0);
  const n = days.reduce((a, d) => a + d.n, 0), ok = days.reduce((a, d) => a + d.ok, 0);
  const focus = days.reduce((a, d) => a + (d.focus || 0), 0);
  const done = LESSONS.filter(isDone).length;
  const cards = Object.entries(S.srs);
  const learned = p => cards.filter(([k, c]) => k[0] === p && c.box >= 3).length;
  const boxes = [0, 0, 0, 0];
  for (const [, c] of cards) boxes[c.box <= 1 ? 0 : c.box <= 3 ? 1 : c.box <= 5 ? 2 : 3]++;
  const goal = goalSec();
  // календарь на 5 недель, начиная с понедельника
  const start = new Date(); start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 28);
  let cal = '';
  for (let i = 0; i < 35; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const s = S.days[dayKey(d)]?.sec || 0;
    const lvl = d > new Date() ? 'f' : s >= goal ? 3 : s >= goal / 2 ? 2 : s > 0 ? 1 : 0;
    cal += `<i class="c${lvl}" title="${d.toLocaleDateString('ru-RU')}: ${Math.round(s / 60)} мин"></i>`;
  }
  const el = h(`<div>
    <section class="card"><h1>📈 Прогресс</h1>
      <div class="tiles">
        <div><b>🔥 ${streak()}</b><small>${plural(streak(), 'день', 'дня', 'дней')} подряд с нормой</small></div>
        <div><b>⏱ ${totalSec >= 3600 ? `${Math.floor(totalSec / 3600)} ч ${Math.floor(totalSec % 3600 / 60)} м` : `${Math.floor(totalSec / 60)} мин`}</b><small>всего занятий</small></div>
        <div><b>🎯 ${focus}</b><small>сессий по ${S.settings.focusMin} мин</small></div>
        <div><b>📚 ${done}/${LESSONS.length}</b><small>уроков пройдено</small></div>
        <div><b>💬 ${learned('s')}</b><small>фраз выучено</small></div>
        <div><b>🔤 ${learned('w')}</b><small>слов выучено</small></div>
        <div><b>✅ ${n ? Math.round(ok / n * 100) : 0}%</b><small>верных ответов</small></div>
        <div><b>⭐ ${S.xp}</b><small>очков опыта</small></div>
      </div>
    </section>
    <section class="card"><h2>Последние 5 недель</h2>
      <div class="cal-head"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div>
      <div class="cal">${cal}</div>
      <div class="legend"><i class="c0"></i>нет <i class="c1"></i>немного <i class="c2"></i>полнормы <i class="c3"></i>норма ${S.settings.focusMin} мин</div>
    </section>
    <section class="card"><h2>Насколько крепко запомнено</h2>
      ${cards.length ? `<div class="stack">${boxes.map((b, i) => b ? `<i class="b${i}" style="flex:${b}">${b}</i>` : '').join('')}</div>
      <div class="legend"><i class="b0"></i>новые <i class="b1"></i>учу <i class="b2"></i>знаю <i class="b3"></i>навсегда</div>` : '<p class="muted">Пока пусто — пройди первый урок.</p>'}
      <p class="muted small">Всего карточек: ${cards.length}</p>
    </section>
  </div>`);
  main.append(el);
}

function settings() {
  const st = S.settings;
  const voices = englishVoices();
  const el = h(`<div>
    <section class="card"><h1>⚙️ Настройки</h1>
      <label class="row"><span>Длительность сессии</span><select id="fm">${[5, 10, 15, 20, 30].map(m => `<option value="${m}" ${m === st.focusMin ? 'selected' : ''}>${m} мин</option>`).join('')}</select></label>
      <label class="row"><span>Скорость речи</span><select id="rate">${[[0.7, 'медленно'], [0.85, 'спокойно'], [0.9, 'обычно'], [1, 'быстро']].map(([v, t]) => `<option value="${v}" ${v === st.rate ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${voices.length > 1 ? `<label class="row"><span>Голос</span><select id="voice"><option value="">авто</option>${voices.map(v => `<option ${v.name === st.voice ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` : ''}
      <div class="row"><span>${ttsSupported ? 'Озвучка работает' : 'Браузер не умеет озвучивать текст'}</span><button class="btn sm" data-say="Hello! Let's learn English together.">🔊 Проверить</button></div>
      <label class="row"><span>Автоозвучка правильных ответов</span><input type="checkbox" id="auto" ${st.autoplay ? 'checked' : ''}></label>
      <label class="row"><span>Звуки</span><input type="checkbox" id="sfx" ${st.sfx ? 'checked' : ''}></label>
    </section>
    <section class="card"><h2>🎙 Голос</h2>
      ${srSupported ? `<label class="row"><span>Задания «скажи вслух» и голосовой ввод</span><input type="checkbox" id="mic" ${st.mic ? 'checked' : ''}></label>
        <div class="row"><span id="mict" class="muted">Скажи что-нибудь по-английски</span><button class="btn sm" id="mtest">🎙 Проверить</button></div>`
      : '<p class="muted">Этот браузер не поддерживает распознавание речи. Работает в Chrome (Android, ПК) и Safari (iPhone, iOS 14.5+). Остальные задания доступны полностью.</p>'}
    </section>
    <section class="card"><h2>Уроки</h2>
      <label class="row"><span>Открыть все уроки (если уже знаешь основы)</span><input type="checkbox" id="ua" ${st.unlockAll ? 'checked' : ''}></label>
    </section>
    <section class="card"><h2>Данные</h2>
      <p class="muted small">Прогресс хранится в этом браузере. Чтобы перенести его на другое устройство — сохрани файл и загрузи его там.</p>
      <div class="btns"><button class="btn" id="exp">⬇ Сохранить прогресс</button><label class="btn">⬆ Загрузить<input type="file" id="imp" accept=".json,application/json" hidden></label><button class="btn danger" id="rst">Сбросить всё</button></div>
    </section>
    <section class="card"><h2>📱 На телефоне как приложение</h2>
      <p class="muted small">iPhone: Safari → «Поделиться» → «На экран Домой». Android: Chrome → ⋮ → «Добавить на главный экран». Работает и без интернета (кроме распознавания речи).</p>
    </section>
  </div>`);
  main.append(el);
  const bind = (id, fn) => { const i = $('#' + id, el); if (i) i.onchange = () => { fn(i); save(); }; };
  bind('fm', i => st.focusMin = +i.value);
  bind('rate', i => st.rate = +i.value);
  bind('voice', i => st.voice = i.value);
  bind('auto', i => st.autoplay = i.checked);
  bind('sfx', i => st.sfx = i.checked);
  bind('mic', i => st.mic = i.checked);
  bind('ua', i => st.unlockAll = i.checked);
  $('#mtest', el)?.addEventListener('click', async () => {
    const t = $('#mict', el);
    t.textContent = 'Слушаю…';
    try {
      const r = await listen(s => t.textContent = s);
      t.textContent = r[0] ? `Распознано: «${r[0]}»` : 'Ничего не услышал. Проверь разрешение на микрофон.';
    } catch (e) { t.textContent = micError(e); }
  });
  $('#exp', el).onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
    a.download = `english-progress-${dayKey()}.json`;
    a.click();
  };
  $('#imp', el).onchange = async e => {
    try { importData(await e.target.files[0].text()); toast('Прогресс загружен'); route(); } catch { toast('Не получилось прочитать файл'); }
  };
  $('#rst', el).onclick = () => {
    if (confirm('Удалить весь прогресс? Это нельзя отменить.')) { reset(); toast('Прогресс сброшен'); route(); }
  };
}

function micError(e) {
  const m = e?.message || '';
  if (/not-allowed|service-not-allowed/.test(m)) return 'Нет доступа к микрофону. Разреши его в настройках браузера для этого сайта.';
  if (/network/.test(m)) return 'Распознаванию речи нужен интернет.';
  if (/audio-capture/.test(m)) return 'Микрофон не найден.';
  return 'Не получилось распознать речь. Попробуй ещё раз.';
}

// ─────────────── Сессия занятий ───────────────
// kind: lesson | focus | review | practice. Очередь заданий; для каждой «пачки» (урока) — свой маркер end,
// перед которым повторяются ошибки этой пачки.
let run = null;
let blockSeq = 0;

function block(items, kind, lid) {
  const b = ++blockSeq;
  return [...items.filter(Boolean).map(x => ({ ...x, block: b })), { type: 'end', block: b, kind, lid }];
}

function startRun(kind, L) {
  run = {
    kind, queue: [], i: 0, results: [], retry: {}, xp: 0, elapsed: 0,
    timed: kind === 'focus', total: S.settings.focusMin * 60, timeUp: false,
    paused: false, lastAct: Date.now(), used: new Set(), lessonsDone: [], last: null,
  };
  if (kind === 'lesson') run.queue = [{ type: 'theory', lid: L.id }, ...block(X.lessonExercises(L), 'lesson', L.id)];
  if (kind === 'review') run.queue = block(dueKeys().slice(0, 20).map(X.fromKey), 'review');
  if (kind === 'practice') run.queue = block(X.practiceKeys(15).map(X.fromKey), 'review');
  if (kind === 'focus') refillFocus();
  if (!run.queue.length) { run = null; toast('Пока нечего повторять'); return; }
  history.pushState({ run: 1 }, '');
  document.body.classList.add('running');
  runEl.hidden = false;
  runEl.innerHTML = `<div class="run-top"><button class="x" id="rx" aria-label="Выйти">✕</button><div class="bar"><i></i></div><div class="timer" id="rt"></div><button class="x" id="rp" aria-label="Пауза" ${run.timed ? '' : 'hidden'}>⏸</button></div>
    <div class="run-body" id="rb"></div><div class="run-foot" id="rf"></div>`;
  $('#rx').onclick = exitRun;
  $('#rp').onclick = () => pauseRun('pause');
  render();
}

// Фокус-сессия: разминка повторением → новый урок → закрепление → следующий урок…
function refillFocus() {
  const q = run.queue;
  if (!run.warmed) {
    run.warmed = true;
    const due = dueKeys().slice(0, 6);
    due.forEach(k => run.used.add(k));
    if (due.length) { q.push(...block(due.map(X.fromKey), 'warm')); return; }
  }
  const L = LESSONS.find(L => !isDone(L) && !run.lessonsDone.includes(L.id));
  if (L && run.last !== 'lesson') {
    run.last = 'lesson';
    q.push({ type: 'theory', lid: L.id }, ...block(X.lessonExercises(L), 'lesson', L.id));
    return;
  }
  run.last = 'practice';
  const keys = X.practiceKeys(8, run.used);
  if (keys.length < 4) run.used.clear();
  const items = (keys.length ? keys : X.practiceKeys(8)).map(X.fromKey);
  if (items.length) q.push(...block(items, 'practice'));
  else if (L) refillFocus();
}

function exitRun() {
  if (run && !run.finished && run.results.length > 2 && !confirm(run.kind === 'focus' ? 'Закончить сессию раньше? Время и ответы сохранятся.' : 'Выйти из урока? Ответы сохранятся, но урок не засчитается.')) return;
  closeRun();
}
function closeRun() {
  stopListening();
  speechSynthesis?.cancel();
  run = null;
  save();
  runEl.hidden = true;
  runEl.innerHTML = '';
  document.body.classList.remove('running');
  if (history.state?.run) history.back(); else route();
}
window.addEventListener('popstate', () => {
  if (run) { stopListening(); run = null; save(); runEl.hidden = true; runEl.innerHTML = ''; document.body.classList.remove('running'); }
  route();
});

function pauseRun(why) {
  if (!run || run.paused) return;
  run.paused = true;
  stopListening();
  const ov = h(`<div class="pause"><div class="card"><h2>${why === 'idle' ? '⏸ Ты отвлёкся?' : '⏸ Пауза'}</h2>
    <p>${why === 'idle' ? 'Таймер остановлен — больше минуты без действий. Цель — заниматься без перерыва.' : 'Таймер стоит. Возвращайся скорее — непрерывность важнее всего.'}</p>
    <button class="btn primary big">▶ Продолжить</button></div></div>`);
  $('button', ov).onclick = () => { run.paused = false; run.lastAct = Date.now(); ov.remove(); };
  runEl.append(ov);
}

['pointerdown', 'keydown', 'input'].forEach(e => document.addEventListener(e, () => { if (run) run.lastAct = Date.now(); }, true));

setInterval(() => {
  if (!run || run.paused || run.finished || document.hidden) return;
  const idleLimit = run.queue[run.i]?.type === 'theory' ? 240e3 : 90e3;
  if (Date.now() - run.lastAct > idleLimit) { pauseRun('idle'); return; }
  run.elapsed++;
  addSec(1);
  if (run.elapsed % 5 === 0) save();
  if (run.timed && !run.timeUp && run.elapsed >= run.total) {
    run.timeUp = true;
    today().focus = (today().focus || 0) + 1;
    addXP(30); run.xp += 30;
    save();
    beep('done');
    toast('⏰ Время! Заверши это задание — и отсечка.');
  }
  topbar();
}, 1000);

function topbar() {
  if (!run) return;
  const t = $('#rt'), bar = $('.run-top .bar i');
  if (!t) return;
  if (run.timed) {
    const left = Math.max(0, run.total - run.elapsed);
    t.textContent = run.timeUp ? '0:00' : fmt(left);
    t.classList.toggle('end', left <= 60);
    bar.style.width = `${Math.min(100, run.elapsed / run.total * 100)}%`;
  } else {
    t.textContent = fmt(run.elapsed);
    const n = run.queue.filter(x => x.type !== 'end' && x.type !== 'theory').length;
    const d = run.queue.slice(0, run.i).filter(x => x.type !== 'end' && x.type !== 'theory').length;
    bar.style.width = `${n ? d / n * 100 : 0}%`;
  }
}

function next() {
  run.lastAct = Date.now();
  if (run.timeUp && run.timed) return finishFocus();
  run.i++;
  if (run.i >= run.queue.length && run.kind === 'focus') refillFocus();
  if (run.i >= run.queue.length) return finish();
  render();
}

// Следующее задание отработки (или итог, если 3 подряд верно / задания кончились).
function drillNext(start) {
  const d = run.drill;
  run.lastAct = Date.now();
  if (!d) return next();
  let item;
  if (!start && d.streak >= d.need) { item = { type: 'drillDone', ok: true, n: d.done }; run.drill = null; }
  else if (d.done >= d.max) { item = { type: 'drillDone', ok: false, n: d.done }; run.drill = null; }
  else item = { ...X.drillItem(d), drill: true, again: true };
  run.queue.splice(run.i + 1, 0, { ...item, block: run.queue[run.i].block });
  run.i++;
  render();
}

function render() {
  const ex = run.queue[run.i];
  const body = $('#rb'), foot = $('#rf');
  body.innerHTML = ''; foot.innerHTML = ''; foot.className = 'run-foot';
  body.scrollTop = 0;
  topbar();
  if (ex.type === 'end') return endBlock(ex);
  if (ex.type === 'theory') return renderTheory(ex, body, foot);
  if (ex.type === 'lessonDone') return renderLessonDone(ex, body, foot);
  R[ex.type](ex, body, foot);
  if (ex.drill && run.drill) {
    const d = run.drill;
    body.prepend(h(`<div class="drill-bar">🎯 Отработка · подряд верно: <b>${d.streak}</b> из ${d.need} ${'●'.repeat(d.streak)}${'○'.repeat(Math.max(0, d.need - d.streak))}</div>`));
  }
}

function endBlock(ex) {
  const retry = run.retry[ex.block];
  if (retry?.length) {
    delete run.retry[ex.block];
    run.queue.splice(run.i, 0, { type: 'retryNote', block: ex.block }, ...retry);
    return render();
  }
  if (ex.kind === 'lesson') {
    const L = lessonById[ex.lid];
    const rs = run.results.filter(r => r.block === ex.block && r.first);
    const acc = rs.length ? rs.filter(r => r.ok).length / rs.length : 1;
    const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    const prev = S.lessons[L.id];
    S.lessons[L.id] = { stars: Math.max(stars, prev?.stars || 0), best: Math.max(acc, prev?.best || 0), times: (prev?.times || 0) + 1 };
    X.lessonKeys(L).forEach(srsAdd);
    addXP(20); run.xp += 20;
    run.lessonsDone.push(L.id);
    save();
    beep('done');
    if (run.kind === 'lesson' || run.finishAfterLesson) return finish({ L, stars, acc });
    run.queue.splice(run.i + 1, 0, { type: 'lessonDone', lid: L.id, stars, acc });
  }
  next();
}

// ───── Рендер заданий ─────
const R = {};

function renderTheory(ex, body, foot) {
  const L = lessonById[ex.lid];
  const n = LESSONS.indexOf(L) + 1;
  body.innerHTML = `<div class="theory"><div class="kicker">Урок ${n} · теория</div><h1>${esc(L.title)}</h1>${theoryHTML(L)}
    <h4>Новые слова</h4><div class="wordlist">${L.words.map(([en, ru]) => `<span>${sayBtn(en, 'sm')}<b>${esc(en)}</b> — ${esc(ru)}</span>`).join('')}</div></div>`;
  const b = h('<button class="btn primary big">Понятно → к заданиям</button>');
  b.onclick = next;
  foot.append(b);
}

function renderLessonDone(ex, body, foot) {
  const L = lessonById[ex.lid];
  body.innerHTML = `<div class="center done-card"><div class="stars-big">${'★'.repeat(ex.stars)}<span>${'☆'.repeat(3 - ex.stars)}</span></div>
    <h1>Урок пройден!</h1><p>«${esc(L.title)}» — ${Math.round(ex.acc * 100)}% с первой попытки.</p><p class="muted">Таймер идёт дальше: закрепляем пройденное.</p></div>`;
  const b = h('<button class="btn primary big">Дальше</button>');
  b.onclick = next;
  foot.append(b);
}

R.drillDone = (ex, body, foot) => {
  body.innerHTML = ex.ok
    ? `<div class="center"><div class="emoji">🎯</div><h1>Закреплено!</h1><p>Три раза подряд без ошибок — правило работает. Эти фразы ещё вернутся в повторении, чтобы не забылись.</p><p class="muted">Заданий в отработке: ${ex.n}</p></div>`
    : `<div class="center"><div class="emoji">💪</div><h1>Хорошая работа</h1><p>Сделано ${ex.n} заданий на это правило. Идём дальше — фразы вернутся в работе над ошибками и в повторении.</p></div>`;
  const b = h('<button class="btn primary big">Дальше</button>');
  b.onclick = next;
  foot.append(b);
};

R.retryNote = (ex, body, foot) => {
  body.innerHTML = '<div class="center"><div class="emoji">🔄</div><h1>Работа над ошибками</h1><p>Ещё раз задания, где были ошибки. Так они запоминаются лучше всего.</p></div>';
  const b = h('<button class="btn primary big">Поехали</button>');
  b.onclick = next;
  foot.append(b);
};

function checkFoot(foot, grade) {
  const b = h('<button class="btn primary big" id="chk" disabled>Проверить</button>');
  b.onclick = () => { if (!b.disabled) result(grade()); };
  foot.append(b);
  return ready => { b.disabled = !ready; };
}

function prompt(body, title, html = '') {
  body.innerHTML = `<div class="ex"><div class="kicker">${title}</div>${html}</div>`;
  return $('.ex', body);
}

// Итог ответа: начисления, повторение ошибок, плашка внизу.
function result({ ok, answer, ru, note, say, typo, skip, user, variants, points: extraPoints }) {
  const ex = run.queue[run.i];
  if (!skip) {
    const first = !ex.again;
    run.results.push({ ok, first, block: ex.block, type: ex.type });
    countAnswer(ok);
    if (ex.key) srsAnswer(ex.key, ok);
    if (ok) { const x = first ? 10 : 5; addXP(x); run.xp += x; }
    if (!ok && first && ex.type !== 'match') (run.retry[ex.block] ||= []).push(rebuild(ex));
    beep(ok ? 'ok' : 'bad');
  }
  save();
  header();
  const foot = $('#rf');
  foot.innerHTML = '';
  foot.className = `run-foot ${skip ? 'skip' : ok ? 'ok' : 'bad'}`;
  const msg = skip ? 'Пропущено' : ok ? (typo ? 'Верно, но есть опечатка' : pick(['Отлично!', 'Верно!', 'Так держать!', 'Супер!', 'Точно!'])) : 'Не совсем';
  const english = answer && !/[а-яё]/i.test(answer);

  // разбор ошибки: что не так, почему и какое правило
  let diff = '', why = '', rules = '';
  const mark = {};
  if (!ok && !skip && user && variants) {
    const e = explain(user, variants);
    const tw = normWords(answer), tt = tilesOf(answer);
    if (e.target === answer && tw.length === tt.length) for (const o of e.ops) if (o.op === 'miss' || o.op === 'sub') mark[o.ti] = 'need';
    diff = `<div class="fb-you"><small>Твой ответ:</small> ${e.ops.filter(o => o.op !== 'miss').map(o =>
      o.op === 'eq' ? esc(o.u) : `<s>${esc(o.u)}</s>`).join(' ') || '—'}</div>`;
    run.focus = e.ops.filter(o => o.op === 'miss' || o.op === 'sub').map(o => o.t);
    if (e.low) {
      // ответ далёк от правильного — вместо списка мелочей разбираем фразу по словам
      const tok = tilesOf(answer);
      why = `<div class="fb-why"><b>Разберём фразу по словам:</b><ul>${tok.map((w, i) => `<li><b>${esc(w)}</b> — ${esc(gloss(tok, i).ru || '')}</li>`).join('')}</ul>
        ${note || extraPoints?.length ? `<p>💡 ${[...(extraPoints || []), ...(note ? [note] : [])].join(' ')}</p>` : ''}</div>`;
      rules = e.rules.slice(0, 1).map(k => ruleCard(k, true)).join('');
    } else {
      const pts = [...(extraPoints || []), ...(note ? [note] : []), ...e.points];
      if (pts.length) why = `<div class="fb-why"><b>Почему:</b><ul>${pts.map(p => `<li>${p}</li>`).join('')}</ul></div>`;
      rules = e.rules.slice(0, 2).map((k, i) => ruleCard(k, i === 0)).join('');
    }
  } else if (!ok && !skip && (note || extraPoints?.length)) {
    why = `<div class="fb-why"><b>Почему:</b><ul>${[...(extraPoints || []), ...(note ? [note] : [])].map(p => `<li>${p}</li>`).join('')}</ul></div>`;
  }
  const L = lessonById[ex.lid];
  const lessonRule = !ok && !skip && L ? `<details class="rule"><summary>📖 Правило урока «${esc(L.title)}»</summary>${theoryHTML({ theory: L.theory.filter(t => t[0] !== 'tip').slice(0, 6) })}</details>` : '';
  foot.append(h(`<div class="fb">
    <div class="fb-title">${ok ? '✓' : skip ? '→' : '✗'} ${msg}</div>
    ${diff}
    ${answer ? `<div class="fb-ans">${say ? sayBtn(say) : ''}<div>${!ok || typo ? '<small>Правильно:</small>' : ''}<b>${english ? tapText(answer, mark) : esc(answer)}</b>${ru ? `<small>${esc(ru)}</small>` : ''}</div></div>` : ''}
    ${english ? '<div class="fb-hint">👆 Нажми на любое слово — перевод и почему оно здесь</div>' : ''}
    ${why}${rules}${lessonRule}
  </div>`));
  const btns = h('<div class="fb-btns"></div>');
  const btn = (id, label, primary, fn) => { const x = h(`<button class="btn big ${primary ? 'primary' : ''}" id="${id}">${label}</button>`); x.onclick = fn; btns.append(x); };
  const inDrill = run.drill && ex.drill;
  if (inDrill && !skip) { run.drill.done++; run.drill.streak = ok ? run.drill.streak + 1 : 0; }
  const timeOut = run.timeUp && run.timed;
  if (timeOut) btn('nxt', 'Завершить ⏰', true, () => { run.drill = null; next(); });
  else if (inDrill) {
    // в отработке: дальше — следующая похожая фраза, или выйти
    btn(ok ? 'nxt' : 'rep', ok ? 'Дальше' : '🎯 Ещё фраза', true, () => drillNext());
    btn('drx', 'Хватит, дальше', false, () => { run.drill = null; next(); });
  } else if (!ok && !skip && ex.type !== 'match') {
    // после ошибки — выбор: отработать до конца или идти дальше
    btn('rep', '🎯 Отработать', true, () => { run.drill = X.makeDrill(ex, run.focus); run.drillOf = ex; drillNext(true); });
    btn('nxt', 'Дальше', false, next);
  } else btn('nxt', 'Дальше', true, next);
  foot.append(btns);
  if (!ok && !skip && !inDrill && !timeOut && ex.type !== 'match') foot.append(h('<div class="fb-hint drill-hint">🎯 Отработать — то же задание и похожие фразы на это правило, пока не получится 3 раза подряд</div>'));
  btns.firstChild.focus({ preventScroll: true });
  if (say && ok && S.settings.autoplay && !['speak'].includes(ex.type)) speak(say);
}
const pick = a => a[Math.floor(Math.random() * a.length)];

// При повторе ошибки формат меняется на более простой, но смысл тот же.
function rebuild(ex) {
  let r = ex;
  if (ex.type === 'translate' || ex.type === 'speak') r = X.build(ex);
  else if (ex.type === 'build' || ex.type === 'listen') r = X.build(ex, ex.type === 'listen');
  else if (ex.type === 'choose_ru') r = X.chooseRu(ex);
  else if (ex.type === 'word' || ex.type === 'word_type') r = X.wordChoose(ex);
  return { ...r, block: ex.block, again: true };
}

R.mc = (ex, body, foot) => {
  const el = prompt(body, 'Выбери правильный вариант', `<div class="q">${esc(ex.q).replace('___', '<span class="blank">___</span>')}</div><div class="opts"></div>`);
  let sel = -1;
  const set = checkFoot(foot, () => {
    const fill = o => (ex.q.includes('___') ? ex.q.replace('___', o === '—' ? '' : o) : o).replace(/ \(.*\)/, '').replace(/\s+/g, ' ').trim();
    const ans = fill(ex.o[ex.a]);
    const en = !/[а-яё]/i.test(ans);
    return { ok: sel === ex.a, answer: ans, note: ex.ex, say: en ? ans : null,
      user: en && sel >= 0 ? fill(ex.o[sel]) : null, variants: [ans] };
  });
  ex.o.forEach((o, i) => {
    const b = h(`<button class="opt"><span class="k">${i + 1}</span>${esc(o)}</button>`);
    b.onclick = () => { sel = i; $('.opts', el).querySelectorAll('.opt').forEach((x, j) => x.classList.toggle('sel', j === i)); set(true); };
    $('.opts', el).append(b);
  });
};

R.gap = (ex, body, foot) => {
  const [a, b] = ex.g.split('___');
  const el = prompt(body, 'Впиши слово', `<div class="q">${esc(a)}<input class="gap-in" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="en">${esc(b)}</div><div class="ru">${esc(ex.ru)}</div>`);
  const inp = $('input', el);
  const set = checkFoot(foot, () => {
    const r = checkText(inp.value, ex.a);
    inp.disabled = true;
    const full = ex.g.replace('___', ex.a[0]);
    return { ok: r.ok, answer: full, note: ex.ex, say: full, user: ex.g.replace('___', inp.value.trim()), variants: ex.a.map(a => ex.g.replace('___', a)) };
  });
  inp.oninput = () => set(inp.value.trim().length > 0);
  setTimeout(() => inp.focus(), 50);
};

function tileExercise(ex, body, foot, listenMode) {
  const el = prompt(body, listenMode ? 'Послушай и собери фразу' : 'Собери перевод',
    `${listenMode ? `<div class="listen-btns">${sayBtn(ex.en, 'huge')}<button class="say slow" data-slow="1" aria-label="Медленно">🐢</button></div>` : `<div class="q ru-q">${esc(ex.ru)}</div>`}
     <div class="answer-zone"></div><div class="bank"></div>`);
  const zone = $('.answer-zone', el), bank = $('.bank', el);
  const chosen = [];
  const set = checkFoot(foot, () => {
    el.querySelectorAll('.tile').forEach(t => t.disabled = true);
    const user = chosen.map(c => c.w).join(' ');
    const r = checkText(user, ex.variants);
    // после проверки собранные слова тоже можно нажать
    zone.querySelectorAll('.tile').forEach((t, k) => { t.disabled = false; t.onclick = () => openGloss(chosen.map(c => c.w), k); });
    return { ok: r.ok, answer: ex.en, ru: ex.ru, say: ex.en, user, variants: ex.variants };
  });
  ex.tiles.forEach((w, i) => {
    const t = h(`<button class="tile">${esc(w)}</button>`);
    t.onclick = () => {
      const k = chosen.findIndex(c => c.i === i);
      if (k >= 0) { chosen.splice(k, 1); bank.querySelector(`[data-i="${i}"]`).classList.remove('used'); t.remove(); }
      set(chosen.length > 0);
    };
    const src = h(`<button class="tile" data-i="${i}">${esc(w)}</button>`);
    src.onclick = () => {
      if (src.classList.contains('used')) return;
      src.classList.add('used');
      chosen.push({ i, w });
      zone.append(t);
      set(true);
    };
    bank.append(src);
  });
  if (listenMode) {
    $('[data-slow]', el).onclick = () => speak(ex.en, 0.55);
    setTimeout(() => speak(ex.en), 250);
  }
}
R.build = (ex, b, f) => tileExercise(ex, b, f, false);
R.listen = (ex, b, f) => tileExercise(ex, b, f, true);

function micButton(onText, onState) {
  const b = h('<button class="mic" aria-label="Говорить">🎙</button>');
  b.onclick = async () => {
    if (b.classList.contains('on')) { stopListening(); return; }
    b.classList.add('on'); onState?.('listen');
    try {
      const alts = await listen(t => onText(t, false));
      onText(alts, true);
    } catch (e) { onState?.('error', micError(e)); }
    b.classList.remove('on'); onState?.('idle');
  };
  return b;
}

R.translate = (ex, body, foot) => {
  const el = prompt(body, 'Переведи на английский', `<div class="q ru-q">${esc(ex.ru)}</div>
    <textarea class="tr-in" rows="3" placeholder="Напиши по-английски…" autocomplete="off" autocapitalize="sentences" autocorrect="off" spellcheck="false" lang="en"></textarea>
    <div class="tr-tools"><span class="muted small" id="mstate"></span></div>`);
  const inp = $('textarea', el);
  const set = checkFoot(foot, () => {
    inp.disabled = true;
    const r = checkText(inp.value, ex.variants);
    return { ok: r.ok, typo: r.typo, answer: ex.en, ru: null, say: ex.en, user: inp.value, variants: ex.variants };
  });
  inp.oninput = () => set(inp.value.trim().length > 0);
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chk')?.click(); } };
  if (X.micOn()) {
    const st = $('#mstate', el);
    $('.tr-tools', el).prepend(micButton((t, fin) => {
      inp.value = Array.isArray(t) ? (t[0] || inp.value) : t;
      set(inp.value.trim().length > 0);
      if (fin && Array.isArray(t) && t.length) {
        // если среди вариантов распознавания есть верный — берём его
        const good = t.find(a => checkText(a, ex.variants).ok);
        if (good) inp.value = good;
      }
    }, (s, m) => st.textContent = s === 'listen' ? 'Говори…' : s === 'error' ? m : 'Можно сказать голосом'));
    st.textContent = 'Можно сказать голосом';
  }
  setTimeout(() => inp.focus(), 50);
};

R.speak = (ex, body, foot) => {
  const el = prompt(body, 'Скажи вслух по-английски', `<div class="speak-target">${sayBtn(ex.en)}<div><b class="words">${normWords(ex.en).length ? ex.en.split(' ').map(w => `<span>${esc(w)}</span>`).join(' ') : ''}</b><small>${esc(ex.ru)}</small></div></div>
    <div class="mic-wrap"></div><div class="heard muted">Нажми на микрофон и прочитай фразу</div>`);
  let tries = 0;
  const heard = $('.heard', el);
  const mic = micButton((t, fin) => {
    if (!fin) { heard.textContent = t; return; }
    if (!t.length) { heard.textContent = 'Ничего не услышал — попробуй ещё раз, громче и ближе к микрофону.'; return; }
    let best = null;
    for (const v of ex.variants) for (const a of t) {
      const s = speechScore(a, v);
      if (!best || s.score > best.score) best = { ...s, heard: a, v };
    }
    const ok = speechOk(best.score, best.t.length);
    if (best.v === ex.en && best.t.length === ex.en.split(' ').length) $('.words', el).innerHTML = best.t.map((w, i) => `<span class="${best.hit[i] ? 'hit' : 'miss'}">${esc(ex.en.split(' ')[i] ?? w)}</span>`).join(' ');
    heard.innerHTML = `Услышал: «${esc(best.heard)}»`;
    if (ok) return result({ ok: true, answer: ex.en, say: ex.en });
    tries++;
    heard.innerHTML += `<br><b>${tries >= 2 ? 'Не получилось. Можно ещё раз или пропустить.' : 'Почти! Красные слова не распознаны — попробуй ещё раз.'}</b>`;
    if (tries >= 2) skip.textContent = 'Дальше (засчитать ошибку)';
  }, (s, m) => { if (s === 'error') heard.textContent = m; if (s === 'listen') heard.textContent = 'Говори…'; });
  $('.mic-wrap', el).append(mic);
  const skip = h('<button class="btn big">Пропустить</button>');
  skip.onclick = () => { stopListening(); result({ ok: false, answer: ex.en, ru: ex.ru, say: ex.en, skip: tries === 0 }); };
  const off = h('<button class="link">🔇 Не могу говорить сейчас (на час)</button>');
  off.onclick = () => { X.pauseMic(); stopListening(); result({ skip: true, answer: ex.en, ru: ex.ru, say: ex.en }); };
  foot.append(skip, off);
};

function choose(ex, body, foot, title, shown) {
  const el = prompt(body, title, `<div class="q en-q">${sayBtn(shown)}<b>${esc(shown)}</b></div><div class="opts"></div>`);
  let sel = -1;
  const set = checkFoot(foot, () => {
    const pts = [];
    if (sel !== ex.a) {
      const other = enOf(ex.opts[sel]);
      pts.push(`«${esc(ex.opts[sel])}» — это ${other ? `<b>${esc(other)}</b>` : 'другая фраза'}.`);
      pts.push(`А <b>${esc(shown)}</b> — «${esc(ex.opts[ex.a])}». Нажми на слова фразы, чтобы разобрать её.`);
    }
    return { ok: sel === ex.a, answer: shown, ru: ex.opts[ex.a], say: shown, points: pts };
  });
  ex.opts.forEach((o, i) => {
    const b = h(`<button class="opt"><span class="k">${i + 1}</span>${esc(o)}</button>`);
    b.onclick = () => { sel = i; el.querySelectorAll('.opt').forEach((x, j) => x.classList.toggle('sel', j === i)); set(true); };
    $('.opts', el).append(b);
  });
  setTimeout(() => speak(shown), 250);
}
// русский перевод → английский оригинал (для объяснения неверного выбора)
const enOf = ru => {
  for (const L of LESSONS) {
    const s = L.sents.find(x => x[1] === ru); if (s) return s[0];
    const w = L.words.find(x => x[1] === ru); if (w) return w[0];
  }
  return null;
};
R.choose_ru = (ex, b, f) => choose(ex, b, f, 'Что означает эта фраза?', ex.en);
R.word = (ex, b, f) => choose(ex, b, f, 'Выбери перевод слова', ex.en);

R.word_type = (ex, body, foot) => {
  const el = prompt(body, 'Напиши по-английски', `<div class="q ru-q">${esc(ex.ru)}</div><input class="tr-in one" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="en" placeholder="слово…">`);
  const inp = $('input', el);
  const set = checkFoot(foot, () => { inp.disabled = true; const r = checkText(inp.value, [ex.en]); return { ok: r.ok, typo: r.typo, answer: ex.en, ru: ex.ru, say: ex.en, points: r.ok ? [] : [`«${esc(ex.ru)}» по-английски — <b>${esc(ex.en)}</b>.`] }; });
  inp.oninput = () => set(inp.value.trim().length > 0);
  setTimeout(() => inp.focus(), 50);
};

R.match = (ex, body) => {
  const el = prompt(body, 'Найди пары', '<div class="match"><div class="col l"></div><div class="col r"></div></div>');
  let selL = null, selR = null, left = ex.pairs.length, errors = 0;
  const tryPair = () => {
    if (!selL || !selR) return;
    const [a, b] = [selL, selR]; selL = selR = null;
    if (a.dataset.k === b.dataset.k) {
      [a, b].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); x.disabled = true; });
      beep('tick');
      if (--left === 0) setTimeout(() => result({ ok: errors <= 1, answer: errors > 1 ? 'Пары найдены, но с ошибками' : null }), 300);
    } else {
      errors++;
      [a, b].forEach(x => { x.classList.remove('sel'); x.classList.add('no'); setTimeout(() => x.classList.remove('no'), 450); });
    }
  };
  X.shuffle(ex.pairs).forEach(([en], i) => {
    const b = h(`<button class="tile m" data-k="${esc(en)}">${esc(en)}</button>`);
    b.onclick = () => { $('.l', el).querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); selL = b; speak(en); tryPair(); };
    $('.l', el).append(b); void i;
  });
  X.shuffle(ex.pairs).forEach(([en, ru]) => {
    const b = h(`<button class="tile m" data-k="${esc(en)}">${esc(ru)}</button>`);
    b.onclick = () => { $('.r', el).querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); selR = b; tryPair(); };
    $('.r', el).append(b);
  });
};

// Enter = главная кнопка, цифры 1–4 = варианты ответа.
document.addEventListener('keydown', e => {
  if (!run || run.paused) return;
  const tag = e.target.tagName;
  if (e.key === 'Enter' && tag !== 'TEXTAREA' && !e.target.closest?.('.tile,.opt,.say')) {
    const b = $('#rf .fb-btns .btn.primary') || $('#chk') || $('#rf .btn.primary');
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
  if (/^[1-4]$/.test(e.key) && tag !== 'INPUT' && tag !== 'TEXTAREA' && !$('#nxt')) {
    $$('.opts .opt')[+e.key - 1]?.click();
  }
});
const $$ = s => [...document.querySelectorAll(s)];

// ───── Итоги ─────
function summaryStats() {
  const rs = run.results;
  const ok = rs.filter(r => r.ok).length;
  return `<div class="tiles sm">
    <div><b>⏱ ${fmt(run.elapsed)}</b><small>время</small></div>
    <div><b>✅ ${rs.length ? Math.round(ok / rs.length * 100) : 0}%</b><small>${ok} из ${rs.length} верно</small></div>
    <div><b>⭐ +${run.xp}</b><small>опыт</small></div>
    <div><b>🔥 ${streak()}</b><small>${plural(streak(), 'день', 'дня', 'дней')} подряд</small></div>
  </div>`;
}

function finishFocus() {
  run.finished = true;
  document.querySelectorAll('.toast').forEach(t => t.remove());
  stopListening();
  const body = $('#rb'), foot = $('#rf');
  const midLesson = run.queue.slice(run.i + 1).some(x => x.type === 'end' && x.kind === 'lesson');
  body.innerHTML = `<div class="center done-card"><div class="emoji">🏁</div><h1>Отсечка! ${S.settings.focusMin} минут</h1>
    <p>Ты занимался без перерыва. Именно так появляется привычка — завтра в то же время?</p>
    ${run.lessonsDone.length ? `<p>Пройдено уроков: <b>${run.lessonsDone.map(id => '«' + esc(lessonById[id].title) + '»').join(', ')}</b></p>` : ''}
    ${summaryStats()}</div>`;
  foot.className = 'run-foot col';
  foot.innerHTML = '';
  if (midLesson) {
    const b = h('<button class="btn big primary">Дорешать урок до конца</button>');
    b.onclick = () => { run.finished = false; run.timed = false; run.finishAfterLesson = true; topbar(); run.i++; render(); };
    foot.append(b);
  }
  const more = h('<button class="btn big">Ещё 5 минут</button>');
  more.onclick = () => { run.finished = false; run.timeUp = false; run.total = run.elapsed + 300; run.i++; if (run.i >= run.queue.length) refillFocus(); render(); };
  const home = h(`<button class="btn big ${midLesson ? '' : 'primary'}">На главную</button>`);
  home.onclick = closeRun;
  foot.append(more, home);
}

function finish(info) {
  run.finished = true;
  const body = $('#rb'), foot = $('#rf');
  topbar();
  $('.run-top .bar i').style.width = '100%';
  if (info?.L) {
    const nl = nextLesson();
    body.innerHTML = `<div class="center done-card"><div class="stars-big">${'★'.repeat(info.stars)}<span>${'☆'.repeat(3 - info.stars)}</span></div>
      <h1>Урок пройден!</h1><p>«${esc(info.L.title)}» — ${Math.round(info.acc * 100)}% с первой попытки${info.stars < 3 ? '. Пройди ещё раз ради трёх звёзд — или иди дальше, ошибки вернутся в повторении.' : '.'}</p>${summaryStats()}</div>`;
    foot.className = 'run-foot col';
    if (nl) {
      const b = h(`<button class="btn big primary">Следующий: ${esc(nl.title)}</button>`);
      b.onclick = () => { closeRunSilently(); startRun('lesson', nl); };
      foot.append(b);
    }
  } else {
    body.innerHTML = `<div class="center done-card"><div class="emoji">🎉</div><h1>Готово!</h1>${summaryStats()}</div>`;
    foot.className = 'run-foot col';
  }
  const home = h(`<button class="btn big ${info?.L && nextLesson() ? '' : 'primary'}">На главную</button>`);
  home.onclick = closeRun;
  foot.append(home);
}

function closeRunSilently() {
  run = null;
  runEl.hidden = true;
  runEl.innerHTML = '';
  if (history.state?.run) history.replaceState(null, '');
}

// ─────────────── Старт ───────────────
route();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  // вышла новая версия — перезагружаемся, если не идёт занятие (иначе — при выходе на главную)
  let reloaded = !navigator.serviceWorker.controller; // при первой установке перезагрузка не нужна
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    const go = () => { reloaded = true; location.reload(); };
    if (!run) go(); else window.addEventListener('hashchange', go, { once: true });
  });
}
window.__eng = { get run() { return run; }, render, X };  // для отладки и автотестов
