import * as THREE from 'three';
import { Sim, MAX_EDGE_DEG, wrapAngle } from './sim.js';
import { LESSONS, LESSONS_BY_ID, FALLS, WARN_TEXT, STANCE_QUIZ, BINDING_PRESETS, evaluateBindings, POSTURE_PARTS, GOOD_POSTURE, evaluatePosture, GEAR_LEVELS, recommendBoard, GEAR_TIPS } from './lessons.js';
import { MISTAKES } from './mistakes.js';
import { Rider } from './rider.js';
import { World, CameraRig, CAM_MODES, CAM_NAMES } from './world.js';
import { decorateStudio } from './art/scenery.js';
import { PAUSE, newPauses, keyMoment } from './pauses.js';
import { TRACKS, trackStars, trackGates, taskNames, tasksDone, fmtTime, rankOf, nextRank, trackStarsEarned, totalStars, newRun, stepRun, trackAuto, GATE_PENALTY } from './tracks.js';
import { sfx } from './sfx.js';
import { LECTURES, LECTURES_BY_ID } from './lectures.js';
import { SLOPE_CARDS, SLOPE_CARDS_BY_ID } from './slopecards.js';

const $ = (id) => document.getElementById(id);
const D = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------------------------------------------------------------- сохранение
const SAVE_KEY = 'snowschool.v1';
const save = Object.assign({ stance: null, front: 15, rear: 0, width: 54, height: 175, weight: 70, boot: 42, level: 'new', done: {}, tracks: {}, mute: false }, (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })());
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* приватный режим */ } };
const stance = () => save.stance || 'regular';
const toeSign = () => (stance() === 'goofy' ? -1 : 1);
sfx.setMuted(save.mute);

// Трасса как урок: тот же цикл заезда, но звёзды, время и финиш вместо задания урока
const trackLesson = (T) => ({
  id: 'track:' + T.id, kind: 'track', track: T, title: `${T.level} · ${T.name}`, slopeDeg: T.slopeDeg, keys: 'turn',
  nStars: trackStars(T).length, gates: trackGates(T), demoCams: ['follow', 'front3', 'follow', 'profile'],
  start: () => ({ u: T.line(0), s: 2, theta: 0, speed: 1 }),
  goal: 'Собери звёзды и доедь до финиша. Упал — встанешь и поедешь дальше, время идёт.',
  tips: [T.tip, 'Звезда засчитывается, если проехать рядом — в пределах двух метров.', 'Пропустил звезду — не возвращайся, смотри на следующую.'],
  init: (ls) => Object.assign(ls, newRun(), { fallTypes: [], rec: [], combo: 0, lastStar: -2, vmax: 0 }),
  check(sim, ls) { stepRun(T, ls, sim); return { done: ls.finished, text: '', p: clamp(sim.s / T.length, 0, 1) }; },
  auto: (sim, t) => trackAuto(T, sim, t),
});
const TRACK_LESSONS = Object.fromEntries(TRACKS.map((T) => [`track:${T.id}`, trackLesson(T)]));
const lessonById = (id) => LESSONS_BY_ID[id] || TRACK_LESSONS[id];
const starsTotal = () => totalStars(save.tracks);
const isOpen = (T) => starsTotal() >= T.need;

// ---------------------------------------------------------------- рендер
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
const world = new World(renderer);
const rig = new CameraRig(camera);
const rider = new Rider();
world.scene.add(rider.root);
// Призрак: лучший заезд на трассе, полупрозрачный голубой райдер
const ghost = new Rider({ ghost: true, palette: { ghost: '#2563eb' } });
ghost.root.traverse((o) => { if (o.material) o.material.opacity = 0.42; }); // на белом снегу бледный силуэт теряется
ghost.root.visible = false;
world.scene.add(ghost.root);
const sim = new Sim();

// Студия: отдельная сцена с ровной площадкой
const studio = (() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c4dcf3');
  scene.fog = new THREE.Fog('#c4dcf3', 18, 60);
  scene.add(new THREE.HemisphereLight('#e8f0ff', '#998fc6', 1.4));
  const sun = new THREE.DirectionalLight('#ffe8cc', 2.4); sun.position.set(4, 10, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ map: world.snowTex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  decorateStudio(scene, world.snow); // лес, горы и небо вокруг площадки
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  const orbit = { yaw: 0, pitch: 0.18, dist: 4.6, target: new THREE.Vector3(0, 0.85, 0) };
  return { scene, cam, orbit, riders: [] };
})();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  if (!w || !h) return; // свёрнутое окно: аспект 0/0 сломал бы камеру
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  studio.cam.aspect = w / h; studio.cam.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- ввод
const keys = new Set();
const isTyping = (e) => e.target && (e.target.tagName === 'INPUT');
window.addEventListener('keydown', (e) => {
  if (isTyping(e)) return;
  if (sheetKey(e)) return;
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && app.mode === 'ride') e.preventDefault();
  if (app.mode === 'ride' && !e.repeat) {
    if (e.code === 'KeyC') cycleCam();
    if (e.code === 'KeyT') toggleSlow();
    if (e.code === 'KeyR') restart();
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'Escape') toMenu();
  } else if (e.code === 'Escape' && app.mode !== 'menu') toMenu();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
// звук (и шорох снега) браузер разрешает только после касания — открываем его по первому жесту
['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, () => sfx.unlock(), { passive: true }));
// iPhone: щипок по экрану на склоне — это зум камеры, а не страницы
document.addEventListener('gesturestart', (e) => { if (app.mode === 'ride') e.preventDefault(); });
window.addEventListener('blur', () => keys.clear());
const down = (...c) => c.some((k) => keys.has(k));

if ('ontouchstart' in window) $('touch').classList.remove('hidden');
document.querySelectorAll('#touch button').forEach((b) => {
  const k = b.dataset.k;
  const on = (e) => { e.preventDefault(); keys.add(k); b.classList.add('on'); };
  const off = (e) => { e.preventDefault(); keys.delete(k); b.classList.remove('on'); };
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  b.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});

// Кант с клавиатуры: удержание плавно увеличивает кант, отпускание плавно возвращает к нулю.
const ctl = { edge: 0 };
function readInput(dt) {
  const lr = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0);
  // на малой скорости тело не может сильно закантоваться — ограничиваем, чтобы удержание клавиши не «сажало» на снег
  const target = lr * toeSign() * (0.55 + clamp(sim.speed / 8, 0, 0.45));
  if (lr) ctl.edge += clamp(target - ctl.edge, -(Math.sign(target) !== Math.sign(ctl.edge) ? 3 : 1.4) * dt, (Math.sign(target) !== Math.sign(ctl.edge) ? 3 : 1.4) * dt);
  else ctl.edge += clamp(-ctl.edge, -0.9 * dt, 0.9 * dt);
  const fb = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0);
  const rot = (down('KeyE') ? 1 : 0) - (down('KeyQ') ? 1 : 0);
  return { edge: ctl.edge, weight: fb ? fb * 0.7 : 0.1, rot: rot * 0.8, crouch: down('Space'), stiff: down('ShiftLeft', 'ShiftRight') };
}

// ---------------------------------------------------------------- состояние приложения
// autoplay — инструктор ведёт и в обычном заезде (для скриншотов и проверок через window.__app)
const app = { mode: 'menu', lesson: null, ls: null, demo: false, autoplay: false, userPause: false, t: 0, slow: 1, falls: 0, fallShown: false, history: [], replay: null, ended: false, hudT: 0, studioMode: null, travel: new THREE.Vector3(0, 0, -1), variant: null, variantOf: {} };
const TOUCH = 'ontouchstart' in window;

function show(id, on) { $(id).classList.toggle('hidden', !on); }
// Экран не гаснет на склоне: демонстрацию смотрят, не касаясь телефона
let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && 'wakeLock' in navigator && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    else if (!on && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && app.mode === 'ride') keepAwake(true);
  if (document.visibilityState !== 'visible') { keys.clear(); if (app.mode === 'ride' && !app.userPause) setUserPause(true); } // свернул приложение — заезд на паузе
});
function setScreen(mode) {
  app.mode = mode;
  keepAwake(mode === 'ride');
  if (mode !== 'ride') { hintKey(null); sfx.slide(0); }
  show('menu', mode === 'menu');
  show('brief', mode === 'brief');
  show('hud', mode === 'ride');
  show('studio', mode === 'studio');
  rider.com.visible = mode === 'ride';
  if (mode !== 'ride') { show('modal', false); rider.edgeGlow.visible = false; voiceStop(); }
}

// ---------------------------------------------------------------- голос инструктора (речь браузера)
// Субтитры демонстрации читаются вслух: на телефоне можно смотреть на райдера, а не на текст.
const voice = { ok: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window, last: '', pauseSpoken: null };
const voiceOn = () => voice.ok && save.voice !== false;
function speak(text, queue = false, force = false) {
  if (!(force ? voice.ok : voiceOn()) || !text) return;
  const clean = text.replace(/<[^>]+>/g, '').replace(/[«»]/g, '').replace(/—/g, ',').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'ru-RU'; u.rate = 1.06; u.pitch = 1;
  const v = speechSynthesis.getVoices().find((x) => /^ru/i.test(x.lang));
  if (v) u.voice = v;
  if (!queue) speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
function voiceStop() { if (voice.ok) speechSynthesis.cancel(); voice.last = ''; voice.pauseSpoken = null; }
function renderVoiceBtn() {
  const b = $('bVoice'); if (!b) return;
  b.classList.toggle('hidden', !voice.ok || !app.demo);
  b.innerHTML = (voiceOn() ? '🔊' : '🔇') + '<span class="vt"> Голос</span>'; // на телефоне остаётся только значок
  b.classList.toggle('on', voiceOn());
}
if (voice.ok) speechSynthesis.getVoices(); // iOS отдаёт список голосов только после первого запроса

// ---------------------------------------------------------------- меню
// Порядок курса: по нему считается прогресс и предлагается следующий урок
const COURSE = ['stance', 'bindings', 'posture', 'gear', 'heel_slip', 'toe_slip', 'leaf', 'jturn', 'garland', 'cturn', 'turns', 'speed', 'carve', 'free'];
const COURSE_N = COURSE.length - 1; // «свободное катание» не считается уроком
function nextStep() {
  const id = COURSE.find((x) => x !== 'free' && !save.done[x]);
  return id ? LESSONS_BY_ID[id] : null;
}
const GROUPS = [
  ['Основы', ['stance', 'bindings', 'posture', 'gear']],
  ['Голова: страхи и психология', LECTURES.map((x) => 'lect:' + x.id)],
  ['На склоне', ['heel_slip', 'toe_slip', 'leaf', 'jturn', 'garland', 'cturn', 'turns', 'speed']],
  ['Мастер-класс', ['carve']],
  ['Свободно', ['free', 'mistakes', 'cards']],
];
function renderMenu() {
  $('stanceChip').textContent = `Стойка: ${save.stance ? (stance() === 'regular' ? 'Regular (левая вперёд)' : 'Goofy (правая вперёд)') : 'не выбрана'} · ${fmtA(save.front)} / ${fmtA(save.rear)}`;
  let n = 0;
  const total = starsTotal(), nr = nextRank(total);
  const tracks = `<div class="group-title gt-row"><span>Трассы на время</span><span class="gt-r"><b class="rank">★ ${total} · ${rankOf(total)}</b>${nr ? `<small>до «${nr[1]}» ${nr[0] - total}★</small>` : ''}<button class="chip sm" id="soundChip">${save.mute ? '🔇 звук выкл' : '🔊 звук вкл'}</button></span></div>
    <div class="grid tracks">${TRACKS.map((T) => {
    const rec = save.tracks[T.id], got = trackStarsEarned(rec), open = total >= T.need;
    const sub = !open ? `🔒 нужно ${T.need}★ · у тебя ${total}` : rec?.best != null ? `рекорд ${fmtTime(rec.best)} · ${T.length} м` : `${T.slopeDeg}° · ${T.length} м · ${trackStars(T).length} звёзд`;
    return `<button class="lesson track${open ? '' : ' locked'}" data-id="track:${T.id}" style="--c:${T.id === 'black' ? '#e2e8f0' : T.color}"><div class="n">${T.level}</div><div class="t">${T.name}</div><div class="s">${sub}</div><div class="st">${'★'.repeat(got)}${'☆'.repeat(3 - got)}</div></button>`;
  }).join('')}</div>`;
  const doneN = COURSE.filter((x) => x !== 'free' && save.done[x]).length;
  const ns = nextStep();
  const nextCard = ns
    ? `<button class="lesson next" data-id="${ns.id}"><div class="n">Следующий шаг · пройдено ${doneN} из ${COURSE_N}</div><div class="t">${ns.kind === 'ride' ? 'Урок ' + (COURSE.indexOf(ns.id) + 1) + ': ' : ''}${ns.title}</div><div class="s">${ns.kind === 'ride' ? ns.goal : ns.short}</div><div class="bar"><i style="width:${Math.round(100 * doneN / COURSE_N)}%"></i></div></button>`
    : `<div class="lesson next done"><div class="n">Курс пройден · ${COURSE_N} из ${COURSE_N}</div><div class="t">Все уроки позади — дальше трассы на время и свободное катание</div><div class="bar"><i style="width:100%"></i></div></div>`;
  $('lessonList').innerHTML = nextCard + todayRow() + tracks + GROUPS.map(([g, ids]) => `<div class="group-title">${g}</div><div class="grid${ids[0].startsWith('lect:') ? ' lects' : ''}">${ids.map((id) => {
    if (id.startsWith('lect:')) { const X = LECTURES_BY_ID[id.slice(5)]; return `<button class="lesson lect" data-id="${id}"><div class="n">Лекция</div><div class="t">${X.title}</div><div class="s">${X.short}</div></button>`; }
    if (id === 'cards') return `<button class="lesson cardsl" data-id="cards"><div class="n">На настоящем склоне</div><div class="t">📋 Шпаргалка на склон</div><div class="s">${SLOPE_CARDS.length} карточек крупно: правила, подъёмник, каждый элемент. Открой на подъёмнике — работает без интернета.</div></button>`;
    if (id === 'mistakes') return `<button class="lesson special" data-id="mistakes"><div class="n">Разбор</div><div class="t">Библиотека ошибок</div><div class="s">${MISTAKES.length} типичных ошибок: «неправильно / правильно» в 3D</div></button>`;
    const L = LESSONS_BY_ID[id]; n++;
    const st = save.done[id] ? '★'.repeat(save.done[id]) : '';
    return `<button class="lesson" data-id="${id}"><div class="n">${id === 'free' ? '∞' : 'Урок ' + n}</div><div class="t">${L.title}</div><div class="s">${L.short}</div><div class="st">${st}</div></button>`;
  }).join('')}</div>`).join('');
  $('lessonList').querySelectorAll('.lesson').forEach((b) => b.onclick = () => {
    const id = b.dataset.id;
    if (id === 'cards') openCards(); else if (id === 'mistakes') openMistakes(); else if (id.startsWith('lect:')) openLecture(id.slice(5)); else openBrief(id);
  });
  $('soundChip').onclick = () => { save.mute = !save.mute; persist(); sfx.setMuted(save.mute); if (!save.mute) sfx.star(); renderMenu(); };
}
const fmtA = (a) => (a > 0 ? '+' : '') + a + '°';
$('stanceChip').onclick = () => openBrief('stance');
$('setChip').onclick = () => openSettings();

// ---------------------------------------------------------------- настройки
// Всё, что раньше было разбросано (стойка — только в первом уроке, голос — только в демо, звук — в шапке трасс), в одном окне.
const canVibe = 'vibrate' in navigator && TOUCH;
const vibe = (ms) => { if (canVibe && save.vibe !== false) try { navigator.vibrate(ms); } catch { /* нет вибро */ } };
const applyLook = () => document.body.classList.toggle('big', !!save.big);
applyLook();
function openSettings() {
  show('modal', true);
  const row = (id, name, note, on) => `<div class="setrow"><div><b>${name}</b><small>${note}</small></div><button class="chip sw${on ? ' on' : ''}" id="${id}">${on ? 'вкл' : 'выкл'}</button></div>`;
  const draw = () => {
    $('modalCard').innerHTML = `<h2>Настройки</h2>
      <div class="setrow"><div><b>Стойка</b><small>${save.stance ? (stance() === 'regular' ? 'Regular: левая нога впереди' : 'Goofy: правая нога впереди') : 'не выбрана — по умолчанию regular'} · крепления ${fmtA(save.front)} / ${fmtA(save.rear)}</small></div>
        <span class="seg"><button class="chip${stance() === 'regular' ? ' on' : ''}" id="stR">Regular</button><button class="chip${stance() === 'goofy' ? ' on' : ''}" id="stG">Goofy</button></span></div>
      <div class="row" style="justify-content:flex-start;margin-top:0"><button class="btn sm alt" id="stQuiz">Пройти тест стойки</button><button class="btn sm alt" id="stBind">Настроить крепления</button></div>
      ${voice.ok ? row('sVoice', 'Голос инструктора', 'В демонстрациях подписи читаются вслух', voiceOn()) : ''}
      ${row('sSound', 'Звуки игры', 'Звёзды, ворота, финиш, падение', !save.mute)}
      ${row('sSlide', 'Шорох снега', 'Звук доски: юз шуршит, карвинг шипит — слышно, режешь или скользишь', save.slide !== false)}
      ${canVibe ? row('sVibe', 'Вибрация', 'Короткий отклик на звезду, ворота и падение', save.vibe !== false) : ''}
      ${row('sBig', 'Крупные подписи', 'Субтитры инструктора и подсказки крупнее', !!save.big)}
      <div class="setrow"><div><b>Прогресс</b><small>Пройдено уроков ${COURSE.filter((x) => x !== 'free' && save.done[x]).length} из ${COURSE_N} · звёзд на трассах ${starsTotal()}${save.streak?.n ? ` · серия ${save.streak.n} дн.` : ''}</small></div><button class="chip" id="sReset">Сбросить</button></div>
      <div class="row"><button class="btn primary" id="sOk">Готово</button></div>`;
    const tg = (id, f) => { const b = $(id); if (b) b.onclick = () => { f(); persist(); draw(); }; };
    $('stR').onclick = () => { save.stance = 'regular'; persist(); draw(); };
    $('stG').onclick = () => { save.stance = 'goofy'; persist(); draw(); };
    $('stQuiz').onclick = () => { show('modal', false); openStance(); };
    $('stBind').onclick = () => { show('modal', false); openBindings(); };
    tg('sVoice', () => { save.voice = !voiceOn(); if (save.voice) speak('Голос инструктора включён.'); else voiceStop(); });
    tg('sSound', () => { save.mute = !save.mute; sfx.setMuted(save.mute); if (!save.mute) sfx.star(); });
    tg('sSlide', () => { save.slide = save.slide === false; });
    tg('sVibe', () => { save.vibe = save.vibe === false; if (save.vibe) vibe(30); });
    tg('sBig', () => { save.big = !save.big; applyLook(); });
    $('sReset').onclick = () => {
      $('modalCard').innerHTML = `<h2>Сбросить прогресс?</h2><p>Пройденные уроки, звёзды трасс, рекорды, призраки и серия дней удалятся. Стойка и крепления останутся.</p>
        <div class="row"><button class="btn ghost" id="rNo">Отмена</button><button class="btn primary" id="rYes">Сбросить</button></div>`;
      $('rNo').onclick = draw;
      $('rYes').onclick = () => {
        save.done = {}; save.tracks = {}; save.streak = null; save.daily = null; save.stats = {};
        TRACKS.forEach((T) => { try { localStorage.removeItem(GHOST_KEY(T.id)); } catch { /* приватный режим */ } });
        persist(); draw();
      };
    };
    $('sOk').onclick = () => { show('modal', false); renderMenu(); };
  };
  draw();
}
// ---------------------------------------------------------------- шпаргалка на склон
// Карточки для настоящего склона: крупный текст, листаются свайпом и стрелками, читаются вслух.
// Открываются поверх любого экрана и закрываются туда же — из меню, брифинга и окна «урок пройден».
let sheetAt = 0;
function openCards(id) {
  sheetAt = Math.max(0, SLOPE_CARDS.findIndex((c) => c.id === id));
  show('sheet', true);
  drawCard();
}
function closeCards() { show('sheet', false); voiceStop(); }
function drawCard() {
  const C = SLOPE_CARDS[sheetAt], L = C.lesson && LESSONS_BY_ID[C.lesson];
  $('sheetCard').innerHTML = `<div class="cards-nav">${SLOPE_CARDS.map((c, i) => `<button class="chip sm${i === sheetAt ? ' on' : ''}" data-i="${i}">${c.icon} ${c.title}</button>`).join('')}</div>
    <div class="ok-k">Шпаргалка на склон · ${sheetAt + 1} из ${SLOPE_CARDS.length}</div><h2>${C.icon} ${C.title}</h2>
    <div class="blk fix"><div class="h">Помни</div><ul>${C.remember.map((t) => `<li>${t}</li>`).join('')}</ul></div>
    <div class="blk dont"><div class="h">Не делай</div><ul>${C.dont.map((t) => `<li>${t}</li>`).join('')}</ul></div>
    <div class="psy"><div class="h">Если страшно</div>${C.scared}</div>
    <div class="row"><button class="btn ghost" id="cClose">Закрыть</button>${voice.ok ? '<button class="btn alt" id="cSay" title="Прочитать вслух">🔊<span class="pt"> Прочитать</span></button>' : ''}${L ? '<button class="btn alt" id="cLesson">Урок в игре</button>' : ''}<button class="btn alt" id="cPrev" title="Назад (←)">◀</button><button class="btn primary" id="cNext" title="Дальше (→)">▶</button></div>`;
  const nav = $('sheetCard').querySelector('.cards-nav'), on = nav.querySelector('.on');
  nav.scrollLeft = on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2;
  nav.querySelectorAll('.chip').forEach((b) => b.onclick = () => { sheetAt = +b.dataset.i; voiceStop(); drawCard(); });
  $('sheetCard').scrollTop = 0;
  $('cClose').onclick = closeCards;
  $('cPrev').onclick = () => flipCard(-1);
  $('cNext').onclick = () => flipCard(1);
  if ($('cSay')) $('cSay').onclick = () => speak(`${C.title}. Помни: ${C.remember.join(' ')} Не делай: ${C.dont.join(' ')} Если страшно: ${C.scared}`, false, true);
  if (L) $('cLesson').onclick = () => { closeCards(); openBrief(L.id); };
}
function flipCard(d) { sheetAt = (sheetAt + d + SLOPE_CARDS.length) % SLOPE_CARDS.length; voiceStop(); drawCard(); }
function sheetKey(e) {
  if ($('sheet').classList.contains('hidden')) return false;
  if (e.code === 'ArrowRight') flipCard(1);
  else if (e.code === 'ArrowLeft') flipCard(-1);
  else if (e.code === 'Escape') closeCards();
  return true;
}
// свайп влево-вправо по карточке листает (вертикальная прокрутка не мешает)
{
  let sx = null, sy = 0;
  $('sheetCard').addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  $('sheetCard').addEventListener('pointerup', (e) => {
    if (sx == null || e.target.closest('.cards-nav')) { sx = null; return; }
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) flipCard(dx < 0 ? 1 : -1);
  });
}
$('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeCards(); });

// ---------------------------------------------------------------- задание дня, серия дней, над чем поработать
// Повод вернуться завтра: одно задание на день из уже открытого и серия дней подряд.
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
const days = (n) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
// серию продлевает любой пройденный урок или финиш трассы; пропустил день — серия начинается заново
function touchStreak() {
  const today = dayKey(), s = save.streak || { n: 0, last: null, best: 0 };
  if (s.last === today) return false;
  const n = s.last === yesterday() ? s.n + 1 : 1;
  save.streak = { n, last: today, best: Math.max(s.best || 0, n) };
  return true;
}
const streakN = () => (save.streak && [dayKey(), yesterday()].includes(save.streak.last) ? save.streak.n : 0);
const RIDE_COURSE = COURSE.filter((id) => id !== 'free' && LESSONS_BY_ID[id].kind === 'ride');
function daily() {
  const today = dayKey();
  if (save.daily?.day === today) return save.daily;
  // пока не пройдено ни одного урока на склоне и ни одной трассы — только «следующий шаг», без задания дня
  if (!RIDE_COURSE.some((id) => save.done[id]) && !Object.keys(save.tracks).length) return null;
  const ns = nextStep();
  const pool = [
    ...RIDE_COURSE.filter((id) => save.done[id] || id === ns?.id).map((id) => ({ kind: 'lesson', id })),
    ...TRACKS.filter(isOpen).flatMap((T) => [{ kind: 'track', id: T.id, task: 'clean' }, { kind: 'track', id: T.id, task: 'stars' }]),
  ];
  const h = [...today].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  save.daily = { day: today, ...pool[h % pool.length], done: false }; persist();
  return save.daily;
}
const trackName = (id) => TRACKS.find((T) => T.id === id).name;
const dailyText = (d) => (d.kind === 'lesson' ? `Пройди «${LESSONS_BY_ID[d.id].title}» без падений`
  : d.task === 'clean' ? `Проедь трассу «${trackName(d.id)}» без падений` : `Собери все звёзды на трассе «${trackName(d.id)}»`);
// отмечает задание дня, если заезд его выполнил; true — только что выполнено
function dailyCheck(kind, id, ok) {
  const d = save.daily;
  if (!d || d.done || d.day !== dayKey() || d.kind !== kind || d.id !== id || !ok) return false;
  d.done = true; return true;
}
// какие падения повторяются: считаем по типам, советуем урок, где это отрабатывается
function countFall(type) {
  const st = save.stats || (save.stats = {}), f = st.falls || (st.falls = {});
  f[type] = (f[type] || 0) + 1; persist();
}
function workOn() {
  const f = save.stats?.falls || {};
  const [type, n] = Object.entries(f).sort((a, b) => b[1] - a[1])[0] || [];
  const les = type && LESSONS_BY_ID[FALL_LESSON[type]];
  return les && n >= 3 ? { type, n, lesson: les } : null;
}
// чистый проход урока «гасит» половину падений, которые он лечит: совет меняется по мере прогресса
function healFalls(lessonId) {
  const f = save.stats?.falls; if (!f) return;
  for (const t in f) if (FALL_LESSON[t] === lessonId) f[t] = Math.floor(f[t] / 2);
}
function todayRow() {
  const d = daily(), wk = workOn(), n = streakN();
  if (!d && !wk) return '';
  const dc = d ? `<button class="lesson daily${d.done ? ' ok' : ''}" data-id="${d.kind === 'track' ? 'track:' + d.id : d.id}"><div class="n">🎯 Задание дня${n ? ` · 🔥 ${days(n)} подряд` : ''}</div><div class="t">${dailyText(d)}</div><div class="s">${d.done ? '✓ Выполнено! Завтра будет новое.' : 'Повтор закрепляет: тело запоминает движение, а не текст. Заходи каждый день — растёт серия.'}</div></button>` : '';
  const wc = wk ? `<button class="lesson work" data-id="${wk.lesson.id}"><div class="n">Над чем поработать</div><div class="t">${(FALLS[wk.type] || FALLS.out).title} · ${wk.n} ${plural(wk.n, 'раз', 'раза', 'раз')}</div><div class="s">Потренируй «${wk.lesson.title}» — там отрабатывается именно это.</div></button>` : '';
  return `<div class="grid today">${dc}${wc}</div>`;
}
// что показать в окне итогов: выполнено задание дня, продлилась серия
function rewardsHtml(dailyDone, streakUp) {
  const n = save.streak?.n || 0;
  return (dailyDone ? '<div class="unlock">🎯 Задание дня выполнено!</div>' : '')
    + (streakUp && n > 1 ? `<div class="unlock streak">🔥 ${days(n)} подряд — серия продолжается. Завтра снова!</div>` : '');
}

// ---------------------------------------------------------------- поделиться результатом
// Телефон открывает своё меню «Поделиться», компьютер копирует ссылку. По ссылке друг попадает сразу на трассу.
async function shareResult(text, query) {
  const url = location.origin + location.pathname + (query ? '?' + query : '');
  if (navigator.share) {
    try { await navigator.share({ title: 'Школа сноуборда', text, url }); return 'ok'; } catch (e) { if (e?.name === 'AbortError') return 'cancel'; }
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); return 'copied'; } catch { return 'fail'; }
}
function shareBtn(id, text, query) {
  const b = $(id); if (!b) return;
  b.onclick = async () => {
    const r = await shareResult(text, query);
    if (r === 'copied') b.textContent = '✓ Ссылка скопирована';
    else if (r === 'fail') b.textContent = 'Не получилось — скопируй адрес страницы';
  };
}

if (TOUCH) $('menuFoot').textContent = 'На телефоне: ◀ ▶ — кант, ▲ ▼ — вес, ⟲ ⟳ — плечи, ⤓ — присесть. Удобнее держать телефон боком.';

// ---------------------------------------------------------------- установка как приложение (PWA)
// Chrome/Android предлагает установку событием; на iPhone — подсказка «Поделиться → На экран „Домой“».
let installEvt = null;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
function renderInstall() {
  const b = $('installChip'); if (!b) return;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone;
  b.classList.toggle('hidden', standalone || !(installEvt || ios));
  b.textContent = installEvt ? '📲 Установить как приложение' : '📲 На экран «Домой»';
  b.onclick = async () => {
    if (installEvt) { installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); if (r?.outcome === 'accepted') { installEvt = null; renderInstall(); } return; }
    show('modal', true);
    $('modalCard').innerHTML = `<h2>Как установить на iPhone</h2><p>В Safari нажми кнопку «Поделиться» (квадрат со стрелкой), затем «На экран „Домой“». Приложение откроется на весь экран и будет работать без интернета.</p><div class="row"><button class="btn primary" id="mOk">Понятно</button></div>`;
    $('mOk').onclick = () => show('modal', false);
  };
}
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; renderInstall(); });
addEventListener('appinstalled', () => { installEvt = null; renderInstall(); });
renderInstall();
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.search.includes('shots=1')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function toMenu() {
  setScreen('menu'); renderMenu();
  // фон меню — инструктор катается
  startRide('free', true, { background: true });
  app.mode = 'menu';
  show('hud', false);
}

// ---------------------------------------------------------------- брифинг
function keyLegend(kind) {
  const ts = toeSign();
  // на телефоне подсказки говорят про экранные кнопки, на компьютере — про клавиши
  const K = (key, sym) => `<kbd>${TOUCH ? sym : key}</kbd>`;
  const toeKey = ts > 0 ? K('D', '▶') : K('A', '◀'), heelKey = ts > 0 ? K('A', '◀') : K('D', '▶');
  const items = [[heelKey, 'на пятки (пяточный кант)'], [toeKey, 'на носки (носочный кант)']];
  const ws = `${K('W', '▲')}/${K('S', '▼')}`;
  if (kind === 'pheel' || kind === 'ptoe') items.push([ws, 'вес — держи доску поперёк']);
  else items.push([ws, 'вес на переднюю / заднюю ногу']);
  if (kind === 'turn' || kind === 'carve') items.push([`${K('Q', '⟲')}/${K('E', '⟳')}`, 'повернуть плечи']);
  items.push([K('Пробел', '⤓'), 'присесть']);
  if (TOUCH) items.push(['кнопки сверху', 'камера, замедление, заново']);
  else items.push(['<kbd>Shift</kbd>', 'выпрямить ноги (ошибка)'], ['<kbd>C</kbd> <kbd>T</kbd> <kbd>R</kbd>', 'камера, замедление, заново']);
  return items;
}

function openBrief(id) {
  const L = lessonById(id);
  if (L.kind === 'stance') return openStance();
  if (L.kind === 'bindings') return openBindings();
  if (L.kind === 'posture') return openPosture();
  if (L.kind === 'gear') return openGear();
  if (L.kind === 'track') return openTrackBrief(L);
  setScreen('brief');
  $('briefNum').style.background = '';
  $('briefDemo').textContent = '▶ Показать инструктора';
  $('briefGo').textContent = 'Попробовать сам'; $('briefGo').disabled = false;
  const idx = LESSONS.filter((l) => l.id !== 'free').indexOf(L) + 1;
  $('briefNum').textContent = id === 'free' ? '∞' : idx;
  $('briefTitle').textContent = L.title;
  $('briefTheory').innerHTML = L.theory.map((p) => `<p>${p}</p>`).join('');
  $('briefTips').innerHTML = L.tips ? `<div class="h">Мастер-класс: фишки инструктора</div><ul>${L.tips.map((t) => `<li>${t}</li>`).join('')}</ul>` : '';
  $('briefPrep').innerHTML = L.prep ? `<div class="h">Подводящие упражнения</div><ul>${L.prep.map((t) => `<li>${t}</li>`).join('')}</ul>` : '';
  $('briefPsy').innerHTML = L.psy ? `<div class="h">Голова</div>${L.psy}` : '';
  const vsel = L.variants ? variantOf(L) : null;
  $('briefGoal').innerHTML = `<b>Задание:</b> ${L.goal}` + (L.variants ? `<div class="variants">${L.variants.map((v) => `<button class="chip sm v${v.id === vsel ? ' on' : ''}" data-v="${v.id}">${save.done[id + ':' + v.id] ? '✓ ' : ''}${v.name}</button>`).join('')}</div>` : '');
  $('briefGoal').querySelectorAll('.chip.v').forEach((b) => b.onclick = () => { app.variantOf[id] = b.dataset.v; openBrief(id); });
  $('briefKeys').innerHTML = keyLegend(L.keys).map(([k, t]) => `<span>${k} ${t}</span>`).join('');
  $('briefDemo').onclick = () => startRide(id, true);
  $('briefGo').onclick = () => startRide(id, false);
  $('briefBack').onclick = toMenu;
  const card = SLOPE_CARDS.find((c) => c.lesson === id);
  show('briefCard', !!card);
  if (card) $('briefCard').onclick = () => openCards(card.id);
}
// Вариант урока (например, «падающий лист» на пятках или на носках): выбранный в брифинге, иначе первый непройденный
function variantOf(L) {
  const sel = app.variantOf[L.id];
  if (sel && L.variants.some((v) => v.id === sel)) return sel;
  return (L.variants.find((v) => !save.done[L.id + ':' + v.id]) || L.variants[0]).id;
}

// Призрак хранится отдельно от сохранения: [время, u, s, theta, edge, weight, rot, lean, crouch] 20 раз в секунду
const GHOST_KEY = (id) => 'snowschool.ghost.' + id;
function loadGhost(id) {
  try {
    const g = JSON.parse(localStorage.getItem(GHOST_KEY(id)));
    if (!g || !g.rec?.length) return null;
    let m = -Infinity; g.sMax = g.rec.map((r) => (m = Math.max(m, r[2]))); // s призрака не убывает — для поиска по s
    return g;
  } catch { return null; }
}
function saveGhost(id, rec) {
  try { localStorage.setItem(GHOST_KEY(id), JSON.stringify({ st: stance(), rec: rec.map((r) => r.map((v) => Math.round(v * 1000) / 1000)) })); } catch { /* нет места */ }
}
// Время призрака в той же точке трассы: «+» — ты медленнее
function ghostDelta() {
  const g = app.ghost; if (!g) return null;
  const S = g.sMax, s = sim.s;
  if (s < S[0] || s > S[S.length - 1]) return null;
  let lo = 0, hi = S.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] < s) lo = m; else hi = m; }
  const a = S[hi] > S[lo] ? (s - S[lo]) / (S[hi] - S[lo]) : 0;
  return app.ls.time - (g.rec[lo][0] + (g.rec[hi][0] - g.rec[lo][0]) * a);
}
function drawGhost() {
  const g = app.ghost, R = g?.rec;
  const t = app.ls.time;
  ghost.root.visible = !!R && g.st === stance() && t <= R[R.length - 1][0] + 0.3;
  if (!ghost.root.visible) return;
  let i = Math.min(R.length - 2, Math.max(0, Math.floor(t * 20)));
  while (i > 0 && R[i][0] > t) i--;
  while (i < R.length - 2 && R[i + 1][0] < t) i++;
  const a = clamp((t - R[i][0]) / ((R[i + 1][0] - R[i][0]) || 1), 0, 1), A = R[i], B = R[i + 1];
  const h = A.map((v, j) => v + ((j === 3 ? wrapAngle(B[j] - v) : B[j] - v)) * a);
  poseFromState(h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8], 0, null, t, ghost);
}

const taskList = (T, done, fresh = []) => `<ul class="tasks">${taskNames(T).map((t, i) => `<li class="${done[i] ? 'ok' : 'no'}"><span class="sx">${done[i] ? '★' : '☆'}</span>${t}${fresh[i] ? '<i>новая!</i>' : ''}</li>`).join('')}</ul>`;

function openTrackBrief(L) {
  const T = L.track, rec = save.tracks[T.id], open = isOpen(T);
  setScreen('brief');
  $('briefNum').textContent = T.level;
  $('briefNum').style.background = T.id === 'black' ? '#334155' : T.color;
  $('briefTitle').textContent = T.name;
  $('briefTheory').innerHTML = `<p>${T.intro}</p><p class="meta">Склон ${T.slopeDeg}° · ${T.length} м · ${L.nStars} звёзд${T.gates ? ' · ворота' : ''}${rec?.best != null ? ` · твой рекорд <b>${fmtTime(rec.best)}</b>` : ''}</p>`;
  $('briefTips').innerHTML = `<div class="h">Совет инструктора</div><ul><li>${T.tip}</li><li>Упал — не страшно: встанешь на том же месте и поедешь дальше. Время при этом идёт.</li></ul>`;
  $('briefGoal').innerHTML = `<b>Три звезды за трассу:</b>${taskList(T, rec?.tasks || [])}`;
  $('briefPrep').innerHTML = ''; $('briefPsy').innerHTML = ''; show('briefCard', false);
  $('briefKeys').innerHTML = keyLegend(L.keys).map(([k, t]) => `<span>${k} ${t}</span>`).join('');
  $('briefDemo').textContent = '▶ Как проехать';
  $('briefGo').textContent = open ? 'Поехали' : `🔒 Откроется на ${T.need}★`;
  $('briefGo').disabled = !open;
  $('briefDemo').onclick = () => startRide(L.id, true);
  $('briefGo').onclick = () => open && startRide(L.id, false);
  $('briefBack').onclick = toMenu;
}

// ---------------------------------------------------------------- склон
function startRide(id, demo, opts = {}) {
  const L = lessonById(id);
  app.lesson = L; app.demo = demo; app.t = 0; app.ended = false; app.fallShown = false; app.history = []; app.replay = null;
  app.background = !!opts.background;
  if (!opts.keepFalls) app.falls = 0;
  app.variant = L.variants ? (opts.variant || variantOf(L)) : null;
  if (app.variant) app.variantOf[id] = app.variant;
  app.ls = {}; L.init(app.ls, app.variant); prevSnap = null; acc = 0;
  app.pauses = newPauses(); app.pause = null; app.held = null;
  setUserPause(false);
  world.build(L.slopeDeg);
  world.setGates(L.gates);
  const targets = typeof L.targets === 'function' ? L.targets(app.variant) : L.targets;
  world.setTargets(targets ? targets.map((u) => u * toeSign()) : null);
  const track = L.kind === 'track';
  world.setStars(track ? trackStars(L.track) : null);
  world.setFinish(track ? L.track.length : null);
  world.setTrackLook(track ? L.track : null);
  app.ghost = track && !demo && !app.background ? loadGhost(L.track.id) : null;
  ghost.root.visible = false;
  $('hudTop').classList.toggle('track', track);
  sim.reset({ slopeDeg: L.slopeDeg, stance: stance(), ...L.start(toeSign(), app.variant) });
  ctl.edge = 0;
  rider.setConfig({ stance: stance(), front: save.front, rear: save.rear, width: save.width / 100 });
  if (app.ghost) ghost.setConfig({ stance: stance(), front: save.front, rear: save.rear, width: save.width / 100 });
  rig.init = false;
  rig.mode = 'follow';
  app.camManual = false; app.camT = 0; app.camI = 0;
  app.travel.copy(world.frame.D);
  if (!app.background) {
    setScreen('ride');
    const best = track ? save.tracks[L.track.id]?.best : null;
    const vname = app.variant ? ` · ${L.variants.find((v) => v.id === app.variant).name.toLowerCase()}` : '';
    $('hudTitle').innerHTML = (demo ? 'Демонстрация · ' : '') + L.title + vname + (app.ghost && best != null ? ` <span class="gh">· призрак ${fmtTime(best)}</span>` : '');
    $('toast').className = '';
    $('keyLegend').innerHTML = keyLegend(L.keys).map(([k, t]) => `<div>${k} ${t}</div>`).join('');
    show('demoBanner', demo);
    $('hud').classList.toggle('demo', demo);
    show('pip', !!L.pip);
    app.demoSlow = null;
    $('bCam').innerHTML = 'Камера<span class="camName">: ' + CAM_NAMES[rig.mode] + '</span>';
    setCoach('info', demo ? 'Смотри, что делает тело: колени, вес, наклон. На панели тела — кант и вес в реальном времени.' : L.goal);
    voiceStop(); renderVoiceBtn();
    if (demo) speak(track ? `Инструктор показывает трассу ${L.track.name}.` : `Инструктор показывает: ${L.title}.`);
  }
}

function restart() { if (app.lesson) startRide(app.lesson.id, app.demo, { keepFalls: true }); }
function setCam(mode) { rig.mode = mode; $('bCam').innerHTML = 'Камера<span class="camName">: ' + CAM_NAMES[mode] + '</span>'; }
// Пауза игрока: время стоит, а камеру можно крутить вокруг райдера и смотреть с любой стороны
function setUserPause(on) {
  app.userPause = on;
  $('bPause').innerHTML = on ? '▶<span class="pt"> Дальше</span>' : '❚❚<span class="pt"> Пауза</span>';
  $('bPause').classList.toggle('on', on);
  $('hud').classList.toggle('paused', on);
  if (on && !app.background) toast(TOUCH ? '❚❚ Пауза · крути камеру пальцем, щипок — ближе' : '❚❚ Пауза · крути камеру мышью, колёсико — ближе', 'info long');
  if (on) voiceStop();
}
function togglePause() { if (app.mode === 'ride' && !app.replay) setUserPause(!app.userPause); }
function cycleCam() { app.camManual = true; const i = CAM_MODES.indexOf(rig.mode); setCam(CAM_MODES[(i + 1) % CAM_MODES.length]); }
// Режиссёр демонстрации: сам меняет ракурс, чтобы было видно и кант, и работу тазом.
// Урок может задать свой список ракурсов (L.demoCams). Кнопка «Камера» отключает автосмену.
const DEMO_CAMS = ['follow', 'profile', 'front3', 'side', 'follow', 'front'];
function directCam() {
  if (!app.demo || app.camManual || app.background || sim.fallen) return;
  const list = app.lesson.demoCams || DEMO_CAMS;
  if (app.t - app.camT < 5.5) return;
  app.camT = app.t; app.camI = (app.camI + 1) % list.length;
  setCam(list[app.camI]);
}
function toggleSlow() { app.slow = app.slow === 1 ? 0.35 : 1; renderSlow(); }
// на телефоне вместо слова «Замедл.» — черепаха, иначе кнопки не помещаются в ряд
function renderSlow() { $('bSlow').innerHTML = `<span class="st">Замедл. </span><span class="si">🐢</span>${app.slow === 1 ? '×1' : '×0.35'}`; $('bSlow').classList.toggle('on', app.slow !== 1); }
renderSlow();
$('bCam').onclick = cycleCam; $('bSlow').onclick = toggleSlow; $('bPause').onclick = togglePause; $('bRestart').onclick = restart; $('bMenu').onclick = toMenu;
$('bVoice').onclick = () => { save.voice = !voiceOn(); persist(); if (!save.voice) voiceStop(); else { voice.last = ''; speak('Голос инструктора включён.'); } renderVoiceBtn(); };

let coachState = '';
function setCoach(kind, text) {
  const key = kind + text;
  if (key === coachState) return;
  coachState = key;
  $('coach').className = kind === 'info' ? '' : kind;
  $('coachText').innerHTML = text;
}

const STEP = 1 / 120;
let acc = 0;
// Снимок состояния до шага: при замедлении шаг физики реже кадра,
// поэтому рисуем райдера между двумя шагами, а не прыжками.
const SNAP = ['u', 's', 'theta', 'edge', 'weight', 'rot', 'lean', 'crouch', 'stiff', 'time'];
let prevSnap = null;
const snap = () => Object.fromEntries(SNAP.map((k) => [k, sim[k]]));
function interpState() {
  const cur = snap();
  if (!prevSnap || sim.fallen) return cur;
  const a = Math.min(1, acc / STEP), o = {};
  for (const k of SNAP) o[k] = prevSnap[k] + (cur[k] - prevSnap[k]) * a;
  o.theta = prevSnap.theta + wrapAngle(cur.theta - prevSnap.theta) * a;
  return o;
}
function updateRide(dt) {
  // в демонстрации картинка поднята над субтитрами: доска и колени не прячутся за текстом (применяется в кадре)
  const want = app.mode === 'ride' && app.demo && !app.background ? $('demoBanner').offsetHeight * (innerHeight > innerWidth ? 0.6 : 0.8) : 0;
  app.viewShift = (app.viewShift || 0) + (want - (app.viewShift || 0)) * (app.t < 0.3 ? 1 : 1 - Math.exp(-dt * 6)); // в начале заезда — сразу, дальше плавно
  applyViewShift(); // сразу, а не в следующем кадре: первый кадр нового склона бывает долгим (компиляция шейдеров)
  const L = app.lesson;
  if (app.replay) return updateReplay(dt);
  if (app.pause && !app.userPause && (app.pause.left -= dt) <= 0) app.pause = null;
  if (!app.pause && !app.userPause) acc += dt * Math.min(app.slow, app.demo && app.demoSlow ? app.demoSlow : 1);
  const track = L.kind === 'track';
  let steps = 0;
  while (acc >= STEP && steps < 20 && !app.pause) {
    // после финиша трассы райдер не замирает, а докатывается (ведёт автопилот)
    const coast = track && app.ended && app.ls.finished;
    const live = !sim.fallen && (!app.ended || coast);
    // автопилот зовём ровно раз за шаг (у него есть состояние); на паузе ввод ждёт в app.held
    const input = !live ? null : app.demo || coast || app.autoplay ? (app.held || L.auto(sim, app.t, app.ls)) : readInput(STEP);
    app.held = null;
    if (live && app.demo && !app.background && !track && (app.pause = keyMoment(app.pauses, app.t, input))) { app.held = input; break; }
    acc -= STEP; steps++;
    prevSnap = snap();
    if (track && !app.ls.finished) app.ls.time += STEP; // время трассы идёт и пока райдер встаёт
    if (live) {
      if (app.demo) { app.caption = input.caption; app.dont = input.dont || ''; app.demoSlow = input.slow || null; app.captionKind = input.mistake ? 'danger' : 'info'; }
      sim.step(STEP, input);
      if (Math.abs(sim.u) > 21) sim.fall('out');
      if (sim.s > 1300) { app.ended = true; }
      app.history.push([sim.u, sim.s, sim.theta, sim.edge, sim.weight, sim.rot, sim.lean, sim.crouch, sim.stiff]);
      if (app.history.length > 720) app.history.shift();
      if (track && !app.ls.finished) {
        const ls = app.ls;
        ls.vmax = Math.max(ls.vmax, sim.speed);
        if (Math.round(ls.time * 120) % 6 === 0) ls.rec.push([ls.time, sim.u, sim.s, sim.theta, sim.edge, sim.weight, sim.rot, sim.lean, sim.crouch]);
      }
      const r = L.check(sim, app.ls, STEP);
      app.lastCheck = r;
      if (!app.background && !app.ended) {
        if (r.done) { app.ended = true; setTimeout(() => (track ? trackDone() : lessonDone()), track ? 1300 : 600); }
        else if (r.fail) { app.ended = true; setTimeout(() => lessonFail(r.fail), 400); }
      }
      if (app.background && app.t > 40) startRide('free', true, { background: true });
    } else if (sim.fallen) sim.step(STEP, {}); // после конца урока райдер замирает
    app.t += STEP;
  }
  if (track) trackEvents();
  if (sim.fallen && !app.fallShown) {
    if (!app.background && app.fallBuzz !== sim.fallen) { app.fallBuzz = sim.fallen; vibe([50, 40, 50]); }
    if (track && app.ls.fallAt !== sim.fallen) { app.ls.fallAt = sim.fallen; sfx.fall(); }
    if (sim.time - sim.fallen.t > 1.1) {
      app.fallShown = true;
      if (app.background) startRide('free', true, { background: true });
      else if (track) { if (!app.ended) trackRespawn(); }
      else { app.falls++; if (!app.demo) countFall(sim.fallen.type); showFall(sim.fallen); }
    }
  }
  if (app.lesson?.id === 'leaf') world.highlightTarget(app.ls.i);
  directCam();
  drawRider(dt, sim.time);
}

function poseFromState(u, s, theta, edge, weight, rot, lean, crouch, stiff, fall, t, who = rider) {
  const f = world.frame, ts = toeSign();
  const pos = f.p(u, s);
  const nose = f.dir(Math.sin(theta), Math.cos(theta));
  const right = f.dir(Math.cos(theta), -Math.sin(theta));
  who.placeOnSlope(pos, nose, f.N, right, edge * ts * MAX_EDGE_DEG * D);
  who.root.updateMatrixWorld(true);
  const danger = who === rider ? sim.danger || 0 : 0;
  who.update({
    knee: 0.5, hinge: 0.12, weight, rot: rot * ts, gaze: 1, arms: 0.4 + (fall ? 0 : danger * 0.45), lean, crouch, stiff, t,
    up: who.worldUpLocal(), fall,
  });
  return { pos, nose, right };
}

const fallSide = (f) => (/toe/.test(f.type) ? 1 : -1);

function drawRider(dt, t) {
  const f = world.frame;
  const fall = sim.fallen ? { side: fallSide(sim.fallen), k: (sim.time - sim.fallen.t) / 0.45 } : null;
  const st = interpState();
  const { pos, right } = poseFromState(st.u, st.s, st.theta, st.edge, st.weight, st.rot, st.lean, st.crouch, st.stiff, fall, st.time);
  // направление камеры «сзади» — по ходу движения
  const tv = sim.speed > 1.5 ? f.dir(sim.vu, sim.vs).normalize() : f.D.clone();
  app.travel.lerp(tv, 1 - Math.exp(-dt * 2.5)).normalize();
  const toeDir = right.clone().multiplyScalar(toeSign());
  const demoCam = app.demo && !app.background && app.lesson.kind !== 'track';
  // в демонстрации камера ближе и смотрит почти на райдера (а не на 3 м вперёд): видно колени, кант и центр тяжести
  const zoom = demoCam ? 0.78 : 1;
  rig.update(dt, pos, app.travel, toeDir, f.N, { mode: app.background ? 'follow' : (sim.fallen && !app.replay ? 'orbit' : undefined), zoom, lookAhead: demoCam ? (innerHeight > innerWidth ? 2 : 1.2) : 3 });
  app.pipTarget = { pos, toeDir };
  // рабочий кант светится на доске: видно, какой край опущен, и зелёный он или опасный
  rider.setEdgeGlow(Math.sign(sim.sideDown), sim.fallen || app.background ? 0 : Math.abs(sim.edge), sim.danger, app.pause?.focus === 'edge');
  const now = performance.now() / 1000;
  world.follow(pos, sim.s, now);
  world.updateStars(now);
  if (app.ghost) drawGhost();
  // след и снежная пыль
  if (!sim.fallen) {
    const slip = sim.slip;
    world.trail.add(sim.u, sim.s, sim.theta, 0.05 + 1.45 * Math.min(1, Math.abs(Math.sin(slip))), slip > 0.15 ? 1 : 0);
    const vl = Math.abs(sim.vLat);
    if (vl > 0.8 || (sim.grip > 0.6 && sim.speed > 8)) {
      const n = Math.min(6, Math.ceil(vl * 1.5 + (sim.grip > 0.6 ? 2 : 0)));
      world.spray.emit(pos, f.dir(sim.vu, sim.vs).multiplyScalar(0.4).addScaledVector(right, -Math.sign(sim.vLat) * 0.6), n);
    }
  }
  world.spray.update(dt);
  const quiet = app.background || app.userPause || app.pause || sim.fallen || app.mode !== 'ride' || save.slide === false;
  sfx.slide(quiet ? 0 : sim.speed, clamp(Math.abs(Math.sin(sim.slip)) * 1.6, 0, 1), sim.grip, !quiet);
  if (!app.background) updateHud(dt);
}

function updateHud(dt) {
  app.hudT -= dt;
  if (app.hudT > 0) return;
  app.hudT = 1 / 15;
  const r = app.lastCheck || { text: '', p: 0 };
  if (app.lesson.kind === 'track') {
    const ls = app.ls, d = ghostDelta();
    $('hudGoal').innerHTML = `<span class="tt">${fmtTime(ls.time)}</span><span class="ts">★ ${ls.stars.size}/${app.lesson.nStars}</span>`
      + (d != null ? `<span class="td ${d > 0.05 ? 'bad' : d < -0.05 ? 'ok' : ''}" title="разница с призраком">${d > 0.05 ? '+' : d < -0.05 ? '−' : '±'}${Math.abs(d).toFixed(1)}</span>` : '')
      + (ls.missed ? `<span class="tm">+${ls.missed * GATE_PENALTY} с</span>` : '');
  } else $('hudGoal').textContent = r.text;
  $('hudProg').style.width = (r.p * 100).toFixed(0) + '%';
  // кант: вид сзади на доску; поворот рисунка — в «телесных» координатах (+ носки справа)
  const deg = sim.edgeDeg;
  $('gBoard').setAttribute('transform', `rotate(${(-deg).toFixed(1)} 80 60)`);
  $('gDeg').textContent = `${Math.abs(deg).toFixed(0)}° ${deg > 1.5 ? 'носки' : deg < -1.5 ? 'пятки' : 'плоско'}`;
  const P = app.demo ? app.pause : null;
  $('edgeGauge').setAttribute('class', (sim.danger > 0.45 ? 'danger' : sim.grip > 0.6 ? 'carve' : '') + (P?.focus === 'edge' ? ' focus' : ''));
  document.querySelector('#body .wrow').classList.toggle('focus', P?.focus === 'weight');
  rider.comBall.scale.setScalar(P?.focus === 'weight' ? 1.6 : 1);
  $('wMark').style.left = (50 + sim.weight * 45).toFixed(0) + '%';
  const front = Math.round(50 + sim.weight * 30);
  $('bodyStats').innerHTML = `<span>Скорость</span><b>${(sim.speed * 3.6).toFixed(0)} км/ч</b><span>Вес вперёд</span><b>${front}%</b><span>Ноги</span><b>${sim.stiff > 0.5 ? 'прямые!' : sim.crouch > 0.5 ? 'присел' : 'согнуты'}</b><span>Ход</span><b>${sim.speed < 0.3 ? 'стоп' : sim.grip > 0.6 ? 'карвинг' : sim.slip > 0.6 ? 'боком' : sim.slip > 0.15 ? 'юз' : 'скольжение'}</b>`;
  if (app.demo) {
    $('demoCaption').textContent = app.caption || '';
    $('demoBanner').classList.toggle('mistake', app.captionKind === 'danger');
    $('demoCam').textContent = CAM_NAMES[rig.mode];
    $('demoPause').innerHTML = P ? `<b><span class="pi"></span>Пауза.</b> ${P.look}<i style="transform:scaleX(${clamp(P.left / PAUSE.len, 0, 1).toFixed(2)})"></i>` : '';
    show('demoPause', !!P);
    // голос: новая подпись читается сразу, пояснение паузы — следом, один раз
    if (app.caption && app.caption !== voice.last) { voice.last = app.caption; speak(app.caption); }
    if (P && voice.pauseSpoken !== P) { voice.pauseSpoken = P; speak(P.look, true); }
    $('demoDont').innerHTML = app.dont ? `<b>${app.captionKind === 'danger' ? 'Правильно:' : 'Не делай:'}</b> ${app.dont}` : '';
    show('demoDont', !!app.dont);
    const e = Math.abs(deg), ws = front >= 53 ? 'вперёд' : front <= 47 ? 'НАЗАД' : 'центр';
    $('demoLive').innerHTML = `<span>кант <b>${e.toFixed(0)}°</b> ${deg > 1.5 ? 'носки' : deg < -1.5 ? 'пятки' : 'плоско'}</span><span class="${front < 47 ? 'bad' : ''}">вес <b>${front}%</b> на передней · ${ws}</span><span><b>${(sim.speed * 3.6).toFixed(0)}</b> км/ч</span>`;
    setCoach(app.captionKind || 'info', app.caption || '');
    return;
  }
  if (sim.fallen) { hintKey(null); return; }
  const w = sim.warnings[0];
  // при ошибке инструктор говорит, какую кнопку жать, а на телефоне эта кнопка мигает
  const hk = w ? warnKey(w) : null;
  hintKey(hk);
  if (w) { const [k, txt] = WARN_TEXT[w]; setCoach(k, txt + (hk ? ` <span class="press">Жми ${keyLabel(hk)}</span>` : '')); }
  else if (app.lesson.maxSpeed && sim.speed > app.lesson.maxSpeed) setCoach('warn', app.lesson.fastText || 'Быстровато для этого упражнения. Доску поперёк склона и на верхний кант — затормози.');
  else {
    // без ошибок — цель урока и по очереди «фишки инструктора», чтобы подсказка была всегда
    const notes = [...(app.lesson.tips || []).map((t) => ['Совет', t]), ...(app.lesson.psy ? [['Голова', app.lesson.psy]] : [])];
    const [h, t] = notes.length ? notes[Math.floor(app.t / 7) % notes.length] : [];
    setCoach('info', app.lesson.goal + (t ? `<div class="tip${h === 'Голова' ? ' psy' : ''}">${h}: ${t}</div>` : ''));
  }
}

// Какая кнопка исправляет ошибку: верхний кант, вес вперёд, плечи в поворот
function warnKey(w) {
  const lr = (edgeSign) => (edgeSign * toeSign() > 0 ? 'KeyD' : 'KeyA'); // кант «+ носки» → клавиша с учётом стойки
  if (w === 'edge_danger') return lr(-Math.sign(sim.vLat || 1) * toeSign()); // верхний кант — против бокового скольжения
  if (w === 'tip_danger') return lr(-Math.sign(sim.edge || 1));
  if (w === 'weight_back' || w === 'sit') return 'KeyW';
  if (w === 'counter_rot') return sim.sideDown > 0 ? 'KeyE' : 'KeyQ';
  return null;
}
const KEY_LABEL = { KeyA: ['A', '◀'], KeyD: ['D', '▶'], KeyW: ['W', '▲'], KeyS: ['S', '▼'], KeyQ: ['Q', '⟲'], KeyE: ['E', '⟳'] };
const keyLabel = (k) => `<kbd>${KEY_LABEL[k][TOUCH ? 1 : 0]}</kbd>`;
let hinted = null;
function hintKey(k) {
  if (k === hinted) return;
  hinted = k;
  document.querySelectorAll('#touch button').forEach((b) => b.classList.toggle('hint', b.dataset.k === k));
}

// ---------------------------------------------------------------- разбор падения
// Сноски «Голова» в разборе падения: по очереди, чтобы не повторяться
const FALL_PSY = [
  'Падение — это данные, а не провал: теперь ты знаешь, что именно подвело. В первые дни все падают десятки раз.',
  'Прежде чем встать — медленный выдох. Зажатое тело падает снова, расслабленное — держит кант.',
  'Падая, не выставляй прямые руки: вперёд — на колени и предплечья, назад — присесть и подбородок к груди.',
  'Страшно — и тело тянет назад, от склона. На следующей попытке нарочно перенеси вес на переднюю ногу.',
  'Сравнивай себя с собой пять минут назад, а не с теми, кто едет мимо. Они тоже так начинали.',
];
// Падение → ошибка из библиотеки: два райдера рядом показывают, что было в позе и как надо
const FALL_MISTAKE = { catch_toe: 'flat_heel', catch_heel: 'flat_base', back_seat: 'back_seat', overlean_toe: 'overlean', overlean_heel: 'overlean' };
function showFall(f) {
  const info = FALLS[f.type] || FALLS.out;
  const mk = MISTAKES.find((m) => m.id === FALL_MISTAKE[f.type]);
  show('modal', true);
  const demoNote = app.demo ? '<p>Инструктор нарочно показал эту ошибку — вот что происходит, если опустить доску на нижний кант.</p>' : '';
  $('modalCard').innerHTML = `<div class="fall-k">${app.demo ? 'Ошибка в демонстрации · разбор' : 'Падение · разбор'}</div><h2>${info.title}</h2>${demoNote}
    <div class="blk"><div class="h">Что произошло</div>${info.what}</div>
    <div class="blk why"><div class="h">Почему</div>${info.why}</div>
    <div class="blk fix"><div class="h">Как исправить</div>${info.fix}</div>
    <div class="blk drill"><div class="h">Упражнение</div>${info.drill}</div>
    ${app.demo ? '' : `<div class="psy"><div class="h">Голова</div>${FALL_PSY[app.falls % FALL_PSY.length]}</div>`}
    ${mk ? `<button class="btn sm alt m3d" id="m3d">🧍 Неправильно / правильно в 3D: ${mk.title.toLowerCase()}</button>` : ''}
    <div class="row"><button class="btn ghost" id="mMenu">Меню</button><button class="btn alt" id="mReplay">⟲ Повтор в замедлении</button><button class="btn alt" id="mDemo">Как делает инструктор</button><button class="btn primary" id="mRetry">${app.demo ? 'Попробовать сам' : 'Ещё раз'}</button></div>`;
  const back = app.lesson.id;
  if (mk) $('m3d').onclick = () => openMistakes(mk.id, () => openBrief(back));
  $('mMenu').onclick = toMenu;
  $('mRetry').onclick = () => { show('modal', false); if (app.demo) startRide(app.lesson.id, false); else restart(); };
  $('mDemo').onclick = () => { show('modal', false); startRide(app.lesson.id, true); };
  $('mReplay').onclick = () => { show('modal', false); app.replay = { i: 0, f }; setCoach('danger', `Повтор: ${info.title.toLowerCase()}. Смотри на панель канта.`); };
}

function updateReplay(dt) {
  const R = app.replay, H = app.history;
  sfx.slide(0);
  R.i += dt * 120 * 0.3;
  const k = Math.min(H.length - 1, Math.floor(R.i));
  const h0 = H[k], h1 = H[Math.min(H.length - 1, k + 1)], a = R.i - k;
  const h = h0.map((v, j) => v + ((j === 2 ? wrapAngle(h1[j] - v) : h1[j] - v)) * Math.min(1, a));
  const ended = k >= H.length - 1;
  const fall = ended ? { side: fallSide(R.f), k: (R.i - (H.length - 1)) / 54 } : null;
  const { pos, right } = poseFromState(h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8], fall, R.i / 120);
  const f = world.frame;
  const prev = H[Math.max(0, k - 10)];
  const tv = f.dir(h[0] - prev[0], h[1] - prev[1]); if (tv.lengthSq() < 1e-6) tv.copy(f.D); tv.normalize();
  rig.update(dt, pos, tv, right.clone().multiplyScalar(toeSign()), f.N, { mode: 'side' });
  rider.setEdgeGlow(Math.sign(h[3] * toeSign()), ended ? 0 : Math.abs(h[3]), 0, false);
  $('gBoard').setAttribute('transform', `rotate(${(-h[3] * MAX_EDGE_DEG).toFixed(1)} 80 60)`);
  $('gDeg').textContent = `${Math.abs(h[3] * MAX_EDGE_DEG).toFixed(0)}°`;
  if (ended && R.i > H.length + 60) { app.replay = null; showFall(R.f); }
}

function lessonDone() {
  const L = app.lesson;
  if (app.demo) {
    show('modal', true);
    $('modalCard').innerHTML = `<div class="ok-k">Демонстрация окончена</div><h2>${L.title}</h2><p>Теперь твоя очередь. Повтори то же самое: следи за кантом и весом на панели тела.</p>
      <div class="row"><button class="btn ghost" id="mMenu">Меню</button><button class="btn alt" id="mAgain">Посмотреть ещё раз</button><button class="btn primary" id="mGo">Попробовать сам</button></div>`;
    $('mAgain').onclick = () => { show('modal', false); startRide(L.id, true); };
  } else {
    const stars = app.falls === 0 ? 3 : app.falls <= 2 ? 2 : 1;
    if (app.variant) save.done[L.id + ':' + app.variant] = Math.max(save.done[L.id + ':' + app.variant] || 0, stars);
    save.done[L.id] = Math.max(save.done[L.id] || 0, stars);
    if (stars === 3) healFalls(L.id);
    const dd = dailyCheck('lesson', L.id, app.falls === 0), su = touchStreak();
    persist();
    const next = nextLesson(L.id);
    const card = SLOPE_CARDS.find((c) => c.lesson === L.id);
    // у урока с вариантами (пятки/носки) сначала предлагаем вторую сторону, потом следующий урок
    const other = L.variants?.find((v) => v.id !== app.variant && !save.done[L.id + ':' + v.id]);
    const vname = app.variant ? ` · ${L.variants.find((v) => v.id === app.variant).name.toLowerCase()}` : '';
    show('modal', true);
    $('modalCard').innerHTML = `<div class="ok-k">Урок пройден</div><h2>${L.title}${vname}</h2><div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p>${app.falls ? `Падений: ${app.falls}. Каждое — это опыт: ты уже знаешь, откуда оно берётся.` : 'Без единого падения — чисто!'}</p>${rewardsHtml(dd, su)}
      ${card ? `<p class="hint">На настоящем склоне открой шпаргалку «${card.title}»: главное крупно, без интернета. <button class="chip sm" id="mCard">📋 Шпаргалка</button></p>` : ''}
      <div class="row"><button class="btn ghost" id="mMenu">Меню</button><button class="btn alt" id="mShare">📤 Поделиться</button><button class="btn alt" id="mAgain">Ещё раз</button>${other ? `<button class="btn primary" id="mVar">Теперь ${other.name.toLowerCase()}</button>` : next ? `<button class="btn primary" id="mNext">Дальше: ${next.title}</button>` : ''}</div>`;
    $('mAgain').onclick = () => { show('modal', false); startRide(L.id, false); };
    if (other) $('mVar').onclick = () => { show('modal', false); app.variantOf[L.id] = other.id; startRide(L.id, true, { variant: other.id }); };
    else if (next) $('mNext').onclick = () => { show('modal', false); openBrief(next.id); };
    if (card) $('mCard').onclick = () => openCards(card.id);
    shareBtn('mShare', `Урок «${L.title}» пройден${app.falls ? '' : ' без падений'}: ${'★'.repeat(stars)}. Учусь кататься в Школе сноуборда — ещё до того, как приеду на гору.`, 'lesson=' + L.id);
  }
  $('mMenu').onclick = toMenu;
  const go = $('mGo'); if (go) go.onclick = () => { show('modal', false); startRide(L.id, false); };
}
function lessonFail(text) {
  show('modal', true);
  $('modalCard').innerHTML = `<div class="fall-k">Почти</div><h2>${app.lesson.title}</h2><div class="blk fix"><div class="h">Подсказка</div>${text}</div>
    <div class="row"><button class="btn ghost" id="mMenu">Меню</button><button class="btn alt" id="mDemo">Как делает инструктор</button><button class="btn primary" id="mRetry">Ещё раз</button></div>`;
  $('mMenu').onclick = toMenu;
  $('mRetry').onclick = () => { show('modal', false); restart(); };
  $('mDemo').onclick = () => { show('modal', false); startRide(app.lesson.id, true); };
}
// ---------------------------------------------------------------- трасса: события, падения, финиш
function toast(html, kind = '') {
  const el = $('toast');
  el.innerHTML = html; el.className = kind;
  void el.offsetWidth; // перезапуск анимации
  el.classList.add('go');
}
function trackEvents() {
  const ls = app.ls;
  for (const e of ls.events) {
    if (e.type === 'star') {
      ls.combo = e.i === ls.lastStar + 1 ? ls.combo + 1 : 0; ls.lastStar = e.i;
      world.collectStar(e.i, performance.now() / 1000);
      sfx.star(ls.combo); vibe(12);
      toast(ls.combo >= 2 ? `★ серия ×${ls.combo + 1}` : '+★');
    } else if (e.type === 'gate') {
      sfx.gate(e.ok);
      if (!e.ok) { toast(`Ворота мимо · +${GATE_PENALTY} с`, 'bad'); vibe(40); }
    } else if (e.type === 'finish') sfx.finish();
  }
  ls.events.length = 0;
}
// Упал — встаём на том же месте, без разбора: на трассе важен ритм. Разбор — в итогах заезда.
function trackRespawn() {
  const ls = app.ls, T = app.lesson.track, f = sim.fallen;
  ls.falls++; ls.fallTypes.push(f.type); ls.combo = 0;
  if (!app.demo) countFall(f.type);
  const u = clamp(f.type === 'out' ? T.line(sim.s) : sim.u, -17, 17);
  sim.reset({ slopeDeg: T.slopeDeg, stance: stance(), u, s: sim.s, theta: 0, speed: 0.5 });
  prevSnap = null; ctl.edge = 0; app.fallShown = false;
  toast(`${(FALLS[f.type] || FALLS.out).title} · встаём`, 'bad');
}
// Падение → урок, где отрабатывается то, что подвело
const FALL_LESSON = { catch_toe: 'heel_slip', overlean_heel: 'heel_slip', catch_heel: 'toe_slip', tip_toe: 'toe_slip', tip_heel: 'toe_slip', overlean_toe: 'toe_slip', back_seat: 'turns', out: 'turns' };

function trackDone() {
  const L = app.lesson, T = L.track, ls = app.ls;
  const done = tasksDone(T, ls), n = L.nStars;
  const stats = `<div class="tstats"><span>★ <b>${ls.stars.size}/${n}</b></span><span>падений <b>${ls.falls}</b></span>${T.gates ? `<span>ворота <b>${ls.gatesOk}/${ls.gatesOk + ls.missed}</b></span>` : ''}<span>макс. <b>${(ls.vmax * 3.6).toFixed(0)}</b> км/ч</span></div>`;
  show('modal', true);
  if (app.demo) {
    $('modalCard').innerHTML = `<div class="ok-k">Инструктор на финише</div><h2>${L.title}</h2><div class="ttime">${fmtTime(ls.total)}</div>${stats}
      <p>Смотри не на скорость, а на ритм: поворот начинается до звезды, взгляд — на следующую. Твоя очередь.</p>
      <div class="row"><button class="btn ghost" id="mMenu">Меню</button><button class="btn alt" id="mAgain">Посмотреть ещё раз</button>${isOpen(T) ? '<button class="btn primary" id="mGo">Поехали сам</button>' : ''}</div>`;
    $('mMenu').onclick = toMenu;
    $('mAgain').onclick = () => { show('modal', false); startRide(L.id, true); };
    if ($('mGo')) $('mGo').onclick = () => { show('modal', false); startRide(L.id, false); };
    return;
  }
  const before = starsTotal();
  const rec = save.tracks[T.id] || (save.tracks[T.id] = { tasks: [false, false, false], best: null, bestStars: 0, runs: 0 });
  const fresh = done.map((d, i) => d && !rec.tasks[i]);
  rec.tasks = rec.tasks.map((d, i) => d || done[i]);
  const prev = rec.best, record = prev == null || ls.total < prev;
  if (record) { rec.best = ls.total; saveGhost(T.id, ls.rec); }
  rec.bestStars = Math.max(rec.bestStars, ls.stars.size); rec.runs++;
  const dd = dailyCheck('track', T.id, save.daily?.task === 'clean' ? ls.falls === 0 : ls.stars.size === n), su = touchStreak();
  persist();
  const after = starsTotal(), nr = nextRank(after);
  const unlocked = TRACKS.filter((t) => t.need > before && t.need <= after);
  const next = TRACKS.slice(TRACKS.indexOf(T) + 1).find((t) => after >= t.need);
  const locked = TRACKS.find((t) => after < t.need);
  const cmp = prev == null ? 'Первый заезд — теперь это твой рекорд. На следующем заезде рядом поедет призрак этого заезда.'
    : record ? `Новый рекорд: быстрее на <b>${(prev - ls.total).toFixed(1)} с</b>. Призрак обновлён.`
    : ls.total - prev < 0.05 ? `Ровно как рекорд ${fmtTime(prev)}. Ещё чуть-чуть!` : `Рекорд ${fmtTime(prev)} — не хватило <b>${(ls.total - prev).toFixed(1)} с</b>.`;
  const pen = ls.missed ? `<div class="hint">чистое время ${fmtTime(ls.time)} + ${ls.missed} ворот × ${GATE_PENALTY} с</div>` : '';
  // разбор: что помешало и что потренировать
  const advice = [];
  if (ls.falls) {
    const top = Object.entries(ls.fallTypes.reduce((a, t) => ((a[t] = (a[t] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0][0];
    const les = LESSONS_BY_ID[FALL_LESSON[top]];
    advice.push(`<div class="blk why"><div class="h">Что мешает</div>${(FALLS[top] || FALLS.out).title}${ls.falls > 1 ? ` (падений: ${ls.falls})` : ''}. ${(FALLS[top] || FALLS.out).fix}</div>`);
    if (les) advice.push(`<button class="btn sm alt" id="mLesson" data-id="${les.id}">Потренировать: ${les.title}</button>`);
  }
  if (!done[1]) advice.push(`<div class="blk drill"><div class="h">Звёзды</div>Пропущено ${n - ls.stars.size}. ${T.tip}</div>`);
  else if (!done[2]) advice.push(`<div class="blk drill"><div class="h">Время</div>Звёзды собраны — теперь скорость. Меньше юза: доводи дугу на канте, а не боком.</div>`);
  $('modalCard').innerHTML = `<div class="ok-k">${record && prev != null ? 'Новый рекорд!' : 'Финиш'}</div><h2>${L.title}</h2>
    <div class="ttime">${fmtTime(ls.total)}</div>${pen}<p class="cmp">${cmp}</p>${stats}
    ${taskList(T, rec.tasks, fresh)}
    <div class="rankline">Всего <b>★ ${after}</b> · звание <b>${rankOf(after)}</b>${nr ? ` · до «${nr[1]}» ещё ${nr[0] - after}★` : ''}</div>
    ${rewardsHtml(dd, su)}
    ${unlocked.map((t) => `<div class="unlock">🔓 Открыта трасса: <b>${t.level} · ${t.name}</b></div>`).join('')}
    ${!next && locked ? `<div class="hint">Следующая трасса «${locked.name}» откроется на ${locked.need}★.</div>` : ''}
    ${advice.join('')}
    <div class="row"><button class="btn ghost" id="mMenu">Меню</button><button class="btn alt" id="mShare">📤 Вызов другу</button><button class="btn alt" id="mDemo">Как проехать</button><button class="btn ${next && done.every(Boolean) ? 'alt' : 'primary'}" id="mAgain">Ещё раз</button>${next ? `<button class="btn ${done.every(Boolean) ? 'primary' : 'alt'}" id="mNext">Дальше: ${next.name}</button>` : ''}</div>`;
  $('mMenu').onclick = toMenu;
  $('mDemo').onclick = () => { show('modal', false); startRide(L.id, true); };
  $('mAgain').onclick = () => { show('modal', false); startRide(L.id, false); };
  if (next) $('mNext').onclick = () => { show('modal', false); openBrief('track:' + next.id); };
  const ml = $('mLesson'); if (ml) ml.onclick = () => openBrief(ml.dataset.id);
  shareBtn('mShare', `Моё время на трассе «${T.name}» (${T.level.toLowerCase()}) в Школе сноуборда — ${fmtTime(ls.total)}, звёзд ${ls.stars.size} из ${n}. Побьёшь?`, 'track=' + T.id);
}

function nextLesson(id) {
  const i = COURSE.indexOf(id);
  return i >= 0 && i < COURSE.length - 1 ? LESSONS_BY_ID[COURSE[i + 1]] : null;
}

// ---------------------------------------------------------------- студия
function studioSet(list) {
  for (const r of studio.riders) { studio.scene.remove(r.rider.root); (r.extra || []).forEach((o) => studio.scene.remove(o)); }
  studio.riders = list.map((o) => {
    const r = new Rider(o.ghost ? { ghost: true } : { palette: o.palette || {} });
    r.setConfig({ stance: stance(), front: save.front, rear: save.rear, width: save.width / 100 });
    studio.scene.add(r.root);
    return { rider: r, ...o };
  });
  $('studioLabels').innerHTML = studio.riders.map((r, i) => r.label ? `<div class="lbl ${r.labelKind}" id="lbl${i}">${r.label}</div>` : '').join('');
}
function studioPose(r, pose, offset) {
  const ts = toeSign();
  const edge = pose.edge || 0;
  r.rider.placeOnSlope(offset, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), edge * ts * D);
  r.rider.root.updateMatrixWorld(true);
  r.rider.update({ ...pose, t: performance.now() / 1000, up: r.rider.worldUpLocal(), fall: pose.fall || null, crouch: 0 });
}
const VIEWS = { side: { yaw: 0, pitch: 0.12 }, front: { yaw: Math.PI / 2, pitch: 0.15 }, behind: { yaw: -Math.PI / 2, pitch: 0.15 }, top: { yaw: Math.PI / 2, pitch: 1.2 } };
const VIEW_NAMES = { side: 'Профиль', front: 'Спереди', behind: 'Сзади', top: 'Сверху' };
function setView(v) {
  const o = VIEWS[v]; studio.orbit.yaw = o.yaw; studio.orbit.pitch = o.pitch;
  // «спереди» — со стороны носков; для goofy носки с другой стороны
  if (v === 'front' || v === 'behind' || v === 'top') studio.orbit.yaw = o.yaw * toeSign();
  document.querySelectorAll('#studioViews .btn').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
}
function studioViews(list = ['side', 'front', 'behind', 'top']) {
  $('studioViews').innerHTML = list.map((v) => `<button class="btn sm" data-v="${v}">${VIEW_NAMES[v]}</button>`).join('') + '<button class="btn sm" id="sMenu">Меню</button>';
  $('studioViews').querySelectorAll('[data-v]').forEach((b) => b.onclick = () => setView(b.dataset.v));
  $('sMenu').onclick = toMenu;
}
// вращение мышью/пальцем: в студии — вокруг пары райдеров, на склоне — «своя» камера вокруг райдера
(() => {
  let drag = null;
  const pts = new Map(); let pinch = null;
  const rideCam = () => app.mode === 'ride' && !app.replay && $('modal').classList.contains('hidden');
  canvas.addEventListener('pointerdown', (e) => {
    if (app.mode === 'studio') drag = { x: e.clientX, y: e.clientY };
    else if (rideCam()) {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false };
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: rig.user.dist }; drag = null; }
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (app.mode === 'studio') {
      if (!drag) return;
      studio.orbit.yaw -= (e.clientX - drag.x) * 0.008; studio.orbit.pitch = clamp(studio.orbit.pitch + (e.clientY - drag.y) * 0.006, -0.1, 1.45);
      drag = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      if (rig.mode !== 'user') userCam();
      rig.user.dist = clamp(pinch.dist * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 2.2, 16);
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return; // короткое касание — не поворот камеры
    if (!drag.moved) { drag.moved = true; if (rig.mode !== 'user') userCam(); }
    rig.user.yaw -= dx * 0.008; rig.user.pitch = clamp(rig.user.pitch + dy * 0.006, -0.05, 1.45);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) drag = null; if (app.mode === 'studio') drag = null; };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    if (app.mode === 'studio') studio.orbit.dist = clamp(studio.orbit.dist * (1 + Math.sign(e.deltaY) * 0.08), 2, 12);
    else if (rideCam()) { if (rig.mode !== 'user') userCam(); rig.user.dist = clamp(rig.user.dist * (1 + Math.sign(e.deltaY) * 0.08), 2.2, 16); }
  }, { passive: true });
})();
// игрок взял камеру в руки: автосмена ракурсов в демонстрации выключается; кнопка «Камера» вернёт обычные
function userCam() {
  app.camManual = true; rig.toUser(); setCam('user');
  if (!app.userCamHinted) { app.userCamHinted = true; toast('Своя камера · кнопка «Камера» вернёт обычную', 'info long'); }
}

function updateStudio() {
  const o = studio.orbit;
  const c = studio.cam;
  // на телефоне кадр узкий: пара «неправильно / правильно» должна влезть целиком вместе с подписями
  const dist = o.dist * (innerWidth <= 720 ? (studio.riders.length > 1 && !studio.riders[1].ghost ? 2.2 : 1.6) : 1);
  c.position.set(o.target.x + Math.cos(o.yaw) * Math.cos(o.pitch) * dist, o.target.y + Math.sin(o.pitch) * dist, o.target.z + Math.sin(o.yaw) * Math.cos(o.pitch) * dist);
  c.lookAt(o.target);
  // сдвигаем картинку в свободную от панели часть экрана
  const W = innerWidth, H = innerHeight, mobile = W <= 720;
  const dx = mobile ? 0 : Math.min(W * 0.33, 424) / 2, dy = mobile ? H * 0.26 : 0;
  c.setViewOffset(W, H, -dx, dy, W, H);
  if (app.studioMode && app.studioMode.update) app.studioMode.update();
  studio.riders.forEach((r, i) => {
    const el = $('lbl' + i); if (!el) return;
    const p = (r.labelPos ? r.labelPos() : r.rider.root.position.clone().add(new THREE.Vector3(0, 2.05, 0))).project(c);
    el.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - p.y) / 2 * innerHeight) + 'px'; // project() уже учитывает сдвиг
  });
}

// --- Стойка: regular / goofy
function openStance() {
  setScreen('studio');
  studioSet([{}]);
  studioViews(['front', 'top']);
  setView('front'); studio.orbit.dist = 4.6;
  const answers = [];
  const P = $('studioPanel');
  const draw = () => {
    const L = LESSONS_BY_ID.stance;
    if (answers.length < STANCE_QUIZ.length) {
      const q = STANCE_QUIZ[answers.length];
      P.innerHTML = `<h2>${L.title}</h2>${L.theory.map((p) => `<p>${p}</p>`).join('')}<div class="quiz-q"><b>Вопрос ${answers.length + 1} из ${STANCE_QUIZ.length}.</b> ${q.q}</div>
        <div class="quiz-a">${q.a.map(([t, v]) => `<button class="btn" data-v="${v}">${t}</button>`).join('')}<button class="btn ghost" data-v="skip">Не знаю</button></div>`;
      P.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { answers.push(b.dataset.v); draw(); });
    } else {
      const r = answers.filter((a) => a === 'regular').length, g = answers.filter((a) => a === 'goofy').length;
      const rec = g > r ? 'goofy' : 'regular';
      if (!save.stance) { save.stance = rec; persist(); studioSet([{}]); setView('front'); }
      P.innerHTML = `<h2>Твоя стойка: ${rec === 'regular' ? 'Regular' : 'Goofy'}</h2>
        <p>${rec === 'regular' ? 'Левая нога впереди, правая сзади.' : 'Правая нога впереди, левая сзади.'} ${r && g ? 'Ответы разошлись — это нормально. Попробуй на склоне обе стойки и оставь ту, где спокойнее.' : 'Все ответы указали в одну сторону.'}</p>
        <p class="hint">Справа — ты в этой стойке. Покрути камеру мышью. Нос доски — со стороны передней ноги.</p>
        <div class="row" style="justify-content:flex-start"><button class="btn ${stance() === 'regular' ? 'on' : ''}" id="sReg">Regular</button><button class="btn ${stance() === 'goofy' ? 'on' : ''}" id="sGoof">Goofy</button></div>
        <div class="row"><button class="btn ghost" id="sBack">Меню</button><button class="btn primary" id="sNext">Дальше: крепления</button></div>`;
      const setS = (s) => { save.stance = s; persist(); studioSet([{}]); setView('front'); draw(); };
      $('sReg').onclick = () => setS('regular'); $('sGoof').onclick = () => setS('goofy');
      $('sBack').onclick = toMenu;
      $('sNext').onclick = () => { save.done.stance = 3; persist(); openBindings(); };
    }
  };
  draw();
  app.studioMode = { update: () => studioPose(studio.riders[0], GOOD_POSTURE, new THREE.Vector3(0, 0, 0)) };
}

// --- Крепления
function openBindings() {
  setScreen('studio');
  if (!save.stance) save.stance = 'regular';
  studioSet([{}]);
  studioViews(['top', 'front', 'side']);
  setView('top'); studio.orbit.dist = 4.2;
  const L = LESSONS_BY_ID.bindings;
  const P = $('studioPanel');
  let bad = false;
  // перерисовываем только то, что меняется, — иначе ползунок теряется посреди перетаскивания
  const refresh = () => {
    const ev = evaluateBindings(save);
    bad = ev.some(([k]) => k === 'bad');
    $('topv').innerHTML = topView();
    $('bverd').innerHTML = ev.map(([k, t]) => `<div class="verdict ${k}">${t}</div>`).join('');
    for (const k of ['front', 'rear', 'width', 'height']) {
      $('v_' + k).textContent = sliderVal(save[k], k === 'width' || k === 'height' ? ' см' : '°');
      P.querySelector(`input[data-k=${k}]`).value = save[k];
    }
    const btn = $('bSave'); btn.disabled = bad; btn.textContent = bad ? 'Исправь красные пункты' : 'Готово: к базовой стойке';
    studio.riders[0].rider.setConfig({ front: save.front, rear: save.rear, width: save.width / 100 });
  };
  P.innerHTML = `<h2>${L.title}</h2>${L.theory.map((p) => `<p>${p}</p>`).join('')}
    <div id="topv"></div>
    <div class="presets">${BINDING_PRESETS.map((p) => `<button class="btn" data-p="${p.id}">${p.name}</button>`).join('')}</div>
    <div id="presetNote" class="hint"></div>
    ${slider('front', 'Передняя нога', save.front, -15, 30, 1, '°')}
    ${slider('rear', 'Задняя нога', save.rear, -30, 30, 1, '°')}
    ${slider('width', 'Ширина стойки', save.width, 40, 66, 1, ' см')}
    ${slider('height', 'Твой рост', save.height, 140, 205, 1, ' см')}
    <div id="bverd"></div>
    <div class="tips"><div class="h">Мастер-класс</div><ul>${L.tips.map((t) => `<li>${t}</li>`).join('')}</ul></div>
    <div class="row"><button class="btn ghost" id="bBack">Меню</button><button class="btn primary" id="bSave"></button></div>`;
  P.querySelectorAll('input[type=range]').forEach((inp) => inp.oninput = () => { save[inp.dataset.k] = +inp.value; persist(); refresh(); });
  P.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => {
    const p = BINDING_PRESETS.find((x) => x.id === b.dataset.p);
    save.front = p.front; save.rear = p.rear; persist(); refresh();
    $('presetNote').innerHTML = `<b>${p.name}:</b> ${p.note}`;
  });
  $('bBack').onclick = toMenu;
  $('bSave').onclick = () => { if (bad) return; save.done.bindings = 3; persist(); openPosture(); };
  refresh();
  app.studioMode = { update: () => studioPose(studio.riders[0], GOOD_POSTURE, new THREE.Vector3(0, 0, 0)) };
}
const sliderVal = (v, unit) => `${v > 0 && unit === '°' ? '+' : ''}${v}${unit}`;
function slider(k, name, v, min, max, step, unit, ends) {
  return `<div class="slider"><div class="top"><span>${name}</span><span id="v_${k}">${sliderVal(v, unit)}</span></div>
    <input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}">${ends ? `<div class="ends"><span>${ends[0]}</span><span>${ends[1]}</span></div>` : ''}</div>`;
}
// Вид сверху: доска, крепления, углы. Нос доски — слева для regular, справа для goofy.
function topView() {
  const ts = toeSign();
  const W = 360, H = 150, cx = W / 2, cy = H / 2, sc = 190; // px на метр
  const noseX = -ts; // regular: нос слева на рисунке, если смотреть сверху, носки вниз
  const foot = (x, ang, lab) => {
    const a = ang * D * noseX * -1;
    return `<g transform="translate(${cx + x * sc} ${cy}) rotate(${(-ang * noseX).toFixed(1)})">
      <rect x="-15" y="-30" width="30" height="60" rx="8" fill="#334155"/><rect x="-11" y="-6" width="22" height="34" rx="5" fill="#64748b"/>
      <line x1="0" y1="-38" x2="0" y2="40" stroke="#f97316" stroke-width="2"/></g>
      <line x1="${cx + x * sc}" y1="${cy - 46}" x2="${cx + x * sc}" y2="${cy + 46}" stroke="#94a3b8" stroke-dasharray="3 3"/>
      <text x="${cx + x * sc}" y="${cy + 66}" text-anchor="middle" font-size="13" fill="#0f172a" font-weight="700">${lab} ${fmtA(ang)}</text>`;
  };
  const half = save.width / 200;
  return `<svg class="topview" viewBox="0 0 ${W} ${H + 30}">
    <rect x="${cx - 0.775 * sc}" y="${cy - 24}" width="${1.55 * sc}" height="48" rx="24" fill="#1f6feb"/>
    <text x="${noseX < 0 ? 14 : W - 14}" y="${cy + 4}" font-size="12" fill="#0f172a" text-anchor="${noseX < 0 ? 'start' : 'end'}">нос</text>
    <text x="${cx}" y="14" font-size="11" fill="#475569" text-anchor="middle">пятки ↑ · носки ↓ · вид сверху</text>
    ${foot(noseX * half, save.front, 'перед')}${foot(-noseX * half, save.rear, 'зад')}
    <text x="${cx}" y="${H + 24}" font-size="12" fill="#0f172a" text-anchor="middle">ширина ${save.width} см</text></svg>`;
}

// --- Базовая стойка
function openPosture() {
  setScreen('studio');
  const L = LESSONS_BY_ID.posture;
  const pose = Object.fromEntries(POSTURE_PARTS.map((p) => [p.key, p.def]));
  let ghost = true;
  studioSet([{}, { ghost: true }]);
  studio.riders[0].rider.com.visible = true; // ползунок веса двигает шар центра тяжести
  studioViews(['side', 'front', 'behind']);
  setView('side'); studio.orbit.dist = 4.2;
  const P = $('studioPanel');
  let allOk = false;
  const refresh = () => {
    const ev = evaluatePosture(pose);
    allOk = Object.values(ev).every(([k]) => k === 'ok');
    for (const p of POSTURE_PARTS) {
      const el = $('pv_' + p.key); el.className = 'verdict ' + ev[p.key][0]; el.textContent = ev[p.key][1];
      $('v_' + p.key).textContent = pose[p.key].toFixed(2);
    }
    const btn = $('pNext'); btn.disabled = !allOk; btn.textContent = allOk ? 'Отлично! Дальше: снаряжение' : 'Исправь все пункты';
    $('pGhost').classList.toggle('on', ghost);
  };
  P.innerHTML = `<h2>${L.title}</h2>${L.theory.map((p) => `<p>${p}</p>`).join('')}
    <p class="hint">Сейчас у райдера все ошибки сразу. Двигай ползунки, пока все пункты не станут зелёными. Зелёный силуэт — правильная поза.</p>
    ${POSTURE_PARTS.map((p) => slider(p.key, p.name, pose[p.key], p.min, p.max, 0.01, '', [p.left, p.right]) + `<div class="verdict" id="pv_${p.key}"></div>`).join('')}
    <div class="row" style="justify-content:flex-start"><button class="btn sm" id="pGhost">Силуэт правильной позы</button></div>
    <div class="tips"><div class="h">Мастер-класс</div><ul>${L.tips.map((t) => `<li>${t}</li>`).join('')}</ul></div>
    <div class="row"><button class="btn ghost" id="pBack">Меню</button><button class="btn primary" id="pNext"></button></div>`;
  P.querySelectorAll('input[type=range]').forEach((inp) => inp.oninput = () => { pose[inp.dataset.k] = +inp.value; refresh(); });
  $('pGhost').onclick = () => { ghost = !ghost; refresh(); };
  $('pBack').onclick = toMenu;
  $('pNext').onclick = () => { if (!allOk) return; save.done.posture = 3; persist(); openGear(); };
  refresh();
  app.studioMode = { update: () => {
    studioPose(studio.riders[0], pose, new THREE.Vector3(0, 0, 0));
    studio.riders[1].rider.root.visible = ghost;
    studioPose(studio.riders[1], GOOD_POSTURE, new THREE.Vector3(0, 0, 0));
  } };
}

// --- Библиотека ошибок
// back — куда вернуться (из разбора падения — к уроку), иначе в меню
function openMistakes(id = MISTAKES[0].id, back = null) {
  setScreen('studio');
  const m = MISTAKES.find((x) => x.id === id);
  mistakePair(m);
  $('studioPanel').innerHTML = `${back ? '<button class="btn sm alt" id="mkBack">← Вернуться к уроку</button>' : ''}<h2>${m.title}</h2><div class="hint">${m.tag}</div>
    <div class="blk"><div class="h">Как это выглядит</div>${m.symptom}</div>
    <div class="blk why"><div class="h">Почему так происходит</div>${m.why}</div>
    <div class="blk fix"><div class="h">Как исправить</div>${m.fix}</div>
    <div class="blk drill"><div class="h">Упражнение</div>${m.drill}</div>
    <div class="group-title">Все ошибки</div>
    <div class="mlist">${MISTAKES.map((x) => `<button class="mitem ${x.id === id ? 'on' : ''}" data-m="${x.id}">${x.title}<small>${x.tag}</small></button>`).join('')}</div>`;
  $('studioPanel').querySelectorAll('[data-m]').forEach((b) => b.onclick = () => openMistakes(b.dataset.m, back));
  if (back) $('mkBack').onclick = back;
  $('studioPanel').scrollTop = 0;
}
// Два райдера «неправильно / правильно» в ракурсе, где ошибку видно лучше всего
function mistakePair(m, labels = ['НЕПРАВИЛЬНО', 'ПРАВИЛЬНО']) {
  const sideBySide = m.view === 'side';
  studioSet([{ label: '✗ ' + labels[0], labelKind: 'bad', palette: { jacket: '#ef4444' } }, { label: '✓ ' + labels[1], labelKind: 'good', palette: { jacket: '#22c55e' } }]);
  studio.riders.forEach((r) => { r.rider.com.visible = true; }); // шар центра тяжести, как в демонстрациях: видно, куда ушёл вес
  studioViews(['side', 'front', 'behind', 'top']);
  setView(m.view); studio.orbit.dist = 6.2;
  const off = sideBySide ? [new THREE.Vector3(0, 0, 1.0), new THREE.Vector3(0, 0, -1.0)] : [new THREE.Vector3(-1.05, 0, 0), new THREE.Vector3(1.05, 0, 0)];
  if (!sideBySide && toeSign() < 0 && m.view !== 'top') off.reverse();
  app.studioMode = { update: () => { studioPose(studio.riders[0], m.wrong, off[0]); studioPose(studio.riders[1], m.right, off[1]); } };
}


// --- Лекции «Голова»: текст слева, справа — сравнение в 3D (падения, вес, взгляд)
const LECT_PAIRS = { fear_speed: ['back_seat', 'СТРАХ: ВЕС НАЗАД', 'ВЕС ВПЕРЁД'], look_breath: ['look_down', 'ВЗГЛЯД ПОД НОГИ', 'ВЗГЛЯД ВПЕРЁД'] };
function openLecture(id) {
  const X = LECTURES_BY_ID[id];
  setScreen('studio');
  const P = $('studioPanel');
  P.innerHTML = `<div class="lect-k">Голова · лекция</div><h2>${X.title}</h2>
    <div class="blk"><div class="h">Что чувствуешь</div>${X.feel}</div>
    <div class="blk why"><div class="h">Почему так</div>${X.why.map((p) => `<p>${p}</p>`).join('')}</div>
    <div class="blk fix"><div class="h">Что делать</div><ul>${X.todo.map((t) => `<li>${t}</li>`).join('')}</ul></div>
    <div class="blk drill"><div class="h">Упражнение</div>${X.drill}</div>
    <div class="row" style="justify-content:flex-start">${X.links.map((l) => `<button class="btn sm alt" data-l="${l}">Урок: ${LESSONS_BY_ID[l].title}</button>`).join('')}</div>
    <div class="group-title">Все лекции</div>
    <div class="mlist">${LECTURES.map((x) => `<button class="mitem ${x.id === id ? 'on' : ''}" data-x="${x.id}">${x.title}<small>${x.short}</small></button>`).join('')}</div>`;
  P.querySelectorAll('[data-l]').forEach((b) => b.onclick = () => openBrief(b.dataset.l));
  P.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => openLecture(b.dataset.x));
  P.scrollTop = 0;
  if (X.studio === 'falls') return fallsStudio();
  if (X.studio === 'warmup') return warmupStudio();
  const pair = LECT_PAIRS[id];
  if (pair) mistakePair(MISTAKES.find((x) => x.id === pair[0]), pair.slice(1));
  else {
    studioSet([{}]);
    studioViews(['side', 'front', 'behind']);
    setView('front'); studio.orbit.dist = 4.6;
    app.studioMode = { update: () => studioPose(studio.riders[0], GOOD_POSTURE, new THREE.Vector3(0, 0, 0)) };
  }
}
// Падение по кругу: вперёд, потом назад. Слева — на прямые руки, справа — правильно.
function fallsStudio() {
  studioSet([{ label: '✗', labelKind: 'bad', palette: { jacket: '#ef4444' } }, { label: '✓', labelKind: 'good', palette: { jacket: '#22c55e' } }]);
  studioViews(['side', 'front', 'behind']);
  setView('side'); studio.orbit.dist = 6.4;
  const off = [new THREE.Vector3(0, 0, 1.1), new THREE.Vector3(0, 0, -1.1)];
  const CYC = 3.6, TXT = { 1: ['✗ НА ПРЯМЫЕ РУКИ', '✓ НА ПРЕДПЛЕЧЬЯ'], [-1]: ['✗ НА ЛАДОНИ', '✓ ПОДБОРОДОК К ГРУДИ'] };
  let shown = 0;
  app.studioMode = { update: () => {
    const now = performance.now() / 1000, c = Math.floor(now / CYC), ph = now - c * CYC, side = c % 2 ? -1 : 1;
    const k = ph < 0.8 ? 0 : (ph - 0.8) / 0.55;
    if (shown !== side) { shown = side; TXT[side].forEach((t, i) => { const el = $('lbl' + i); if (el) el.textContent = t; }); }
    studioPose(studio.riders[0], { ...GOOD_POSTURE, fall: k > 0 ? { side, k, hands: true } : null }, off[0]);
    studioPose(studio.riders[1], { ...GOOD_POSTURE, fall: k > 0 ? { side, k } : null }, off[1]);
  } };
}

// Разминка на доске: перекат пятки → плоско → носки и пружинка коленями, по кругу
function warmupStudio() {
  studioSet([{ label: 'ПЛОСКО', labelKind: 'good' }]);
  studioViews(['front', 'side', 'behind']);
  setView('front'); studio.orbit.dist = 4.4;
  const CYC = 6, NAMES = ['ПЛОСКО', 'НА ПЯТКАХ', 'ПЛОСКО', 'НА НОСКАХ'];
  let shown = '';
  app.studioMode = { update: () => {
    const now = performance.now() / 1000, ph = (now % CYC) / CYC, w = Math.sin(ph * Math.PI * 2);
    const edge = Math.abs(w) < 0.25 ? 0 : (w > 0 ? -1 : 1) * 14 * smoothstep((Math.abs(w) - 0.25) / 0.5);
    const name = Math.abs(w) < 0.25 ? NAMES[0] : w > 0 ? NAMES[1] : NAMES[3];
    if (name !== shown) { shown = name; const el = $('lbl0'); if (el) el.textContent = name; }
    studioPose(studio.riders[0], { ...GOOD_POSTURE, edge, knee: 0.45 + 0.15 * Math.sin(now * 2.6) ** 2 }, new THREE.Vector3(0, 0, 0));
  } };
}
const smoothstep = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

// --- Снаряжение и прокат: рост, вес, ботинок, уровень → длина доски, жёсткость, прогиб, ширина
function openGear() {
  setScreen('studio');
  const L = LESSONS_BY_ID.gear;
  studioSet([{ label: 'доска', labelKind: 'good' }]);
  studioViews(['front', 'side', 'top']);
  setView('front'); studio.orbit.dist = 4.6;
  const P = $('studioPanel');
  let rec = recommendBoard(save);
  // рядом с райдером — такая же доска стоймя, как в прокате: видно, до подбородка она или выше
  const R = studio.riders[0], stand = R.rider.board.clone();
  stand.rotation.set(0, Math.PI / 2 * toeSign(), Math.PI / 2); // топшитом к камере «спереди» (со стороны носков)
  stand.rotateY(Math.PI); // и надписью вверх, чтобы читалась
  studio.scene.add(stand); R.extra = [stand];
  R.labelPos = () => stand.position.clone().add(new THREE.Vector3(0, stand.scale.x * 0.8, 0));
  const refresh = () => {
    rec = recommendBoard(save);
    $('grec').innerHTML = rec.items.map(([k, t]) => `<div class="verdict ${k}">${t}</div>`).join('');
    for (const k of ['height', 'weight', 'boot']) { $('v_' + k).textContent = sliderVal(save[k], k === 'weight' ? ' кг' : k === 'boot' ? ' EU' : ' см'); P.querySelector(`input[data-k=${k}]`).value = save[k]; }
    P.querySelectorAll('[data-lv]').forEach((b) => b.classList.toggle('on', b.dataset.lv === save.level));
    const el = $('lbl0'); if (el) el.textContent = `доска ${rec.length} см`;
  };
  P.innerHTML = `<h2>${L.title}</h2>${L.theory.map((p) => `<p>${p}</p>`).join('')}
    ${slider('height', 'Рост', save.height, 140, 205, 1, ' см')}
    ${slider('weight', 'Вес', save.weight, 35, 130, 1, ' кг')}
    ${slider('boot', 'Размер ботинка', save.boot, 34, 48, 0.5, ' EU')}
    <div class="presets lv">${GEAR_LEVELS.map((v) => `<button class="btn" data-lv="${v.id}">${v.name}<small>${v.note}</small></button>`).join('')}</div>
    <div class="group-title">Твоя доска</div><div id="grec"></div>
    <div class="group-title">Остальное снаряжение</div>
    ${GEAR_TIPS.map(([h, t]) => `<div class="blk"><div class="h">${h}</div>${t}</div>`).join('')}
    <div class="tips"><div class="h">Мастер-класс</div><ul>${L.tips.map((t) => `<li>${t}</li>`).join('')}</ul></div>
    <div class="row"><button class="btn ghost" id="gBack">Меню</button><button class="btn alt" id="gCard">📋 Шпаргалка для проката</button><button class="btn primary" id="gNext">Готово: на склон</button></div>`;
  P.querySelectorAll('input[type=range]').forEach((inp) => inp.oninput = () => { save[inp.dataset.k] = +inp.value; persist(); refresh(); });
  P.querySelectorAll('[data-lv]').forEach((b) => b.onclick = () => { save.level = b.dataset.lv; persist(); refresh(); });
  $('gBack').onclick = toMenu;
  $('gCard').onclick = () => openCards('rental');
  $('gNext').onclick = () => { save.done.gear = 3; persist(); openBrief('heel_slip'); };
  refresh();
  P.scrollTop = 0;
  app.studioMode = { update: () => {
    // райдер — твоего роста (модель рассчитана на 175 см), доска — рекомендованной длины (модель — 155 см)
    const k = save.height / 175, len = rec.length / 155;
    R.rider.root.scale.setScalar(k); R.rider.board.scale.x = len / k;
    stand.scale.set(len, 1, 1); stand.position.set(-1.25 * toeSign(), len * 0.775 + 0.01, 0.15);
    studioPose(R, GOOD_POSTURE, new THREE.Vector3(0, 0, 0));
  } };
}

// Врезка «вид спереди»: камера со стороны носков, низко — видно, как приподнята доска и какой кант в снегу.
const pipCam = new THREE.PerspectiveCamera(38, 4 / 3, 0.1, 500);
function renderPip() {
  const el = $('pip'); const r = el.getBoundingClientRect();
  if (!r.width) return;
  const { pos, toeDir } = app.pipTarget;
  const up = new THREE.Vector3(0, 1, 0);
  pipCam.position.copy(pos).addScaledVector(toeDir, 3.4).addScaledVector(up, 0.55);
  pipCam.lookAt(pos.clone().addScaledVector(up, 0.55));
  pipCam.aspect = r.width / r.height; pipCam.updateProjectionMatrix();
  const y = innerHeight - r.bottom;
  renderer.setScissorTest(true);
  renderer.setScissor(r.left, y, r.width, r.height); renderer.setViewport(r.left, y, r.width, r.height);
  renderer.render(world.scene, pipCam);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, innerWidth, innerHeight);
}

// ---------------------------------------------------------------- цикл
function applyViewShift() {
  if (app.viewShift > 0.5) camera.setViewOffset(innerWidth, innerHeight, 0, app.viewShift, innerWidth, innerHeight); else camera.clearViewOffset();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (app.mode === 'studio') { updateStudio(); renderer.render(studio.scene, studio.cam); }
  else {
    if (app.lesson && !(app.mode === 'ride' && !$('modal').classList.contains('hidden') && !app.replay)) updateRide(dt);
    applyViewShift();
    renderer.render(world.scene, camera);
    if (app.mode === 'ride' && app.lesson?.pip && app.pipTarget) renderPip();
  }
  requestAnimationFrame(frame);
}
toMenu();
// Ссылка от друга: ?track=green — сразу брифинг трассы, ?lesson=leaf — урок, ?card — шпаргалка на склон (ярлык приложения)
{
  const q = new URLSearchParams(location.search), t = q.get('track'), l = q.get('lesson'), c = q.get('card');
  if (t && TRACKS.some((T) => T.id === t)) openBrief('track:' + t);
  else if (l && LESSONS_BY_ID[l]) openBrief(l);
  if (c != null) openCards(c);
}
requestAnimationFrame(frame);
window.__app = { app, sim, studio, THREE, startRide, openMistakes, openPosture, openBindings, openStance, openGear, openBrief, openLecture, openCards, openSettings, showFall, rig, updateRide, rider, world, camera, save, toMenu, renderMenu, lessonDone, trackDone };
