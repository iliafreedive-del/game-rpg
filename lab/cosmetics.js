// Витрина обликов (lab/cosmetics.html): примеры перекраски героев и питомцев, внешних эффектов и особых питомцев.
// Сцена — из адреса: ?s=looks&cls=warrior | s=models | s=dyes&cls=archer | s=pets&list=fennec,crow | s=premium | s=fx&kind=trail | s=combo
// Для скриншотов: window.__step(n) двигает время на n кадров по 1/30 с без ожидания (рендер без GPU медленный).
import * as THREE from '../js/vendor/three.module.min.js';
import { makeKit } from '../js/render3d/kit.js';
import { Actor } from '../js/render3d/actor.js';
import { U, applyLook } from '../js/render3d/toon.js';
import { grassTex } from '../js/render3d/textures.js';
import { LIGHT, CAMERA, HERO } from '../js/render3d/style.js';
import { Post } from '../js/render3d/post.js';
import { Trail, Aura, Wings, Extra, WeaponFx } from '../js/render3d/cosfx.js';
import { petFx } from '../js/render3d/models/pet/petfx.js';
import { PET_MODELS } from '../js/render3d/models/pet/pets.js';
import { PREMIUM_PET_MODELS } from '../js/render3d/models/pet/pets_premium.js';
import { PETS } from '../js/data/pets.js';
import { HERO_LOOKS, DYES, PET_SKINS, PREMIUM_PETS, EFFECTS, HERO_MODELS } from '../js/data/cosmetics.js';
import { make as makeWarrior } from '../js/render3d/models/hero/warrior.js';
import { make as makeMage } from '../js/render3d/models/hero/mage.js';
import ARCHER from '../js/render3d/models/hero/archer.js';

const QS = Object.fromEntries(new URLSearchParams(location.search));
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), kit = makeKit(scene);
kit.fur.FUR.on = false;
const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.3, 200);
const hemi = new THREE.HemisphereLight(), sun = new THREE.DirectionalLight();
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshToonMaterial({ map: grassTex() }));
ground.material.map.repeat.set(14, 14); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const LK = QS.light || 'village', L = LIGHT[LK];
hemi.color.set(L.hemi.sky); hemi.groundColor.set(L.hemi.ground); hemi.intensity = L.hemi.i;
sun.color.set(L.key.color); sun.intensity = L.key.i; sun.position.set(...L.key.offset).normalize().multiplyScalar(30);
renderer.setClearColor(L.clear); scene.fog = new THREE.Fog(L.fog.color, 40, 110);
ground.material.color.set(LK === 'village' ? 0x9aa890 : 0x6a5e50);
const post = new Post(renderer);

const right = new THREE.Vector3(Math.cos(CAMERA.yaw), 0, -Math.sin(CAMERA.yaw)), fwd = new THREE.Vector3(-Math.sin(CAMERA.yaw), 0, -Math.cos(CAMERA.yaw));
const env = { wind: new THREE.Vector2(0.6, 0.3) };
const at = (c, r) => right.clone().multiplyScalar(c).add(fwd.clone().multiplyScalar(r));   // столбец, ряд → мир

const HERO_DEF = { warrior: makeWarrior(), mage: makeMage(), archer: ARCHER, warrior_vanguard: makeWarrior('warrior_vanguard'), mage_archmage: makeMage('mage_archmage') };
const items = [];   // { a: Actor, x, z, tag, fx: [], walk }
const priceOf = g => !g ? '' : [g.rub ? 'за ₽' : '', g.ads ? `или ${g.ads} реклам за неделю` : '', g.shards ? `${g.shards}◆` : ''].filter(Boolean).join(' ');
function tag(text, sub, price) { const d = document.createElement('div'); d.className = 'tag'; d.innerHTML = text + (sub ? `<small>${sub}</small>` : '') + (price ? `<br><span class="p">${price}</span>` : ''); document.body.appendChild(d); return d; }
function hero(def, look, x, z, o = {}) {
  const a = new Actor(def, kit, scene); a.root.scale.setScalar(HERO.scale);
  a.root.traverse(m => { if (m.isMesh && !m.userData.isOutline) m.castShadow = true; });
  if (look && a.model.skinMat) applyLook(a.model.skinMat, look);
  const it = { a, x, z, fx: [], walk: o.walk, face: o.face ?? CAMERA.yaw + 0.35, cls: o.cls, tagY: o.tagY ?? -0.25 };
  items.push(it); return it;
}
function pet(def, look, x, z, o = {}) {
  const a = new Actor(def, kit, scene); a.root.traverse(m => { if (m.isMesh && !m.userData.isOutline) m.castShadow = true; });
  if (look) for (const m of a.mats) applyLook(m, look);
  const it = { a, x, z, fx: [], face: o.face ?? CAMERA.yaw + 0.5, pet: true, tagY: o.tagY ?? (def.fly ? 0.9 : -0.25), walk: o.walk };
  items.push(it); return it;
}
function addFx(it, slot, kind) {
  const bones = it.a.model.skinBones || it.a.model.bones;
  if (slot === 'trail') it.fx.push(new Trail(scene, kind));
  if (slot === 'aura') it.fx.push(new Aura(scene, kind));
  if (slot === 'wings') it.fx.push(new Wings(kind, bones.torso, { y: +(QS.wy || 0.4), z: -(QS.wz || 0.3), scale: +(QS.ws || 0.85) }));
  if (slot === 'extra') it.fx.push(new Extra(kind, scene, bones.head));
  if (slot === 'weapon') it.fx.push(new WeaponFx(kind, scene, it.a.root, it.cls === 'archer' ? 'handL' : 'handR'));
}

// ---------------------------------------------------------------- сцены
let camDist = 14, camPitch = 0.55, camAim = new THREE.Vector3(0, 1, 0);
const S = QS.s || 'looks', title = document.getElementById('title');
const CLS_NAME = { warrior: 'Воин', archer: 'Лучник', mage: 'Маг' };
async function build() {
  await Promise.all(['warrior_knight', 'archer_raven', 'mage_staff', 'warrior_vanguard', 'mage_archmage'].map(n => kit.skin.preloadSkin(n)));
  if (S === 'looks') {
    const cls = QS.cls || 'warrior', list = (QS.list || 'base,blood,frost,ember,holy,void').split(',');
    title.textContent = `${CLS_NAME[cls]}: готовые облики`;
    list.forEach((id, i) => { const L = HERO_LOOKS[id], it = hero(HERO_DEF[cls], L.look, ...xz(at((i - (list.length - 1) / 2) * 1.9, 0))); it.tag = tag(L.name, '', priceOf(L.get)); });
    camDist = 2.4 + list.length * 1.65; camPitch = 0.3; camAim.y = 1.05;
  } else if (S === 'models') {
    title.textContent = 'Другие модели того же класса';
    const L = [['warrior', 'Рыцарь Ордена (сейчас)'], ['warrior_vanguard', 'Фиолетовый авангард'], ['mage', 'Маг посоха (сейчас)'], ['mage_archmage', 'Звёздный архимаг']];
    L.forEach(([k, n], i) => { const it = hero(HERO_DEF[k], null, ...xz(at((i - 1.5) * 2.1, 0))); it.tag = tag(n); });
    camDist = 12; camPitch = 0.32;
  } else if (S === 'dyes') {
    const cls = QS.cls || 'archer';
    title.textContent = `${CLS_NAME[cls]}: собери сам — ткань × кайма × броня`;
    const combos = (QS.list || 'violet:gold:steel,crimson:gold:white,emerald:bone:bronze,azure:silver:ice,black:copper:black,white:dark:black').split(',');
    const cols = combos.length; combos.forEach((c, i) => {
      const [a, b, cc] = c.split(':'), look = { a: DYES.a[a][1], b: DYES.b[b][1], c: DYES.c[cc][1] }, col = i % cols, row = Math.floor(i / cols);
      const it = hero(HERO_DEF[cls], look, ...xz(at((col - (cols - 1) / 2) * 1.9, row * 3.2))); it.tag = tag(`${DYES.a[a][0]} · ${DYES.b[b][0]}`, `броня: ${DYES.c[cc][0]}`);
    });
    camDist = 2.4 + cols * 1.65; camPitch = 0.3; camAim.y = 1.05;
  } else if (S === 'pets' || S === 'premium') {
    const ids = S === 'premium' ? Object.keys(PREMIUM_PETS) : (QS.list || 'fennec,crow,scorpid,wisp').split(',');
    title.textContent = S === 'premium' ? 'Особые питомцы: за ₽ или за рекламу' : 'Облики питомцев';
    ids.forEach((id, r) => {
      const def = PET_MODELS[id] || PREMIUM_PET_MODELS[id], skins = [['base', PREMIUM_PETS[id] ? PREMIUM_PETS[id].look : null], ...Object.entries(PET_SKINS[id] || {}).map(([k, [n, l]]) => [n, l])];
      skins.forEach(([n, l], c) => {
        const it = pet(def, l, ...xz(at((c - 1.5) * 1.9, (r - (ids.length - 1) / 2) * (+QS.rs || 2.7))));
        const nm = (PETS[id] || PREMIUM_PETS[id]).name;
        it.tag = tag(c === 0 ? nm : n, c === 0 && S === 'premium' ? '' : '', c === 0 && S === 'premium' ? priceOf(PREMIUM_PETS[id].get) : c === 0 ? '' : priceOf({ rub: 1 }));
      });
    });
    camDist = 5.5 + ids.length * 2.6; camPitch = 0.72; camAim.y = 0.3;
  } else if (S === 'mpets' || S === 'mfx') {   // питомцы из Meshy (как в игре): облики и эффекты
    kit.skin.SKINS.on = true; await Promise.all(Object.keys(PET_MODELS).map(id => kit.skin.preloadSkin('pet_' + id)));
    const ids = (QS.list || 'fennec,skull,golem,bat').split(','), PS = +QS.ps || 1.4;
    const mk = (id, look, x, z, o) => { const it = pet(PET_MODELS[id], look, x, z, o); it.a.root.scale.setScalar(PS); return it; };
    if (S === 'mpets') {
      title.textContent = 'Облики питомцев';
      ids.forEach((id, r) => {
        const cols = [[PETS[id].name, null, ''], ...Object.entries(PET_SKINS[id] || {}).map(([k, [n, l]]) => [n, l, k === 'gold' ? 'или 60 реклам за неделю' : '20◆']), ['Призрачный', { ghost: true }, 'или 80 реклам за неделю']];
        cols.forEach(([n, l, pr], c) => { const it = mk(id, l, ...xz(at((c - (cols.length - 1) / 2) * 2.1, (r - (ids.length - 1) / 2) * (+QS.rs || 2.6)))); if (l && l.ghost) it.a.root.traverse(o => { if (o.userData.isOutline) o.visible = false; }); it.tag = tag(n, '', pr); });
      });
      camDist = 6 + ids.length * 2.6; camPitch = 0.6; camAim.y = 0.3;
    } else {
      title.textContent = 'Эффекты на питомце';
      const id = QS.pet || 'fennec', V = [['Аура огня', { aura: 'fire' }], ['Ледяные следы', { trail: 'ice' }], ['Аура Бездны', { aura: 'void' }], ['Огненные сферы', { extra: 'orbs_fire' }], ['Нимб', { extra: 'halo' }], ['Корона пламени', { extra: 'crown' }]];
      V.forEach(([n, fx], i) => {
        const st = V.filter(v => !v[1].trail), j = st.findIndex(v => v[0] === n), it = fx.trail ? mk(id, null, ...xz(at(0, 2.2)), { walk: true }) : mk(id, null, ...xz(at((j - (st.length - 1) / 2) * 2.5, -1.2))); if (fx.trail) it.walkAmp = 1.6;
        for (const [k, v] of Object.entries(fx)) {
          if (k === 'aura') { const A = new Aura(scene, v); A.disc.scale.setScalar(0.55); it.fx.push(A); }
          else if (k === 'trail') it.fx.push(new Trail(scene, v));
          else { const E = new Extra(v, scene, it.a.model.bones.head, { y: v === 'crown' ? 0.16 : 0.22, z: 0.06 }); it.fx.push(E); }
        }
        it.tag = tag(n);
      });
      camDist = 9.5; camPitch = 0.6; camAim.y = 0.3;
    }
  } else if (S === 'fx') {
    const kind = QS.kind || 'trail', list = QS.only ? QS.only.split(',') : Object.keys(EFFECTS[kind]);
    const NAMES = { trail: 'Следы шагов', aura: 'Ауры', wings: 'Крылья', extra: 'Нимб, сферы, корона', weapon: 'Эффекты оружия' };
    title.textContent = NAMES[kind];
    const cls = QS.cls ? [QS.cls] : ['warrior', 'archer', 'mage'];
    list.forEach((k, i) => {
      const it = hero(HERO_DEF[cls[i % cls.length]], null, ...xz(at((i - (list.length - 1) / 2) * 2.2, 0)), { walk: kind === 'trail', cls: cls[i % cls.length] });
      if (kind === 'wings') it.face = CAMERA.yaw + Math.PI - 0.25;   // крылья — со спины
      addFx(it, kind, k); it.tag = tag(EFFECTS[kind][k]);
    });
    camDist = 7 + list.length * 1.9; camPitch = kind === 'trail' ? 0.62 : 0.4; camAim.y = 0.8;
  } else if (S === 'combo') {
    title.textContent = 'Всё вместе: облик + крылья + аура + следы + питомец';
    const C = [
      ['warrior', 'blood', { wings: 'demon', aura: 'blood', trail: 'blood' }, 'bat', PET_SKINS.bat.blood[1], 'Кровавый страж'],
      ['mage', 'frost', { wings: 'frost', aura: 'frost', extra: 'halo' }, 'phoenix', PET_SKINS.phoenix.frost[1], 'Ледяной'],
      ['archer', 'ember', { wings: 'flame', aura: 'fire', trail: 'fire' }, 'dragon', null, 'Пепельное пламя'],
    ];
    C.forEach(([cls, lk, fx, p, pl, name], i) => {
      const x = (i - 1) * 3.4, it = hero(HERO_DEF[cls], HERO_LOOKS[lk].look, ...xz(at(x, 0)), { walk: !!fx.trail });
      it.face = CAMERA.yaw + Math.PI * 0.75;
      for (const [k, v] of Object.entries(fx)) addFx(it, k, v);
      it.tag = tag(name);
      const pp = pet(PET_MODELS[p] || PREMIUM_PET_MODELS[p], pl, ...xz(at(x + 1, 0.9)), { tagY: -9 }); pp.follow = it;
    });
    camDist = 14; camPitch = 0.5; camAim.y = 0.9;
  }
}
const xz = v => [v.x, v.z];

// ---------------------------------------------------------------- кадр
function tick(dt) {
  U.uTime.value += dt; const t = U.uTime.value;
  for (const it of items) {
    let x = it.x, z = it.z, moving = false;
    if (it.walk) {   // ходит вперёд-назад вдоль взгляда камеры: видно след
      const ph = (t * 0.3 + 0.05) % 2, k = ph < 1 ? ph : 2 - ph, dir = ph < 1 ? 1 : -1;
      const d = fwd.clone().multiplyScalar((k - 0.5) * (it.walkAmp || 4.5)); x += d.x; z += d.z; moving = true;
      it.a.faceAngle(Math.atan2(fwd.x * dir, fwd.z * dir));
    } else if (it.follow) { x = it.follow.cx + right.x * 0.9 - fwd.x * 0.6; z = it.follow.cz + right.z * 0.9 - fwd.z * 0.6; it.a.faceAngle(it.follow.a.yaw); }
    else it.a.faceAngle(it.face);
    it.cx = x; it.cz = z;
    it.a.place(x, z); it.a.update(dt, moving ? { clip: 'walk', speed: 3.2 } : { clip: 'idle' }, env);
    for (const f of it.fx) { if (f.update.length >= 3) f.update(dt, x, z, it.a.yaw); else f.update(dt, moving); }
    if (it.pet && it.a.model.fx) petFx(it.a, scene, dt, t);
  }
}
function placeCam() {
  if (QS.d) { camDist = +QS.d; if (QS.pitch) camPitch = +QS.pitch; if (QS.ay) camAim.y = +QS.ay; }
  camera.position.set(Math.sin(CAMERA.yaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(CAMERA.yaw) * Math.cos(camPitch)).multiplyScalar(camDist).add(camAim); camera.lookAt(camAim);
}
const _v = new THREE.Vector3();
function draw() {
  placeCam(); U.uCam.value.copy(camera.position); U.uFocus.value.set(0, -50, 0);
  post.render(scene, camera, U.uTime.value, 1.05);
  for (const it of items) if (it.tag) { _v.set(it.cx ?? it.x, it.tagY, it.cz ?? it.z).project(camera); it.tag.style.left = (_v.x * 0.5 + 0.5) * innerWidth + 'px'; it.tag.style.top = (-_v.y * 0.5 + 0.5) * innerHeight + 'px'; }
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); post.setup(w, h, { enabled: true, samples: 4, levels: 4 }); }
addEventListener('resize', resize);
window.__items = items;
window.__step = n => { for (let i = 0; i < n; i++) tick(1 / 30); draw(); return true; };
build().then(() => {
  if (QS.cd) camDist = +QS.cd; if (QS.cp) camPitch = +QS.cp;
  resize(); document.getElementById('load').remove(); window.__ready = true;
  if (QS.still) { window.__step(+QS.still); return; }
  let last = performance.now();
  const frame = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tick(dt); draw(); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
});
