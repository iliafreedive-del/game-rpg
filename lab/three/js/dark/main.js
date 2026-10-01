// DARK ASCENT — dark-fantasy style demo ("bone, brass and abyss"). Entry point: renderer, night lighting, camera, game loop.
import * as THREE from '../../vendor/three.module.min.js';
import { U } from '../toon.js';
import { FX } from '../fx.js';
import { Input } from '../input.js';
import { ARENA, heightAt } from '../world.js';
import { buildWorld, toWorld, ARCH } from './world.js';
import { DarkHero } from './hero.js';
import { Mobs } from './mobs.js';

const params = new URLSearchParams(location.search);
const LOOK = window.LOOK || params.get('look') || 'dark', TORCH = LOOK === 'torch';
const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 2, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 160);
const FOG = TORCH ? 0x1d3836 : 0x12102a;
renderer.setClearColor(FOG);
scene.fog = TORCH ? new THREE.Fog(FOG, 38, 95) : new THREE.Fog(FOG, 22, 50);

const WARM = TORCH ? 26 : 18;
// night: cold sky/ground ambient, a moon key from the camera side, ONE roaming warm torch light and ONE violet light at the gate
const hemi = TORCH ? new THREE.HemisphereLight(0x8fb0a4, 0x4a3826, 1.1) : new THREE.HemisphereLight(0x6a86c8, 0x121a34, 1.2); scene.add(hemi);
const moon = TORCH ? new THREE.DirectionalLight(0xffd8a0, 1.7) : new THREE.DirectionalLight(0x9fb2ff, 1.5); scene.add(moon, moon.target);
const warm = new THREE.PointLight(0xff9a4a, WARM, TORCH ? 15 : 11, 1.5); scene.add(warm);
const violet = new THREE.PointLight(0x9a62ff, 9, 9, 1.6); scene.add(violet);

const world = buildWorld(scene, LOOK);
const gate = toWorld(0, 1.0); violet.position.set(gate.x, 2.0, gate.z);
const fx = new FX(scene);
fx.slashes.forEach(x => x.mesh.material.uniforms.uColor.value.set(0xc9a8ff));      // abyss-violet slash arcs
const hero = new DarkHero(scene);
const mobs = params.get('mobs') === '0' ? null : new Mobs(scene, fx);
const input = new Input(document.getElementById('joyBase'), document.getElementById('joyKnob'), document.getElementById('atk'));

// ---------- settings ----------
const QUALITY = { low: { name: 'Низкое', pr: 1 }, med: { name: 'Среднее', pr: 1.5 }, high: { name: 'Высокое', pr: 2 } };
const WIND = [{ name: 'Штиль', s: 0.35 }, { name: 'Ветер', s: 1 }, { name: 'Буря', s: 2.1 }];
const state = { quality: params.get('q') || (matchMedia('(pointer: coarse)').matches ? 'med' : 'high'), outlines: true, wind: 1, autoTuned: false };
const ui = { quality: document.getElementById('bQuality'), outline: document.getElementById('bOutline'), wind: document.getElementById('bWind'), stats: document.getElementById('stats') };
function applyOutlines() {
  const on = state.outlines && state.quality !== 'low';
  world.setOutlines(on); hero.olMat.visible = on; mobs && mobs.setOutlines(on);
  ui.outline.textContent = state.outlines ? '✎ Контур: вкл' : '✎ Контур: выкл';
}
function applyQuality() {
  renderer.setPixelRatio(Math.min(dpr, QUALITY[state.quality].pr));
  world.setQuality(state.quality); applyOutlines();
  fx.sparkMat.uniforms.uPR.value = world.moteMat.uniforms.uPR.value = renderer.getPixelRatio();
  ui.quality.textContent = '⚙ ' + QUALITY[state.quality].name; resize();
}
function applyWind() { U.uWindStr.value = WIND[state.wind].s; ui.wind.textContent = '≋ ' + WIND[state.wind].name; }
ui.quality.onclick = () => { state.quality = { low: 'med', med: 'high', high: 'low' }[state.quality]; state.autoTuned = true; applyQuality(); };
ui.outline.onclick = () => { state.outlines = !state.outlines; applyOutlines(); };
ui.wind.onclick = () => { state.wind = (state.wind + 1) % WIND.length; applyWind(); };

// ---------- camera: hero sits in the lower third so the tall gate stays in frame ----------
const CAM_YAW = Math.PI / 4, CAM_PITCH = TORCH ? 0.64 : 0.74, AIM = TORCH ? 1.0 : 2.6   // torch: low, forward-tilted camera, hero high in frame;
const camTarget = new THREE.Vector3();
const BASE = TORCH ? 30 : 15;
let camDist = BASE, shake = 0;
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  camDist = w / h < 1 ? BASE * Math.min(1.5, 1 / (w / h) * 0.85) : BASE;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
function updateCamera(dt) {
  const goal = new THREE.Vector3(hero.pos.x - Math.SQRT1_2 * AIM + hero.vel.x * 0.25, hero.pos.y + 0.8, hero.pos.z - Math.SQRT1_2 * AIM + hero.vel.y * 0.25);
  camTarget.lerp(goal, 1 - Math.exp(-5 * dt));
  const off = new THREE.Vector3(Math.sin(CAM_YAW) * Math.cos(CAM_PITCH), Math.sin(CAM_PITCH), Math.cos(CAM_YAW) * Math.cos(CAM_PITCH)).multiplyScalar(camDist);
  camera.position.copy(camTarget).add(off);
  if (shake > 0) { shake = Math.max(0, shake - dt * 2.5); const m = shake * shake * 0.4; camera.position.x += (Math.random() - .5) * m; camera.position.y += (Math.random() - .5) * m; }
  camera.lookAt(camTarget);
  if (window.__dbgCam) { const y = hero.yaw; camera.position.set(hero.pos.x + Math.cos(y) * 5.6 * window.__dbgCam, hero.pos.y + 1.2, hero.pos.z - Math.sin(y) * 5.6 * window.__dbgCam); camera.lookAt(hero.pos.x, hero.pos.y + 0.9, hero.pos.z); }   // debug: side view for animation checks
  U.uCam.value.copy(camera.position); U.uFocus.value.set(hero.pos.x, hero.pos.y + 1.0, hero.pos.z);
  moon.position.copy(camTarget).add(new THREE.Vector3(9, 12, 3)); moon.target.position.copy(camTarget);
}

// ---------- gameplay glue ----------
let hitStop = 0;
hero.onHit = (p, yaw, dir) => {
  fx.slash(p, yaw, dir);
  const n = mobs ? mobs.slash(p, yaw) : 0;
  if (n) { hitStop = 0.06; shake = Math.min(1, shake + 0.4); }
};
const origTakeHit = hero.takeHit.bind(hero);
hero.takeHit = d => { origTakeHit(d); shake = Math.min(1, shake + 0.5); fx.burst({ x: hero.pos.x, y: hero.pos.y + 0.8, z: hero.pos.z }, 0xff6a5a, 8, 3); };

const right = new THREE.Vector2(Math.cos(CAM_YAW), -Math.sin(CAM_YAW)), fwd = new THREE.Vector2(-Math.sin(CAM_YAW), -Math.cos(CAM_YAW));
const mv = new THREE.Vector2();
function lights(t) {
  // warm light hops to the torch nearest to the hero and flickers; violet breathes
  const f = 0.82 + Math.sin(t * 13) * 0.08 + Math.sin(t * 23.7) * 0.06 + Math.sin(t * 5.1) * 0.06;
  warm.intensity = WARM * f; violet.intensity = 9 * (0.85 + Math.sin(t * 2.1) * 0.15);
  let best = world.torches[0], bd = 1e9;
  for (const q of world.torches) { const d = Math.hypot(q.x - hero.pos.x, q.z - hero.pos.z); if (d < bd) { bd = d; best = q; } }
  warm.position.lerp(best, 0.06);
}
function step(dt, t) {
  const m = input.read();
  mv.set(right.x * m.x - fwd.x * m.y, right.y * m.x - fwd.y * m.y);
  // Archero rule: stand still near an enemy → the hero fights on his own; hold attack to swing anywhere
  const near = mobs && mobs.nearest(hero.pos, input.attackHeld ? 3.6 : 2.5);
  if (near && (input.attackHeld || mv.lengthSq() < 0.01)) hero.attack(Math.atan2(near.pos.x - hero.pos.x, near.pos.z - hero.pos.z));
  else if (input.attackHeld) hero.attack();
  hero.update(dt, mv, t);
  for (const c of world.colliders) {
    const dx = hero.pos.x - c.x, dz = hero.pos.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.38;
    if (d < r && d > 1e-4) { hero.pos.x += dx / d * (r - d); hero.pos.z += dz / d * (r - d); }
  }
  const rr = Math.hypot(hero.pos.x, hero.pos.z); if (rr > ARENA) { hero.pos.x *= ARENA / rr; hero.pos.z *= ARENA / rr; }
  hero.pos.y = heightAt(hero.pos.x, hero.pos.z);
  if (mobs) mobs.update(dt, hero, world.colliders);
  fx.update(dt); lights(t);
  world.update(t, camTarget, [{ x: hero.pos.x, z: hero.pos.z, r: 0.7, w: 1 }, ...(mobs ? mobs.blobs() : [])], hero.pos);
}

// ---------- loop + stats + adaptive quality ----------
let last = performance.now(), t = 0, frames = 0, acc = 0, fps = 60, perfAcc = 0, perfN = 0, startT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min((now - last) / 1000, 1 / 20); last = now;
  frames++; acc += dt;
  if (acc >= 0.5) { fps = frames / acc; frames = 0; acc = 0; const i = renderer.info.render; ui.stats.textContent = `${fps.toFixed(0)} FPS · ${i.calls} draw · ${(i.triangles / 1000).toFixed(0)}k tri · ×${renderer.getPixelRatio()}`; }
  if (hitStop > 0) { hitStop -= dt; dt *= 0.08; }
  t += dt; U.uTime.value = t;
  step(dt, t); updateCamera(dt);
  renderer.render(scene, camera);
  startT += dt;
  if (!state.autoTuned && startT > 2) {
    perfAcc += fps; perfN++;
    if (startT > 5) { state.autoTuned = true; if (perfAcc / perfN < 42 && state.quality !== 'low') { state.quality = state.quality === 'high' ? 'med' : 'low'; applyQuality(); } }
  }
}

applyQuality(); applyWind();
{ const s = toWorld(0, 5.6); hero.pos.set(s.x, 0, s.z); hero.yaw = hero.targetYaw = -Math.PI * 0.75; warm.position.copy(world.torches[2]); }
camTarget.set(hero.pos.x - Math.SQRT1_2 * AIM, 0.8, hero.pos.z - Math.SQRT1_2 * AIM);
document.getElementById('loading').remove();
requestAnimationFrame(frame);
// debug hook for automated screenshots: advance the simulation without waiting for real frames
const advance = sec => { for (let i = 0; i < sec * 60; i++) { t += 1 / 60; U.uTime.value = t; step(1 / 60, t); updateCamera(1 / 60); } };
window.__game = { hero, mobs, fx, world, renderer, state, camera, input, advance, camTarget, setDist: d => { camDist = d; } };
