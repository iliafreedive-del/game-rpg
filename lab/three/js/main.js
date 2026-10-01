// DARK ASCENT — Three.js stylised-graphics prototype. Entry point: renderer, lighting presets, camera, game loop.
import * as THREE from '../vendor/three.module.min.js';
import { U } from './toon.js';
import { buildWorld, ARENA, heightAt } from './world.js';
import { Hero } from './hero.js';
import { Mobs } from './mobs.js';
import { FX } from './fx.js';
import { Input } from './input.js';

const PRESETS = {
  day: {
    name: 'День', fog: 0xbfd9c4, fogNear: 22, fogFar: 46,
    sky: 0xe4f1ff, groundCol: 0x56663a, hemi: 1.55, sun: 0xfff0d2, sunI: 2.5, sunPos: [-7, 13, 6],
    grassBase: 0x4a7c2e, grassTip: 0x9ccc5c, grassDry: 0xcfc873, grassLight: 1.0,
    flies: 0.3, fliesColor: 0xfff6c0, fire: 3,
  },
  dusk: {
    name: 'Ночь', fog: 0x1f2340, fogNear: 15, fogFar: 38,
    sky: 0x7480c8, groundCol: 0x1c1a2c, hemi: 1.1, sun: 0xa8b8ff, sunI: 1.15, sunPos: [6, 12, -5],
    grassBase: 0x2a4a38, grassTip: 0x6f9878, grassDry: 0x9aa086, grassLight: 0.6,
    flies: 1.3, fliesColor: 0xd8ff7a, fire: 12,
  },
};
const QUALITY = {
  low: { name: 'Низкое', pr: 1, maxPr: 1 },
  med: { name: 'Среднее', pr: 1.5, maxPr: 1.5 },
  high: { name: 'Высокое', pr: 2, maxPr: 2 },
};
const WIND = [{ name: 'Штиль', s: 0.35 }, { name: 'Ветер', s: 1 }, { name: 'Буря', s: 2.1 }];

const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)').matches;
const dpr = window.devicePixelRatio || 1;

// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 2, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
renderer.setClearColor(0x000000);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 90);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2); scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog(0x000000, 20, 45);

const world = buildWorld(scene);
const fx = new FX(scene);
const hero = new Hero(scene);
const mobs = new Mobs(scene, fx);
const input = new Input(document.getElementById('joyBase'), document.getElementById('joyKnob'), document.getElementById('atk'));

// ---------- settings ----------
const state = {
  preset: params.get('t') === 'dusk' ? 'dusk' : 'day',
  quality: params.get('q') || (coarse ? 'med' : 'high'),
  wind: 1, outlines: true, autoTuned: false,
};
function applyPreset() {
  const p = PRESETS[state.preset];
  scene.fog.color.set(p.fog); scene.fog.near = p.fogNear; scene.fog.far = p.fogFar;
  renderer.setClearColor(p.fog);
  hemi.color.set(p.sky); hemi.groundColor.set(p.groundCol); hemi.intensity = p.hemi;
  sun.color.set(p.sun); sun.intensity = p.sunI; sun.userData.offset = new THREE.Vector3(...p.sunPos);
  world.setPreset(p);
  ui.preset.textContent = '☀ ' + p.name;
}
function applyQuality() {
  const q = QUALITY[state.quality];
  renderer.setPixelRatio(Math.min(dpr, q.maxPr));
  world.setQuality(state.quality);
  setOutlines(state.outlines && state.quality !== 'low');
  fx.sparkMat.uniforms.uPR.value = world.flyMat.uniforms.uPR.value = renderer.getPixelRatio();
  ui.quality.textContent = '⚙ ' + q.name;
  resize();
}
function setOutlines(on) {
  mobs.setOutlines(on); hero.olMat.visible = on; world.setOutlines(on);
  ui.outline.textContent = on ? '✎ Контур: вкл' : '✎ Контур: выкл';
}
function applyWind() { U.uWindStr.value = WIND[state.wind].s; ui.wind.textContent = '≋ ' + WIND[state.wind].name; }

const ui = {
  preset: document.getElementById('bPreset'), quality: document.getElementById('bQuality'),
  wind: document.getElementById('bWind'), outline: document.getElementById('bOutline'), stats: document.getElementById('stats'),
};
ui.preset.onclick = () => { state.preset = state.preset === 'day' ? 'dusk' : 'day'; applyPreset(); };
ui.quality.onclick = () => { state.quality = { low: 'med', med: 'high', high: 'low' }[state.quality]; state.autoTuned = true; applyQuality(); };
ui.wind.onclick = () => { state.wind = (state.wind + 1) % WIND.length; applyWind(); };
ui.outline.onclick = () => { state.outlines = !state.outlines; setOutlines(state.outlines && state.quality !== 'low'); };

// ---------- camera ----------
const CAM_YAW = Math.PI / 4, CAM_PITCH = 0.74;
const camTarget = new THREE.Vector3();
let camDist = 14, shake = 0;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // portrait phones: pull back so the same world width stays visible
  camDist = w / h < 1 ? 14 * Math.min(1.55, 1 / (w / h) * 0.85) : 14;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
function updateCamera(dt) {
  const lead = new THREE.Vector3(hero.vel.x, 0, hero.vel.y).multiplyScalar(0.28);
  const goal = new THREE.Vector3(hero.pos.x, hero.pos.y + 0.6, hero.pos.z).add(lead);
  camTarget.lerp(goal, 1 - Math.exp(-5 * dt));
  const off = new THREE.Vector3(Math.sin(CAM_YAW) * Math.cos(CAM_PITCH), Math.sin(CAM_PITCH), Math.cos(CAM_YAW) * Math.cos(CAM_PITCH)).multiplyScalar(camDist);
  camera.position.copy(camTarget).add(off);
  if (shake > 0) { shake = Math.max(0, shake - dt * 2.5); const m = shake * shake * 0.35; camera.position.x += (Math.random() - .5) * m; camera.position.y += (Math.random() - .5) * m; }
  camera.lookAt(camTarget);
  U.uCam.value.copy(camera.position); U.uFocus.value.set(hero.pos.x, hero.pos.y + 0.8, hero.pos.z);
  sun.position.copy(camTarget).add(sun.userData.offset); sun.target.position.copy(camTarget);
}

// ---------- gameplay glue ----------
let hitStop = 0;
hero.onHit = (p, yaw, dir) => {
  fx.slash(p, yaw, dir);
  const n = mobs.slash(p, yaw);
  if (n) { hitStop = 0.055; shake = Math.min(1, shake + 0.35); }
};
const origTakeHit = hero.takeHit.bind(hero);
hero.takeHit = d => { origTakeHit(d); shake = Math.min(1, shake + 0.5); fx.burst(hero.pos, 0xff6a5a, 8, 3); };

const right = new THREE.Vector2(Math.cos(CAM_YAW), -Math.sin(CAM_YAW)), fwd = new THREE.Vector2(-Math.sin(CAM_YAW), -Math.cos(CAM_YAW));
const mv = new THREE.Vector2();
function step(dt, t) {
  const m = input.read();
  mv.set(right.x * m.x - fwd.x * m.y, right.y * m.x - fwd.y * m.y);
  // Archero rule: stand still near an enemy → the hero fights on his own; hold attack to swing anywhere
  const near = mobs.nearest(hero.pos, input.attackHeld ? 3.2 : 2.1);
  if (near && (input.attackHeld || mv.lengthSq() < 0.01)) hero.attack(Math.atan2(near.pos.x - hero.pos.x, near.pos.z - hero.pos.z));
  else if (input.attackHeld) hero.attack();
  hero.update(dt, mv, t);
  // hero vs obstacles and arena edge
  for (const c of world.colliders) {
    const dx = hero.pos.x - c.x, dz = hero.pos.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.32;
    if (d < r && d > 1e-4) { hero.pos.x += dx / d * (r - d); hero.pos.z += dz / d * (r - d); }
  }
  const rr = Math.hypot(hero.pos.x, hero.pos.z); if (rr > ARENA) { hero.pos.x *= ARENA / rr; hero.pos.z *= ARENA / rr; }
  hero.pos.y = heightAt(hero.pos.x, hero.pos.z);
  mobs.update(dt, hero, world.colliders);
  fx.update(dt);
  const blobs = [{ x: hero.pos.x, z: hero.pos.z, r: 0.55, w: 1 }, ...mobs.blobs()];
  world.update(t, camTarget, blobs);
}

// ---------- loop + stats + adaptive quality ----------
let last = performance.now(), t = 0, frames = 0, acc = 0, fps = 60, perfAcc = 0, perfN = 0, startT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min((now - last) / 1000, 1 / 20); last = now;
  frames++; acc += dt;
  if (acc >= 0.5) { fps = frames / acc; frames = 0; acc = 0; drawStats(); }
  if (hitStop > 0) { hitStop -= dt; dt *= 0.08; }
  t += dt; U.uTime.value = t;
  step(dt, t);
  updateCamera(dt);
  renderer.render(scene, camera);
  // one automatic downgrade if the device struggles during the first seconds
  startT += dt;
  if (!state.autoTuned && startT > 2) {
    perfAcc += fps; perfN++;
    if (startT > 5) {
      state.autoTuned = true;
      if (perfAcc / perfN < 42 && state.quality !== 'low') { state.quality = state.quality === 'high' ? 'med' : 'low'; applyQuality(); }
    }
  }
}
function drawStats() {
  const i = renderer.info.render;
  ui.stats.textContent = `${fps.toFixed(0)} FPS · ${i.calls} draw · ${(i.triangles / 1000).toFixed(0)}k tri · ×${renderer.getPixelRatio()}`;
}

applyPreset(); applyQuality(); applyWind();
hero.pos.set(0, 0, 0); hero.yaw = hero.targetYaw = Math.PI * 0.25;
camTarget.set(0, 0.6, 0);
document.getElementById('loading').remove();
requestAnimationFrame(frame);
// debug hook for automated screenshots: advance the simulation without waiting for real frames
const advance = sec => { for (let i = 0; i < sec * 60; i++) { t += 1 / 60; U.uTime.value = t; step(1 / 60, t); updateCamera(1 / 60); } };
window.__game = { hero, mobs, fx, world, renderer, state, camera, input, advance };
