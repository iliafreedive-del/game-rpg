// Красота питомцев из Meshy (облики, сборка 66+): светящиеся точки на костях (глаза, жало) и искры от кости.
// Дёшево: ореол — спрайт с общей текстурой, искры — один Points на питомца (cosfx.Motes). Ничего не качается.
// halos: [кость, цвет, размер, смещение от кости (вперёд +Z), яркость]; глаза сняты лучом из снимка (lab/pets.html?focus=head); motes: кость + смещение, откуда летят искры; rim — цвет края тела.
import * as THREE from '../../../vendor/three.module.min.js';
import { Motes } from '../../cosfx.js';

export const PET_FX = {
  pet_fennec:   { rim: 0xffa050, halos: [['head', 0x50ff20, 0.11, [-0.082, -0.039, 0.08], 1.3], ['head', 0x50ff20, 0.11, [0.036, -0.037, 0.122], 1.3]] },   // правки: без огня хвоста, глаза как у костяного пса
  pet_crow:     { rim: 0xb070ff, halos: [['head', 0xff3020, 0.1, [-0.035, 0.005, 0.09], 1.3], ['head', 0xff3020, 0.1, [0.045, 0.005, 0.09], 1.3]],
                  motes: { bone: 'body', at: [0, 0, -0.1], rate: 5, colA: 0xc080ff, colB: 0x300050, grav: 0.5, size: 0.08, k: 1.4, sp: 0.3, up: 0, wobble: 0.3 } },
  pet_scorpid:  { rim: 0x90ff60, halos: [['tl6', 0x60ff30, 0.45, [0, 0.02, 0.06], 1]],
                  motes: { bone: 'tl6', at: [0, 0, 0.06], rate: 7, colA: 0xc0ff80, colB: 0x208000, grav: 2.5, size: 0.08, k: 1.8, sp: 0.04, up: 0 } },
  pet_wisp:     { rim: 0x80ffe0, halos: [['chest', 0x40e0c0, 1.2, [0, 0, 0], 0.55], ['chest', 0xe0fff8, 0.45, [0, 0, 0.02], 0.9]],
                  motes: { bone: 'body', at: [0, 0, 0], rate: 10, colA: 0xe0fff0, colB: 0x20b080, grav: -0.3, size: 0.09, k: 1.8, sp: 0.35, up: 0.2, wobble: 0.3 } },
  pet_skull:    { rim: 0x80ff60, halos: [['head', 0x50ff20, 0.16, [-0.095, -0.017, 0.18], 1.3], ['head', 0x50ff20, 0.16, [0.095, -0.017, 0.18], 1.3]],
                  motes: { bone: 'head', at: [0, 0.1, 0.12], rate: 12, colA: 0xc0ff90, colB: 0x10a020, grav: -1.4, size: 0.1, k: 2.0, sp: 0.1, up: 0.5 } },
  pet_basilisk: { rim: 0xc0ff60, halos: [['head', 0xffd020, 0.12, [-0.06, 0.136, 0.135], 1.3], ['head', 0xffd020, 0.12, [0.09, 0.136, 0.135], 1.3]],
                  motes: { bone: 'head', at: [0, 0, 0.18], rate: 4, colA: 0xe0ff80, colB: 0x308000, grav: 1.5, size: 0.07, k: 1.6, sp: 0.04, up: 0 } },
  pet_bat:      { rim: 0xd060ff, halos: [['head', 0xff2040, 0.09, [-0.03, -0.015, 0.08], 1.3], ['head', 0xff2040, 0.09, [0.015, -0.015, 0.08], 1.3], ['chest', 0x9030ff, 0.8, [0, 0, 0], 0.45]],
                  motes: { bone: 'chest', at: [0, 0, 0], rate: 6, colA: 0xd090ff, colB: 0x400080, grav: 0.4, size: 0.08, k: 1.5, sp: 0.3, up: -0.1, wobble: 0.2 } },
  pet_golem:    { rim: 0xffa040, halos: [['head', 0xffc040, 0.13, [-0.12, -0.037, 0.195], 1.3], ['head', 0xffc040, 0.13, [0.0, -0.037, 0.195], 1.3]] },   // правки: свет только в глазах (сбоку у груди и на кулаках был «подмышкой»)
};

let _tex = null;
function haloTex() {
  if (_tex || typeof document === 'undefined') return _tex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (_tex = new THREE.CanvasTexture(c));
}
// вешает ореолы на кости модели; возвращает { motes, at } для petFx (точка искр — пустой узел на кости)
export function addPetFx(name, B) {
  const F = PET_FX[name], t = haloTex(); if (!F || !t) return null;
  const halos = [];
  for (const [bone, color, size, p, k = 1] of F.halos || []) {
    if (!B[bone]) continue;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: new THREE.Color(color).multiplyScalar(k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    s.scale.setScalar(size); s.position.set(...p); s.userData.noOutline = true; s.userData.noBake = true; s.renderOrder = 5; B[bone].add(s); halos.push(s);
  }
  let at = null; const M = F.motes;
  if (M && B[M.bone]) { at = new THREE.Object3D(); at.position.set(...M.at); B[M.bone].add(at); }
  return { M, at, halos };
}
// каждый кадр: искры от кости (мировые координаты), лёгкое мерцание ореолов
const _v = new THREE.Vector3();
export function petFx(a, scene, dt, t) {
  const F = a.model.fx; if (!F) return;
  for (let i = 0; i < F.halos.length; i++) F.halos[i].material.opacity = 0.82 + 0.18 * Math.sin(t * 5 + i * 1.7);
  if (!F.at || a.root.visible === false) return;
  const M = F.M; if (!a.fxMotes) { a.fxMotes = new Motes(scene, 40, M); a.fxAcc = 0; }
  F.at.getWorldPosition(_v); a.fxAcc += dt * M.rate; const r = M.sp * (a.root.scale.x || 1);
  while (a.fxAcc >= 1) { a.fxAcc--; a.fxMotes.emit(_v.x + (Math.random() - 0.5) * r, _v.y + (Math.random() - 0.5) * r, _v.z + (Math.random() - 0.5) * r, (Math.random() - 0.5) * 0.3, M.up + Math.random() * 0.4, (Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.6); }
  a.fxMotes.update(dt);
}
