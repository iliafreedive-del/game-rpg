import * as THREE from 'three';
import { Sim, MAX_EDGE_DEG, wrapAngle } from './sim.js';
import { LESSONS, LESSONS_BY_ID, FALLS, WARN_TEXT, STANCE_QUIZ, BINDING_PRESETS, evaluateBindings, POSTURE_PARTS, GOOD_POSTURE, evaluatePosture } from './lessons.js';
import { MISTAKES } from './mistakes.js';
import { Rider } from './rider.js';
import { World, CameraRig, CAM_MODES, CAM_NAMES } from './world.js';

const $ = (id) => document.getElementById(id);
const D = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------------------------------------------------------------- сохранение
const SAVE_KEY = 'snowschool.v1';
const save = Object.assign({ stance: null, front: 15, rear: 0, width: 54, height: 175, done: {} }, (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })());
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* приватный режим */ } };
const stance = () => save.stance || 'regular';
const toeSign = () => (stance() === 'goofy' ? -1 : 1);

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
const sim = new Sim();

// Студия: отдельная сцена с ровной площадкой
const studio = (() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bcdcf5');
  scene.fog = new THREE.Fog('#bcdcf5', 18, 60);
  scene.add(new THREE.HemisphereLight('#eaf4ff', '#8aa0b8', 1.4));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2); sun.position.set(4, 10, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ map: world.snowTex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
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
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && app.mode === 'ride') e.preventDefault();
  if (app.mode === 'ride' && !e.repeat) {
    if (e.code === 'KeyC') cycleCam();
    if (e.code === 'KeyT') toggleSlow();
    if (e.code === 'KeyR') restart();
    if (e.code === 'Escape') toMenu();
  } else if (e.code === 'Escape' && app.mode !== 'menu') toMenu();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
const down = (...c) => c.some((k) => keys.has(k));

if ('ontouchstart' in window) $('touch').classList.remove('hidden');
document.querySelectorAll('#touch button').forEach((b) => {
  const k = b.dataset.k;
  const on = (e) => { e.preventDefault(); keys.add(k); b.classList.add('on'); };
  const off = (e) => { e.preventDefault(); keys.delete(k); b.classList.remove('on'); };
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
const app = { mode: 'menu', lesson: null, ls: null, demo: false, t: 0, slow: 1, falls: 0, fallShown: false, history: [], replay: null, ended: false, hudT: 0, studioMode: null, travel: new THREE.Vector3(0, 0, -1) };

function show(id, on) { $(id).classList.toggle('hidden', !on); }
function setScreen(mode) {
  app.mode = mode;
  show('menu', mode === 'menu');
  show('brief', mode === 'brief');
  show('hud', mode === 'ride');
  show('studio', mode === 'studio');
  rider.com.visible = mode === 'ride';
  if (mode !== 'ride') show('modal', false);
}

// ---------------------------------------------------------------- меню
const GROUPS = [
  ['Основы', ['stance', 'bindings', 'posture']],
  ['На склоне', ['heel_slip', 'toe_slip', 'leaf', 'turns']],
  ['Мастер-класс', ['carve']],
  ['Свободно', ['free', 'mistakes']],
];
function renderMenu() {
  $('stanceChip').textContent = `Стойка: ${save.stance ? (stance() === 'regular' ? 'Regular (левая вперёд)' : 'Goofy (правая вперёд)') : 'не выбрана'} · ${fmtA(save.front)} / ${fmtA(save.rear)}`;
  let n = 0;
  $('lessonList').innerHTML = GROUPS.map(([g, ids]) => `<div class="group-title">${g}</div><div class="grid">${ids.map((id) => {
    if (id === 'mistakes') return `<button class="lesson special" data-id="mistakes"><div class="n">Разбор</div><div class="t">Библиотека ошибок</div><div class="s">${MISTAKES.length} типичных ошибок: «неправильно / правильно» в 3D</div></button>`;
    const L = LESSONS_BY_ID[id]; n++;
    const st = save.done[id] ? '★'.repeat(save.done[id]) : '';
    return `<button class="lesson" data-id="${id}"><div class="n">${id === 'free' ? '∞' : 'Урок ' + n}</div><div class="t">${L.title}</div><div class="s">${L.short}</div><div class="st">${st}</div></button>`;
  }).join('')}</div>`).join('');
  $('lessonList').querySelectorAll('.lesson').forEach((b) => b.onclick = () => (b.dataset.id === 'mistakes' ? openMistakes() : openBrief(b.dataset.id)));
}
const fmtA = (a) => (a > 0 ? '+' : '') + a + '°';
$('stanceChip').onclick = () => openBrief('stance');

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
  const toeKey = ts > 0 ? 'D' : 'A', heelKey = ts > 0 ? 'A' : 'D';
  const items = [[`<kbd>${heelKey}</kbd>`, 'на пятки (пяточный кант)'], [`<kbd>${toeKey}</kbd>`, 'на носки (носочный кант)']];
  if (kind === 'pheel' || kind === 'ptoe') items.push(['<kbd>W</kbd>/<kbd>S</kbd>', 'вес — держи доску поперёк']);
  else items.push(['<kbd>W</kbd>/<kbd>S</kbd>', 'вес на переднюю / заднюю ногу']);
  if (kind === 'turn' || kind === 'carve') items.push(['<kbd>Q</kbd>/<kbd>E</kbd>', 'повернуть плечи']);
  items.push(['<kbd>Пробел</kbd>', 'присесть'], ['<kbd>Shift</kbd>', 'выпрямить ноги (ошибка)'], ['<kbd>C</kbd> <kbd>T</kbd> <kbd>R</kbd>', 'камера, замедление, заново']);
  return items;
}

function openBrief(id) {
  const L = LESSONS_BY_ID[id];
  if (L.kind === 'stance') return openStance();
  if (L.kind === 'bindings') return openBindings();
  if (L.kind === 'posture') return openPosture();
  setScreen('brief');
  const idx = LESSONS.filter((l) => l.id !== 'free').indexOf(L) + 1;
  $('briefNum').textContent = id === 'free' ? '∞' : idx;
  $('briefTitle').textContent = L.title;
  $('briefTheory').innerHTML = L.theory.map((p) => `<p>${p}</p>`).join('');
  $('briefTips').innerHTML = L.tips ? `<div class="h">Мастер-класс: фишки инструктора</div><ul>${L.tips.map((t) => `<li>${t}</li>`).join('')}</ul>` : '';
  $('briefGoal').innerHTML = `<b>Задание:</b> ${L.goal}`;
  $('briefKeys').innerHTML = keyLegend(L.keys).map(([k, t]) => `<span>${k} ${t}</span>`).join('');
  $('briefDemo').onclick = () => startRide(id, true);
  $('briefGo').onclick = () => startRide(id, false);
  $('briefBack').onclick = toMenu;
}

// ---------------------------------------------------------------- склон
function startRide(id, demo, opts = {}) {
  const L = LESSONS_BY_ID[id];
  app.lesson = L; app.demo = demo; app.t = 0; app.ended = false; app.fallShown = false; app.history = []; app.replay = null;
  app.background = !!opts.background;
  if (!opts.keepFalls) app.falls = 0;
  app.ls = {}; L.init(app.ls); prevSnap = null; acc = 0;
  world.build(L.slopeDeg);
  world.setGates(L.gates);
  world.setTargets(L.targets ? L.targets.map((u) => u * toeSign()) : null);
  sim.reset({ slopeDeg: L.slopeDeg, stance: stance(), ...L.start(toeSign()) });
  ctl.edge = 0;
  rider.setConfig({ stance: stance(), front: save.front, rear: save.rear, width: save.width / 100 });
  rig.init = false;
  rig.mode = 'follow';
  app.camManual = false; app.camT = 0; app.camI = 0;
  app.travel.copy(world.frame.D);
  if (!app.background) {
    setScreen('ride');
    $('hudTitle').textContent = (demo ? 'Демонстрация · ' : '') + L.title;
    $('keyLegend').innerHTML = keyLegend(L.keys).map(([k, t]) => `<div>${k} ${t}</div>`).join('');
    show('demoBanner', demo);
    $('hud').classList.toggle('demo', demo);
    show('pip', !!L.pip);
    app.demoSlow = null;
    $('bCam').textContent = 'Камера: ' + CAM_NAMES[rig.mode];
    setCoach('info', demo ? 'Смотри, что делает тело: колени, вес, наклон. Внизу слева — кант и вес в реальном времени.' : L.goal);
  }
}

function restart() { if (app.lesson) startRide(app.lesson.id, app.demo, { keepFalls: true }); }
function setCam(mode) { rig.mode = mode; $('bCam').textContent = 'Камера: ' + CAM_NAMES[mode]; }
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
function toggleSlow() { app.slow = app.slow === 1 ? 0.35 : 1; $('bSlow').textContent = app.slow === 1 ? 'Замедл. ×1' : 'Замедл. ×0.35'; $('bSlow').classList.toggle('on', app.slow !== 1); }
$('bCam').onclick = cycleCam; $('bSlow').onclick = toggleSlow; $('bRestart').onclick = restart; $('bMenu').onclick = toMenu;

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
  const L = app.lesson;
  if (app.replay) return updateReplay(dt);
  acc += dt * Math.min(app.slow, app.demo && app.demoSlow ? app.demoSlow : 1);
  let steps = 0;
  while (acc >= STEP && steps < 20) {
    acc -= STEP; steps++;
    prevSnap = snap();
    if (!sim.fallen && !app.ended) {
      const input = app.demo ? L.auto(sim, app.t, app.ls) : readInput(STEP);
      if (app.demo) { app.caption = input.caption; app.demoSlow = input.slow || null; app.captionKind = input.mistake ? 'danger' : 'info'; }
      sim.step(STEP, input);
      if (Math.abs(sim.u) > 21) sim.fall('out');
      if (sim.s > 1300) { app.ended = true; }
      app.history.push([sim.u, sim.s, sim.theta, sim.edge, sim.weight, sim.rot, sim.lean, sim.crouch, sim.stiff]);
      if (app.history.length > 720) app.history.shift();
      const r = L.check(sim, app.ls, STEP);
      app.lastCheck = r;
      if (!app.background && !app.ended) {
        if (r.done) { app.ended = true; setTimeout(() => lessonDone(), 600); }
        else if (r.fail) { app.ended = true; setTimeout(() => lessonFail(r.fail), 400); }
      }
      if (app.background && app.t > 40) startRide('free', true, { background: true });
    } else if (sim.fallen) sim.step(STEP, {}); // после конца урока райдер замирает
    app.t += STEP;
  }
  if (sim.fallen && !app.fallShown) {
    if (sim.time - sim.fallen.t > 1.1) {
      app.fallShown = true;
      if (app.background) startRide('free', true, { background: true });
      else { app.falls++; showFall(sim.fallen); }
    }
  }
  if (app.lesson?.id === 'leaf') world.highlightTarget(app.ls.i);
  directCam();
  drawRider(dt, sim.time);
}

function poseFromState(u, s, theta, edge, weight, rot, lean, crouch, stiff, fall, t) {
  const f = world.frame, ts = toeSign();
  const pos = f.p(u, s);
  const nose = f.dir(Math.sin(theta), Math.cos(theta));
  const right = f.dir(Math.cos(theta), -Math.sin(theta));
  rider.placeOnSlope(pos, nose, f.N, right, edge * ts * MAX_EDGE_DEG * D);
  rider.root.updateMatrixWorld(true);
  const danger = sim.danger || 0;
  rider.update({
    knee: 0.5, hinge: 0.12, weight, rot: rot * ts, gaze: 1, arms: 0.4 + (fall ? 0 : danger * 0.45), lean, crouch, stiff, t,
    up: rider.worldUpLocal(), fall,
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
  rig.update(dt, pos, app.travel, toeDir, f.N, { mode: app.background ? 'follow' : (sim.fallen && !app.replay ? 'orbit' : undefined) });
  app.pipTarget = { pos, toeDir };
  world.follow(pos, sim.s);
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
  if (!app.background) updateHud(dt);
}

function updateHud(dt) {
  app.hudT -= dt;
  if (app.hudT > 0) return;
  app.hudT = 1 / 15;
  const r = app.lastCheck || { text: '', p: 0 };
  $('hudGoal').textContent = r.text;
  $('hudProg').style.width = (r.p * 100).toFixed(0) + '%';
  // кант: вид сзади на доску; поворот рисунка — в «телесных» координатах (+ носки справа)
  const deg = sim.edgeDeg;
  $('gBoard').setAttribute('transform', `rotate(${(-deg).toFixed(1)} 80 60)`);
  $('gDeg').textContent = `${Math.abs(deg).toFixed(0)}° ${deg > 1.5 ? 'носки' : deg < -1.5 ? 'пятки' : 'плоско'}`;
  $('edgeGauge').setAttribute('class', sim.danger > 0.45 ? 'danger' : sim.grip > 0.6 ? 'carve' : '');
  $('wMark').style.left = (50 + sim.weight * 45).toFixed(0) + '%';
  const front = Math.round(50 + sim.weight * 30);
  $('bodyStats').innerHTML = `<span>Скорость</span><b>${(sim.speed * 3.6).toFixed(0)} км/ч</b><span>Вес вперёд</span><b>${front}%</b><span>Ноги</span><b>${sim.stiff > 0.5 ? 'прямые!' : sim.crouch > 0.5 ? 'присел' : 'согнуты'}</b><span>Ход</span><b>${sim.speed < 0.3 ? 'стоп' : sim.grip > 0.6 ? 'карвинг' : sim.slip > 0.6 ? 'боком' : sim.slip > 0.15 ? 'юз' : 'скольжение'}</b>`;
  if (app.demo) {
    $('demoCaption').textContent = app.caption || '';
    $('demoBanner').classList.toggle('mistake', app.captionKind === 'danger');
    $('demoCam').textContent = CAM_NAMES[rig.mode];
    const e = Math.abs(deg), ws = front >= 53 ? 'вперёд' : front <= 47 ? 'НАЗАД' : 'центр';
    $('demoLive').innerHTML = `<span>кант <b>${e.toFixed(0)}°</b> ${deg > 1.5 ? 'носки' : deg < -1.5 ? 'пятки' : 'плоско'}</span><span class="${front < 47 ? 'bad' : ''}">вес <b>${front}%</b> на передней · ${ws}</span><span><b>${(sim.speed * 3.6).toFixed(0)}</b> км/ч</span>`;
    setCoach(app.captionKind || 'info', app.caption || '');
    return;
  }
  if (sim.fallen) return;
  const w = sim.warnings[0];
  if (w) { const [k, txt] = WARN_TEXT[w]; setCoach(k, txt); }
  else if (app.lesson.maxSpeed && sim.speed > app.lesson.maxSpeed) setCoach('warn', 'Быстровато для этого упражнения. Доску поперёк склона и на верхний кант — затормози.');
  else setCoach('info', app.lesson.goal);
}

// ---------------------------------------------------------------- разбор падения
function showFall(f) {
  const info = FALLS[f.type] || FALLS.out;
  show('modal', true);
  const demoNote = app.demo ? '<p>Инструктор нарочно показал эту ошибку — вот что происходит, если опустить доску на нижний кант.</p>' : '';
  $('modalCard').innerHTML = `<div class="fall-k">${app.demo ? 'Ошибка в демонстрации · разбор' : 'Падение · разбор'}</div><h2>${info.title}</h2>${demoNote}
    <div class="blk"><div class="h">Что произошло</div>${info.what}</div>
    <div class="blk why"><div class="h">Почему</div>${info.why}</div>
    <div class="blk fix"><div class="h">Как исправить</div>${info.fix}</div>
    <div class="blk drill"><div class="h">Упражнение</div>${info.drill}</div>
    <div class="row"><button class="btn ghost" id="mMenu">Меню</button><button class="btn alt" id="mReplay">⟲ Повтор в замедлении</button><button class="btn alt" id="mDemo">Как делает инструктор</button><button class="btn primary" id="mRetry">${app.demo ? 'Попробовать сам' : 'Ещё раз'}</button></div>`;
  $('mMenu').onclick = toMenu;
  $('mRetry').onclick = () => { show('modal', false); if (app.demo) startRide(app.lesson.id, false); else restart(); };
  $('mDemo').onclick = () => { show('modal', false); startRide(app.lesson.id, true); };
  $('mReplay').onclick = () => { show('modal', false); app.replay = { i: 0, f }; setCoach('danger', `Повтор: ${info.title.toLowerCase()}. Смотри на кант внизу слева.`); };
}

function updateReplay(dt) {
  const R = app.replay, H = app.history;
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
  $('gBoard').setAttribute('transform', `rotate(${(-h[3] * MAX_EDGE_DEG).toFixed(1)} 80 60)`);
  $('gDeg').textContent = `${Math.abs(h[3] * MAX_EDGE_DEG).toFixed(0)}°`;
  if (ended && R.i > H.length + 60) { app.replay = null; showFall(R.f); }
}

function lessonDone() {
  const L = app.lesson;
  if (app.demo) {
    show('modal', true);
    $('modalCard').innerHTML = `<div class="ok-k">Демонстрация окончена</div><h2>${L.title}</h2><p>Теперь твоя очередь. Повтори то же самое: следи за кантом и весом в панели слева внизу.</p>
      <div class="row"><button class="btn ghost" id="mMenu">Меню</button><button class="btn alt" id="mAgain">Посмотреть ещё раз</button><button class="btn primary" id="mGo">Попробовать сам</button></div>`;
    $('mAgain').onclick = () => { show('modal', false); startRide(L.id, true); };
  } else {
    const stars = app.falls === 0 ? 3 : app.falls <= 2 ? 2 : 1;
    save.done[L.id] = Math.max(save.done[L.id] || 0, stars); persist();
    const next = nextLesson(L.id);
    show('modal', true);
    $('modalCard').innerHTML = `<div class="ok-k">Урок пройден</div><h2>${L.title}</h2><div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p>${app.falls ? `Падений: ${app.falls}. Каждое — это опыт: ты уже знаешь, откуда оно берётся.` : 'Без единого падения — чисто!'}</p>
      <div class="row"><button class="btn ghost" id="mMenu">Меню</button><button class="btn alt" id="mAgain">Ещё раз</button>${next ? `<button class="btn primary" id="mNext">Дальше: ${next.title}</button>` : ''}</div>`;
    $('mAgain').onclick = () => { show('modal', false); startRide(L.id, false); };
    if (next) $('mNext').onclick = () => { show('modal', false); openBrief(next.id); };
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
function nextLesson(id) {
  const order = ['stance', 'bindings', 'posture', 'heel_slip', 'toe_slip', 'leaf', 'turns', 'carve', 'free'];
  const i = order.indexOf(id);
  return i >= 0 && i < order.length - 1 ? LESSONS_BY_ID[order[i + 1]] : null;
}

// ---------------------------------------------------------------- студия
function studioSet(list) {
  for (const r of studio.riders) studio.scene.remove(r.rider.root);
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
  r.rider.update({ ...pose, t: performance.now() / 1000, up: r.rider.worldUpLocal(), fall: null, crouch: 0 });
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
// вращение мышью/пальцем
(() => {
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { if (app.mode === 'studio') drag = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    studio.orbit.yaw -= (e.clientX - drag.x) * 0.008; studio.orbit.pitch = clamp(studio.orbit.pitch + (e.clientY - drag.y) * 0.006, -0.1, 1.45);
    drag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => { if (app.mode === 'studio') studio.orbit.dist = clamp(studio.orbit.dist * (1 + Math.sign(e.deltaY) * 0.08), 2, 12); }, { passive: true });
})();

function updateStudio() {
  const o = studio.orbit;
  const c = studio.cam;
  const dist = o.dist * (innerWidth <= 720 ? 1.6 : 1);
  c.position.set(o.target.x + Math.cos(o.yaw) * Math.cos(o.pitch) * dist, o.target.y + Math.sin(o.pitch) * dist, o.target.z + Math.sin(o.yaw) * Math.cos(o.pitch) * dist);
  c.lookAt(o.target);
  // сдвигаем картинку в свободную от панели часть экрана
  const W = innerWidth, H = innerHeight, mobile = W <= 720;
  const dx = mobile ? 0 : Math.min(W * 0.33, 424) / 2, dy = mobile ? H * 0.26 : 0;
  c.setViewOffset(W, H, -dx, dy, W, H);
  if (app.studioMode && app.studioMode.update) app.studioMode.update();
  studio.riders.forEach((r, i) => {
    const el = $('lbl' + i); if (!el) return;
    const p = r.rider.root.position.clone().add(new THREE.Vector3(0, 2.05, 0)).project(c);
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
    const btn = $('pNext'); btn.disabled = !allOk; btn.textContent = allOk ? 'Отлично! На склон' : 'Исправь все пункты';
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
  $('pNext').onclick = () => { if (!allOk) return; save.done.posture = 3; persist(); openBrief('heel_slip'); };
  refresh();
  app.studioMode = { update: () => {
    studioPose(studio.riders[0], pose, new THREE.Vector3(0, 0, 0));
    studio.riders[1].rider.root.visible = ghost;
    studioPose(studio.riders[1], GOOD_POSTURE, new THREE.Vector3(0, 0, 0));
  } };
}

// --- Библиотека ошибок
function openMistakes(id = MISTAKES[0].id) {
  setScreen('studio');
  const m = MISTAKES.find((x) => x.id === id);
  const sideBySide = m.view === 'side';
  studioSet([{ label: '✗ НЕПРАВИЛЬНО', labelKind: 'bad', palette: { jacket: '#ef4444' } }, { label: '✓ ПРАВИЛЬНО', labelKind: 'good', palette: { jacket: '#22c55e' } }]);
  studioViews(['side', 'front', 'behind', 'top']);
  setView(m.view); studio.orbit.dist = 6.2;
  const off = sideBySide ? [new THREE.Vector3(0, 0, 1.0), new THREE.Vector3(0, 0, -1.0)] : [new THREE.Vector3(-1.05, 0, 0), new THREE.Vector3(1.05, 0, 0)];
  if (!sideBySide && toeSign() < 0 && m.view !== 'top') off.reverse();
  $('studioPanel').innerHTML = `<h2>${m.title}</h2><div class="hint">${m.tag}</div>
    <div class="blk"><div class="h">Как это выглядит</div>${m.symptom}</div>
    <div class="blk why"><div class="h">Почему так происходит</div>${m.why}</div>
    <div class="blk fix"><div class="h">Как исправить</div>${m.fix}</div>
    <div class="blk drill"><div class="h">Упражнение</div>${m.drill}</div>
    <div class="group-title">Все ошибки</div>
    <div class="mlist">${MISTAKES.map((x) => `<button class="mitem ${x.id === id ? 'on' : ''}" data-m="${x.id}">${x.title}<small>${x.tag}</small></button>`).join('')}</div>`;
  $('studioPanel').querySelectorAll('[data-m]').forEach((b) => b.onclick = () => openMistakes(b.dataset.m));
  $('studioPanel').scrollTop = 0;
  app.studioMode = { update: () => { studioPose(studio.riders[0], m.wrong, off[0]); studioPose(studio.riders[1], m.right, off[1]); } };
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
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (app.mode === 'studio') { updateStudio(); renderer.render(studio.scene, studio.cam); }
  else {
    if (app.lesson && !(app.mode === 'ride' && !$('modal').classList.contains('hidden') && !app.replay)) updateRide(dt);
    renderer.render(world.scene, camera);
    if (app.mode === 'ride' && app.lesson?.pip && app.pipTarget) renderPip();
  }
  requestAnimationFrame(frame);
}
toMenu();
requestAnimationFrame(frame);
window.__app = { app, sim, studio, THREE, startRide, openMistakes, openPosture, openBindings, openStance, openBrief, rig };
