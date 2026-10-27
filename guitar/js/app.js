// Экраны приложения и навигация.
import { LESSONS, STEPS, CHORDS, SONGS, PATTERNS, COUNT, FINGERS, changeTip, midiAt } from './data.js';
import { S, save, addSeconds, todayMinutes, streak, markDone, isDone, lessonProgress, dayKey, resetAll } from './store.js';
import { chordSVG, fretboardSVG, headstockSVG, tabSVG, illustration, fingerDot } from './svg.js';
import { strum, arpeggio, playNote, click, beep, ctx } from './audio.js';
import { activity } from './activity.js';
import {
  $, html, plural, Tuner, NoteChecker, FindNote, StringPicker, EarGame, StringCheck, ChordChecker, ChangesCounter,
  TimerWidget, Quiz, Recorder, StrumTrainer, Metronome, calibrateLatency, fmt,
} from './components.js';

const main = $('#main');
let cleanup = [];
const onLeave = fn => fn && cleanup.push(fn);

// ---------- учёт времени и занятие ----------
let session = null; // {plan, idx, left, paused}
let tick = 0;
setInterval(() => {
  if (session && !session.paused) {
    session.left--;
    if (session.left <= 0) nextPhase();
    renderSessionBar();
  }
  if ((activity.size || (session && !session.paused)) && !document.hidden) {
    addSeconds(1);
    if (++tick % 15 === 0) save();
    renderBadge();
  }
}, 1000);
document.addEventListener('visibilitychange', () => document.hidden && save());

function renderBadge() {
  $('#today').textContent = `⏱ ${todayMinutes()}/${S.settings.goal} мин`;
}

function currentLesson() {
  return LESSONS.find(l => lessonProgress(l) < 1) || LESSONS[LESSONS.length - 1];
}

function sessionPlan(goal) {
  const l = currentLesson();
  const warm = Math.max(2, Math.round(goal * 0.15)), main = Math.max(4, Math.round(goal * 0.5)), rep = Math.max(2, Math.round(goal * 0.2));
  const free = Math.max(1, goal - 2 - warm - main - rep);
  const w = l.id < 5
    ? { name: 'Разминка: открытые струны', link: '#/lesson/3', desc: 'Струны 6 → 1 и обратно, медленно: каждая должна звенеть.' }
    : { name: 'Разминка «паучок»', link: '#/lesson/4', desc: 'Лады 1-2-3-4 на всех струнах под метроном, по ноте на щелчок.' };
  const r = l.id >= 9
    ? { link: '#/trainer', desc: 'Бой и смены аккордов из прошлых уроков.' }
    : { link: `#/lesson/${Math.max(1, l.id - 1)}`, desc: 'Упражнения прошлого урока: то, что уже получается, закрепляем.' };
  return [
    { name: 'Настройка', min: 2, link: '#/tuner', desc: 'Проверьте строй всех 6 струн.' },
    { ...w, min: warm },
    { name: `Урок ${l.id}: ${l.title}`, min: main, link: `#/lesson/${l.id}`, desc: l.goal },
    { name: 'Повторение', min: rep, ...r },
    { name: 'Свободная игра', min: free, link: '#/trainer/songs', desc: 'Играйте то, что нравится: аккорды, мелодии, песни.' },
  ];
}

function startSession() {
  const plan = sessionPlan(S.settings.goal);
  session = { plan, idx: 0, left: plan[0].min * 60, paused: false };
  ctx();
  renderSessionBar();
  location.hash = plan[0].link;
}
function nextPhase() {
  beep(880, 0.3);
  session.idx++;
  if (session.idx >= session.plan.length) {
    session = null; save();
    toast('🎉 Занятие закончено! Отличная работа.');
    renderSessionBar();
    return;
  }
  session.left = session.plan[session.idx].min * 60;
  toast(`Дальше: ${session.plan[session.idx].name}`);
}
function renderSessionBar() {
  const bar = $('#session');
  if (!session) { bar.hidden = true; return; }
  const p = session.plan[session.idx];
  bar.hidden = false;
  bar.innerHTML = `<a href="${p.link}" class="sb-name">${session.idx + 1}/${session.plan.length} · ${p.name}</a>
    <b class="sb-time">${fmt(session.left)}</b>
    <button class="sb-btn" data-a="pause">${session.paused ? '▶' : '⏸'}</button>
    <button class="sb-btn" data-a="next">⏭</button><button class="sb-btn" data-a="stop">✕</button>`;
  bar.querySelectorAll('.sb-btn').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'pause') session.paused = !session.paused;
    if (a === 'next') { nextPhase(); if (session) location.hash = session.plan[session.idx].link; }
    if (a === 'stop') session = null;
    renderSessionBar();
  });
}

function toast(msg) {
  const t = html(`<div class="toast">${msg}</div>`);
  document.body.append(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
}

// ---------- общие куски ----------
const stepOf = n => STEPS.find(s => s.n === n);
const stepProgress = n => { const ls = LESSONS.filter(l => l.step === n); return ls.reduce((a, l) => a + lessonProgress(l), 0) / ls.length; };

// как ставить пальцы: по схеме аккорда, от указательного к мизинцу
function fingerList(ch) {
  const rows = ch.frets.map((f, i) => ({ f, s: 6 - i, fg: ch.fingers[i] })).filter(r => r.f > 0).sort((a, b) => a.fg - b.fg);
  const open = ch.frets.map((f, i) => (f === 0 ? 6 - i : 0)).filter(Boolean);
  const mute = ch.frets.map((f, i) => (f < 0 ? 6 - i : 0)).filter(Boolean);
  return `<ul class="fingers-l">${rows.map(r => `<li>${fingerDot(r.fg)} <b>${FINGERS[r.fg]}</b> — ${r.s}-я струна, ${r.f}-й лад</li>`).join('')}
    ${open.length ? `<li class="muted">○ открытые: ${open.join(', ')}</li>` : ''}
    ${mute.length ? `<li class="muted">✕ не играть: ${mute.join(', ')}</li>` : ''}</ul>`;
}

const ARROW = { D: '↓', U: '↑', X: '✕', B: 'Б', '': '·' };
const LEGEND = [['D', 'вниз'], ['U', 'вверх, по 3–4 тонким струнам'], ['X', 'вниз с глушением'], ['B', 'только бас'], ['', 'пауза: рука проходит мимо струн']];
const legendHTML = cells => `<div class="legend">${LEGEND.filter(([c]) => cells.includes(c)).map(([c, t]) => `<span><b>${ARROW[c]}</b> ${t}</span>`).join('')}</div>`;
const cellsHTML = cells => cells.map((c, i) => `<div class="cell ${c === 'X' ? 'mute' : ''}"><div class="arr">${ARROW[c]}</div><div class="cnt">${COUNT[i]}</div></div>`).join('');

// мелодии из блоков «табулатура»: кнопка «Послушать» находит их по номеру
let seqs = [];
function playSeq(targets, gap = 0.45) {
  const t0 = ctx().currentTime + 0.08;
  targets.forEach((t, k) => playNote(midiAt(t.s, t.f), t0 + k * gap, 0.55, gap * 2.2));
}
function playPattern(box, pattern, chord, bpm = 72, bars = 2) {
  const c = ctx(), cells = PATTERNS[pattern].cells, st = 60 / bpm / 2, t0 = c.currentTime + 0.1, els = box.querySelectorAll('.cell');
  for (let k = 0; k < bars * 8; k++) {
    const t = t0 + k * st, cell = cells[k % 8];
    if (k % 2 === 0) click(t, k % 8 === 0);
    if (cell) strum(chord, cell, t);
    setTimeout(() => els.forEach((x, i) => x.classList.toggle('now', i === k % 8)), (t - c.currentTime) * 1000);
  }
  setTimeout(() => els.forEach(x => x.classList.remove('now')), (t0 + bars * 8 * st - c.currentTime) * 1000);
}

function renderBlock(b, next) {
  switch (b.type) {
    case 'why': return `<div class="why"><b>Зачем это.</b> ${b.html}</div>`;
    case 'text': return `<div class="txt">${b.html}</div>`;
    case 'tip': return `<div class="tip">💡 ${b.html}</div>`;
    case 'secret': return `<div class="secret"><b>🔑 Секрет.</b> ${b.html}</div>`;
    case 'svg': return illustration(b.id);
    case 'steps': return `<div class="card steps"><h4>${b.title || 'Как делать'}</h4><ol class="steps-l">${b.items.map(i => `<li>${i.replace(/\(([1-4])\)/g, (_, f) => fingerDot(+f))}</li>`).join('')}</ol></div>`;
    case 'mistakes': return `<div class="card mistakes"><h4>⚠️ Частые ошибки</h4><ul class="mist-l">${b.items.map(([p, f]) => `<li><b>${p}</b> — ${f}</li>`).join('')}</ul></div>`;
    case 'chord': {
      const ch = CHORDS[b.chord];
      return `<div class="card chord-block"><div class="diagram">${chordSVG(b.chord)}</div>
        <div class="cb-side"><h3>${ch.name} <span class="muted">— ${ch.ru}</span></h3><p>${ch.about}</p>
          ${next && next.type === 'steps' ? '' : fingerList(ch)}
          <div class="row gap wrap"><button class="btn sm ghost" data-strum="${b.chord}">▶ Послушать</button><button class="btn sm ghost" data-arp="${b.chord}">▶ По струнам</button></div>
        </div></div>`;
    }
    case 'change': {
      const [a, c] = b.chords, tip = changeTip(a, c);
      return `<div class="card change-block"><h4>Смена ${a} ⇄ ${c}</h4>
        <div class="row gap center"><div class="diagram sm">${chordSVG(a)}</div><div class="chg-arrow">⇄</div><div class="diagram sm">${chordSVG(c)}</div></div>
        ${tip ? `<div class="tip">🔁 ${tip}</div>` : ''}
        <div class="row center"><button class="btn sm ghost" data-change="${a},${c}">▶ Послушать смену</button></div></div>`;
    }
    case 'fretboard':
      return `<figure class="figure"><div class="scroll-x">${fretboardSVG(b.marks.map(m => ({ cls: 'note', ...m })), b.maxFret || 5)}</div>
        <figcaption>Слева номер струны и её открытая нота, снизу лады. Цифра в кружке — палец левой руки.</figcaption></figure>`;
    case 'tab': {
      const k = seqs.push(b.targets) - 1;
      return `<figure class="figure"><div class="scroll-x">${tabSVG(b.targets)}</div><figcaption>${b.caption || 'Табулатура'}</figcaption>
        <div class="row center"><button class="btn sm ghost" data-seq="${k}">▶ Послушать</button></div></figure>`;
    }
    case 'pattern': {
      const p = PATTERNS[b.pattern];
      return `<div class="card pattern-block"><h4>${p.name}</h4><div class="grid8">${cellsHTML(p.cells)}</div>
        ${legendHTML(p.cells)}
        <div class="row gap wrap center"><button class="btn sm ghost" data-pattern="${b.pattern}|${b.chord || 'Am'}">▶ Послушать</button>
          <a class="btn sm ghost" href="#/trainer/strum/${b.pattern}">🥁 В тренажёр</a></div></div>`;
    }
    case 'song': {
      const sg = SONGS[b.song];
      return `<div class="card song-block"><div>🎶 <b>${sg.title}</b> <span class="muted">— ${sg.by}</span></div>
        <div class="song-prog">${sg.chords.map(c => `<span class="chip">${c}</span>`).join('')}</div>
        <div class="row gap wrap center">${[...new Set(sg.chords)].map(c => `<div class="diagram xs">${chordSVG(c)}</div>`).join('')}</div>
        ${sg.note ? `<p>${sg.note}</p>` : ''}<p class="muted small">Бой: <b>${PATTERNS[sg.pattern].name.toLowerCase()}</b> · ${sg.bpm} уд/мин · один аккорд на такт</p>
        <div class="row center"><a class="btn sm ghost" href="#/song/${b.song}">🎸 Играть вместе</a></div></div>`;
    }
    case 'head':
      return `<figure class="figure head-fig">${headstockSVG(0)}<figcaption>Голова грифа, вид спереди: какой колок у какой струны (колки 3 + 3). Слева басы 6, 5, 4, справа 1, 2, 3.</figcaption></figure>`;
  }
  return '';
}

function wireBlocks(root) {
  root.querySelectorAll('[data-strum]').forEach(b => b.onclick = () => strum(b.dataset.strum, 'D'));
  root.querySelectorAll('[data-arp]').forEach(b => b.onclick = () => arpeggio(b.dataset.arp));
  root.querySelectorAll('[data-change]').forEach(b => b.onclick = () => {
    const [a, c] = b.dataset.change.split(','), t = ctx().currentTime + 0.05;
    [a, c, a, c].forEach((n, k) => strum(n, 'D', t + k * 1.3));
  });
  root.querySelectorAll('[data-seq]').forEach(b => b.onclick = () => playSeq(seqs[+b.dataset.seq]));
  root.querySelectorAll('[data-pattern]').forEach(b => b.onclick = () => {
    const [p, c] = b.dataset.pattern.split('|');
    playPattern(b.closest('.pattern-block'), p, c);
  });
}

// ---------- экраны ----------
function ring(value, max) {
  const r = 46, c = 2 * Math.PI * r, k = Math.min(1, value / max);
  return `<svg viewBox="0 0 110 110" class="ring"><circle cx="55" cy="55" r="${r}" class="ring-bg"/>
    <circle cx="55" cy="55" r="${r}" class="ring-fg" stroke-dasharray="${c * k} ${c}" transform="rotate(-90 55 55)"/>
    <text x="55" y="54" text-anchor="middle" class="ring-v">${value}</text><text x="55" y="72" text-anchor="middle" class="ring-l">из ${max} мин</text></svg>`;
}

function viewHome() {
  const l = currentLesson(), p = lessonProgress(l), st = streak(), stp = stepOf(l.step);
  const doneLessons = LESSONS.filter(x => lessonProgress(x) === 1).length;
  main.innerHTML = `
    <section class="card hero">
      ${ring(todayMinutes(), S.settings.goal)}
      <div class="hero-txt">
        <h2>Сегодня</h2>
        <p>${st ? `🔥 ${st} ${plural(st, 'день', 'дня', 'дней')} подряд` : 'Начните серию: позанимайтесь от 5 минут.'}</p>
        <p class="muted">Пройдено уроков: ${doneLessons} из ${LESSONS.length}</p>
        <button class="btn primary go">▶ Занятие на ${S.settings.goal} мин</button>
      </div>
    </section>
    <a class="card next-lesson" href="#/lesson/${l.id}">
      <div class="muted">${p > 0 ? 'Продолжить' : 'Следующий урок'} · ступень ${stp.n} «${stp.title}»</div>
      <h3>Урок ${l.id}. ${l.title}</h3><p>${l.goal}</p>
      <div class="pbar"><i style="width:${p * 100}%"></i></div>
    </a>
    <div class="tiles">
      <a class="tile" href="#/tuner"><span>🎚</span>Тюнер</a>
      <a class="tile" href="#/chords"><span>🎸</span>Аккорды</a>
      <a class="tile" href="#/trainer/songs"><span>🎶</span>Песни</a>
      <a class="tile" href="#/progress"><span>📈</span>Прогресс</a>
    </div>
    <section class="card path"><h3>Ваш путь: 6 ступеней</h3>
      ${STEPS.map(s => { const k = stepProgress(s.n); return `<a class="step-row ${k === 1 ? 'done' : ''} ${s.n === l.step && k < 1 ? 'cur' : ''}" href="#/lessons/${s.n}">
        <span class="step-n">${k === 1 ? '✓' : s.n}</span><span class="step-b"><b>${s.title}</b><small>${s.desc}</small><span class="pbar"><i style="width:${k * 100}%"></i></span></span></a>`; }).join('')}
    </section>
    <section class="card">
      <h3>Как заниматься, чтобы был результат</h3>
      <ul class="list">
        <li><b>Каждый день понемногу.</b> 15–20 минут ежедневно дают больше, чем 2 часа в воскресенье: пальцы запоминают движения между занятиями.</li>
        <li><b>Медленно и чисто, потом быстро.</b> Скорость приходит сама, а ошибку, выученную на скорости, потом долго исправлять.</li>
        <li><b>Подушечки болят первые 1–2 недели</b> — это нормально, появятся мозоли. Боль в запястье — сигнал остановиться и проверить посадку.</li>
        <li><b>Урок пройден</b>, когда сделаны упражнения и получаются пункты «Можно идти дальше». Один урок — 1–3 дня.</li>
        <li>Кнопка «Занятие» сама разобьёт время: настройка → разминка → урок → повторение → свободная игра.</li>
      </ul>
    </section>
    ${session ? '' : `<section class="card plan"><h3>План занятия</h3>${sessionPlan(S.settings.goal).map(ph => `<div class="ph"><b>${ph.min} мин</b> ${ph.name}<div class="muted">${ph.desc}</div></div>`).join('')}</section>`}`;
  $('.go', main).onclick = startSession;
}

function lessonCard(l) {
  const p = lessonProgress(l);
  return `<a class="card lesson-card ${p === 1 ? 'done' : ''}" href="#/lesson/${l.id}">
    <div class="num">${p === 1 ? '✓' : l.id}</div>
    <div class="lc-body"><b>${l.title}</b><div class="muted">${l.goal}</div>
    <div class="pbar"><i style="width:${p * 100}%"></i></div></div></a>`;
}

function viewLessons(stepN) {
  main.innerHTML = `<h2 class="page-t">Уроки</h2>
    <p class="muted">${LESSONS.length} уроков в ${STEPS.length} ступенях. Идите по порядку: каждый урок опирается на предыдущий. Один урок — 1–3 дня занятий.</p>
    ${STEPS.map(st => `<section class="step" id="step${st.n}"><div class="step-h"><span class="step-n">${st.n}</span><div><b>${st.title}</b><div class="muted">${st.desc}</div></div></div>
      ${LESSONS.filter(l => l.step === st.n).map(lessonCard).join('')}</section>`).join('')}`;
  if (stepN > 1) { const s = document.getElementById(`step${stepN}`); s && s.scrollIntoView(); }
}

const EX_ICONS = {
  quiz: '❓', strings: '👆', ear: '👂', tuner: '🎚', notes: '🎵', findnote: '🔎', stringcheck: '🎯', chord: '🎸',
  changes: '🔁', strum: '🥁', rhythm: '🎤', song: '🎶', timer: '⏱', record: '⏺',
};

function viewLesson(id) {
  const l = LESSONS.find(x => x.id === id);
  if (!l) return viewLessons();
  const prev = LESSONS.find(x => x.id === id - 1), next = LESSONS.find(x => x.id === id + 1), stp = stepOf(l.step);
  seqs = [];
  const exDone = () => l.exercises.filter(e => isDone(l.id, e.id)).length;
  const ready = (S.ready && S.ready[l.id]) || [];
  main.innerHTML = `<a href="#/lessons/${l.step}" class="back">← Все уроки</a>
    <div class="muted">Ступень ${stp.n} · ${stp.title}</div>
    <h2 class="page-t">Урок ${l.id}. ${l.title}</h2>
    <div class="goal">🎯 <b>Цель:</b> ${l.goal} <span class="muted">· ~${l.minutes} мин</span></div>
    <div class="blocks">${l.blocks.map((b, i) => renderBlock(b, l.blocks[i + 1])).join('')}</div>
    ${l.exercises.length ? `<h3 class="ex-h">Упражнения <span class="muted ex-cnt">${exDone()}/${l.exercises.length}</span></h3>
      <p class="muted small">Делайте по порядку. Микрофон телефона или ноутбука слушает гитару и подсказывает, что не так.</p>
      <div class="exs">${l.exercises.map(e => `
      <div class="card ex ${isDone(l.id, e.id) ? 'done' : ''}" data-id="${e.id}">
        <div class="ex-head"><span class="ex-st">${isDone(l.id, e.id) ? '✓' : EX_ICONS[e.type] || '•'}</span><b>${e.title}</b>
          <button class="btn sm open">Начать</button></div>
        ${e.desc ? `<p class="muted">${e.desc}</p>` : ''}
        <div class="ex-body"></div>
        <button class="linkbtn manual" ${isDone(l.id, e.id) ? 'hidden' : ''}>Отметить выполненным вручную</button>
      </div>`).join('')}</div>` : ''}
    ${l.ready ? `<section class="card ready"><h3>✅ Можно идти дальше, когда:</h3>
      ${l.ready.map((r, i) => `<label class="ready-i"><input type="checkbox" data-i="${i}" ${ready[i] ? 'checked' : ''}><span>${r}</span></label>`).join('')}
      <p class="muted small">Отмечайте честно. Не получается пока — повторите упражнения ещё день-два, это нормальный темп.</p></section>` : ''}
    ${l.exercises.length ? '' : `<button class="btn primary readbtn">${S.read[l.id] ? '✓ Прочитано' : 'Отметить прочитанным'}</button>`}
    <div class="row between nav-lessons">${prev ? `<a class="btn ghost" href="#/lesson/${prev.id}">← Урок ${prev.id}</a>` : '<span></span>'}
      ${next ? `<a class="btn ghost" href="#/lesson/${next.id}">Урок ${next.id} →</a>` : ''}</div>`;

  wireBlocks(main);
  const rb = $('.readbtn', main);
  if (rb) rb.onclick = () => { S.read[l.id] = dayKey(); save(); rb.textContent = '✓ Прочитано'; toast('Урок пройден!'); };
  main.querySelectorAll('.ready-i input').forEach(c => c.onchange = () => {
    S.ready = S.ready || {};
    const r = S.ready[l.id] = S.ready[l.id] || [];
    r[+c.dataset.i] = c.checked; save();
    if (c.checked && l.ready.every((_, i) => r[i]) && lessonProgress(l) === 1) toast(`🎉 Урок ${l.id} освоен!${next ? ' Переходите к следующему.' : ''}`);
  });

  let openClean = null;
  const complete = (e, card) => {
    if (markDone(l.id, e.id)) toast('✓ Упражнение выполнено!');
    card.classList.add('done');
    $('.ex-st', card).textContent = '✓';
    $('.manual', card).hidden = true;
    $('.ex-cnt', main).textContent = `${exDone()}/${l.exercises.length}`;
    if (lessonProgress(l) === 1) setTimeout(() => toast(`🎉 Все упражнения урока ${l.id} сделаны! Проверьте пункты «Можно идти дальше».`), 1200);
  };
  main.querySelectorAll('.ex').forEach(card => {
    const e = l.exercises.find(x => x.id === card.dataset.id);
    $('.manual', card).onclick = () => complete(e, card);
    $('.open', card).onclick = () => {
      const body = $('.ex-body', card);
      const wasOpen = card.classList.contains('open');
      openClean && openClean(); openClean = null;
      main.querySelectorAll('.ex').forEach(c => { c.classList.remove('open'); $('.ex-body', c).innerHTML = ''; $('.open', c).textContent = 'Начать'; });
      if (wasOpen) return;
      card.classList.add('open'); $('.open', card).textContent = 'Свернуть';
      openClean = mountExercise(e, body, () => complete(e, card));
    };
  });
  onLeave(() => openClean && openClean());
}

function mountExercise(e, body, onDone) {
  const passed = r => r.pass && onDone();
  switch (e.type) {
    case 'quiz': return Quiz(body, { ...e, onDone });
    case 'strings': return StringPicker(body, { onDone });
    case 'ear': return EarGame(body, { onDone });
    case 'timer': return TimerWidget(body, { seconds: e.seconds, metronome: e.metronome, onDone });
    case 'tuner': return Tuner(body, { onAllTuned: onDone });
    case 'notes': return NoteChecker(body, { targets: e.targets, tab: e.tab, onDone });
    case 'findnote': return FindNote(body, { asks: e.asks, onDone });
    case 'stringcheck': return StringCheck(body, { chord: e.chord, onDone });
    case 'chord': return ChordChecker(body, { chord: e.chord, need: e.need, onDone });
    case 'changes': {
      const [a, b] = e.chords;
      return ChangesCounter(body, { chords: e.chords, goal: e.goal, onDone, bestKey: `changes:${a}-${b}`, tip: changeTip(a, b) });
    }
    case 'strum': return StrumTrainer(body, { ...e, mode: 'tap', onResult: passed });
    case 'rhythm': return StrumTrainer(body, { ...e, mode: 'mic', onResult: passed });
    case 'song': {
      const s = SONGS[e.song];
      return StrumTrainer(body, { pattern: s.pattern, bpm: e.bpm || s.bpm, chord: s.chords, mode: 'song', onResult: passed });
    }
    case 'record': return Recorder(body, { onDone });
  }
  return null;
}

function viewChords(sel) {
  main.innerHTML = `<h2 class="page-t">Аккорды</h2>
    <p class="muted">Нажмите на аккорд: как ставить пальцы, как он звучит, и проверка через микрофон — ударом или по одной струне.</p>
    <div class="chord-detail"></div>
    <div class="chord-grid">${Object.values(CHORDS).map(c => `<button class="card chord-card ${c.name === sel ? 'on' : ''}" data-c="${c.name}">${chordSVG(c.name)}<span>${c.ru}</span></button>`).join('')}</div>
    <section class="card"><h3>Как читать схему</h3><ul class="list">
      <li>Схема — это гриф, поставленный вертикально: вверху голова гитары, толстая линия — верхний порожек.</li>
      <li>Вертикальные линии — струны: <b>слева 6-я</b> (толстая), <b>справа 1-я</b> (тонкая). Номера струн подписаны сверху, ноты — снизу.</li>
      <li>Цифры слева — лады. Цветной кружок — палец: ${[1, 2, 3, 4].map(f => `${fingerDot(f)} ${FINGERS[f]}`).join(', ')}.</li>
      <li>○ — струна звучит открытой, ✕ — эту струну не играть.</li></ul></section>`;
  let clean = null;
  const area = $('.chord-detail', main);
  const close = () => { clean && clean(); clean = null; area.innerHTML = ''; main.querySelectorAll('.chord-card').forEach(c => c.classList.remove('on')); };
  const choose = name => {
    close();
    const ch = CHORDS[name];
    main.querySelectorAll('.chord-card').forEach(c => c.classList.toggle('on', c.dataset.c === name));
    area.innerHTML = `<div class="card cd">
      <div class="row between"><h3>${ch.name} <span class="muted">— ${ch.ru}</span></h3><button class="btn sm ghost x">✕</button></div>
      <p>${ch.about}</p>${fingerList(ch)}
      ${ch.mistakes ? `<div class="mist-mini"><b>Если звучит плохо:</b><ul class="list">${ch.mistakes.map(m => `<li>${m}</li>`).join('')}</ul></div>` : ''}
      <div class="muted small">Проверка через микрофон:</div>
      <div class="seg cd-seg"><button data-m="strum">Ударом</button><button data-m="strings">По одной струне</button></div>
      <div class="cd-check"></div></div>`;
    const mount = m => {
      clean && clean();
      area.querySelectorAll('.cd-seg button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
      const box = $('.cd-check', area);
      clean = m === 'strum' ? ChordChecker(box, { chord: name, need: Infinity }) : StringCheck(box, { chord: name });
    };
    area.querySelectorAll('.cd-seg button').forEach(b => b.onclick = () => mount(b.dataset.m));
    $('.x', area).onclick = () => { close(); history.replaceState(null, '', '#/chords'); };
    mount('strum');
    strum(name, 'D');
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#/chords/${encodeURIComponent(name)}`);
  };
  main.querySelectorAll('.chord-card').forEach(b => b.onclick = () => choose(b.dataset.c));
  if (sel && CHORDS[sel]) choose(sel);
  onLeave(() => clean && clean());
}

function viewTrainer(tab = 'strum', arg) {
  main.innerHTML = `<h2 class="page-t">Тренажёр</h2>
    <div class="seg"><a href="#/trainer" class="${tab === 'strum' ? 'on' : ''}">Бой</a><a href="#/trainer/songs" class="${tab === 'songs' ? 'on' : ''}">Песни</a><a href="#/trainer/metro" class="${tab === 'metro' ? 'on' : ''}">Метроном</a></div>
    <div class="body"></div>`;
  const body = $('.body', main);
  if (tab === 'songs') {
    body.innerHTML = `${Object.entries(SONGS).map(([id, s]) => `<a class="card song-card" href="#/song/${id}">
        <div>🎶 <b>${s.title}</b> <span class="muted">— ${s.by}</span></div>
        <div class="song-prog">${s.chords.map(c => `<span class="chip">${c}</span>`).join('')}</div>
        <div class="muted small">${PATTERNS[s.pattern].name} · ${s.bpm} уд/мин</div></a>`).join('')}
      <section class="card"><h3>Как разучивать песню</h3><ol class="steps-l">
        <li>Сначала выучите каждый аккорд песни отдельно: он должен звенеть (раздел «Аккорды»).</li>
        <li>Потренируйте самые трудные смены: «Смены за минуту» в уроках.</li>
        <li>Играйте вместе с приложением медленно. Сбились — не останавливайтесь, ловите следующую долю.</li>
        <li>Слова найдите на сайте с аккордами и сначала напевайте мелодию без слов.</li></ol></section>`;
    return;
  }
  if (tab === 'metro') { body.innerHTML = '<div class="card"></div>'; onLeave(Metronome(body.firstElementChild)); return; }
  body.innerHTML = `<div class="card"></div>
    <section class="card"><h3>Как пользоваться</h3><ul class="list">
      <li><b>Демо</b> — послушать бой и посмотреть, как качается рука (кружок на полосе).</li>
      <li><b>Проверить меня</b> — после отсчёта «1-2-3-4» свайпайте по полосе вниз/вверх или жмите ↓ ↑. Ячейки покрасятся: зелёные — точно, красные — промах.</li>
      <li><b>Проверить на гитаре</b> — играйте настоящей гитарой, микрофон слушает попадание в доли. Направление удара микрофон не различает, следите за ним сами.</li>
      <li>Точность 90% и выше — поднимайте темп на 5.</li></ul></section>`;
  const pattern = PATTERNS[arg] ? arg : 'down4';
  onLeave(StrumTrainer(body.firstElementChild, { mode: 'free', pattern, bpm: 70, chord: 'Am' }));
}

function viewSong(id) {
  const s = SONGS[id];
  if (!s) return viewTrainer('songs');
  main.innerHTML = `<a href="#/trainer/songs" class="back">← Все песни</a>
    <h2 class="page-t">${s.title}</h2><p class="muted">${s.by}</p>
    ${s.note ? `<div class="tip">💡 ${s.note}</div>` : ''}
    <div class="song-prog">${s.chords.map(c => `<a class="chip" href="#/chords/${encodeURIComponent(c)}">${c}</a>`).join('')}</div>
    <p class="muted small">Бой: ${PATTERNS[s.pattern].name.toLowerCase()} · один аккорд на такт. Нажмите на аккорд, чтобы посмотреть схему.</p>
    <div class="card body"></div>
    <section class="card"><h3>Как играть вместе</h3><ol class="steps-l">
      <li>Нажмите «Демо»: послушайте, как это звучит, и посмотрите, как движется рука.</li>
      <li>Над полосой виден аккорд, который играть сейчас, и следующий: готовьте пальцы заранее.</li>
      <li>«Проверить меня» — тапами по экрану, «Проверить на гитаре» — настоящей гитарой, микрофон слушает ритм.</li>
      <li>Не успеваете переставить аккорд — снизьте темп кнопкой −5. Точность от 90% — прибавьте 5.</li></ol></section>`;
  onLeave(StrumTrainer($('.body', main), { pattern: s.pattern, bpm: s.bpm, chord: s.chords, mode: 'song' }));
}

function viewTuner() {
  main.innerHTML = `<h2 class="page-t">Тюнер</h2><div class="card body"></div>
    <section class="card"><h3>Как настроить гитару</h3>
      <p>Стандартный строй от толстой струны к тонкой: <b>E A D G B E</b> — ми, ля, ре, соль, си, ми.</p>
      <ul class="list">
        <li>Тюнер сам узнаёт струну. Если струна расстроена сильно и тюнер принимает её за соседнюю, выключите «Авто» и нажмите её колок на рисунке.</li>
        <li>Пока вы крутите колок, тюнер пишет «звук повышается ↑» или «понижается ↓» — так сразу видно, в ту ли сторону вы крутите.</li>
        <li>Подходите к ноте снизу: перетянули — ослабьте чуть ниже и снова подтяните. Так струна дольше держит строй.</li>
        <li>Стрелка прыгает — приглушите остальные струны ладонью, дёрните одну не слишком сильно и дайте ей звучать.</li>
        <li>На ноутбуке микрофон обычно над экраном: держите гитару ближе к нему.</li>
      </ul></section>`;
  onLeave(Tuner($('.body', main)));
}

function viewProgress() {
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return d; });
  const mins = days.map(d => Math.round((S.seconds[dayKey(d)] || 0) / 60));
  const max = Math.max(S.settings.goal, ...mins);
  const total = Math.round(Object.values(S.seconds).reduce((a, b) => a + b, 0) / 60);
  const exDone = Object.keys(S.done).length, exAll = LESSONS.reduce((a, l) => a + l.exercises.length, 0);
  const bests = Object.entries(S.bests).filter(([k]) => k.startsWith('changes:'));
  const strumBest = Object.entries(S.bests).filter(([k]) => k.startsWith('strum:')).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const wd = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  main.innerHTML = `<h2 class="page-t">Прогресс</h2>
    <div class="stats">
      <div class="card stat"><b>${todayMinutes()}</b><span>мин сегодня</span></div>
      <div class="card stat"><b>${streak()}</b><span>дней подряд</span></div>
      <div class="card stat"><b>${total >= 60 ? (total / 60).toFixed(1) + ' ч' : total + ' мин'}</b><span>всего</span></div>
      <div class="card stat"><b>${exDone}/${exAll}</b><span>упражнений</span></div>
    </div>
    <section class="card"><h3>Последние 14 дней</h3>
      <div class="chart">${mins.map((m, i) => `<div class="bar ${m >= S.settings.goal ? 'met' : ''}" title="${m} мин"><i style="height:${(m / max) * 100}%"></i><span>${wd[days[i].getDay()]}</span></div>`).join('')}
        <div class="goal-line" style="bottom:calc(${(S.settings.goal / max) * 100}% * .8 + 20px)"></div></div>
      <p class="muted">Время засчитывается, пока работает микрофон, метроном, таймер или занятие.</p></section>
    <section class="card"><h3>Уроки</h3>${STEPS.map(st => `<div class="muted small prog-step">${st.n}. ${st.title}</div>${LESSONS.filter(l => l.step === st.n).map(l => `<a class="prow" href="#/lesson/${l.id}"><span>${l.id}. ${l.title}</span><span class="pbar"><i style="width:${lessonProgress(l) * 100}%"></i></span></a>`).join('')}`).join('')}</section>
    <section class="card"><h3>Рекорды</h3>
      ${bests.length ? bests.map(([k, v]) => `<div class="prow"><span>Смены ${k.slice(8).replace('-', ' ⇄ ')}</span><b>${v}/мин</b></div>`).join('') : '<p class="muted">Пока нет. Попробуйте «Смены за минуту» в уроке 8.</p>'}
      ${strumBest.map(([k, v]) => { const [, p, b] = k.split(':'); return `<div class="prow"><span>${PATTERNS[p] ? PATTERNS[p].name : p}, ${b} уд/мин</span><b>${v}%</b></div>`; }).join('')}
    </section>
    <section class="card settings"><h3>Настройки</h3>
      <label>Цель на день
        <select class="goal">${[10, 15, 20, 30, 45, 60].map(v => `<option ${v === S.settings.goal ? 'selected' : ''} value="${v}">${v} мин</option>`).join('')}</select></label>
      <label>Чувствительность микрофона к ударам <input type="range" class="sens" min="0.4" max="3" step="0.1" value="${S.settings.sens}"></label>
      <div class="row between"><span>Задержка микрофона: <b class="lat">${S.settings.latency != null ? Math.round(S.settings.latency * 1000) + ' мс' : 'по умолчанию 50 мс'}</b></span>
        <button class="btn sm ghost calib">Калибровать</button></div>
      <p class="muted">Калибровка: положите телефон на стол в тишине. Приложение сыграет 8 щелчков и измерит, с какой задержкой их слышит микрофон. Так проверка ритма будет точнее.</p>
      <div class="status"></div>
      <button class="btn ghost danger reset">Сбросить весь прогресс</button>
    </section>`;
  $('.goal', main).onchange = e => { S.settings.goal = +e.target.value; save(); renderBadge(); };
  $('.sens', main).onchange = e => { S.settings.sens = +e.target.value; save(); };
  $('.calib', main).onclick = async () => {
    $('.lat', main).textContent = 'слушаю…';
    const lat = await calibrateLatency($('.status', main));
    $('.lat', main).textContent = lat == null ? 'не получилось, попробуйте громче' : `${Math.round(lat * 1000)} мс`;
  };
  $('.reset', main).onclick = () => confirm('Удалить весь прогресс и время занятий?') && resetAll();
}

// ---------- роутер ----------
function route() {
  cleanup.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  cleanup = [];
  const [, view, arg, arg2] = (location.hash || '#/').split('/');
  const navOf = { lesson: 'lessons', song: 'trainer' };
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.v === (navOf[view] || view || 'home')));
  window.scrollTo(0, 0);
  switch (view) {
    case 'lessons': viewLessons(+arg); break;
    case 'lesson': viewLesson(+arg); break;
    case 'chords': viewChords(arg && decodeURIComponent(arg)); break;
    case 'trainer': viewTrainer(arg || 'strum', arg2); break;
    case 'song': viewSong(arg); break;
    case 'tuner': viewTuner(); break;
    case 'progress': viewProgress(); break;
    default: viewHome();
  }
}
window.addEventListener('hashchange', route);
route();
renderBadge();
renderSessionBar();

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
