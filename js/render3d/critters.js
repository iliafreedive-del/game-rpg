// Живность деревни (только вид, без игровой логики): куры и собаки бродят вокруг своего места (json.critters генератора),
// обходят препятствия по карте зоны (map.free), куры клюют землю и разбегаются от героя, собаки садятся, виляют хвостом
// и подходят к герою, если он рядом. Модели — процедурные, из частей kit, анимация — повороты групп (ноги, голова, хвост).
// Собака из Meshy (assets/models/dog_town.glb, tools/art/meshy.py) — через glbmob.js: ходьба/покой — её анимации,
// «села» — лечь на живот (поза смерти зверя); пока файл не загрузился или «Новые модели» выключены — процедурная.
import * as THREE from '../vendor/three.module.min.js';

function chicken(kit, v) {
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
const DOG_GLB = 'dog_town';
const glbDog = kit => kit.mob && kit.skin.SKINS.on && kit.mob.mobLoaded(DOG_GLB);
function dog(kit, coat) {
  if (glbDog(kit)) {
    const m = kit.mob.buildMob(kit, DOG_GLB, { height: 0.95, radius: 0.3, rimColor: 0xffe2b8, tint: coat ? 0xffffff : 0xfff0dc, speed0: 1.1 });
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

const makeDog = dog;   // внутри update имя dog занято признаком «это собака»

export class Critters {
  constructor(scene, kit, zone) {
    this.scene = scene; this.kit = kit; this.map = zone.map; this.list = [];
    let k = 0;
    for (const c of zone.json.critters || []) {
      const m = c.k === 'dog' ? dog(kit, c.coat) : chicken(kit, (k++) % 3 === 1);
      if (!m.glb) m.root.traverse(o => { if (o.isMesh) { o.castShadow = o.parent === m.body; o.receiveShadow = false; o.userData.noOutline = true; } });
      const [x, y] = this.map.nearestFree ? this.map.nearestFree(c.x, c.y, 0.25) : [c.x, c.y];
      const a = { ...c, m, x, y, hx: x, hy: y, yaw: Math.random() * 6.28, tx: x, ty: y, st: 'idle', t: Math.random() * 2, ph: Math.random() * 6, v: 0 };
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
      if (dog && !a.m.glb && glbDog(this.kit)) { const n = makeDog(this.kit, a.coat); if (n.glb) { a.m.root.removeFromParent(); this.scene.add(n.root); a.m = n; } }
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
      if (dog && m.glb) {
        // ходьба и покой — анимации модели; «села» — легла на живот, голова к герою — поворотом всего зверя (уже выше)
        const sit = a.st === 'sit' ? 1 : 0; a.sit = (a.sit || 0) + (sit - (a.sit || 0)) * Math.min(1, dt * 3);
        const A = { t: t + a.ph, dt, speed: sp, k: a.sit * 0.75 };
        if (a.sit > 0.02) m.glb.anims.death(A); else if (sp) m.glb.anims.walk(A); else m.glb.anims.idle(A);
      } else if (dog) {
        const sit = a.st === 'sit' ? 1 : 0; a.sit = (a.sit || 0) + (sit - (a.sit || 0)) * Math.min(1, dt * 5);
        m.body.rotation.x = -0.42 * a.sit; m.body.position.y = -0.1 * a.sit; m.body.position.z = -0.12 * a.sit;
        m.legs[0].rotation.x = sw * 0.6 + 0.4 * a.sit; m.legs[3].rotation.x = sw * 0.6 - 1.2 * a.sit; m.legs[1].rotation.x = -sw * 0.6 + 0.4 * a.sit; m.legs[2].rotation.x = -sw * 0.6 - 1.2 * a.sit;
        const wag = a.st === 'greet' || (dP < 5) ? 16 : 5; m.tail.rotation.y = Math.sin(t * wag + a.ph) * (dP < 5 ? 0.7 : 0.3); m.tail.rotation.x = -0.3 + a.sit * 0.6;
        m.head.rotation.x = 0.2 * a.sit + Math.sin(t * 1.3 + a.ph) * 0.06; m.head.rotation.y = a.st === 'idle' ? Math.sin(t * 0.6 + a.ph) * 0.4 : 0;
      } else {
        m.legs[0].rotation.x = sw * 0.7; m.legs[1].rotation.x = -sw * 0.7; m.body.position.y = Math.abs(Math.sin(a.ph)) * 0.03 * a.v;
        const peck = a.st === 'peck' ? Math.max(0, Math.sin(t * 7 + a.ph)) : 0;
        m.body.rotation.x = peck * 0.45; m.head.rotation.x = peck * 0.6 + Math.sin(a.ph * 2) * 0.12 * a.v;
        m.head.rotation.y = a.st === 'idle' ? Math.sin(t * 2.1 + a.ph) * 0.6 : 0;
      }
    }
  }
  dispose() { for (const a of this.list) a.m.root.removeFromParent(); this.list = []; }
}
