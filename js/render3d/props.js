// Слой окружения: превращает zone.statics в 3D. Модели с batch:true собираются в instanced-меши (по одному на меш модели),
// остальные — отдельные группы с update(t). Деревьев вне карты добавляется кольцо-фон, чтобы за краем не было пустоты.
import * as THREE from '../vendor/three.module.min.js';
import { addOutlines, outlineMat } from './actor.js';
import { PROPS } from './registry.js';
import { OUTLINE } from './style.js';

const hash = (x, y) => { let h = (Math.round(x * 31) * 374761393 + Math.round(y * 31) * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const warned = new Set();

export class PropLayer {
  constructor(scene, kit, zone, wantBackdrop = true) {
    this.scene = scene; this.kit = kit; this.items = []; this.batches = []; this.dyn = [];
    const lists = new Map();   // id → [{x,y,rot,s}]
    const push = (id, x, y, rot, s, opts) => { if (!lists.has(id)) lists.set(id, []); lists.get(id).push({ x, y, rot, s, opts }); };
    for (const d of zone.statics) {
      if (d.hidden || d.flat) continue;
      if (!PROPS[d.spr]) { if (!warned.has(d.spr)) { warned.add(d.spr); console.warn('[3D] нет модели предмета «' + d.spr + '» — не показан'); } continue; }
      const h = hash(d.x, d.y), isTree = d.spr === 'tree_0' || d.spr === 'tree_1' || d.spr === 'deadtree';
      const light = zone.lights.find(L => Math.hypot(L.x - d.x, L.y - d.y) < 0.3);
      push(d.spr, d.x, d.y, isTree ? h * 6.283 : 0, isTree ? 0.9 + h * 0.5 : 1, light ? { color: new THREE.Color(light.c[0] / 255, light.c[1] / 255, light.c[2] / 255) } : null);
    }
    if (wantBackdrop) {  // лес за краем карты
      const m = zone.map, G = 3.4, ring = 11;
      for (let y = -ring; y < m.h + ring; y += G) for (let x = -ring; x < m.w + ring; x += G) {
        if (x > -1.5 && y > -1.5 && x < m.w + 1.5 && y < m.h + 1.5) continue;
        const h = hash(x + 3, y - 7); if (h > 0.7) continue;
        push(h > 0.4 ? 'tree_1' : 'tree_0', x + (hash(x, y) - 0.5) * 2, y + (hash(y, x) - 0.5) * 2, h * 6.28, 1 + hash(x * 2, y) * 0.6);
      }
    }
    for (const [id, list] of lists) {
      const def = PROPS[id];
      if (def.batch) this.addBatch(def, list); else for (const it of list) this.addSingle(def, it);
    }
    this.lastK = 1e9; this.pv = new THREE.Matrix4(); this.fr = new THREE.Frustum();
  }
  outlineFor(def) { const k = def.outline === undefined ? 'prop' : def.outline; return k ? outlineMat(k, true) : null; }
  addSingle(def, it) {
    const model = def.build(this.kit, it.opts || {}), g = new THREE.Group(); g.add(model.root);
    g.position.set(it.x, 0, it.y); g.rotation.y = it.rot; g.scale.setScalar(it.s); this.scene.add(g);
    const ol = this.outlineFor(def); if (ol) addOutlines(model.root, ol);
    this.items.push(g); if (model.update) this.dyn.push(model);
  }
  addBatch(def, list) {
    const model = def.build(this.kit), root = model.root; root.updateMatrixWorld(true);
    const ol = this.outlineFor(def), meshes = [];
    root.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); meshes.push({ geo: g, mat: o.material }); } });
    const parts = meshes.map(({ geo, mat }) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length); im.frustumCulled = false;
      this.scene.add(im); this.items.push(im);
      let oim = null;
      if (ol) { oim = new THREE.InstancedMesh(geo, ol, list.length); oim.instanceMatrix = im.instanceMatrix; oim.frustumCulled = false; oim.userData.isOutline = true; this.scene.add(oim); this.items.push(oim); }
      return { im, oim };
    });
    root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(root), bs = bb.getBoundingSphere(new THREE.Sphere());
    this.batches.push({ list, parts, r: bs.radius * 1.1 + 0.3 });
  }
  // оставляем в instanced-мешах только то, что рядом с камерой
  // оставляем в instanced-мешах только то, что попадает в кадр (пирамида видимости камеры + запас на высоту кроны)
  cull(camera, force) {
    const k = camera.position.x * 1.0 + camera.position.z * 1.0 + camera.rotation.y * 7;
    if (!force && Math.abs(k - this.lastK) < 0.35) return;
    this.lastK = k;
    this.pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); this.fr.setFromProjectionMatrix(this.pv);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), sp = new THREE.Sphere();
    for (const b of this.batches) {
      let n = 0;
      for (const it of b.list) {
        sp.center.set(it.x, 2.2 * it.s, it.y); sp.radius = b.r * it.s;
        if (!this.fr.intersectsSphere(sp)) continue;
        m.compose(p.set(it.x, 0, it.y), q.setFromEuler(e.set(0, it.rot, 0)), s.setScalar(it.s));
        for (const { im } of b.parts) im.setMatrixAt(n, m);
        n++;
      }
      for (const { im, oim } of b.parts) { im.count = n; im.instanceMatrix.needsUpdate = true; if (oim) oim.count = n; }
    }
  }
  update(t) { for (const d of this.dyn) d.update(t); }
  dispose() { for (const o of this.items) { o.removeFromParent(); if (o.isInstancedMesh) o.dispose(); } this.items = []; }
}
