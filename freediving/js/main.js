// Школа фридайвинга: экраны, проигрыватель уроков, сравнение ошибок, таблицы, тренировка дня.
import * as THREE from 'three';
import { World } from './scene.js';
import { Diver } from './diver.js';
import { Player } from './anims.js';
import { Anatomy, MODES } from './anatomy.js';
import { MODULES, MISTAKES, EXERCISES, ATLAS, allLessons } from './content.js';
import * as S from './store.js';
import { KINDS, TableTimer, fmt, total } from './tables.js';
import * as WO from './workout.js';
import { beep, unlockAudio, keepAwake, vibrate } from './sfx.js';
import { clamp, V3 } from './kit.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const Q = new URLSearchParams(location.search);

// ================================================================ 3D
const canvas = $('#view');
const world = new World(canvas);
const pool = {};
function getDiver(fins = 'bifins', slot = 'a') {
  const key = fins + slot;
  if (!pool[key]) {
    const d = new Diver({ fins, suit: slot === 'b' ? 'orange' : 'teal', finColor: slot === 'b' ? '#e0632b' : '#1f6fd1' });
    world.scene.add(d.root); if (d.finGroup) world.scene.add(d.finGroup);
    pool[key] = d;
  }
  return pool[key];
}
function showOnly(list) {
  for (const d of Object.values(pool)) { const on = list.includes(d); d.root.visible = on; if (d.finGroup) d.finGroup.visible = on; }
}

const rt = { a: null, b: null, rate: 1, paused: false, flow: false, seg: null, camName: 'side', ambient: true, hold: 0 };
const CAMS = ['side', 'diag', 'front', 'back', 'top', 'under', 'diag2'];
const CAM_NAMES = { side: 'сбоку', diag: 'сверху-сбоку', front: 'спереди', back: 'сзади', top: 'сверху', under: 'снизу', diag2: 'с другой стороны', low: 'снизу-сбоку', far: 'издалека' };

function makeSlot(cfg, slot) {
  const fins = cfg.fins || 'bifins';
  const diver = getDiver(fins, slot);
  const start = cfg.start ?? 3;
  const player = new Player(cfg.anim || 'finkick', cfg.opts || {}, start);
  diver.resetFins();
  diver.setFinStiffness(0.45);
  return { diver, player, cfg, prevPalm: {}, prevTip: {} };
}

// cfg: {anim, opts, fins, start, cam, at, rate}
function setScene(cfg, split = null) {
  rt.a = makeSlot(cfg, 'a');
  rt.b = split ? makeSlot(split, 'b') : null;
  showOnly([rt.a.diver, rt.b && rt.b.diver].filter(Boolean));
  world.split = split ? { offset: V3(), A: [rt.a.diver.root, rt.a.diver.finGroup], B: [rt.b.diver.root, rt.b.diver.finGroup] } : null;
  rt.rate = cfg.rate || 1;
  rt.seg = null;
  const P = rt.a.player;
  if (cfg.at != null) {
    if (P.anim.loop) { P.t = cfg.at; if (rt.b) rt.b.player.t = cfg.at; }
    else rt.seg = [Math.max(0, cfg.at - (cfg.lead || 1.8)), cfg.at];
  }
  if (rt.seg) { P.t = rt.seg[0]; if (rt.b) rt.b.player.t = rt.seg[0]; }
  setCam(cfg.cam || 'side', cfg.dist);
  world.clearBubbles();
  // сразу поставить позу, чтобы камера не летела через бассейн
  stepSlots(0.0001);
  world.cam.goal.copy(camGoal()); world.cam.snap();
  updRateBtn();
}
function setCam(name, dist) { rt.camName = name; world.cam.preset(name, dist); world.cam.resetUser(); }
function camGoal() {
  const p = rt.a && rt.a.pose; if (!p) return V3(5, -1.5, 0);
  const an = rt.a.player.anim;
  // центр кадра — середина тела с ластами, а не таз
  const k = an.dry ? 0 : an.name === 'surface' ? 0.45 : -0.4;
  return V3(p.pos[0] + Math.cos(p.pitch || 0) * k, p.pos[1] + Math.sin(p.pitch || 0) * k, p.pos[2]);
}

const tmpV = new THREE.Vector3();
function stepSlot(s, dt) {
  const pose = s.player.update(dt, 1);
  s.pose = pose;
  s.diver.applyPose(pose);
  if (s.player.wrapped) s.diver.resetFins();
  s.diver.updateFins(dt, !s.player.anim.dry);
  // пузыри: выдох у поверхности или на последних метрах
  if (pose.fx === 'exhale' && Math.random() < 0.6) { const m = s.diver.mouthWorld(); if (m.y < -0.05) world.emitBubbles(m, 3, 0.03); }
  if (s.player.name === 'duck' && s.player.t > 2.2 && s.player.t < 3.3 && Math.random() < 0.5) {
    const f = s.diver.jointWorld('footL'); if (f.y < -0.05) world.emitBubbles(f, 2, 0.15, 1.4);
  }
  if (s.player.name === 'surface' && pose.cap === 'hookOut' && Math.random() < 0.15) { /* выдох над водой — без пузырей */ }
}
function stepSlots(dt) {
  if (!rt.a) return;
  if (rt.seg) {
    const P = rt.a.player;
    if (P.t >= rt.seg[1]) { rt.hold += dt; if (rt.hold > 1.4) { rt.hold = 0; P.t = rt.seg[0]; if (rt.b) rt.b.player.t = rt.seg[0]; rt.a.diver.resetFins(); rt.b && rt.b.diver.resetFins(); world.clearBubbles(); } dt = 0.00001; }
  }
  if (rt.a.cfg.loopRestart && rt.a.player.done) { rt.hold += dt; if (rt.hold > 2) { rt.hold = 0; rt.a.player.t = 0; rt.a.diver.resetFins(); } }
  stepSlot(rt.a, dt);
  if (rt.b) stepSlot(rt.b, dt);
}

// «Чувство воды»: стрелки давления воды на ладони и лопасти
const arrows = [];
for (let i = 0; i < 8; i++) { const a = new THREE.ArrowHelper(V3(1, 0, 0), V3(), 0.2, 0x4ade80, 0.06, 0.04); a.visible = false; a.line.material.depthTest = false; a.cone.material.depthTest = false; a.renderOrder = 10; world.scene.add(a); arrows.push(a); }
function updateFlow(dt) {
  arrows.forEach((a) => (a.visible = false));
  if (!rt.flow || !rt.a || dt <= 0) return;
  let k = 0;
  for (const s of [rt.a, rt.b].filter(Boolean)) {
    for (const L of ['L', 'R']) {
      const { c, n } = s.diver.palm(L);
      const pr = s.prevPalm[L]; s.prevPalm[L] = c.clone();
      if (!pr) continue;
      const v = c.clone().sub(pr).divideScalar(dt);
      // скорость относительно воды минус движение тела вперёд не вычитаем: вода неподвижна
      const vn = v.dot(n);
      const f = n.clone().multiplyScalar(-Math.sign(vn));
      const mag = Math.abs(vn);
      const a = arrows[k++]; if (!a) break;
      if (mag > 0.15 && c.y < 0) {
        a.position.copy(c); a.setDirection(f); a.setLength(clamp(mag * 0.28, 0.06, 0.5), 0.06, 0.04);
        a.setColor(f.x < -0.3 ? 0xff9f43 : 0x4ade80); a.visible = true;
      }
    }
    for (const fin of s.diver.fins) {
      const n = fin.nodes; const tip = n[n.length - 1].p, pv = n[n.length - 1].q;
      const v = tip.clone().sub(pv).divideScalar(dt / 4);
      const fr = s.diver._finFrame(fin.L);
      const vn = v.dot(fr.up), f = fr.up.clone().multiplyScalar(-Math.sign(vn));
      const a = arrows[k++]; if (!a) break;
      if (Math.abs(vn) > 0.2 && tip.y < 0) { a.position.copy(n[Math.floor(n.length * 0.7)].p); a.setDirection(f); a.setLength(clamp(Math.abs(vn) * 0.25, 0.06, 0.5), 0.06, 0.04); a.setColor(0x67e8f9); a.visible = true; }
    }
  }
}

// ================================================================ анатомия (панель в проигрывателе)
const anat = new Anatomy($('#anatCv'), { onCaption: (t) => { $('#anatCap').textContent = t; } });
let anatOn = false;
function showAnat(mode) {
  if (!mode) { anatOn = false; $('#anatPanel').classList.add('hidden'); $('#pAnat').classList.remove('on'); return; }
  anatOn = true; $('#anatPanel').classList.remove('hidden'); $('#pAnat').classList.add('on');
  if (anat.mode !== mode) anat.setMode(mode);
  requestAnimationFrame(() => anat.resize());
}

// ================================================================ экраны
const screens = ['home', 'brief', 'player', 'quiz', 'list', 'atlas', 'tables', 'timer', 'workout', 'settings'];
let current = 'home';
function show(id) {
  current = id;
  for (const s of screens) $('#' + s).classList.toggle('hidden', s !== id);
  document.body.classList.toggle('live', id === 'player');
  if (id !== 'player') { world.split = null; showAnat(null); }
  if (id === 'home' || id === 'list' || id === 'settings' || id === 'workout' || id === 'tables') ambient();
  if (id !== 'atlas') atlasOn = false;
}
function ambient() {
  rt.ambient = true; rt.flow = false;
  setScene({ anim: 'finkick', cam: 'diag' });
  world.cam.preset('diag', 4.2);
}
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add('hidden'), 2600); }

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]'); if (go) { openSection(go.dataset.go); return; }
  if (e.target.closest('[data-home]')) { home(); return; }
  if (e.target.closest('[data-back]')) { history.length && back(); }
});
let backTo = 'home';
function back() { if (backTo === 'lessonEnd') home(); else if (backTo) openSection(backTo); else home(); }

function openSection(k) {
  unlockAudio();
  if (k === 'workout') return openWorkout();
  if (k === 'tables') return openTables();
  if (k === 'exercises') return openList('Упражнения в бассейне', 'Каждое — с 3D-демонстрацией, подходами и тем, на что смотреть', EXERCISES.map((e) => ({ t: e.title, s: e.goal, i: '🏊', on: () => openExercise(e.id) })));
  if (k === 'mistakes') return openList('Библиотека ошибок', 'Слева или сверху — неправильно, справа или снизу — правильно', MISTAKES.map((m) => ({ t: m.title, s: m.looks, i: '⚠️', bad: true, on: () => openMistake(m.id) })));
  if (k === 'atlas') return openAtlas();
  if (k === 'history') return openHistory();
  if (k === 'settings') return openSettings();
  if (k === 'home') return home();
}

// ---------------------------------------------------------------- главная
function home() {
  show('home');
  const s = S.load();
  const w = WO.todayWorkout();
  const mins = Math.round(WO.duration(w) / 60);
  $('#todayCard').innerHTML = `<button class="card today" data-go="workout"><div class="ic">${w.place === 'бассейн' ? '🏊' : '🫁'}</div><div><div class="k">Сегодня · день ${w.index + 1} из ${w.of}</div><div class="t">${esc(w.title)}</div><div class="s">${w.items.length} упражнений · ≈${mins} мин · ${w.place} · уровень «${WO.LEVELS[s.level]}»</div></div><span class="btn primary go">Начать</span></button>`;
  const lessons = allLessons();
  const done = lessons.filter((l) => s.lessons[l.id]?.done).length;
  $('#stats').innerHTML = `<div class="card stat"><b>${S.streak()}🔥</b><span>дней подряд</span></div><div class="card stat"><b>${done}/${lessons.length}</b><span>уроков</span></div><div class="card stat"><b>${s.workouts.done}</b><span>тренировок</span></div>`;
  let n = 0;
  $('#course').innerHTML = MODULES.map((m) => {
    const d = m.lessons.filter((l) => s.lessons[l.id]?.done).length;
    return `<div class="mod"><h3>${esc(m.title)}</h3><p>${esc(m.sub)}</p><div class="prog"><i style="width:${(100 * d) / m.lessons.length}%"></i></div><div class="grid">${m.lessons.map((l) => { n++; return `<button class="tile" data-lesson="${l.id}"><span class="n">Урок ${n}</span><b>${esc(l.title)}</b><span>${esc(l.sub)}</span>${s.lessons[l.id]?.done ? '<span class="done">✓</span>' : ''}</button>`; }).join('')}</div></div>`;
  }).join('');
  $$('#course [data-lesson]').forEach((b) => (b.onclick = () => openBrief(b.dataset.lesson)));
}

// ---------------------------------------------------------------- урок
let lesson = null;
function openBrief(id) {
  const all = allLessons(); const i = all.findIndex((l) => l.id === id); lesson = all[i];
  show('brief'); backTo = 'home';
  setScene({ ...lesson.steps[0], cam: 'diag' });
  $('#bNum').textContent = i + 1; $('#bTitle').textContent = lesson.title;
  $('#bTheory').innerHTML = lesson.theory.map((p) => `<p>${p}</p>`).join('');
  $('#bTips').innerHTML = lesson.tips.map((p) => `<p>${p}</p>`).join('');
  $('#bHead').textContent = lesson.head;
  $('#bStart').onclick = () => playSteps({ title: lesson.title, steps: lesson.steps, onDone: () => openQuiz(lesson) });
}

// Проигрыватель шагов
let play = null;
function playSteps({ title, steps, onDone, kind = 'lesson', more = null, split = null, nextLabel }) {
  play = { title, steps, i: 0, onDone, kind, more, split, nextLabel };
  show('player'); rt.ambient = false;
  showStep();
}
function showStep() {
  const p = play, st = p.steps[p.i];
  $('#pTitle').textContent = p.title;
  $('#pStep').textContent = p.steps.length > 1 ? `шаг ${p.i + 1} из ${p.steps.length}` : (p.kind === 'mistake' ? 'сравнение' : p.kind === 'exercise' ? 'упражнение' : '');
  $('#pText').innerHTML = st.text;
  const mo = st.more || p.more || '';
  $('#pMore').innerHTML = mo ? (p.kind === 'workout' && !/<h4>/.test(mo) ? mo : `<details ${innerHeight > 760 ? 'open' : ''}><summary>Подробнее</summary>${mo}</details>`) : '';
  const tag = $('#pTag');
  tag.classList.toggle('hidden', !st.bad); tag.textContent = 'Ошибка'; tag.className = st.bad ? 'tag' : 'tag hidden';
  $('#pPrev').style.visibility = p.i > 0 ? 'visible' : 'hidden';
  $('#pNext').textContent = p.i < p.steps.length - 1 ? 'Дальше →' : (p.nextLabel || (p.kind === 'lesson' ? 'К вопросам →' : 'Готово'));
  if (!st.keepScene) {
    setScene(st, st.split || p.split);
    if (st.flow != null) rt.flow = !!st.flow;
  }
  $('#pFlow').classList.toggle('on', rt.flow);
  showAnat(st.anat || null);
  $('#labels').innerHTML = (st.split || p.split) ? splitLabels() : '';
  rt.paused = false; $('#pPause').textContent = '⏸';
}
function splitLabels() {
  const portrait = innerHeight > innerWidth;
  return portrait ? `<div class="lb bad" style="left:50%;top:14%">Неправильно</div><div class="lb ok" style="left:50%;top:56%">Правильно</div>` : `<div class="lb bad" style="left:25%;top:16%">Неправильно</div><div class="lb ok" style="left:75%;top:16%">Правильно</div>`;
}
$('#pNext').onclick = () => { if (!play) return; if (play.i < play.steps.length - 1) { play.i++; showStep(); } else { const f = play.onDone; play = null; f ? f() : home(); } };
$('#pPrev').onclick = () => { if (play && play.i > 0) { play.i--; showStep(); } };
$('#pClose').onclick = () => { const k = play?.kind; play = null; wrun = null; keepAwake(false); if (k === 'mistake') openSection('mistakes'); else if (k === 'exercise') openSection('exercises'); else if (k === 'workout') openWorkout(); else home(); };
$('#pCam').onclick = () => { const i = (CAMS.indexOf(rt.camName) + 1) % CAMS.length; setCam(CAMS[i]); toast('Ракурс: ' + CAM_NAMES[CAMS[i]] + ' · крутите пальцем'); };
const RATES = [1, 0.5, 0.25];
function updRateBtn() { $('#pSlow').innerHTML = `🐢<span> ×${rt.rate}</span>`; }
$('#pSlow').onclick = () => { const i = (RATES.indexOf(rt.rate) + 1) % RATES.length; rt.rate = RATES[i] ?? 1; updRateBtn(); };
$('#pPause').onclick = () => { rt.paused = !rt.paused; $('#pPause').textContent = rt.paused ? '▶' : '⏸'; };
$('#pFlow').onclick = () => { rt.flow = !rt.flow; $('#pFlow').classList.toggle('on', rt.flow); toast(rt.flow ? 'Чувство воды: стрелки показывают, куда вода давит на ладони и ласты' : 'Стрелки скрыты'); };
$('#pAnat').onclick = () => { if (anatOn) showAnat(null); else showAnat(play?.steps[play.i]?.anat || anat.mode || 'breathe'); };
$('#anatClose').onclick = () => showAnat(null);

function openQuiz(l) {
  show('quiz'); backTo = 'home';
  setScene({ anim: 'finkick', cam: 'diag' });
  let right = 0, answered = 0;
  $('#qBody').innerHTML = l.quiz.map((q, i) => `<div class="q" data-q="${i}"><b>${i + 1}. ${esc(q.q)}</b><div class="opts">${q.a.map((a, j) => `<button class="btn" data-a="${j}">${esc(a)}</button>`).join('')}</div><div class="why hidden"></div></div>`).join('') + `<div class="row"><button class="btn" id="qRe">Посмотреть урок снова</button><button class="btn primary" id="qDone" disabled>Завершить урок</button></div>`;
  $$('#qBody .q').forEach((el) => {
    const q = l.quiz[+el.dataset.q];
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      if (el.dataset.done) return; el.dataset.done = 1; answered++;
      const j = +b.dataset.a; const ok = j === q.ok; if (ok) right++;
      b.classList.add(ok ? 'ok' : 'no'); el.querySelector(`[data-a="${q.ok}"]`).classList.add('ok');
      const w = el.querySelector('.why'); w.textContent = (ok ? 'Верно. ' : 'Не совсем. ') + q.why; w.classList.remove('hidden');
      vibrate(ok ? 20 : [40, 40, 40]);
      if (answered === l.quiz.length) $('#qDone').disabled = false;
    }));
  });
  $('#qRe').onclick = () => openBrief(l.id);
  $('#qDone').onclick = () => {
    const s = S.load(); s.lessons[l.id] = { done: true, score: right / l.quiz.length }; S.save(); S.markDay();
    S.addHistory('lesson', l.title, { score: right, of: l.quiz.length });
    toast(`Урок пройден: ${right} из ${l.quiz.length}`);
    const all = allLessons(); const i = all.findIndex((x) => x.id === l.id);
    if (all[i + 1]) openBrief(all[i + 1].id); else home();
  };
}

// ---------------------------------------------------------------- списки
function openList(title, sub, items) {
  show('list');
  $('#lTitle').textContent = title; $('#lSub').textContent = sub;
  $('#lBody').innerHTML = `<div class="grid">${items.map((it, i) => `<button class="tile ${it.bad ? 'bad' : ''}" data-i="${i}"><i>${it.i || ''}</i><b>${esc(it.t)}</b><span>${esc(it.s || '')}</span></button>`).join('')}</div>`;
  $$('#lBody [data-i]').forEach((b) => (b.onclick = () => items[+b.dataset.i].on()));
}
function openExercise(id) {
  const e = EXERCISES.find((x) => x.id === id);
  const more = `<h4>Как выполнять</h4><ul>${e.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul><h4>Объём</h4>${esc(e.sets)} · отдых ${esc(e.rest)}<h4>На что смотреть</h4>${esc(e.watch)}<h4>Частые ошибки</h4>${esc(e.errors)}<h4>Безопасность</h4>${esc(e.safety)}`;
  playSteps({ title: e.title, kind: 'exercise', steps: [{ text: `<b>Цель:</b> ${esc(e.goal)}`, anim: e.anim, opts: e.opts, fins: e.fins, cam: e.cam, start: e.start, flow: e.flow, loopRestart: e.loopRestart, more }], nextLabel: 'К списку', onDone: () => openSection('exercises') });
}
function openMistake(id) {
  const m = MISTAKES.find((x) => x.id === id);
  const more = `<h4>Почему плохо</h4>${esc(m.why)}<h4>Как исправить</h4>${esc(m.fix)}<h4>Упражнение</h4>${esc(m.drill)}`;
  const wrong = { ...m.wrong, cam: m.cam, start: m.wrong.start, at: m.wrong.at };
  const right = { ...m.right, cam: m.cam, start: m.right.start, at: m.right.at };
  const steps = [{ text: `<b>Как выглядит:</b> ${esc(m.looks)}`, ...wrong, split: m.textOnly || m.wrongAnat ? null : right, more, bad: true }];
  if (m.wrongAnat) {
    steps[0].anat = m.wrongAnat;
    steps.push({ text: `<b>Правильно:</b> ${esc(m.fix)}`, ...right, anat: m.rightAnat, more });
  }
  playSteps({ title: m.title, kind: 'mistake', steps, nextLabel: 'К списку', onDone: () => openSection('mistakes') });
}

// ---------------------------------------------------------------- атлас анатомии
const atlasAn = new Anatomy($('#atlasCv'), { onCaption: (t, k, n, title) => { $('#aText').textContent = t; $('#aTitle').textContent = title; $('#aDots').innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i === k ? 'on' : ''}"></i>`).join(''); } });
let atlasOn = false;
function openAtlas(mode = 'breathe') {
  show('atlas'); atlasOn = true;
  $('#aTabs').innerHTML = ATLAS.map((a) => `<button class="chip ${a.mode === mode ? 'on' : ''}" data-m="${a.mode}">${esc(a.title)}</button>`).join('');
  $$('#aTabs [data-m]').forEach((b) => (b.onclick = () => openAtlas(b.dataset.m)));
  atlasAn.setMode(mode);
  requestAnimationFrame(() => atlasAn.resize());
}
$('#aSlow').onclick = () => { atlasAn.speed = atlasAn.speed === 1 ? 0.5 : atlasAn.speed === 0.5 ? 0.25 : 1; $('#aSlow').textContent = '🐢 ×' + atlasAn.speed; };
$('#aLab').onclick = () => { atlasAn.labels = !atlasAn.labels; };

// ---------------------------------------------------------------- таблицы
let tKind = 'co2', tRows = null;
function openTables() {
  show('tables');
  const s = S.load();
  if (!tRows) tRows = KINDS[tKind].make(s.pb);
  const custom = s.tables.custom || [];
  const kindBtns = Object.entries(KINDS).map(([k, v]) => `<button class="chip ${k === tKind ? 'on' : ''}" data-k="${k}">${v.title}</button>`).join('') + custom.map((c, i) => `<button class="chip ${tKind === 'c' + i ? 'on' : ''}" data-k="c${i}">★ ${esc(c.name)}</button>`).join('');
  const sub = KINDS[tKind] ? KINDS[tKind].sub : 'Ваша сохранённая таблица.';
  $('#tBody').innerHTML = `
    <div class="card pad">
      <div class="field"><label>Личный рекорд статики (сухой):</label><input type="number" id="tPb" min="15" max="600" value="${s.pb}"> <span>секунд (${fmt(s.pb)})</span><button class="btn sm" id="tTest">Пройти тест рекорда</button></div>
      <div class="seg">${kindBtns}</div>
      <p class="sub">${sub}</p>
      <table class="trows"><thead><tr><th>#</th><th>Дышать</th><th>Задержка</th><th></th></tr></thead><tbody>${tRows.map((r, i) => `<tr><td>${i + 1}</td><td><input data-r="${i}" data-f="rest" value="${fmt(r.rest)}"></td><td><input data-r="${i}" data-f="hold" value="${fmt(r.hold)}"></td><td><button class="chip sm" data-del="${i}">✕</button></td></tr>`).join('')}</tbody></table>
      <div class="row" style="justify-content:space-between"><span>Всего: <b>${fmt(total(tRows))}</b> · ${tRows.length} циклов</span><span><button class="btn sm" id="tAdd">+ строка</button> <button class="btn sm" id="tSave">Сохранить как свою</button></span></div>
      <div class="row"><button class="btn primary big" id="tGo">▶ Начать таблицу</button></div>
      <div class="warnbox"><b>Только на суше</b>, лёжа или сидя. Никогда в воде, в ванне, за рулём. Головокружение, покалывание, «туман» — нажмите «Стоп». CO₂ и O₂ — в разные дни, O₂ не чаще 1–2 раз в неделю.</div>
    </div>
    <h3 class="gt">Последние сессии</h3>
    <div class="card">${histRows(s.history.filter((h) => h.kind === 'table' || h.kind === 'pb').slice(0, 8)) || '<div class="hist">Пока пусто</div>'}</div>`;
  $('#tPb').onchange = (e) => { const v = clamp(+e.target.value || 60, 15, 600); S.set('pb', v); if (KINDS[tKind]) tRows = KINDS[tKind].make(v); openTables(); };
  $$('#tBody [data-k]').forEach((b) => (b.onclick = () => { tKind = b.dataset.k; tRows = KINDS[tKind] ? KINDS[tKind].make(S.load().pb) : structuredClone(custom[+tKind.slice(1)].rows); openTables(); }));
  $$('#tBody [data-r]').forEach((inp) => (inp.onchange = () => { const v = parseT(inp.value); if (v != null) tRows[+inp.dataset.r][inp.dataset.f] = v; openTables(); }));
  $$('#tBody [data-del]').forEach((b) => (b.onclick = () => { tRows.splice(+b.dataset.del, 1); if (!tRows.length) tRows.push({ rest: 120, hold: 30 }); openTables(); }));
  $('#tAdd').onclick = () => { tRows.push({ ...tRows[tRows.length - 1] }); openTables(); };
  $('#tSave').onclick = () => { const name = prompt('Название таблицы', 'Моя таблица'); if (!name) return; const st = S.load(); st.tables.custom.push({ name, rows: structuredClone(tRows) }); S.save(); tKind = 'c' + (st.tables.custom.length - 1); openTables(); toast('Сохранено'); };
  $('#tGo').onclick = () => runTable(tRows, KINDS[tKind]?.title || 'Своя таблица', () => openTables());
  $('#tTest').onclick = () => runPbTest();
}
function parseT(v) { const m = String(v).trim().match(/^(\d+):(\d{1,2})$/); if (m) return +m[1] * 60 + +m[2]; const n = parseFloat(v); return isFinite(n) ? Math.round(n) : null; }
function histRows(list) { return list.map((h) => { const d = new Date(h.date); const det = h.kind === 'table' ? `${h.details.rounds}/${h.details.of} циклов${h.details.contr?.filter(Boolean).length ? ' · первый позыв ' + fmt(Math.min(...h.details.contr.filter(Boolean))) : ''}` : h.kind === 'pb' ? 'рекорд ' + fmt(h.details.pb) : h.kind === 'lesson' ? `вопросы ${h.details.score}/${h.details.of}` : ''; return `<div class="hist"><b>${esc(h.title)}</b> <span>· ${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · ${det}</span></div>`; }).join(''); }

let timer = null, timerDone = null;
function runTable(rows, title, onDone, opts = {}) {
  unlockAudio(); keepAwake(true);
  show('timer'); timerDone = onDone;
  $('#tmTitle').textContent = title;
  timer = new TableTimer(rows, { title, onDone: (r) => { keepAwake(false); if (!opts.pb) toast(r.early ? `Остановлено: ${r.rounds} циклов` : 'Таблица завершена!'); } });
  timer.pb = !!opts.pb;
  $('#tmRows').innerHTML = rows.map((r, i) => `<i data-i="${i}">${fmt(r.rest)} / ${fmt(r.hold)}</i>`).join('');
  $('#tmGo').textContent = 'Старт'; $('#tmContr').classList.toggle('hidden', false);
  drawTimer();
}
function drawTimer() {
  if (!timer) return;
  const p = timer.phase || timer.phases[timer.phases.length - 1];
  const el = $('#timer');
  el.classList.toggle('hold', p.type === 'hold');
  $('#tmPhase').textContent = timer.finished ? 'Готово' : p.type === 'hold' ? 'Задержка' : 'Дышите';
  $('#tmLeft').textContent = timer.pb && p.type === 'hold' ? fmt(p.dur - timer.left) : fmt(timer.left);
  const nx = timer.phases[timer.i + 1];
  $('#tmNext').textContent = timer.finished ? '' : timer.pb && p.type === 'hold' ? 'Нажмите «Стоп», когда сделаете вдох' : nx ? `дальше: ${nx.type === 'hold' ? 'задержка' : 'дыхание'} ${fmt(nx.dur)}` : 'последняя задержка';
  $('#tmRound').textContent = timer.pb ? 'тест рекорда' : `цикл ${p.round + 1} из ${timer.rows.length}`;
  const frac = timer.pb && p.type === 'hold' ? ((p.dur - timer.left) % 60) / 60 : 1 - timer.left / p.dur;
  const C = 2 * Math.PI * 88; const arc = $('#tmArc'); arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C * (1 - clamp(frac, 0, 1));
  $$('#tmRows i').forEach((i) => { const k = +i.dataset.i; i.className = k === p.round && !timer.finished ? 'now' : k < p.round || timer.finished ? 'done' : ''; });
  $('#tmGo').textContent = timer.finished ? 'Закрыть' : timer.paused ? (timer.started ? 'Дальше' : 'Старт') : 'Пауза';
}
$('#tmGo').onclick = () => { if (!timer) return; if (timer.finished) { const f = timerDone; timer = null; f ? f() : openTables(); return; } if (!timer.started || timer.paused) { if (!timer.started) timer.start(); else timer.pause(); } else timer.pause(); drawTimer(); };
$('#tmContr').onclick = () => { if (timer) { timer.contraction(); toast('Позыв отмечен'); } };
$('#tmStop').onclick = () => { if (!timer) return; if (timer.pb) return finishPb(); timer.stop(true); drawTimer(); };
$('#tmClose').onclick = () => { if (timer && !timer.finished && timer.started) timer.stop(true); const f = timerDone; timer = null; keepAwake(false); f ? f() : openTables(); };
function runPbTest() {
  runTable([{ rest: 120, hold: 900 }], 'Тест рекорда статики', () => openTables(), { pb: true });
  $('#tmContr').classList.remove('hidden');
  toast('2 минуты спокойной раздышки, затем задержка. Стоп — когда вдохнули.');
}
function finishPb() {
  const p = timer.phase;
  if (p.type !== 'hold') { timer.stop(true); drawTimer(); return; }
  const held = Math.round(p.dur - timer.left);
  timer.finished = true; timer.paused = true; keepAwake(false);
  const s = S.load();
  if (held >= 15) { s.pb = held; S.save(); S.addHistory('pb', 'Тест рекорда', { pb: held, contr: timer.contr[0] }); tRows = KINDS[KINDS[tKind] ? tKind : 'co2'].make(held); toast(`Рекорд: ${fmt(held)} — таблицы пересчитаны`); }
  drawTimer();
}

// ---------------------------------------------------------------- тренировка дня
let wrun = null;
function openWorkout() {
  show('workout');
  const s = S.load();
  const w = WO.todayWorkout();
  $('#wSub').textContent = `Уровень «${WO.LEVELS[s.level]}» · день ${w.index + 1} из ${w.of} · ${w.place}`;
  // неделя
  const days = new Set(s.workouts.days); const now = new Date(); const wd = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const week = wd.map((n, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); const k = S.today(d); return `<div class="${days.has(k) ? 'on' : ''} ${k === S.today() ? 'now' : ''}">${n}<br>${d.getDate()}</div>`; }).join('');
  const prog = WO.program(s.level);
  $('#wBody').innerHTML = `
    <div class="card pad">
      <div class="today" style="background:none;border:0;padding:0;cursor:default"><div class="ic">${w.place === 'бассейн' ? '🏊' : '🫁'}</div><div><div class="k">Сегодня</div><div class="t">${esc(w.title)}</div><div class="s">≈${Math.round(WO.duration(w) / 60)} мин · серия ${S.streak()} 🔥</div></div></div>
      <div class="week">${week}</div>
      ${w.items.map((id, i) => { const it = WO.itemInfo(id); return `<button class="witem" data-w="${i}"><span class="ix">${i + 1}</span><span class="wt"><b>${esc(it.title)}</b><div class="wd">${it.pool ? 'в бассейне · отметить галочкой' : it.table ? 'таблица по вашему рекорду ' + fmt(s.pb) : fmt(it.dur)}</div></span><span>▶</span></button>`; }).join('')}
      <div class="row"><button class="btn primary big" id="wGo">▶ Начать тренировку</button></div>
      ${w.place === 'бассейн' ? '<div class="warnbox">В воде — только с партнёром или инструктором. Все задержки — с запасом.</div>' : '<div class="warnbox">Все задержки дыхания — только на суше, лёжа или сидя.</div>'}
    </div>
    <h3 class="gt">Программа «${WO.LEVELS[s.level]}»</h3>
    <div class="grid">${prog.map((d, i) => `<button class="tile" data-day="${i}"><span class="n">День ${i + 1}${i === w.index ? ' · сегодня' : ''}</span><b>${esc(d.title)}</b><span>${d.place} · ${d.items.length} упр.</span></button>`).join('')}</div>`;
  $('#wGo').onclick = () => runWorkout(w, 0);
  $$('#wBody [data-w]').forEach((b) => (b.onclick = () => runWorkout(w, +b.dataset.w, true)));
  $$('#wBody [data-day]').forEach((b) => (b.onclick = () => { const d = prog[+b.dataset.day]; runWorkout({ ...d, index: +b.dataset.day, of: prog.length }, 0); }));
}
function runWorkout(w, i, single = false) {
  unlockAudio(); keepAwake(true);
  wrun = { w, i, single, left: 0 };
  workoutItem();
}
function workoutItem() {
  const { w, i } = wrun;
  if (i >= w.items.length) return finishWorkout();
  const it = WO.itemInfo(w.items[i]);
  const head = `<b>${i + 1}/${w.items.length} · ${esc(it.title)}</b>`;
  if (it.table) {
    const rows = KINDS[it.table].make(S.load().pb);
    runTable(rows, it.title, () => { wrun.i++; if (wrun.single) { wrun = null; openWorkout(); } else workoutItem(); });
    return;
  }
  if (it.pool) {
    const e = EXERCISES.find((x) => x.id === it.ex);
    const more = `<h4>Как выполнять</h4><ul>${e.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ul><h4>Безопасность</h4>${esc(e.safety)}`;
    playSteps({ title: w.title, kind: 'workout', steps: [{ text: `${head}<br>${esc(e.goal)}`, anim: e.anim, opts: e.opts, fins: e.fins, cam: e.cam, start: e.start, flow: e.flow, loopRestart: e.loopRestart, more }], nextLabel: '✓ Сделано', onDone: nextItem });
    return;
  }
  const v = it.vis || {};
  wrun.left = it.dur; wrun.dur = it.dur;
  playSteps({ title: w.title, kind: 'workout', steps: [{ text: `${head}<div class="bigclock" id="wClock">${fmt(it.dur)}</div><div class="timerbar"><i id="wBar" style="width:0"></i></div>`, more: esc(it.desc), anim: v.anim || 'float', opts: v.kind ? { kind: v.kind } : {}, fins: v.anim === 'dry' || v.anim === 'static' ? 'none' : 'bifins', cam: v.anim === 'dry' ? 'side' : 'diag', anat: v.anat, at: v.at, start: v.anim === 'surface' ? 0 : undefined }], nextLabel: 'Готово →', onDone: nextItem });
  if (v.anim === 'dry') dryCam();
}
function nextItem() { if (!wrun) return home(); wrun.i++; if (wrun.single) { wrun = null; keepAwake(false); openWorkout(); } else workoutItem(); }
function finishWorkout() {
  const w = wrun.w; wrun = null; keepAwake(false);
  WO.complete(w); beep(990, 0.4);
  toast(`Тренировка выполнена! Серия: ${S.streak()} 🔥`);
  openWorkout();
}
function dryCam() { world.cam.preset('side', 4.2); }

// ---------------------------------------------------------------- прогресс
function openHistory() {
  const s = S.load();
  const pbs = s.history.filter((h) => h.kind === 'pb').reverse();
  const tabs = s.history.filter((h) => h.kind === 'table').reverse();
  const pts = pbs.map((h) => h.details.pb);
  let chart = '<p class="sub">Пройдите тест рекорда в разделе таблиц, чтобы увидеть график.</p>';
  if (pts.length) {
    const mx = Math.max(...pts) * 1.15, n = pts.length;
    const P = pts.map((v, i) => `${n === 1 ? 150 : 10 + (i * 280) / (n - 1)},${170 - (v / mx) * 150}`).join(' ');
    chart = `<svg class="chart" viewBox="0 0 300 180"><polyline points="${P}" fill="none" stroke="#22d3ee" stroke-width="3"/>${pts.map((v, i) => `<circle cx="${n === 1 ? 150 : 10 + (i * 280) / (n - 1)}" cy="${170 - (v / mx) * 150}" r="4" fill="#22d3ee"/><text x="${n === 1 ? 150 : 10 + (i * 280) / (n - 1)}" y="${160 - (v / mx) * 150}" fill="#e6f4fb" font-size="10" text-anchor="middle">${fmt(v)}</text>`).join('')}</svg>`;
  }
  show('list');
  $('#lTitle').textContent = 'Прогресс'; $('#lSub').textContent = `Серия ${S.streak()} дней · тренировок ${s.workouts.done} · таблиц ${tabs.length}`;
  $('#lBody').innerHTML = `<div class="card pad"><b>Рекорд статики (сухой)</b>${chart}</div><h3 class="gt">История</h3><div class="card">${histRows(s.history.slice(0, 40)) || '<div class="hist">Пока пусто</div>'}</div>`;
}

// ---------------------------------------------------------------- настройки
function openSettings() {
  show('settings');
  const s = S.load();
  const tg = (k, t) => `<div class="field"><label><input type="checkbox" data-t="${k}" ${s[k] ? 'checked' : ''}> ${t}</label></div>`;
  $('#sBody').innerHTML = `<div class="field"><label>Уровень:</label><select id="sLvl">${Object.entries(WO.LEVELS).map(([k, v]) => `<option value="${k}" ${k === s.level ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="field"><label>Рекорд статики (с):</label><input type="number" id="sPb" value="${s.pb}"></div>
    ${tg('sound', 'Звуковые сигналы таймера')}${tg('vibro', 'Вибрация')}${tg('voice', 'Голосовые подсказки («Задержка», «Дыши»)')}
    <div class="row"><button class="btn" id="sReset">Сбросить прогресс</button></div>
    <p class="sub">Курс составлен на основе открытых знаний о программах обучения фридайвингу (Molchanovs, AIDA, CMAS, PADI) и физиологии апноэ. Это не официальный материал этих организаций и не замена обучению с инструктором.</p>`;
  $('#sLvl').onchange = (e) => S.set('level', e.target.value);
  $('#sPb').onchange = (e) => S.set('pb', clamp(+e.target.value || 60, 15, 600));
  $$('#sBody [data-t]').forEach((c) => (c.onchange = () => S.set(c.dataset.t, c.checked)));
  $('#sReset').onclick = () => { if (confirm('Сбросить весь прогресс?')) { S.reset(); toast('Прогресс сброшен'); home(); } };
}

// ================================================================ цикл
let last = performance.now(), anatAcc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (timer) { timer.update(dt); if (current === 'timer') drawTimer(); }
  if (wrun && current === 'player' && play && play.kind === 'workout' && wrun.left > 0 && !rt.paused) {
    wrun.left -= dt;
    const c = $('#wClock'), b = $('#wBar');
    if (c) c.textContent = fmt(wrun.left);
    if (b) b.style.width = `${100 * (1 - wrun.left / wrun.dur)}%`;
    if (wrun.left <= 0) { if (S.load().sound) beep(880, 0.3); vibrate(150); $('#pNext').textContent = 'Дальше →'; }
  }
  const sdt = rt.paused ? 0 : dt * rt.rate;
  if (current !== 'timer' && current !== 'atlas') {
    stepSlots(sdt);
    updateFlow(sdt);
    if (rt.ambient) world.cam.user.yaw += dt * 0.04;
    world.cam.free = rt.a && rt.a.player.anim.dry;
    world.cam.goal.copy(camGoal());
    world.cam.update(dt);
    world.update(dt);
    world.render();
    if (Q.has('dbg') && Math.random() < 0.05) console.log(JSON.stringify({ t: world.cam.target.toArray().map((v) => +v.toFixed(2)), g: world.cam.goal.toArray().map((v) => +v.toFixed(2)), c: world.camera.position.toArray().map((v) => +v.toFixed(2)), dt: +dt.toFixed(3) }));
  }
  anatAcc += dt;
  if (anatAcc > 1 / 40) {
    if (anatOn && current === 'player') { anat.update(anatAcc * (rt.paused ? 0 : 1)); anat.draw(); }
    if (atlasOn && current === 'atlas') { atlasAn.update(anatAcc); atlasAn.draw(); }
    anatAcc = 0;
  }
  requestAnimationFrame(frame);
}
function resize() { world.resize(); if (anatOn) anat.resize(); if (atlasOn) atlasAn.resize(); if (play && (play.steps[play.i]?.split || play.split)) $('#labels').innerHTML = splitLabels(); }
addEventListener('resize', resize);
addEventListener('keydown', (e) => {
  if (current === 'player') {
    if (e.key === 'ArrowRight' || e.key === 'Enter') $('#pNext').click();
    if (e.key === 'ArrowLeft') $('#pPrev').click();
    if (e.key === ' ') { e.preventDefault(); $('#pPause').click(); }
    if (e.key === 'c' || e.key === 'с') $('#pCam').click();
    if (e.key === 'Escape') $('#pClose').click();
  } else if (e.key === 'Escape' && current !== 'home') home();
  if (current === 'timer' && e.key === ' ') { e.preventDefault(); $('#tmGo').click(); }
});

// ================================================================ старт
resize();
const st = S.load();
if (!st.seenIntro && !Q.has('shot')) {
  $('#intro').classList.remove('hidden');
  $('#introOk').onclick = () => { S.set('level', $('#introLvl').value); S.set('seenIntro', true); $('#intro').classList.add('hidden'); unlockAudio(); home(); };
}
home();
if (Q.get('lesson')) { openBrief(Q.get('lesson')); if (Q.has('play')) { $('#bStart').click(); const k = +(Q.get('step') || 0); for (let i = 0; i < k; i++) $('#pNext').click(); } }
if (Q.get('mistake')) openMistake(Q.get('mistake'));
if (Q.get('exercise')) openExercise(Q.get('exercise'));
if (Q.get('atlas')) openAtlas(Q.get('atlas'));
if (Q.get('screen')) openSection(Q.get('screen'));
requestAnimationFrame(frame);
window.__ready = true;
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
