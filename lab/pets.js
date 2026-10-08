// Просмотр питомцев каравана (сборка 58): lab/pets.html. Питомец, герой рядом для масштаба и соломенное чучело-цель.
// Восемь питомцев. Клипы: стоит / ходит по кругу / бьёт чучело (дальние — снарядом) / получает удар / гибель. «Все» — все в ряд.
import * as THREE from '../js/vendor/three.module.min.js';
import { makeKit } from '../js/render3d/kit.js';
import { Actor } from '../js/render3d/actor.js';
import { U } from '../js/render3d/toon.js';
import { grassTex } from '../js/render3d/textures.js';
import { LIGHT, CAMERA, HERO } from '../js/render3d/style.js';
import { PET_MODELS } from '../js/render3d/models/pet/pets.js';
import { PETS, TIERS } from '../js/data/pets.js';
import WARRIOR from '../js/render3d/models/hero/warrior.js';
import SWORD from '../js/render3d/models/weapon/sword_iron.js';
import SHIELD from '../js/render3d/models/weapon/shield_round.js';

const FX = { burn: ['Горит', '#ff9040'], loot: ['+золото', '#ffd050'], poison: ['Яд', '#9ae04a'], heal: ['+лечение героя', '#7ef07a'], needle: ['Игла', '#e8e0d0'], stun: ['Оглушён', '#f0e08a'], leech: ['+лечение героя', '#7ef07a'], shield: ['Каменный щит', '#e0c08a'] };
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), kit = makeKit(scene);
kit.skin.SKINS.on = false; kit.fur.FUR.on = false;   // герой — процедурный (без загрузки файлов)
const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.3, 200);
const hemi = new THREE.HemisphereLight(), sun = new THREE.DirectionalLight();
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);
const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshToonMaterial({ map: grassTex() }));
ground.material.map.repeat.set(10, 10); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const LIGHTS = { village: 'Деревня', torch: 'Катакомбы', dark: 'Холод' };
function setLight(k) {
  const L = LIGHT[k]; hemi.color.set(L.hemi.sky); hemi.groundColor.set(L.hemi.ground); hemi.intensity = L.hemi.i;
  sun.color.set(L.key.color); sun.intensity = L.key.i; sun.position.set(...L.key.offset).normalize().multiplyScalar(30);
  renderer.setClearColor(L.clear); scene.fog = new THREE.Fog(L.fog.color, 40, 110);
  ground.material.color.set(k === 'village' ? 0x9aa890 : k === 'torch' ? 0x8a7a66 : 0x9aa6c0);
}
// чучело-цель
const dummy = new THREE.Group(); {
  const straw = new THREE.MeshToonMaterial({ color: 0xc8a050 }), wood = new THREE.MeshToonMaterial({ color: 0x6a4a2e }), sack = new THREE.MeshToonMaterial({ color: 0xb89a68 });
  const add = (g, m, p) => { const o = new THREE.Mesh(g, m); o.position.set(...p); o.castShadow = true; dummy.add(o); return o; };
  add(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), wood, [0, 0.75, 0]); add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), wood, [0, 1.1, 0]).rotation.z = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.22, 0.26, 0.6, 8), straw, [0, 0.95, 0]); add(new THREE.SphereGeometry(0.16, 8, 6), sack, [0, 1.42, 0]);
}
scene.add(dummy);

const QS = (() => { try { return Object.fromEntries(new URLSearchParams(location.search)); } catch { return {}; } })();
const S = { pet: QS.pet || 'fennec', clip: QS.clip || 'attack', cam: 'game', spin: false, light: QS.light || 'village', hero: QS.hero !== '0' };
let pets = [], hero = null, clipT = 0, t = 0, last = performance.now();
const fx = [];   // всплывающие надписи и снаряды
function build() {
  for (const p of pets) p.a.dispose(); if (hero) { hero.dispose(); hero = null; }
  const ids = S.pet === 'all' ? Object.keys(PET_MODELS) : [S.pet];
  pets = ids.map((id, i) => {
    const a = new Actor(PET_MODELS[id], kit, scene); a.root.traverse(o => { if (o.isMesh && !o.userData.isOutline) o.castShadow = true; });
    return { id, a, i, cd: 0, act: null };
  });
  if (S.hero && S.pet !== 'all') { hero = new Actor(WARRIOR, kit, scene); hero.root.scale.setScalar(HERO.scale); hero.equip('handR', SWORD); if (SHIELD) hero.equip('handL', SHIELD); hero.root.traverse(o => { if (o.isMesh && !o.userData.isOutline) o.castShadow = true; }); }
  dummy.visible = S.pet !== 'all' && S.clip === 'attack';
  if (S.pet === 'all') target.set(0, 0.5, 0); else target.set(-right.x * 0.9, 0.5, -right.z * 0.9); clipT = 0; showInfo();
}
const right = new THREE.Vector3(Math.cos(CAMERA.yaw), 0, -Math.sin(CAMERA.yaw)), fwd = new THREE.Vector3(-Math.sin(CAMERA.yaw), 0, -Math.cos(CAMERA.yaw));
const env = { wind: new THREE.Vector2(0.6, 0.3) };
function spot(i) { if (S.pet !== 'all') return [0, 0]; const c = i % 4, r = Math.floor(i / 4), v = right.clone().multiplyScalar((c - 1.5) * 2.3).add(fwd.clone().multiplyScalar((r - 0.5) * 2.8)); return [v.x, v.z]; }
function float(x, y, z, text, color) { const d = document.createElement('div'); d.className = 'flt'; d.textContent = text; d.style.color = color; document.body.appendChild(d); fx.push({ kind: 'txt', el: d, p: new THREE.Vector3(x, z, y), t: 0 }); }
function shoot(from, to, color) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color })); m.position.copy(from); scene.add(m); fx.push({ kind: 'proj', m, from: from.clone(), to: to.clone(), t: 0, dur: from.distanceTo(to) / 9 }); }
function drive(dt) {
  clipT += dt;
  const dPos = right.clone().multiplyScalar(1.6);   // чучело справа от питомца
  dummy.position.set(dPos.x, 0, dPos.z); dummy.rotation.y = CAMERA.yaw;
  if (hero) { const h = right.clone().multiplyScalar(-2.0).add(fwd.clone().multiplyScalar(1.4)); hero.place(h.x, h.z); hero.faceAngle(CAMERA.yaw + 0.5); hero.update(dt, { clip: 'idle' }, env); }
  dummy.rotation.z *= Math.max(0, 1 - dt * 8);
  for (const p of pets) {
    const a = p.a, D = PETS[p.id], [sx, sy] = spot(p.i);
    if (S.clip === 'walk') {
      const ang = clipT * 0.7 + p.i, R = S.pet === 'all' ? 0.5 : 1.3, sp = 1.6 * (D.speed || 1);
      a.place(sx + Math.cos(ang) * R, sy + Math.sin(ang) * R); a.faceAngle(Math.atan2(Math.cos(ang), -Math.sin(ang))); a.update(dt, { clip: 'walk', speed: sp * 1.4 }, env);
    } else if (S.clip === 'attack') {
      const solo = S.pet !== 'all';
      let px = sx, py = sy;
      if (solo) { const back = D.ranged ? 2.8 : D.reach + 0.25; px = dPos.x - right.x * back; py = dPos.z - right.z * back; }
      a.place(px, py); a.faceAngle(solo ? Math.atan2(right.x, right.z) : CAMERA.yaw);
      p.cd -= dt;
      if (!p.act && p.cd <= 0) { p.act = { t: 0, dur: 0.5, done: false }; p.cd = D.cd; }
      if (p.act) {
        p.act.t += dt; const k = Math.min(1, p.act.t / p.act.dur);
        if (!p.act.done && k >= 0.5) { p.act.done = true; if (solo) hitFx(p, px, py, dPos); }
        a.update(dt, { clip: 'attack', k }, env); if (k >= 1) { p.act = null; a.update(0, { clip: 'idle' }, env); }
      } else a.update(dt, { clip: 'idle' }, env);
    } else if (S.clip === 'idle') { a.place(sx, sy); a.faceAngle(CAMERA.yaw); a.update(dt, { clip: 'idle' }, env); }
    else {
      a.place(sx, sy); a.faceAngle(CAMERA.yaw);
      const dur = S.clip === 'death' ? 1 : 0.3, hold = S.clip === 'death' ? 1.2 : 0.7, cyc = clipT % (dur + hold), k = Math.min(1, cyc / dur);
      if (cyc < dt && clipT > dt) a.update(0, { clip: 'idle' }, env);
      a.update(dt, { clip: S.clip, k }, env); a.flash(S.clip === 'hit' ? Math.max(0, 1 - k * 4) : 0, 0xffffff);
    }
  }
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt;
    if (f.kind === 'proj') { const k = Math.min(1, f.t / f.dur); f.m.position.lerpVectors(f.from, f.to, k); f.m.position.y += Math.sin(k * Math.PI) * 0.3; if (k >= 1) { scene.remove(f.m); fx.splice(i, 1); f.onHit && f.onHit(); } }
    else { const v = f.p.clone(); v.y += f.t * 0.8; v.project(camera); f.el.style.left = (v.x * 0.5 + 0.5) * innerWidth + 'px'; f.el.style.top = (-v.y * 0.5 + 0.5) * innerHeight + 'px'; f.el.style.opacity = Math.max(0, 1 - f.t / 1.2); if (f.t > 1.2) { f.el.remove(); fx.splice(i, 1); } }
  }
}
function hitFx(p, px, py, dPos) {
  const D = PETS[p.id], [txt, col] = FX[D.fx];
  const land = () => { dummy.rotation.z = 0.18; float(dPos.x, dPos.z, 1.7, '−' + Math.round(4 + Math.random() * 3), '#ffffff'); if (D.fx === 'heal' || D.fx === 'leech' || D.fx === 'shield') { const h = hero ? hero.root.position : new THREE.Vector3(); float(h.x, h.z, 2.3, txt, col); } else if (D.fx !== 'needle') float(dPos.x, dPos.z, 2.1, txt, col); };
  if (D.ranged) { const f = new THREE.Vector3(px, 1.1, py), to = new THREE.Vector3(dPos.x, 1.0, dPos.z); shoot(f, to, D.fx === 'needle' ? 0xf0ead8 : 0xb0ffb0); fx[fx.length - 1].onHit = land; } else land();
}
// камера
let yaw = CAMERA.yaw, pitch = 0.42, dist = 7, gameDist = 11;
const target = new THREE.Vector3(0, 0.5, 0);
function placeCam(dt) {
  const isGame = S.cam === 'game', gd = gameDist * (S.pet === 'all' ? 1.6 : 1); if (S.spin && !isGame) yaw += dt * 0.5;
  const y = isGame ? CAMERA.yaw : yaw, p = isGame ? CAMERA.village.pitch : pitch, d = isGame ? gd : dist;
  camera.position.set(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)).multiplyScalar(d).add(target); camera.lookAt(target);
}
const ptrs = new Map(); let pinch0 = 0, dist0 = 0;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = S.cam === 'game' ? gameDist : dist; } });
canvas.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; const [px, py] = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomTo(dist0 * pinch0 / Math.max(20, d)); return; }
  if (S.cam === 'game') { yaw = CAMERA.yaw; pitch = CAMERA.village.pitch; dist = gameDist; setCam('free'); }
  yaw -= (e.clientX - px) * 0.008; pitch = Math.min(1.3, Math.max(0.02, pitch + (e.clientY - py) * 0.006));
});
const up = e => ptrs.delete(e.pointerId); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', e => { e.preventDefault(); zoomTo((S.cam === 'game' ? gameDist : dist) * Math.exp(e.deltaY * 0.001)); }, { passive: false });
function zoomTo(d) { d = Math.min(40, Math.max(1.5, d)); if (S.cam === 'game') gameDist = d; else dist = d; }

function chips(el, items, get, set) {
  const box = document.getElementById(el); box.innerHTML = '';
  for (const [k, n] of items) { const b = document.createElement('button'); b.textContent = n; b.onclick = () => { set(k); render(); }; b.dataset.k = k; box.appendChild(b); }
  const render = () => box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === get()));
  render(); return render;
}
function showInfo() {
  const el = document.getElementById('card');
  if (S.pet === 'all') { el.innerHTML = '<b>Все 8 питомцев</b><span>Выберите одного, чтобы увидеть удар по чучелу и эффект</span>'; return; }
  const D = PETS[S.pet], T = TIERS[D.tier];
  el.innerHTML = `<b>${D.icon} ${D.name}</b><span style="color:${T.color}">${T.name} · ${T.price}◆ · с ${T.lvl} ур.</span><span>${D.desc}</span><span class="m">${D.ranged ? 'Бьёт издалека' : 'Ближний бой'} · удар раз в ${D.cd} с · сила ${Math.round(D.k * 100)}% удара героя</span>`;
}
const setCam = c => { S.cam = c; camR(); };
const SHORT = { fennec: 'Фенек', crow: 'Ворон', scorpid: 'Скорпид', wisp: 'Огонёк', skull: 'Череп', basilisk: 'Василиск', bat: 'Мышь', golem: 'Голем' };
chips('pets', [...Object.entries(PETS).map(([k, D]) => [k, D.icon + ' ' + SHORT[k]]), ['all', 'Все']], () => S.pet, k => { S.pet = k; build(); });
chips('clips', [['idle', 'Стоит'], ['walk', 'Ходит'], ['attack', 'Бьёт'], ['hit', 'Получает удар'], ['death', 'Гибель']], () => S.clip, k => { S.clip = k; clipT = 0; for (const p of pets) { p.act = null; p.cd = 0; } dummy.visible = S.pet !== 'all' && k === 'attack'; });
const camR = chips('cam', [['game', 'Игровая'], ['free', 'Свободная'], ['close', 'Крупно']], () => S.cam, k => { if (k === 'close') { S.cam = 'free'; dist = S.pet === 'all' ? 7 : 3.2; pitch = 0.3; yaw = CAMERA.yaw; } else S.cam = k; camR(); });
chips('light', Object.entries(LIGHTS), () => S.light, k => { S.light = k; setLight(k); });
const spinB = document.getElementById('spin'); spinB.onclick = () => { S.spin = !S.spin; if (S.spin && S.cam === 'game') { yaw = CAMERA.yaw; pitch = 0.42; dist = 7; setCam('free'); } spinB.classList.toggle('on', S.spin); };
const heroB = document.getElementById('hero'); heroB.classList.toggle('on', S.hero); heroB.onclick = () => { S.hero = !S.hero; heroB.classList.toggle('on', S.hero); build(); };

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); gameDist = w / h < 1 ? 11 * Math.min(1.6, 0.85 / (w / h)) : 11; }
addEventListener('resize', resize); resize(); setLight(S.light); build();
document.getElementById('load').remove();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; U.uTime.value = t;
  drive(dt); placeCam(dt); U.uCam.value.copy(camera.position); U.uFocus.value.set(0, -50, 0);
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
