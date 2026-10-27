// Интерактивные блоки: тюнер, проверка нот и аккордов, тренажёр боя, игры на струны, таймер, тест, запись.
import { CHORDS, OPEN, PATTERNS, COUNT, FINGERS, chordPcs, chordMidis, midiAt, noteName, pcName, sIdx, fingerForFret, bassString } from './data.js';
import { ctx, mic, micErrorText, playNote, strum, arpeggio, click, beep, Clock, freqToMidi, keepAwake } from './audio.js';
import { TunerLogic, NoteMatcher, judgeChord } from './dsp.js';
import { chordSVG, fretboardSVG, headstockSVG, tabSVG, fingerDot } from './svg.js';
import { S, save, setBest } from './store.js';
import { activity } from './activity.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export function html(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}
export function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }
const ord = n => `${n}-я`;
const strName = n => `${ord(n)} струна`;
// падежи: «на 6-й струне», «с 6-й», «дёрните 6-ю струну»
const ordY = n => `${n}-й`;
const strAcc = n => `${n}-ю струну`;
const fretTxt = f => (f === 0 ? 'открытая' : `${f}-й лад`);

async function startMic(statusEl) {
  try {
    ctx();
    await mic.start();
    activity.add('mic');
    keepAwake(true);
    if (statusEl) statusEl.innerHTML = '';
    return true;
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<div class="warn">${micErrorText(err)}</div>`;
    return false;
  }
}
function stopMic() {
  mic.stop();
  if (!mic.stream) { activity.delete('mic'); keepAwake(false); }
}

// схемы грифа нарисованы как табулатура: сверху тонкая 1-я струна
const FB_NOTE = '<div class="muted small center-t">на схеме сверху тонкая 1-я струна, снизу толстая 6-я</div>';

// Полоска громкости и «что слышит микрофон»: видно, что приложение вас слышит
const MICBAR = '<div class="micbar"><span>🎤</span><div class="level-bar"><i></i></div><span class="mb-heard"></span></div>';
function micBar(el) {
  const bar = $('.micbar .level-bar i', el), heard = $('.mb-heard', el);
  let raf = 0, lastNote = '', lastAt = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!mic.stream) { bar.style.width = '0'; heard.textContent = ''; return; }
    const l = mic.level;
    bar.style.width = `${Math.min(100, Math.sqrt(l / 0.25) * 100)}%`;
    bar.classList.toggle('low', l < 0.002);
    const r = mic.last, now = performance.now();
    if (r && r.freq > 0 && !r.weak) { const n = noteName(freqToMidi(r.freq)); lastNote = `слышу: ${n.ru} (${n.lat})`; lastAt = now; }
    heard.textContent = now - lastAt < 1200 ? lastNote : '';
  };
  loop();
  return () => cancelAnimationFrame(raf);
}

// ============ Тюнер ============
export function Tuner(el, { onAllTuned } = {}) {
  el.innerHTML = `<div class="tuner">
    <div class="tn-top"><b class="tn-left">Сыграйте любую открытую струну</b><label class="chk"><input type="checkbox" class="auto" checked> Авто</label></div>
    <div class="tn-main">
      <div class="tn-head"></div>
      <div class="tn-side">
        <div class="tn-note"><b>—</b><small>струна</small></div>
        <div class="tn-act">&nbsp;</div>
        <div class="tn-cents"></div>
      </div>
    </div>
    <div class="tn-stage"><canvas class="tn-trace"></canvas><div class="tn-bubble idle"></div></div>
    <div class="tn-scale"><span>ниже ←</span><span>в строю</span><span>→ выше</span></div>
    <div class="tn-trend">&nbsp;</div>
    <div class="tuner-hint">Нажмите «Включить микрофон» и дёрните струну.</div>
    ${MICBAR}
    <div class="row gap center wrap"><button class="btn ghost ref">▶ Эталон</button></div>
    <div class="status"></div>
    <button class="btn primary start">🎤 Включить микрофон</button>
  </div>`;
  const head = $('.tn-head', el), noteEl = $('.tn-note', el), actEl = $('.tn-act', el), centsEl = $('.tn-cents', el);
  const cv = $('.tn-trace', el), bubble = $('.tn-bubble', el), trendEl = $('.tn-trend', el), hintEl = $('.tuner-hint', el), leftEl = $('.tn-left', el);
  const auto = $('.auto', el);
  const lg = new TunerLogic({ a4: S.settings.a4, inTune: 5 });
  const IN = 5;
  let running = false, off = null, raf = 0, lastT = 0, quiet = 0, noPitch = 0, hist = [], trace = [], drawn = '';
  const offBar = micBar(el);

  const drawHead = () => {
    const key = `${lg.string}|${[...lg.tuned].join()}`;
    if (key === drawn) return;
    drawn = key;
    head.innerHTML = headstockSVG(lg.manual || lg.string, lg.tuned);
    head.querySelectorAll('.peg').forEach(p => p.addEventListener('click', () => choose(+p.dataset.s)));
  };
  function choose(s) {
    if (lg.manual === s) { lg.setManual(null); auto.checked = true; }
    else { lg.setManual(s); auto.checked = false; lg.string = s; }
    drawn = ''; drawHead(); render();
    hintEl.textContent = lg.manual ? `Ручной режим: тюнер считает всё от ${ordY(s)} струны (${noteName(OPEN[sIdx(s)]).ru}). Дёрните её.` : 'Авто: тюнер сам узнаёт струну.';
  }
  auto.onchange = () => choose(auto.checked ? lg.manual : (lg.string || 6));
  $('.ref', el).onclick = () => playNote(OPEN[sIdx(lg.manual || lg.string || 6)], 0, 0.6, 2);
  const leftText = () => {
    const n = 6 - lg.tuned.size;
    leftEl.textContent = n === 0 ? '🎉 Все струны настроены!' : lg.tuned.size ? `Осталось ${n} ${plural(n, 'струна', 'струны', 'струн')}` : 'Сыграйте любую открытую струну';
  };

  // куда движется звук, пока крутят колок: самое понятное для новичка «правильно ли я кручу»
  function trend() {
    const now = hist.length ? hist[hist.length - 1].t : 0, h = hist.filter(p => now - p.t < 1.2);
    if (h.length < 12 || h[h.length - 1].t - h[0].t < 0.5) return 0;
    const n = h.length, mt = h.reduce((a, p) => a + p.t, 0) / n, mc = h.reduce((a, p) => a + p.c, 0) / n;
    let num = 0, den = 0; for (const p of h) { num += (p.t - mt) * (p.c - mc); den += (p.t - mt) ** 2; }
    const slope = den ? num / den : 0; // центов в секунду
    return Math.abs(slope) > 12 ? slope : 0;
  }

  function render() {
    drawHead();
    const s = lg.string, c = lg.cents;
    if (!s || lg.state === 'idle' || c == null) {
      noteEl.innerHTML = s ? `<b>${noteName(OPEN[sIdx(s)]).lat}</b><small>${strName(s)}</small>` : '<b>—</b><small>струна</small>';
      actEl.textContent = ' '; actEl.className = 'tn-act'; centsEl.textContent = '';
      bubble.className = 'tn-bubble idle'; bubble.style.left = '50%'; trendEl.innerHTML = '&nbsp;';
      return;
    }
    const target = OPEN[sIdx(s)], nn = noteName(target), good = Math.abs(c) <= IN, live = lg.state === 'live';
    noteEl.innerHTML = `<b class="${good ? 'good' : ''}">${nn.lat}</b><small>${strName(s)} · ${nn.ru}</small>`;
    const shown = Math.max(-50, Math.min(50, c));
    bubble.className = `tn-bubble ${good ? 'good' : Math.abs(c) < 20 ? 'near' : 'far'} ${live ? '' : 'held'}`;
    bubble.style.left = `calc(14px + (100% - 28px) * ${(shown + 50) / 100})`;
    bubble.textContent = good ? '✓' : `${c > 0 ? '+' : ''}${Math.round(c)}`;
    actEl.textContent = good ? '✓ В строю' : c < 0 ? 'Подтяните ↑' : 'Ослабьте ↓';
    actEl.className = `tn-act ${good ? 'good' : 'bad'}`;
    centsEl.textContent = good ? '' : `${Math.abs(Math.round(c))} ${plural(Math.abs(Math.round(c)), 'цент', 'цента', 'центов')} ${c < 0 ? 'ниже' : 'выше'}`;
    const sl = live ? trend() : 0;
    if (!sl || good) trendEl.innerHTML = '&nbsp;';
    else {
      const up = sl > 0, right = (c < 0) === up;
      trendEl.innerHTML = `<span class="${right ? 'good-t' : 'bad-t'}">${up ? '↑ Звук повышается' : '↓ Звук понижается'} — ${right ? 'так держать, крутите дальше' : c < 0 ? 'не туда! Крутите в другую сторону' : 'уже выше нужного, крутите обратно'}</span>`;
    }
    if (Math.abs(c) > 100) {
      const st = Math.round(Math.abs(c) / 100);
      hintEl.textContent = c < 0 ? `Струна ниже ${nn.ru} на ${st} ${plural(st, 'полутон', 'полутона', 'полутонов')}: подтягивайте, пока кружок не поедет к центру.` : `Струна выше ${nn.ru} на ${st} ${plural(st, 'полутон', 'полутона', 'полутонов')}: ослабьте её, чтобы не порвать.`;
    } else if (good) hintEl.textContent = lg.tuned.size < 6 ? `${ord(s)} струна в строю. ${nextHint()}` : 'Гитара настроена. Можно играть!';
    else hintEl.textContent = 'Крутите колок понемногу и снова дёргайте струну.';
  }
  const nextHint = () => { const n = [6, 5, 4, 3, 2, 1].find(k => !lg.tuned.has(k)); return n ? `Дальше: ${strName(n)} (${noteName(OPEN[sIdx(n)]).ru}).` : ''; };

  function draw() {
    raf = requestAnimationFrame(draw);
    const w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1;
    if (!w) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const X = c => w / 2 + (Math.max(-50, Math.min(50, c)) / 50) * (w / 2 - 14);
    g.fillStyle = 'rgba(92,194,135,.14)'; g.fillRect(X(-IN), 0, X(IN) - X(-IN), h);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (const c of [-40, -30, -20, -10, 10, 20, 30, 40]) { g.beginPath(); g.moveTo(X(c), 0); g.lineTo(X(c), h); g.stroke(); }
    g.strokeStyle = '#5cc287'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(0), h); g.stroke();
    const now = performance.now(), speed = 0.06;
    while (trace.length && (now - trace[0].t) * speed > h) trace.shift();
    g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 1; i < trace.length; i++) {
      const a = trace[i - 1], b = trace[i];
      if (a.c == null || b.c == null) continue;
      g.strokeStyle = Math.abs(b.c) <= IN ? '#5cc287' : Math.abs(b.c) < 20 ? '#e8c24d' : '#e46a5a';
      g.beginPath(); g.moveTo(X(a.c), 30 + (now - a.t) * speed); g.lineTo(X(b.c), 30 + (now - b.t) * speed); g.stroke();
    }
    render();
  }

  function onResult(res) {
    const dt = lastT ? Math.min(0.1, Math.max(0.005, res.t - lastT)) : 0.02; lastT = res.t;
    const prevString = lg.string;
    lg.update(res, dt);
    if (lg.string !== prevString || res.fresh) hist = [];
    if (lg.state === 'live') { hist.push({ t: res.t, c: lg.cents }); if (hist.length > 80) hist.shift(); trace.push({ t: performance.now(), c: lg.cents }); }
    else if (trace.length && trace[trace.length - 1].c != null) trace.push({ t: performance.now(), c: null });
    if (lg.justTuned) {
      beep(1320, 0.12); leftText(); drawn = '';
      if (lg.tuned.size === 6 && onAllTuned) onAllTuned();
    }
    // подсказки, когда ничего не слышно
    if (lg.state === 'idle' || lg.state === 'hold') {
      if (mic.level < 0.002) { quiet += dt; noPitch = 0; } else { quiet = 0; noPitch += dt; }
      if (lg.state === 'idle') {
        if (quiet > 4) hintEl.textContent = 'Микрофон почти ничего не слышит. Поднесите телефон ближе к гитаре (30–50 см).';
        else if (noPitch > 3) hintEl.textContent = 'Слышу звук, но не ноту. Дёрните одну струну и дайте ей звучать, остальные приглушите ладонью.';
      }
    } else { quiet = 0; noPitch = 0; }
  }

  $('.start', el).onclick = async () => {
    if (running) return stop();
    if (!(await startMic($('.status', el)))) return;
    running = true; $('.start', el).textContent = '⏹ Выключить микрофон';
    hintEl.textContent = 'Слушаю… дёрните любую открытую струну.';
    off = mic.listen(onResult);
    draw();
  };
  function stop() {
    off && off(); off = null; cancelAnimationFrame(raf); running = false; stopMic();
    $('.start', el).textContent = '🎤 Включить микрофон';
    lg.state = 'idle'; render();
  }
  drawHead(); render();
  return () => { running && stop(); offBar(); };
}

// ============ Проверка нот по очереди ============
// targets: [{s, f, label?, chord?}] — струна, лад; label — палец правой руки (p, i, m, a)
const PIMA_RU = { p: 'большой', i: 'указательный', m: 'средний', a: 'безымянный' };
function describeWrong(heard, t) {
  const target = midiAt(t.s, t.f), d = heard - target;
  const hn = noteName(heard), wn = noteName(target);
  if ((d % 12 + 12) % 12 === 0) return `Нота ${wn.ru} верная, но приложение слышит её в другой октаве — сыграйте ещё раз, увереннее.`;
  let s = `Слышу ${hn.ru} (${hn.lat}), а нужна ${wn.ru} (${wn.lat}). `;
  const fretOnString = heard - OPEN[sIdx(t.s)];
  if (Math.abs(d) <= 4 && fretOnString >= 0 && fretOnString <= 12) {
    s += fretOnString === 0
      ? `Похоже, ${ord(t.s)} струна звучит открытой — дожмите палец на ${t.f}-м ладу.`
      : t.f === 0 ? `Похоже, на ${ordY(t.s)} струне зажат ${fretOnString}-й лад — отпустите её, нужна открытая.`
        : `Если вы на ${ordY(t.s)} струне, палец стоит на ${fretOnString}-м ладу, а нужен ${t.f}-й.`;
  } else {
    const where = [];
    for (let n = 6; n >= 1; n--) { const f = heard - OPEN[sIdx(n)]; if (f >= 0 && f <= 4) where.push(`${ord(n)} струна, ${fretTxt(f)}`); }
    s += `Наверное, звучит не та струна${where.length ? ` (это: ${where.join(' или ')})` : ''}. Нужна ${ord(t.s)}.`;
  }
  return s;
}

export function NoteChecker(el, { targets, tab, onDone }) {
  el.innerHTML = `<div class="checker notes">
    ${tab ? '<div class="tabv scroll-x"></div>' : ''}
    <div class="nc-now"><div class="nc-fb scroll-x"></div>${FB_NOTE}<div class="nc-txt"></div></div>
    <div class="hint">&nbsp;</div>
    ${MICBAR}
    <div class="row gap wrap center">
      <button class="btn primary start">🎤 Слушать</button>
      <button class="btn ghost sm listen">▶ Как звучит</button>
      <button class="btn ghost sm force" hidden>✓ Засчитать</button>
      <button class="btn ghost sm skip">Пропустить →</button>
    </div><div class="status"></div></div>`;
  let i = 0, running = false, off = null, since = 0, timer = null;
  const nm = new NoteMatcher({ a4: S.settings.a4 });
  const hint = $('.hint', el), force = $('.force', el), tabv = $('.tabv', el);
  const maxF = Math.max(4, ...targets.map(t => t.f));
  const offBar = micBar(el);

  function render() {
    if (tabv) {
      tabv.innerHTML = tabSVG(targets, i);
      const cur = tabv.querySelector('.tab-cur');
      if (cur) tabv.scrollLeft = Math.max(0, cur.getBBox().x * (tabv.scrollWidth / tabv.firstElementChild.viewBox.baseVal.width) - tabv.clientWidth / 2);
    }
    if (i >= targets.length) {
      $('.nc-fb', el).innerHTML = '';
      $('.nc-txt', el).innerHTML = '<div class="big">🎉 Всё сыграно!</div>';
      force.hidden = true;
      return;
    }
    const t = targets[i], nx = targets[i + 1], n = noteName(midiAt(t.s, t.f)), fg = fingerForFret(t.f);
    const marks = [{ s: t.s, f: t.f, cls: 'target', finger: t.chord ? 0 : fg || 0 }];
    if (nx && !(nx.s === t.s && nx.f === t.f)) marks.unshift({ s: nx.s, f: nx.f, cls: 'next' });
    $('.nc-fb', el).innerHTML = fretboardSVG(marks, maxF + 1, { hl: t.s });
    const left = t.f === 0 ? '<b>открытая</b>' : `<b>${t.f}-й лад</b>${t.chord ? '' : ` · палец ${fingerDot(fg)} ${FINGERS[fg]}`}`;
    $('.nc-txt', el).innerHTML = `<span class="pill">${i + 1}/${targets.length}</span> <b>${strName(t.s)}</b> · ${left} → <b>${n.ru}</b> (${n.lat})` +
      (t.label ? `<div class="muted">правая рука: <b>${t.label}</b> — ${PIMA_RU[t.label]} палец${t.chord ? `, левая держит ${t.chord}` : ''}</div>` : '');
    nm.setTarget(midiAt(t.s, t.f));
    since = performance.now(); force.hidden = true;
  }
  render();

  function next(manual) {
    const t = targets[i], n = noteName(midiAt(t.s, t.f));
    i++;
    hint.innerHTML = manual ? '&nbsp;' : `<span class="good-t">✓ ${n.ru}!${i < targets.length ? '' : ' Отлично!'}</span>`;
    render();
    if (i >= targets.length) { stop(); onDone && onDone(); }
  }
  function onResult(res) {
    if (i >= targets.length) return;
    const ev = nm.update(res);
    if (!ev) return;
    if (ev.type === 'hit') {
      next(false);
      if (ev.detuned) hint.innerHTML += ` <span class="muted">Звучит чуть ${ev.cents > 0 ? 'выше' : 'ниже'} (${ev.cents > 0 ? '+' : ''}${ev.cents} ц) — проверьте строй.</span>`;
    } else hint.innerHTML = `<span class="bad-t">${describeWrong(ev.midi, targets[i])}</span>`;
  }

  $('.listen', el).onclick = () => { const t = targets[Math.min(i, targets.length - 1)]; playNote(midiAt(t.s, t.f), 0, 0.6, 1.5); };
  $('.skip', el).onclick = () => { if (i < targets.length) next(true); };
  force.onclick = () => { if (i < targets.length) next(false); };
  $('.start', el).onclick = async () => {
    if (running) return stop();
    if (!(await startMic($('.status', el)))) return;
    running = true; $('.start', el).textContent = '⏹ Стоп';
    off = mic.listen(onResult);
    since = performance.now();
    // если долго не слышим нужную ноту — даём засчитать вручную и подсказываем
    timer = setInterval(() => {
      if (i >= targets.length || performance.now() - since < 10000 || !force.hidden) return;
      force.hidden = false;
      hint.innerHTML = '<span class="muted">Не слышу нужной ноты. Поднесите телефон ближе и приглушите остальные струны. Если уверены, что играете верно, — нажмите «Засчитать».</span>';
    }, 1000);
    hint.textContent = 'Слушаю… играйте ноту.';
  };
  function stop() {
    off && off(); off = null; clearInterval(timer); running = false; stopMic();
    $('.start', el).textContent = '🎤 Слушать';
  }
  return () => { running && stop(); offBar(); };
}

// ============ Найди ноту ============
// asks: [[струна, лад]] — приложение называет ноту и струну, вы ищете лад
export function FindNote(el, { asks, onDone }) {
  el.innerHTML = `<div class="checker">
    <div class="q fn-q"></div>
    <div class="fn-fb scroll-x"></div>${FB_NOTE}
    <div class="hint">&nbsp;</div>
    ${MICBAR}
    <div class="row gap wrap center"><button class="btn primary start">🎤 Слушать</button><button class="btn ghost sm help">Подсказка</button><button class="btn ghost sm skip">Пропустить →</button></div>
    <div class="status"></div></div>`;
  let i = 0, running = false, off = null, shown = false;
  const nm = new NoteMatcher({ a4: S.settings.a4 }), hint = $('.hint', el);
  const offBar = micBar(el);
  const maxF = Math.max(4, ...asks.map(a => a[1]));
  function render(reveal) {
    if (i >= asks.length) { $('.fn-q', el).innerHTML = '🎉 Все ноты найдены!'; $('.fn-fb', el).innerHTML = fretboardSVG([], maxF + 1); return; }
    const [s, f] = asks[i], n = noteName(midiAt(s, f));
    $('.fn-q', el).innerHTML = `<span class="pill">${i + 1}/${asks.length}</span> Сыграйте ноту <b>${n.ru}</b> (${n.lat}) на <b>${ordY(s)}</b> струне`;
    $('.fn-fb', el).innerHTML = fretboardSVG(reveal ? [{ s, f, cls: reveal, finger: fingerForFret(f), t: n.ru }] : [], maxF + 1, { hl: s });
    nm.setTarget(midiAt(s, f));
  }
  render();
  function advance(ok) {
    const [s, f] = asks[i], n = noteName(midiAt(s, f));
    hint.innerHTML = ok ? `<span class="good-t">✓ Верно: ${n.ru} — ${ord(s)} струна, ${fretTxt(f)}.</span>` : `${n.ru} — ${ord(s)} струна, ${fretTxt(f)}.`;
    render('done');
    setTimeout(() => { i++; shown = false; render(); if (i >= asks.length) { stop(); onDone && onDone(); } }, 1400);
  }
  function onResult(res) {
    if (i >= asks.length || shown) return;
    const ev = nm.update(res);
    if (!ev) return;
    if (ev.type === 'hit') { shown = true; advance(true); return; }
    const [s, f] = asks[i], target = midiAt(s, f), d = target - ev.midi, hn = noteName(ev.midi);
    hint.innerHTML = `<span class="bad-t">Это ${hn.ru} (${hn.lat}). ${Math.abs(d) <= 5 ? `Нужная нота на ${Math.abs(d)} ${plural(Math.abs(d), 'лад', 'лада', 'ладов')} ${d > 0 ? 'дальше от головы (выше)' : 'ближе к голове (ниже)'}.` : `Проверьте, на ${ordY(s)} ли вы струне.`}</span>`;
  }
  $('.help', el).onclick = () => { if (i < asks.length) render('hint'); };
  $('.skip', el).onclick = () => { if (i < asks.length && !shown) { shown = true; advance(false); } };
  $('.start', el).onclick = async () => {
    if (running) return stop();
    if (!(await startMic($('.status', el)))) return;
    running = true; $('.start', el).textContent = '⏹ Стоп'; off = mic.listen(onResult);
    hint.textContent = 'Слушаю… найдите лад и сыграйте.';
  };
  function stop() { off && off(); off = null; running = false; stopMic(); $('.start', el).textContent = '🎤 Слушать'; }
  return () => { running && stop(); offBar(); };
}

// ============ Найди струну на рисунке ============
export function StringPicker(el, { onDone }) {
  const order = [3, 1, 6, 4, 2, 5];
  let i = 0, streak = 0;
  el.innerHTML = `<div class="checker"><div class="q sp-q"></div><div class="sp-fb"></div><div class="hint">&nbsp;</div>
    <p class="muted center-t">Струны нарисованы так, как вы видите их на гитаре в руках: толстая 6-я вверху, у лица, тонкая 1-я внизу, у пола.</p></div>`;
  const hint = $('.hint', el);
  function render(mark) {
    if (i >= order.length) { $('.sp-q', el).innerHTML = '🎉 Все струны найдены!'; $('.sp-fb', el).innerHTML = fretboardSVG([], 3, { dy: 32, flip: true }); return; }
    $('.sp-q', el).innerHTML = `<span class="pill">${streak}/6</span> Нажмите на <b>${strAcc(order[i])}</b>`;
    $('.sp-fb', el).innerHTML = fretboardSVG([], 3, { pick: true, hl: mark, nolabels: true, dy: 32, flip: true });
    el.querySelectorAll('.s-pick').forEach(r => r.addEventListener('click', () => answer(+r.dataset.s)));
  }
  function answer(s) {
    const want = order[i];
    if (s === want) {
      streak++; i++;
      hint.innerHTML = `<span class="good-t">✓ Да, это ${ord(s)}${s === 1 ? ' — самая тонкая' : s === 6 ? ' — самая толстая' : ''}.</span>`;
      render();
      if (i >= order.length) onDone && onDone();
    } else {
      streak = 0;
      hint.innerHTML = `<span class="bad-t">Это ${ord(s)}. Считайте от тонкой: 1-я — самая тонкая, 6-я — самая толстая. ${ord(want)} — ${want < s ? 'тоньше' : 'толще'}.</span>`;
      render(s);
    }
  }
  render();
  return () => {};
}

// ============ Какая струна звучит (на слух) ============
export function EarGame(el, { onDone, need = 5 }) {
  el.innerHTML = `<div class="checker"><div class="q">Какая струна звучит?</div>
    <div class="row gap center"><button class="btn primary play">▶ Сыграть струну</button></div>
    <div class="strings-row">${[6, 5, 4, 3, 2, 1].map(n => `<button class="str-btn" data-s="${n}"><b>${n}</b><small>${noteName(OPEN[sIdx(n)]).ru}</small></button>`).join('')}</div>
    <div class="hint">&nbsp;</div><div class="center-t muted ear-score">Верно: 0 из ${need}</div></div>`;
  let cur = 0, score = 0, answered = true;
  const hint = $('.hint', el);
  const play = () => { if (answered) { let n; do n = 1 + Math.floor(Math.random() * 6); while (n === cur); cur = n; answered = false; hint.innerHTML = '&nbsp;'; } playNote(OPEN[sIdx(cur)], 0, 0.6, 1.6); };
  $('.play', el).onclick = play;
  el.querySelectorAll('.str-btn').forEach(b => b.onclick = () => {
    const s = +b.dataset.s;
    if (!cur) return play();
    if (answered) { playNote(OPEN[sIdx(s)], 0, 0.6, 1.4); return; } // после ответа кнопки просто играют струны для сравнения
    answered = true;
    if (s === cur) { score++; hint.innerHTML = `<span class="good-t">✓ Верно, ${ord(cur)} (${noteName(OPEN[sIdx(cur)]).ru})!</span>`; }
    else hint.innerHTML = `<span class="bad-t">Это была ${ord(cur)} (${noteName(OPEN[sIdx(cur)]).ru}). Нажимайте на струны, чтобы сравнить звук.</span>`;
    $('.ear-score', el).textContent = `Верно: ${score} из ${need}`;
    $('.play', el).textContent = '▶ Следующая струна';
    if (score === need) { hint.innerHTML += ' 🎉 Отличный слух!'; onDone && onDone(); }
  });
  return () => {};
}

// ============ Аккорд по одной струне ============
export function StringCheck(el, { chord, onDone }) {
  const ch = CHORDS[chord];
  const list = ch.frets.map((f, i) => ({ f, i, s: 6 - i })).filter(o => o.f >= 0);
  const st = ch.frets.map(f => (f < 0 ? '' : 'wait'));
  el.innerHTML = `<div class="checker"><div class="row gap center wrap"><div class="diagram"></div><div class="sc-side"><div class="sc-txt"></div></div></div>
    <div class="hint">Поставьте ${chord} и дёргайте струны по одной, начиная с ${ordY(list[0].s)}.</div>
    ${MICBAR}
    <div class="row gap wrap center"><button class="btn primary start">🎤 Слушать</button><button class="btn ghost sm listen">▶ Как звучит струна</button><button class="btn ghost sm skip">Пропустить струну</button></div>
    <div class="status"></div></div>`;
  let k = 0, running = false, off = null, offOn = null, dead = null, cleanFor = 0;
  const nm = new NoteMatcher({ a4: S.settings.a4, wrongAfter: 6 }), hint = $('.hint', el);
  const offBar = micBar(el);
  function render() {
    const s = st.map((v, i) => (k < list.length && list[k].i === i ? 'cur' : v === 'wait' ? '' : v));
    $('.diagram', el).innerHTML = chordSVG(chord, { st: s });
    if (k >= list.length) { $('.sc-txt', el).innerHTML = `<div class="big good-t">✓ Все ${list.length} ${plural(list.length, 'струна звенит', 'струны звенят', 'струн звенят')}</div>`; return; }
    const o = list[k], n = noteName(OPEN[o.i] + o.f);
    $('.sc-txt', el).innerHTML = `<span class="pill">${k + 1}/${list.length}</span> Дёрните <b>${strAcc(o.s)}</b><div class="muted">${o.f ? `${o.f}-й лад, палец ${fingerDot(ch.fingers[o.i])} ${FINGERS[ch.fingers[o.i]]}` : 'открытая'} → ${n.ru} (${n.lat})</div>`;
    nm.setTarget(OPEN[o.i] + o.f);
  }
  render();
  function bad(text) { st[list[k].i] = 'bad'; hint.innerHTML = `<span class="bad-t">${text}</span>`; render(); }
  function good() {
    st[list[k].i] = 'ok'; dead = null; k++;
    hint.innerHTML = `<span class="good-t">✓ Звенит!</span>`;
    render();
    if (k >= list.length) { stop(); onDone && onDone(); }
  }
  function onResult(res) {
    if (k >= list.length) return;
    if (dead) {
      if (res.freq > 0 && !res.weak) cleanFor++; else cleanFor = 0;
      if (cleanFor >= 3) dead = null;
      else if (res.t - dead > 0.8) {
        dead = null;
        const o = list[k];
        bad(o.f ? `${strName(o.s)} глухая: палец ${ch.fingers[o.i]} не дожат или его касается соседний. Ставьте кончиком у ладового порожка, «домиком».`
          : `${strName(o.s)} глухая: её касается палец с соседней струны. Поднимите пальцы «домиком», чтобы открытая струна звенела.`);
      }
    }
    const ev = nm.update(res);
    if (!ev) return;
    if (ev.type === 'hit') return good();
    const o = list[k], want = OPEN[o.i] + o.f, open = OPEN[o.i], hn = noteName(ev.midi);
    if (o.f > 0 && ev.midi === open) bad(`Звучит открытая ${ord(o.s)} струна: палец ${ch.fingers[o.i]} не прижимает её. Дожмите кончиком у порожка ${o.f}-го лада.`);
    else if (Math.abs(ev.midi - want) <= 2) bad(`Слышу ${hn.ru} вместо ${noteName(want).ru}: палец стоит не на том ладу — нужен ${fretTxt(o.f)}.`);
    else bad(`Слышу ${hn.ru} (${hn.lat}) — похоже, дёрнули соседнюю струну. Нужна ${ord(o.s)}.`);
  }
  $('.listen', el).onclick = () => { const o = list[Math.min(k, list.length - 1)]; playNote(OPEN[o.i] + o.f, 0, 0.6, 1.5); };
  $('.skip', el).onclick = () => { if (k < list.length) { k++; render(); if (k >= list.length) { stop(); onDone && onDone(); } } };
  $('.start', el).onclick = async () => {
    if (running) return stop();
    if (!(await startMic($('.status', el)))) return;
    running = true; $('.start', el).textContent = '⏹ Стоп';
    off = mic.listen(onResult);
    offOn = mic.onOnset(t => { dead = t; cleanFor = 0; });
    hint.textContent = `Слушаю… дёрните ${strAcc(list[k] ? list[k].s : 1)}.`;
  };
  function stop() { off && off(); offOn && offOn(); off = offOn = null; running = false; stopMic(); $('.start', el).textContent = '🎤 Слушать'; }
  return () => { running && stop(); offBar(); };
}

// ============ Аккорд ударом ============
function chordHints(name, r) {
  const ch = CHORDS[name], hints = [], bad = new Set();
  const first = 6 - ch.frets.findIndex(f => f >= 0);
  r.dead.forEach((d, i) => {
    if (!d) return;
    bad.add(i);
    const f = ch.frets[i];
    hints.push(f > 0 ? `Не звучит ${ord(6 - i)} струна (${f}-й лад, палец ${ch.fingers[i]}). Дожмите её кончиком ближе к ладовому порожку.`
      : `Не звучит открытая ${ord(6 - i)} струна: её глушит соседний палец. Держите пальцы «домиком».`);
  });
  if (r.foreign != null) {
    const pc = r.foreign;
    const notPressed = ch.frets.map((f, i) => ({ f, i })).find(o => o.f > 0 && OPEN[o.i] % 12 === pc);
    const mutedStr = ch.frets.map((f, i) => ({ f, i })).find(o => o.f < 0 && OPEN[o.i] % 12 === pc);
    const neighbour = ch.frets.map((f, i) => ({ f, i })).find(o => o.f > 0 && [1, 11].includes(((OPEN[o.i] + o.f - pc) % 12 + 12) % 12));
    if (notPressed) { bad.add(notPressed.i); hints.push(`Звучит лишняя нота ${pcName(pc)} — похоже, ${ord(6 - notPressed.i)} струна звучит открытой: палец ${ch.fingers[notPressed.i]} не прижимает её на ${notPressed.f}-м ладу.`); }
    else if (mutedStr) { bad.add(mutedStr.i); hints.push(`Звучит ${ord(6 - mutedStr.i)} струна, которую в ${name} не играют. Начинайте удар с ${ordY(first)}.`); }
    else if (neighbour) { bad.add(neighbour.i); hints.push(`Слышна лишняя нота ${pcName(pc)}: палец на ${ordY(6 - neighbour.i)} струне, похоже, не на том ладу (нужен ${neighbour.f}-й).`); }
    else hints.push(`Слышна посторонняя нота ${pcName(pc)}. Проверьте строй тюнером.`);
  }
  for (const pc of r.missing) {
    const strs = ch.frets.map((f, i) => ({ f, i })).filter(o => o.f >= 0 && (OPEN[o.i] + o.f) % 12 === pc && !bad.has(o.i));
    if (!strs.length) continue;
    const o = strs.find(x => x.f > 0) || strs[0];
    bad.add(o.i);
    hints.push(o.f > 0 ? `Не слышно ноты ${pcName(pc)}: ${ord(6 - o.i)} струна, ${o.f}-й лад (палец ${ch.fingers[o.i]}). Прижмите сильнее, ближе к порожку.`
      : `Не слышно открытой ${ordY(6 - o.i)} струны (${pcName(pc)}): её задевает палец. Пальцы «домиком».`);
  }
  if (!hints.length) hints.push(r.quiet.some(Boolean) ? `Бас звучит тихо: начинайте удар увереннее, с ${ordY(first)} струны.` : 'Почти! Ударьте увереннее по всем нужным струнам и дайте аккорду прозвучать.');
  return { hints, bad: [...bad] };
}
function chromaBars(c, tones) {
  return `<div class="chroma">${[...Array(12)].map((_, pc) =>
    `<div class="cb ${tones.includes(pc) ? 'in' : ''}"><i style="height:${Math.round(Math.min(1, c[pc] * 2.5) * 100)}%"></i><span>${noteName(pc + 60).lat}</span></div>`).join('')}</div>`;
}
// слушаем удары: на каждый удар — спектр через 0,12 с и разбор аккорда
function listenChords(strings, cb) {
  let busy = false;
  return mic.onOnset(() => {
    if (busy) return;
    busy = true;
    mic.spectrumIn(0.12, sp => { busy = false; cb(sp); });
  });
}
const tooQuiet = sp => { let m = 0; for (let k = 10; k < sp.mag.length / 8; k++) if (sp.mag[k] > m) m = sp.mag[k]; return m < 1; };

export function ChordChecker(el, { chord, need = 3, onDone }) {
  const ch = CHORDS[chord], tones = chordPcs(ch), strings = chordMidis(ch);
  el.innerHTML = `<div class="checker">
    <div class="row gap center wrap"><div class="diagram">${chordSVG(chord)}</div>
      <div class="cc-side"><div class="big cc-count">${need === Infinity ? '' : `0 / ${need}`}</div><div class="viz">${chromaBars(new Float32Array(12), tones)}</div><div class="muted small">какие ноты слышны</div></div></div>
    <div class="hint">Поставьте ${chord}, включите микрофон и ударьте по струнам сверху вниз.</div>
    ${MICBAR}
    <div class="row gap center wrap"><button class="btn primary start">🎤 Слушать</button><button class="btn ghost sm listen">▶ Как звучит</button><button class="btn ghost sm arp">▶ По струнам</button></div>
    <div class="status"></div></div>`;
  let running = false, off = null, good = 0;
  const hint = $('.hint', el), offBar = micBar(el);
  $('.listen', el).onclick = () => strum(chord, 'D');
  $('.arp', el).onclick = () => arpeggio(chord);
  $('.start', el).onclick = async () => {
    if (running) return stop();
    if (!(await startMic($('.status', el)))) return;
    running = true; $('.start', el).textContent = '⏹ Стоп';
    hint.textContent = 'Слушаю… ударьте по струнам.';
    off = listenChords(strings, sp => {
      if (tooQuiet(sp)) { hint.innerHTML = '<span class="bad-t">Слишком тихо. Ударьте увереннее или поднесите телефон ближе.</span>'; return; }
      const r = judgeChord(sp, strings, S.settings.a4);
      $('.viz', el).innerHTML = chromaBars(r.c, tones);
      if (r.ok) {
        good++;
        if (need !== Infinity) $('.cc-count', el).textContent = `${Math.min(good, need)} / ${need}`;
        hint.innerHTML = `<span class="good-t">✓ Чисто! ${need === Infinity ? 'Все струны звучат.' : good < need ? 'Ещё раз.' : ''}</span>`;
        $('.diagram', el).innerHTML = chordSVG(chord);
        if (good === need) { stop(); onDone && onDone(); }
      } else {
        const { hints, bad } = chordHints(chord, r);
        hint.innerHTML = `<span class="bad-t">${hints.join('<br>')}</span>`;
        $('.diagram', el).innerHTML = chordSVG(chord, { bad });
      }
    });
  };
  function stop() { off && off(); off = null; running = false; stopMic(); $('.start', el).textContent = '🎤 Слушать'; }
  return () => { running && stop(); offBar(); };
}

// ============ Смены аккордов за минуту ============
export function ChangesCounter(el, { chords, goal = 8, onDone, bestKey, tip }) {
  const [a, b] = chords;
  el.innerHTML = `<div class="checker">
    <div class="row gap center">${chords.map(n => `<div class="diagram sm" data-c="${n}">${chordSVG(n)}</div>`).join('')}</div>
    ${tip ? `<div class="tip">🔁 ${tip}</div>` : ''}
    <div class="row gap center chg-stats"><div><div class="big time">1:00</div><small class="muted">осталось</small></div><div><div class="big cnt">0</div><small class="muted">смен</small></div></div>
    <div class="hint">Цель: ${goal} смен. Рекорд: ${S.bests[bestKey] || 0}. Микрофон сам считает смены; если не успевает — жмите «+1».</div>
    ${MICBAR}
    <div class="row gap center wrap"><button class="btn primary start">▶ Старт</button><button class="btn ghost plus">+1</button></div>
    <div class="status"></div></div>`;
  let running = false, count = 0, prev = null, end = 0, timer = null, off = null, micOn = false;
  const set = () => { $('.cnt', el).textContent = count; };
  const offBar = micBar(el);
  const score = (sp, n) => { const r = judgeChord(sp, chordMidis(CHORDS[n]), S.settings.a4); return r.inChord - r.missing.length * 0.15 - (r.foreign != null ? 0.1 : 0); };
  $('.plus', el).onclick = () => { if (running) { count++; set(); } };
  $('.start', el).onclick = async () => {
    if (running) return finish(false);
    count = 0; prev = null; set();
    micOn = await startMic($('.status', el));
    if (micOn) off = listenChords(null, sp => {
      if (tooQuiet(sp)) return;
      const sa = score(sp, a), sb = score(sp, b);
      const cur = Math.max(sa, sb) < 0.55 ? null : sa > sb ? a : b;
      el.querySelectorAll('.diagram').forEach(d => d.classList.toggle('cur', d.dataset.c === cur));
      if (cur && prev && cur !== prev) { count++; set(); }
      if (cur) prev = cur;
    });
    running = true; activity.add('changes');
    $('.start', el).textContent = '⏹ Стоп';
    end = performance.now() + 60000;
    timer = setInterval(() => {
      const left = Math.max(0, end - performance.now());
      $('.time', el).textContent = `0:${String(Math.ceil(left / 1000)).padStart(2, '0')}`;
      if (left <= 0) finish(true);
    }, 200);
  };
  function finish(complete) {
    clearInterval(timer); off && off(); off = null; running = false; activity.delete('changes');
    if (micOn) stopMic();
    $('.start', el).textContent = '▶ Ещё раз';
    if (!complete) return;
    beep(660, 0.4);
    const rec = setBest(bestKey, count);
    $('.hint', el).innerHTML = count >= goal
      ? `<span class="good-t">✓ ${count} смен за минуту${rec ? ' — новый рекорд!' : ''}. Следующая цель: ${Math.max(goal + 5, count + 5)}.</span>`
      : `<span class="bad-t">${count} смен, цель ${goal}. Не смотрите на струны: поднимайте все пальцы вместе и ставьте их одновременно.</span>`;
    if (count >= goal && onDone) onDone();
  }
  return () => { running && finish(false); offBar(); };
}

// ============ Таймер ============
export function TimerWidget(el, { seconds, metronome, onDone }) {
  el.innerHTML = `<div class="checker"><div class="big time">${fmt(seconds)}</div>
    <div class="pbar"><i></i></div>
    ${metronome ? `<label class="chk"><input type="checkbox" class="met" checked> Метроном ${metronome} уд/мин</label>` : ''}
    <div class="row gap center"><button class="btn primary start">▶ Старт</button><button class="btn ghost reset">↺ Сброс</button></div></div>`;
  let left = seconds, timer = null, clock = null, last = 0;
  const upd = () => { $('.time', el).textContent = fmt(left); $('.pbar i', el).style.width = `${100 - (left / seconds) * 100}%`; };
  function pause() {
    clearInterval(timer); timer = null; clock && clock.stop(); clock = null; activity.delete('timer'); keepAwake(false);
    $('.start', el).textContent = left > 0 && left < seconds ? '▶ Продолжить' : '▶ Старт';
  }
  $('.start', el).onclick = () => {
    if (timer) return pause();
    if (left <= 0) left = seconds;
    ctx(); activity.add('timer'); keepAwake(true);
    if (metronome && $('.met', el).checked) { clock = new Clock(metronome, (t, step) => click(t, step % 4 === 0), 1); clock.start(); }
    last = performance.now();
    timer = setInterval(() => {
      const now = performance.now(); left -= (now - last) / 1000; last = now;
      if (left <= 0) { left = 0; upd(); pause(); beep(880, 0.5); onDone && onDone(); return; }
      upd();
    }, 200);
    $('.start', el).textContent = '⏸ Пауза';
  };
  $('.reset', el).onclick = () => { pause(); left = seconds; upd(); };
  return () => timer && pause();
}
export function fmt(s) { s = Math.ceil(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

// ============ Вопрос ============
export function Quiz(el, { q, options, answer, why, onDone }) {
  el.innerHTML = `<div class="checker"><div class="q">${q}</div><div class="opts">${options.map((o, i) => `<button class="btn opt" data-i="${i}">${o}</button>`).join('')}</div><div class="hint">&nbsp;</div></div>`;
  el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const ok = +b.dataset.i === answer;
    b.classList.add(ok ? 'right' : 'wrong');
    $('.hint', el).innerHTML = ok ? `<span class="good-t">✓ Верно!</span>${why ? ` <span class="muted">${why}</span>` : ''}` : '<span class="bad-t">Не совсем, попробуйте ещё.</span>';
    if (ok && onDone) onDone();
  });
  return () => {};
}

// ============ Запись себя ============
export function Recorder(el, { onDone }) {
  el.innerHTML = `<div class="checker"><div class="big rec-time">0:00</div>
    <div class="row gap center wrap"><button class="btn primary rec">⏺ Записать</button></div>
    <audio class="rec-audio" controls hidden></audio><div class="hint muted">До 2 минут. Запись остаётся только на этом устройстве.</div><div class="status"></div></div>`;
  let rec = null, stream = null, chunks = [], t0 = 0, timer = null, url = null;
  const btn = $('.rec', el), audio = $('.rec-audio', el);
  btn.onclick = async () => {
    if (rec) return rec.stop();
    if (!window.MediaRecorder) { $('.status', el).innerHTML = '<div class="warn">Этот браузер не умеет записывать звук. Попробуйте Chrome или свежий Safari.</div>'; return; }
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } }); }
    catch (err) { $('.status', el).innerHTML = `<div class="warn">${micErrorText(err)}</div>`; return; }
    chunks = []; rec = new MediaRecorder(stream);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(timer); stream.getTracks().forEach(t => t.stop()); activity.delete('rec');
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      audio.src = url; audio.hidden = false; rec = null;
      btn.textContent = '⏺ Записать заново';
      $('.hint', el).innerHTML = 'Послушайте: ровный ли ритм? Звенят ли все струны? Где запинка — то место и повторите медленно.';
      onDone && onDone();
    };
    rec.start(); t0 = performance.now(); activity.add('rec');
    btn.textContent = '⏹ Стоп';
    timer = setInterval(() => { const s = (performance.now() - t0) / 1000; $('.rec-time', el).textContent = fmt(s); if (s >= 120) rec && rec.stop(); }, 250);
  };
  return () => { if (rec) rec.stop(); };
}

// ============ Тренажёр боя и «играем вместе» ============
// mode: 'free' (всё доступно), 'tap' (проверка тапами), 'mic' (проверка микрофоном), 'song' (тапы и микрофон, схемы аккордов)
export function StrumTrainer(el, opts) {
  const o = { pattern: 'down4', bpm: 70, bars: 4, chord: 'Am', mode: 'free', ...opts };
  const chords = Array.isArray(o.chord) ? o.chord : [o.chord];
  const free = o.mode === 'free', song = o.mode === 'song';
  const bars = song ? Math.max(o.bars, chords.length * 2) : o.bars;
  el.innerHTML = `<div class="strum">
    ${free ? `<div class="chips">${Object.entries(PATTERNS).map(([k, p]) => `<button class="chip ${k === o.pattern ? 'on' : ''}" data-p="${k}">${p.name}</button>`).join('')}</div>
      <div class="chips">${['Am', 'Em', 'C', 'G', 'Dm', 'E', 'D', 'A'].map(n => `<button class="chip ch ${n === chords[0] ? 'on' : ''}" data-c="${n}">${n}</button>`).join('')}
      <button class="chip ch" data-c="Am,Dm,E,Am">Am–Dm–E–Am</button><button class="chip ch" data-c="Am,C,Dm,G">Am–C–Dm–G</button><button class="chip ch" data-c="G,D,Em,C">G–D–Em–C</button></div>` : ''}
    <div class="row gap center bpm-row"><button class="btn ghost sm minus">−5</button><div class="bpm"><b>${o.bpm}</b> уд/мин</div><button class="btn ghost sm plus">+5</button></div>
    ${song || chords.length > 1 && chords[0] ? '<div class="song-now"><div class="sn-cur"></div><div class="sn-next"></div></div>' : ''}
    <div class="now-chord"><span class="cur-ch"></span><span class="next-ch muted"></span><span class="beat-flash"></span></div>
    <div class="grid8"></div>
    <div class="pad" tabindex="0"><div class="pad-strings">${'<i></i>'.repeat(6)}</div><div class="hand"></div><div class="pad-fb"></div></div>
    <div class="row gap center tapbtns"><button class="btn big-arrow" data-d="D">↓</button><button class="btn big-arrow" data-d="U">↑</button></div>
    <div class="row gap center wrap ctrls">
      <button class="btn ghost demo">▶ Демо</button>
      ${o.mode !== 'mic' ? '<button class="btn primary tap">Проверить меня</button>' : ''}
      ${o.mode !== 'tap' ? '<button class="btn primary micb">🎤 Проверить на гитаре</button>' : ''}
    </div>
    <div class="row gap center wrap small-opts">
      <label class="chk"><input type="checkbox" class="clk" checked> Щелчки</label>
      ${o.mode !== 'tap' ? '<label class="chk"><input type="checkbox" class="hp"> Щелчки в наушниках</label>' : ''}
    </div>
    <div class="status"></div>
    <div class="result"></div>
  </div>`;

  let pattern = o.pattern, bpm = o.bpm, prog = chords;
  let clock = null, run = null, raf = 0, shownBar = -1;
  const grid = $('.grid8', el), pad = $('.pad', el), hand = $('.hand', el), padFb = $('.pad-fb', el);
  const arrowOf = c => (c === 'D' ? '↓' : c === 'U' ? '↑' : c === 'X' ? '✕' : c === 'B' ? 'Б' : '·');

  function drawGrid(marks = {}) {
    const cells = PATTERNS[pattern].cells;
    grid.innerHTML = cells.map((c, i) => `<div class="cell ${marks[i] || ''} ${c === 'X' ? 'mute' : ''}" data-i="${i}"><div class="arr">${arrowOf(c)}</div><div class="cnt">${COUNT[i]}</div></div>`).join('');
  }
  drawGrid();
  const setChordLabel = bar => {
    const cur = prog[bar % prog.length], nxt = prog[(bar + 1) % prog.length];
    $('.cur-ch', el).textContent = cur || 'открытая 6-я';
    $('.next-ch', el).textContent = prog.length > 1 ? `дальше: ${nxt}` : '';
    const sn = $('.song-now', el);
    if (sn && cur && bar !== shownBar) {
      shownBar = bar;
      $('.sn-cur', sn).innerHTML = chordSVG(cur);
      $('.sn-next', sn).innerHTML = prog.length > 1 ? `<span class="muted">дальше</span>${chordSVG(nxt)}` : '';
    }
  };
  setChordLabel(0);

  if (free) {
    el.querySelectorAll('.chip[data-p]').forEach(b => b.onclick = () => {
      el.querySelectorAll('.chip[data-p]').forEach(x => x.classList.toggle('on', x === b));
      pattern = b.dataset.p; drawGrid();
    });
    el.querySelectorAll('.chip.ch').forEach(b => b.onclick = () => {
      el.querySelectorAll('.chip.ch').forEach(x => x.classList.toggle('on', x === b));
      prog = b.dataset.c.split(','); shownBar = -1; setChordLabel(0);
    });
  }
  const setBpm = v => { bpm = Math.max(40, Math.min(180, v)); $('.bpm b', el).textContent = bpm; clock && clock.setBpm(bpm); };
  $('.minus', el).onclick = () => setBpm(bpm - 5);
  $('.plus', el).onclick = () => setBpm(bpm + 5);

  function start(kind) {
    stop();
    $('.result', el).innerHTML = '';
    const c = ctx();
    const cells = PATTERNS[pattern].cells;
    const countIn = kind === 'demo' ? 0 : 8;
    const total = kind === 'demo' ? Infinity : countIn + bars * 8;
    const clicks = $('.clk', el).checked;
    const hp = $('.hp', el) && $('.hp', el).checked;
    run = { kind, expected: [], strokes: [], countIn, total, cells };
    clock = new Clock(bpm, (t, step) => {
      if (step >= total) { if (step === total) setTimeout(() => finish(), (t - c.currentTime) * 1000 + 300); return; }
      const inPlay = step >= countIn, ps = step - countIn, cell = cells[((ps % 8) + 8) % 8];
      const bar = Math.floor(ps / 8);
      if (step % 2 === 0) {
        const countClick = !inPlay;
        const playClick = inPlay && clicks && (kind !== 'mic' || hp);
        if (countClick || playClick) click(t, step % 8 === 0);
      }
      if (inPlay && cell) {
        const chord = prog[bar % prog.length];
        if (kind === 'demo') strum(chord || [40], cell, t);
        else run.expected.push({ t, dir: cell === 'U' ? 'U' : 'D', cell: ps % 8, hit: null });
      }
      const delay = Math.max(0, (t - c.currentTime) * 1000);
      setTimeout(() => {
        if (!run) return;
        if (inPlay) {
          grid.querySelectorAll('.cell').forEach((x, i) => x.classList.toggle('now', i === ps % 8));
          if (ps % 8 === 0) setChordLabel(bar);
        } else {
          $('.cur-ch', el).textContent = `${(step >> 1) + 1}…`;
          $('.next-ch', el).textContent = 'отсчёт';
        }
        if (step % 2 === 0) { const f = $('.beat-flash', el); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
      }, delay);
    });
    run.t0 = clock.start(0.2) + countIn * clock.stepDur;
    activity.add('strum');
    animate();
    if (kind === 'mic') {
      startMic($('.status', el)).then(ok => {
        if (!ok) return stop();
        mic.setSens(S.settings.sens);
        run && (run.off = mic.onOnset(t => addStroke(t - latency(), null)));
      });
    }
    el.querySelector('.strum').classList.toggle('testing', kind !== 'demo');
    $('.demo', el).textContent = kind === 'demo' ? '⏹ Стоп' : '▶ Демо';
  }

  function latency() { return S.settings.latency ?? 0.05; }

  function animate() {
    cancelAnimationFrame(raf);
    const c = ctx();
    const loop = () => {
      if (!run) return;
      const st = 60 / bpm / 2;
      const ph = (c.currentTime - (run.t0 - run.countIn * st)) / st;
      // вниз на чётной восьмой, вверх на нечётной; рука движется всегда
      const k = ((ph % 2) + 2) % 2;
      const y = k < 1 ? (1 - Math.cos(Math.PI * k)) / 2 : (1 + Math.cos(Math.PI * (k - 1))) / 2;
      hand.style.top = `${8 + y * 74}%`;
      raf = requestAnimationFrame(loop);
    };
    loop();
  }

  function addStroke(t, dir) {
    if (!run || run.kind === 'demo') {
      if (dir) strum(prog[0] || [40], dir);
      flashPad(dir, '');
      return;
    }
    if (run.kind === 'tap' && dir) strum(prog[Math.max(0, Math.floor((t - run.t0) / (60 / bpm) / 4)) % prog.length] || [40], dir);
    const tol = Math.min(0.13, (60 / bpm / 2) * 0.48);
    let best = null, bd = tol;
    for (const e of run.expected) { if (e.hit) continue; const d = Math.abs(t - e.t); if (d < bd) { bd = d; best = e; } }
    if (t < run.t0 - tol) return; // во время отсчёта не считаем
    if (!best) { run.strokes.push({ t, extra: true }); flashPad(dir, 'extra'); return; }
    const off = t - best.t;
    best.hit = dir && dir !== best.dir ? 'dir' : 'ok';
    best.off = off;
    run.strokes.push({ t, off });
    flashPad(dir, best.hit === 'dir' ? 'dir' : Math.abs(off) < 0.05 ? 'perfect' : off < 0 ? 'early' : 'late');
  }

  function flashPad(dir, kind) {
    const txt = { perfect: '✓ точно', early: 'рано', late: 'поздно', dir: 'не то направление', extra: 'лишний удар', '': '' }[kind];
    padFb.textContent = txt; padFb.className = `pad-fb ${kind}`;
    pad.classList.remove('hitD', 'hitU'); void pad.offsetWidth;
    pad.classList.add(dir === 'U' ? 'hitU' : 'hitD');
  }

  function finish() {
    if (!run || run.kind === 'demo') return;
    const r = run; stop();
    const exp = r.expected, hits = exp.filter(e => e.hit === 'ok'), dirErr = exp.filter(e => e.hit === 'dir');
    const extras = r.strokes.filter(s => s.extra).length;
    const acc = exp.length ? Math.round((100 * hits.length) / (exp.length + extras * 0.5)) : 0;
    const offs = exp.filter(e => e.hit).map(e => e.off);
    const mean = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : 0;
    const sd = offs.length ? Math.sqrt(offs.reduce((a, b) => a + (b - mean) ** 2, 0) / offs.length) : 0;
    const per = {};
    exp.forEach(e => { per[e.cell] = per[e.cell] || { n: 0, ok: 0, miss: 0, dir: 0 }; per[e.cell].n++; if (e.hit === 'ok') per[e.cell].ok++; else if (e.hit === 'dir') per[e.cell].dir++; else per[e.cell].miss++; });
    const marks = {};
    Object.entries(per).forEach(([i, p]) => (marks[i] = p.ok / p.n >= 0.75 ? 'good' : p.ok / p.n >= 0.4 ? 'mid' : 'bad'));
    drawGrid(marks);
    const hints = [];
    if (!offs.length && extras) hints.push('Удары слышны, но мимо долей. Слушайте отсчёт «1-2-3-4» и бейте вместе со вспышкой кружка.');
    else if (!offs.length) hints.push(r.kind === 'mic' ? 'Микрофон не услышал ударов. Играйте громче, положите телефон ближе или увеличьте чувствительность в «Прогресс → Настройки».' : 'Ударов не было. Свайпайте по полосе со струнами или жмите ↓ ↑.');
    else {
      if (mean > 0.04) hints.push(`Вы опаздываете в среднем на ${Math.round(mean * 1000)} мс. Начинайте движение чуть раньше щелчка.`);
      if (mean < -0.04) hints.push(`Вы спешите в среднем на ${Math.round(-mean * 1000)} мс. Слушайте щелчок, не убегайте вперёд.`);
      if (sd > 0.045) hints.push('Ритм неровный. Считайте вслух «раз-и-два-и» и держите руку в постоянном движении.');
      if (dirErr.length) {
        const cell = Object.entries(per).sort((a, b) => b[1].dir - a[1].dir)[0];
        hints.push(`Путаете направление (${dirErr.length} раз), чаще всего на «${COUNT[cell[0]]}». На цифрах рука идёт вниз, на «и» — вверх.`);
      }
      const worst = Object.entries(per).filter(([, p]) => p.miss / p.n > 0.5).map(([i]) => `«${COUNT[i]}»`);
      if (worst.length) hints.push(`Пропускаете удары на ${worst.join(', ')}.`);
      if (extras > 1) hints.push(`Лишних ударов: ${extras}. Там, где пауза (·), рука проходит мимо струн.`);
      if (!hints.length) hints.push('Отлично! Поднимите темп на 5 ударов в минуту.');
    }
    const pass = acc >= (r.kind === 'mic' ? 75 : 80);
    $('.result', el).innerHTML = `<div class="res ${pass ? 'pass' : ''}"><div class="big">${acc}%</div>
      <div>точность · попаданий ${hits.length} из ${exp.length}${offs.length ? ` · разброс ±${Math.round(sd * 1000)} мс` : ''}</div>
      <ul class="list">${hints.map(h => `<li>${h}</li>`).join('')}</ul></div>`;
    setBest(`strum:${pattern}:${bpm}`, acc);
    o.onResult && o.onResult({ acc, pass, kind: r.kind });
  }

  function stop() {
    if (clock) clock.stop(); clock = null;
    cancelAnimationFrame(raf);
    if (run && run.off) run.off();
    if (run && run.kind === 'mic') stopMic();
    run = null; activity.delete('strum');
    grid.querySelectorAll('.cell').forEach(x => x.classList.remove('now'));
    el.querySelector('.strum').classList.remove('testing');
    $('.demo', el).textContent = '▶ Демо';
    shownBar = -1; setChordLabel(0);
  }

  $('.demo', el).onclick = () => (run && run.kind === 'demo' ? stop() : start('demo'));
  $('.tap', el) && ($('.tap', el).onclick = () => start('tap'));
  $('.micb', el) && ($('.micb', el).onclick = () => start('mic'));

  // Ввод: свайп по полосе, кнопки, стрелки клавиатуры
  const toAudio = ts => ctx().currentTime + (ts - performance.now()) / 1000;
  let down = null;
  pad.addEventListener('pointerdown', e => { down = { y: e.clientY, used: false }; pad.setPointerCapture(e.pointerId); });
  pad.addEventListener('pointermove', e => {
    if (!down || down.used) return;
    const dy = e.clientY - down.y;
    if (Math.abs(dy) > 14) { down.used = true; addStroke(toAudio(e.timeStamp), dy > 0 ? 'D' : 'U'); }
  });
  pad.addEventListener('pointerup', () => (down = null));
  el.querySelectorAll('.big-arrow').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); addStroke(toAudio(e.timeStamp), b.dataset.d); }));
  const onKey = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); addStroke(toAudio(e.timeStamp), e.key === 'ArrowDown' ? 'D' : 'U'); }
  };
  document.addEventListener('keydown', onKey);
  return () => { stop(); document.removeEventListener('keydown', onKey); };
}

// ============ Метроном ============
export function Metronome(el) {
  el.innerHTML = `<div class="checker metro">
    <div class="row gap center bpm-row"><button class="btn ghost sm m10">−10</button><button class="btn ghost sm m1">−1</button>
      <div class="bpm"><b>80</b> уд/мин</div><button class="btn ghost sm p1">+1</button><button class="btn ghost sm p10">+10</button></div>
    <input type="range" min="40" max="200" value="80" class="slider">
    <div class="dots"></div>
    <div class="chips"><button class="chip on" data-b="4">4/4</button><button class="chip" data-b="3">3/4</button><button class="chip" data-b="2">2/4</button></div>
    <div class="row gap center"><button class="btn primary start">▶ Старт</button><button class="btn ghost tapt">Тап-темп</button></div></div>`;
  let bpm = 80, beats = 4, clock = null, taps = [];
  const dots = $('.dots', el);
  const drawDots = () => (dots.innerHTML = '<i></i>'.repeat(beats));
  drawDots();
  const set = v => { bpm = Math.max(40, Math.min(200, Math.round(v))); $('.bpm b', el).textContent = bpm; $('.slider', el).value = bpm; clock && clock.setBpm(bpm); };
  [['m10', -10], ['m1', -1], ['p1', 1], ['p10', 10]].forEach(([c, d]) => ($(`.${c}`, el).onclick = () => set(bpm + d)));
  $('.slider', el).oninput = e => set(+e.target.value);
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => { el.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); beats = +b.dataset.b; drawDots(); });
  $('.tapt', el).onclick = () => {
    const now = performance.now(); taps = taps.filter(t => now - t < 3000); taps.push(now);
    if (taps.length >= 3) set(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
  };
  function stop() { clock && clock.stop(); clock = null; activity.delete('metro'); $('.start', el).textContent = '▶ Старт'; }
  $('.start', el).onclick = () => {
    if (clock) return stop();
    const c = ctx();
    clock = new Clock(bpm, (t, step) => {
      const b = step % beats; click(t, b === 0);
      setTimeout(() => dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === b)), Math.max(0, (t - c.currentTime) * 1000));
    }, 1);
    clock.start(); activity.add('metro');
    $('.start', el).textContent = '⏹ Стоп';
  };
  return stop;
}

// ============ Калибровка задержки микрофона ============
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
export async function calibrateLatency(statusEl) {
  if (!(await startMic(statusEl))) return null;
  const c = ctx(), heard = [], times = [];
  const off = mic.onOnset(t => heard.push(t));
  const t0 = c.currentTime + 0.4;
  for (let k = 0; k < 8; k++) { const t = t0 + k * 0.5; times.push(t); click(t, true); }
  await new Promise(r => setTimeout(r, 4700));
  off(); stopMic();
  const offs = times.map(t => { const h = heard.filter(x => x > t - 0.02 && x < t + 0.35); return h.length ? h[0] - t : null; }).filter(v => v != null);
  if (offs.length < 4) return null;
  const lat = median(offs);
  S.settings.latency = Math.round(lat * 1000) / 1000; save();
  return lat;
}
