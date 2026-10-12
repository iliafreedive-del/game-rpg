// Живность деревни (только вид, без игровой логики): куры и собаки бродят вокруг своего места (json.critters генератора),
// обходят препятствия по карте зоны (map.free), куры клюют землю и разбегаются от героя, собаки садятся, виляют хвостом (только рядом с героем)
// и подходят к герою, если он рядом. Модели — процедурные, из частей kit, анимация — повороты групп (ноги, голова, хвост).
// Собака и куры из Meshy. Собаки (assets/models/dog_town.glb тёмная и dog_brown.glb светлая, риг серого волка, tools/art/meshy.py) — через glbmob.js: ходьба/покой — её анимации,
// «села» — лечь на живот (поза смерти зверя). Куры (chicken_white/chicken_red.glb) без своего скелета остаются на ПРЕЖНЕМ процедурном риге:
// те же группы body / head / ноги и та же анимация, сетка Meshy привязана к ним весами (chickenGlb). Пока файлы не загрузились или «Новые модели» выключены — процедурные.
import * as THREE from '../vendor/three.module.min.js';
import { toon, outline } from './toon.js';
import { OUTLINE } from './style.js';
import { shared, disposeObject } from './dispose.js';

// Курица из Meshy на прежнем риге: кости = те же группы (тело в начале координат, голова (0; 0,4; 0,2), ноги (±0,07; 0,18; 0)), веса — по положению вершины
const CH_GEO = new Map();
function chickenGeo(kit, name) {
  if (CH_GEO.has(name)) return CH_GEO.get(name);
  const d = kit.mob.meshData(name); if (!d) return null;
  const g = d.geometry.clone(); g.computeBoundingBox(); const bb = g.boundingBox, k = 0.6 / (bb.max.y - bb.min.y);   // рост как у процедурной (гребень ≈ 0,6 м до масштаба)
  g.translate(0, -bb.min.y, 0); g.scale(k, k, k);
  const pos = g.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let wh = ss(0.34, 0.44, y) * ss(0.08, 0.18, z), wl = 1 - ss(0.09, 0.17, y); const t = wh + wl; if (t > 1) { wh /= t; wl /= t; }
    const sr = ss(-0.02, 0.02, x);   // +x — вторая нога
    si.set([0, 1, 2, 3], i * 4); sw.set([1 - wh - wl, wh, wl * (1 - sr), wl * sr], i * 4);
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.computeBoundingSphere(); const r = { geometry: shared(g), map: d.map }; CH_GEO.set(name, r); return r;
}
const glbChicken = (kit, v) => kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded(v ? 'chicken_red' : 'chicken_white');
function chickenGlb(kit, v) {
  const D = chickenGeo(kit, v ? 'chicken_red' : 'chicken_white'); if (!D) return null;
  const root = new THREE.Group(), body = new THREE.Bone(), head = new THREE.Bone(), legs = [-1, 1].map(s => { const b = new THREE.Bone(); b.position.set(s * 0.07, 0.18, 0); body.add(b); return b; });
  head.position.set(0, 0.4, 0.2); body.add(head);
  const mat = toon(0xffffff, { rim: 0.35, rimColor: 0xffe2b8, side: THREE.DoubleSide, ao: 0.75, aoH: 0.5 });
  mat.map = D.map; if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.SkinnedMesh(D.geometry, mat); mesh.add(body); mesh.bind(new THREE.Skeleton([body, head, ...legs]));
  mesh.frustumCulled = false; mesh.castShadow = true; mesh.userData.noBake = true; mesh.userData.noOutline = true;
  const ol = new THREE.SkinnedMesh(D.geometry, outline({ width: OUTLINE.small / 1.4, color: OUTLINE.heroColor })); ol.userData.isOutline = true; ol.userData.noBake = true; ol.frustumCulled = false;
  mesh.add(ol); ol.bind(mesh.skeleton, mesh.bindMatrix);
  root.add(mesh); root.scale.setScalar(1.35 + (v ? 0.08 : 0));
  return { root, body, head, legs, glb: true };
}
function chicken(kit, v, proc = false) {
  if (!proc && glbChicken(kit, v)) { const m = chickenGlb(kit, v); if (m) return m; }
  const { part, merge, ball } = kit, mat = kit.propMat({ rim: 0.35 }), root = new THREE.Group();
  const C = v ? [0xa8582a, 0xd88a4a] : [0xe8e0d0, 0xfffaf0], body = new THREE.Group(); root.add(body);
  body.add(new THREE.Mesh(merge([
    ball(0.2, C[0], [0, 0.3, 0], [1.05, 0.95, 1.35], { top: C[1] }),
    part(new THREE.ConeGeometry(0.12, 0.26, 6), v ? 0x3a2a1a : C[0], [0, 0.42, -0.24], [-0.9, 0, 0], [1, 1, 0.6], { top: v ? 0x6a4a2a : C[1] }),
    ball(0.12, C[0], [0.17, 0.32, -0.02], [0.4, 0.7, 1.3], { top: C[1] }), ball(0.12, C[0], [-0.17, 0.32, -0.02], [0.4, 0.7, 1.3], { top: C[1] }),
  ]), mat));
  const head = new THREE.Group(); head.position.set(0, 0.4, 0.2); body.add(head);
  head.add(new THREE.Mesh(merge([
    ball(0.085, C[0], [0, 0.1, 0.04], 1, { top: C[1] }),
    part(new THREE.ConeGeometry(0.03, 0.08, 4), 0xe8a020, [0, 0.09, 0.14], [Math.PI / 2, 0, 0]),
    part(new THREE.BoxGeometry(0.025, 0.06, 0.09), 0xd82a2a, [0, 0.19, 0.04]), part(new THREE.SphereGeometry(0.025, 5, 4), 0xd82a2a, [0, 0.04, 0.11], 0, [0.8, 1.3, 0.8]),
    part(new THREE.SphereGeometry(0.014, 4, 3), 0x101010, [0.06, 0.12, 0.08]), part(new THREE.SphereGeometry(0.014, 4, 3), 0x101010, [-0.06, 0.12, 0.08]),
  ]), mat));
  const legs = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.07, 0.18, 0); g.add(new THREE.Mesh(merge([part(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 4), 0xe8a020, [0, -0.09, 0]), part(new THREE.BoxGeometry(0.08, 0.015, 0.09), 0xe8a020, [0, -0.18, 0.03])]), mat)); body.add(g); return g; });
  root.scale.setScalar(1.35 + (v ? 0.08 : 0));   // чуть крупнее жизни — иначе с высоты камеры кур не разглядеть
  return { root, body, head, legs };
}
// сборка 55: две собаки — две модели Meshy на риге волка: тёмная (dog_town, у кузницы) и светлая рыжая (dog_brown, на площади)
const DOG_GLB = coat => coat ? 'dog_brown' : 'dog_town';
const glbDog = (kit, coat) => kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded(DOG_GLB(coat));
function dog(kit, coat, proc = false) {
  if (!proc && glbDog(kit, coat)) {
    const m = kit.mob.buildMob(kit, DOG_GLB(coat), { height: 0.95, radius: 0.3, rimColor: 0xffe2b8, speed0: 1.1 });
    if (m) return { root: m.root, body: m.bones.body, glb: m };
  }
  const { part, merge, ball } = kit, mat = kit.propMat({ rim: 0.35 }), root = new THREE.Group();
  const C = coat ? [0x2a241e, 0x5a4a3a, 0xd8cdb8] : [0x8a5a2a, 0xc8925a, 0xf0e6d0], body = new THREE.Group(); root.add(body);
  body.add(new THREE.Mesh(merge([
    part(new THREE.CapsuleGeometry(0.17, 0.5, 4, 8), C[0], [0, 0.5, 0], [Math.PI / 2, 0, 0], 1, { top: C[1] }),
    ball(0.16, C[2], [0, 0.46, 0.28], [0.9, 0.9, 0.8]),
  ]), mat));
  const head = new THREE.Group(); head.position.set(0, 0.62, 0.38); body.add(head);
  head.add(new THREE.Mesh(merge([
    ball(0.13, C[0], [0, 0.06, 0.02], [1, 0.95, 1.05], { top: C[1] }),
    part(new THREE.BoxGeometry(0.11, 0.09, 0.16), C[2], [0, 0.0, 0.15]), part(new THREE.SphereGeometry(0.03, 5, 4), 0x101010, [0, 0.03, 0.24]),
    part(new THREE.ConeGeometry(0.06, 0.16, 4), C[0], [0.1, 0.08, -0.02], [0.3, 0, -0.9], [1, 1, 0.5]), part(new THREE.ConeGeometry(0.06, 0.16, 4), C[0], [-0.1, 0.08, -0.02], [0.3, 0, 0.9], [1, 1, 0.5]),
    part(new THREE.SphereGeometry(0.018, 4, 3), 0x101010, [0.055, 0.1, 0.11]), part(new THREE.SphereGeometry(0.018, 4, 3), 0x101010, [-0.055, 0.1, 0.11]),
  ]), mat));
  const tail = new THREE.Group(); tail.position.set(0, 0.6, -0.4); body.add(tail);
  tail.add(new THREE.Mesh(merge([kit.tube([[0, 0, 0], [0, 0.12, -0.12], [0, 0.26, -0.16]], 0.04, 0.015, C[0], { top: C[1] }, 5)]), mat));
  const legs = [[0.1, 0.3], [-0.1, 0.3], [0.1, -0.28], [-0.1, -0.28]].map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0.42, z); g.add(new THREE.Mesh(merge([part(new THREE.CylinderGeometry(0.045, 0.035, 0.42, 5), C[0], [0, -0.21, 0], 0, 1, { top: C[1] }), part(new THREE.SphereGeometry(0.045, 5, 4), C[2], [0, -0.41, 0.02])]), mat)); body.add(g); return g; });
  root.scale.setScalar(1.25);
  return { root, body, head, legs, tail };
}

const makeDog = dog;

// прежняя процедурная собака в формате моделей (для «Было» в просмотре lab/beasts.html): те же движения, что в деревне;
// «смерть» — села, как собаки деревни
export function dogModel(kit, coat = 1) {
  const m = dog(kit, coat, true); let ph = 0, sit = 0;
  const pose = (a, sp, s) => {
    ph += a.dt * 9 * sp / 1.5; sit += (s - sit) * Math.min(1, a.dt * 5);
    const v = sp ? 1 : 0, sw = Math.sin(ph) * v;
    m.body.rotation.x = -0.42 * sit; m.body.position.y = -0.1 * sit; m.body.position.z = -0.12 * sit;
    m.legs[0].rotation.x = sw * 0.6 + 0.4 * sit; m.legs[3].rotation.x = sw * 0.6 - 1.2 * sit; m.legs[1].rotation.x = -sw * 0.6 + 0.4 * sit; m.legs[2].rotation.x = -sw * 0.6 - 1.2 * sit;
    m.tail.rotation.y = Math.sin(a.t * 5) * 0.3; m.tail.rotation.x = -0.3 + sit * 0.6;
    m.head.rotation.x = 0.2 * sit + Math.sin(a.t * 1.3) * 0.06; m.head.rotation.y = sp ? 0 : Math.sin(a.t * 0.6) * 0.4;
  };
  return {
    root: m.root, height: 0.95, radius: 0.3, shadow: 1.1, materials: [], sockets: {},
    bones: { body: m.body, head: m.head, tail: m.tail, l0: m.legs[0], l1: m.legs[1], l2: m.legs[2], l3: m.legs[3] },
    clips: { idle: { loop: true }, walk: { loop: true }, death: { dur: 1 } },
    anims: { idle: a => pose(a, 0, 0), walk: a => pose(a, a.speed || 1.5, 0), death: a => pose(a, 0, 1) },
  };
}   // внутри update имя dog занято признаком «это собака»

// курица в формате моделей (для просмотра lab/beasts.html): proc — прежняя процедурная («Было»), иначе Meshy на том же риге; движения — как в деревне
export function chickenModel(kit, v = 0, proc = false) {
  const m = chicken(kit, !!v, proc); let ph = 0, peck = 0, lie = 0;
  const pose = (a, sp, pk, dead) => {
    ph += a.dt * 14 * sp / 0.8; peck += (pk - peck) * Math.min(1, a.dt * 12); lie += (dead - lie) * Math.min(1, a.dt * 6);
    const sw = Math.sin(ph) * (sp ? 1 : 0);
    m.legs[0].rotation.x = sw * 0.7; m.legs[1].rotation.x = -sw * 0.7; m.body.position.y = Math.abs(Math.sin(ph)) * 0.03 * (sp ? 1 : 0) - 0.12 * lie;
    m.body.rotation.x = peck * 0.45; m.body.rotation.z = 1.45 * lie; m.head.rotation.x = peck * 0.6 + Math.sin(ph * 2) * 0.12 * (sp ? 1 : 0); m.head.rotation.y = sp || pk || dead ? 0 : Math.sin(a.t * 2.1) * 0.6;
  };
  return {
    root: m.root, height: 0.8, radius: 0.25, shadow: 0.9, materials: [], sockets: {}, bones: { body: m.body, head: m.head, l0: m.legs[0], l1: m.legs[1] },
    clips: { idle: { loop: true }, walk: { loop: true }, attack: { dur: 0.8, hit: 0.5 }, hit: { dur: 0.3 }, death: { dur: 1 } },
    anims: { idle: a => pose(a, 0, 0, 0), walk: a => pose(a, a.speed || 0.8, 0, 0), attack: a => pose(a, 0, Math.max(0, Math.sin((a.k ?? 0) * 18)), 0), hit: a => pose(a, 0, 0, 0), death: a => pose(a, 0, 0, 1) },
  };
}

export class Critters {
  constructor(scene, kit, zone) {
    this.scene = scene; this.kit = kit; this.map = zone.map; this.list = [];
    let k = 0;
    for (const c of zone.json.critters || []) {
      const red = c.k === 'dog' ? false : (k++) % 3 === 1, m = c.k === 'dog' ? dog(kit, c.coat) : chicken(kit, red);
      if (!m.glb) m.root.traverse(o => { if (o.isMesh) { o.castShadow = o.parent === m.body; o.receiveShadow = false; o.userData.noOutline = true; } });
      const [x, y] = this.map.nearestFree ? this.map.nearestFree(c.x, c.y, 0.25) : [c.x, c.y];
      const a = { ...c, m, red, x, y, hx: x, hy: y, yaw: Math.random() * 6.28, tx: x, ty: y, st: 'idle', t: Math.random() * 2, ph: Math.random() * 6, v: 0 };
      scene.add(m.root); this.list.push(a);
    }
  }
  pick(a) {   // новая точка в пределах своего места, куда можно пройти
    for (let i = 0; i < 8; i++) { const r = Math.sqrt(Math.random()) * a.r, an = Math.random() * 6.283, x = a.hx + Math.cos(an) * r, y = a.hy + Math.sin(an) * r; if (this.map.free(x, y, 0.25)) { a.tx = x; a.ty = y; return true; } }
    return false;
  }
  update(dt, t, P, cx, cz) {
    for (const a of this.list) {
      const dog = a.k === 'dog', dP = P ? Math.hypot(P.x - a.x, P.y - a.y) : 99;
      // GLB собаки догрузился после входа в деревню — заменить процедурную
      if (dog && !a.m.glb && glbDog(this.kit, a.coat)) { const n = makeDog(this.kit, a.coat); if (n.glb) { a.m.root.removeFromParent(); this.scene.add(n.root); a.m = n; } }
      else if (!dog && !a.m.glb && glbChicken(this.kit, a.red)) { const n = chicken(this.kit, a.red); if (n.glb) { a.m.root.removeFromParent(); this.scene.add(n.root); a.m = n; } }
      const m = a.m;
      m.root.visible = Math.hypot(a.x - cx, a.y - cz) < 34;
      a.t -= dt;
      // решение
      if (!dog && dP < 2.2 && a.st !== 'flee') { a.st = 'flee'; a.t = 0.9 + Math.random() * 0.4; const an = Math.atan2(a.y - P.y, a.x - P.x) + (Math.random() - 0.5); a.tx = a.x + Math.cos(an) * 3; a.ty = a.y + Math.sin(an) * 3; }
      else if (dog && dP < 5 && Math.hypot(P.x - a.hx, P.y - a.hy) < a.r + 4) { if (dP > 1.8) { a.st = 'walk'; a.tx = P.x; a.ty = P.y; } else if (a.st !== 'sit') { a.st = 'greet'; } a.t = 1; }
      else if (a.t <= 0) {
        const r = Math.random();
        if (a.st === 'walk' || a.st === 'flee') { a.st = dog ? (r < 0.45 ? 'sit' : 'idle') : (r < 0.6 ? 'peck' : 'idle'); a.t = dog ? 3 + Math.random() * 5 : 1 + Math.random() * 2.5; }
        else if (this.pick(a)) { a.st = 'walk'; a.t = 6; }
        else a.t = 1;
      }
      // движение
      let sp = a.st === 'walk' ? (dog ? 1.5 : 0.8) : a.st === 'flee' ? 3.2 : 0;
      if (sp) {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d < 0.15 || (dog && a.tx === P.x && d < 1.8)) { sp = 0; if (a.st === 'walk') a.t = 0; }
        else {
          const st = Math.min(d, sp * dt), nx = a.x + dx / d * st, ny = a.y + dy / d * st;
          if (this.map.free(nx, ny, 0.22)) { a.x = nx; a.y = ny; } else { sp = 0; a.t = 0; a.st = 'idle'; }
          let dyaw = Math.atan2(dx, dy) - a.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); a.yaw += dyaw * Math.min(1, dt * 8);
        }
      } else if (dog && P && dP < 5) { let dyaw = Math.atan2(P.x - a.x, P.y - a.y) - a.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); a.yaw += dyaw * Math.min(1, dt * 4); }
      a.v += ((sp ? 1 : 0) - a.v) * Math.min(1, dt * 10); a.ph += dt * (dog ? 9 : 14) * (sp ? sp / (dog ? 1.5 : 0.8) : 0);
      m.root.position.set(a.x, 0, a.y); m.root.rotation.y = a.yaw;
      // анимация
      const sw = Math.sin(a.ph) * a.v;
      // хвост: виляет, только когда герой рядом (плавно включается и затихает)
      if (dog) a.wag = (a.wag || 0) + ((dP < 3.5 ? 1 : 0) - (a.wag || 0)) * Math.min(1, dt * 4);
      // сборка 59: фаза хвоста — своя. Раньше она шла от a.ph (фаза шага), и пока собака бежала к герою, хвост «трясся» ~10 раз в секунду.
      // Теперь: подходит — спокойно, ~1 взмах в секунду; дошла до героя — чаще и шире, радостно
      if (dog) { const joy = dP < 2.1 && !sp ? 1 : 0; a.joy = (a.joy || 0) + (joy - (a.joy || 0)) * Math.min(1, dt * 2.5); a.wt = (a.wt || 0) + dt * (6 + 9 * a.joy); }
      if (dog && m.glb) {
        // ходьба и покой — анимации модели; «села» — легла на живот, голова к герою — поворотом всего зверя (уже выше)
        const sit = a.st === 'sit' ? 1 : 0; a.sit = (a.sit || 0) + (sit - (a.sit || 0)) * Math.min(1, dt * 3);
        // сборка 55: поведение как у первой собаки — садится (а не ложится «замертво»), в покое оглядывается по сторонам
        const A = { t: t + a.ph, dt, speed: sp, k: a.sit, wag: a.wag * (1 + 0.45 * a.joy), wt: a.wt, look: a.st === 'idle' || a.st === 'sit' ? 0.4 : 0.12 };
        if (a.sit > 0.02) m.glb.anims.sit(A); else if (sp) m.glb.anims.walk(A); else m.glb.anims.idle(A);
      } else if (dog) {
        const sit = a.st === 'sit' ? 1 : 0; a.sit = (a.sit || 0) + (sit - (a.sit || 0)) * Math.min(1, dt * 5);
        m.body.rotation.x = -0.42 * a.sit; m.body.position.y = -0.1 * a.sit; m.body.position.z = -0.12 * a.sit;
        m.legs[0].rotation.x = sw * 0.6 + 0.4 * a.sit; m.legs[3].rotation.x = sw * 0.6 - 1.2 * a.sit; m.legs[1].rotation.x = -sw * 0.6 + 0.4 * a.sit; m.legs[2].rotation.x = -sw * 0.6 - 1.2 * a.sit;
        m.tail.rotation.y = Math.sin(a.wt) * 0.45 * a.wag * (1 + 0.45 * a.joy); m.tail.rotation.x = -0.3 + a.sit * 0.6;
        m.head.rotation.x = 0.2 * a.sit + Math.sin(t * 1.3 + a.ph) * 0.06; m.head.rotation.y = a.st === 'idle' ? Math.sin(t * 0.6 + a.ph) * 0.4 : 0;
      } else {
        m.legs[0].rotation.x = sw * 0.7; m.legs[1].rotation.x = -sw * 0.7; m.body.position.y = Math.abs(Math.sin(a.ph)) * 0.03 * a.v;
        const peck = a.st === 'peck' ? Math.max(0, Math.sin(t * 7 + a.ph)) : 0;
        m.body.rotation.x = peck * 0.45; m.head.rotation.x = peck * 0.6 + Math.sin(a.ph * 2) * 0.12 * a.v;
        m.head.rotation.y = a.st === 'idle' ? Math.sin(t * 2.1 + a.ph) * 0.6 : 0;
      }
    }
  }
  dispose() { for (const a of this.list) disposeObject(a.m.root); this.list = []; }
}
