// Слой окружения: превращает zone.statics в 3D. Модели с batch:true собираются в instanced-меши (по одному на меш модели),
// остальные — отдельные группы с update(t). Деревьев вне карты добавляется кольцо-фон, чтобы за краем не было пустоты.
import * as THREE from '../vendor/three.module.min.js';
import { addOutlines, outlineMat } from './actor.js';
import { PROPS, TREE_KINDS } from './registry.js';
import { OUTLINE, QUALITY } from './style.js';
import { fbm } from './geo.js';

const hash = (x, y) => { let h = (Math.round(x * 31) * 374761393 + Math.round(y * 31) * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const warned = new Set();
// порода дерева по позиции: взвешенный выбор из TREE_KINDS (tree_0 — лиственные, tree_1 — хвойные)
function pickTree(spr, h) { const L = TREE_KINDS[spr]; if (!L) return spr; let t = h * L.reduce((a, k) => a + k[1], 0); for (const [id, w] of L) { if ((t -= w) < 0) return id; } return L[0][0]; }
// оттенок экземпляра: светлее/темнее, теплее/холоднее — соседние деревья одной породы не одинаковые
function tintOf(x, y, k) { const a = hash(x * 1.3 + 7, y * 0.7), b = hash(y * 1.9, x * 2.7 + 3), l = 1 + (a - 0.5) * 2 * k, w = (b - 0.5) * k; return new THREE.Color(l * (1 + w * 0.6), l * (1 + w * 0.25), l * (1 - w * 0.8)); }
let _proxyMat = null;
const proxyMat = () => _proxyMat || (_proxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));

export class PropLayer {
  constructor(scene, kit, zone, wantBackdrop = true) {
    this.scene = scene; this.kit = kit; this.items = []; this.batches = []; this.dyn = [];
    const lists = new Map();   // id → [{x,y,rot,s,q}]
    this._lists = lists; this.decorK = 1;
    const push = (id, x, y, rot, s, opts) => { if (!lists.has(id)) lists.set(id, []); const t = PROPS[id] && PROPS[id].tint; lists.get(id).push({ x, y, rot, s, opts, col: t ? tintOf(x, y, t) : null }); };
    for (const d of zone.statics) {
      if (d.hidden || d.flat) continue;
      if (!PROPS[d.spr]) { if (!warned.has(d.spr)) { warned.add(d.spr); console.warn('[3D] нет модели предмета «' + d.spr + '» — не показан'); } continue; }
      const h = hash(d.x, d.y), isTree = d.spr === 'tree_0' || d.spr === 'tree_1' || d.spr === 'deadtree';
      const light = zone.lights.find(L => Math.hypot(L.x - d.x, L.y - d.y) < 0.3);
      push(isTree ? pickTree(d.spr, hash(d.x * 3.1 + 1, d.y * 1.7 + 2)) : d.spr, d.x, d.y, isTree ? h * 6.283 : 0, isTree ? 0.85 + h * 0.55 : 1, light ? { color: new THREE.Color(light.c[0] / 255, light.c[1] / 255, light.c[2] / 255) } : null);
    }
    if (wantBackdrop) {  // лес за краем карты
      const m = zone.map, G = 3.4, ring = 11;
      for (let y = -ring; y < m.h + ring; y += G) for (let x = -ring; x < m.w + ring; x += G) {
        if (x > -1.5 && y > -1.5 && x < m.w + 1.5 && y < m.h + 1.5) continue;
        const h = hash(x + 3, y - 7); if (h > 0.7) continue;
        push(pickTree(h > 0.4 ? 'tree_1' : 'tree_0', hash(x * 2.3, y * 1.1 + 5)) + '_far', x + (hash(x, y) - 0.5) * 2, y + (hash(y, x) - 0.5) * 2, h * 6.28, 1 + hash(x * 2, y) * 0.6);
      }
    }
    if (wantBackdrop) this.scatterDecor(zone, push);
    for (const [id, list] of lists) {
      const def = PROPS[id];
      if (def.batch) this.addBatch(def, list); else for (const it of list) this.addSingle(def, it);
    }
    this.lastK = 1e9; this.pv = new THREE.Matrix4(); this.fr = new THREE.Frustum();
  }
  // Декор земли по карте: папоротники и кусты у кромки леса, цветы пятнами в траве, камешки у троп, грибы под деревьями.
  // Каждому предмету — порог качества q: на низком качестве остаётся только часть (QUALITY.decor).
  scatterDecor(zone, push) {
    const m = zone.map, ch = (x, y) => m.ch(Math.floor(x), Math.floor(y));
    const near = (x, y, c, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (ch(x + dx, y + dy) === c) return true; return false; };
    const clear = (x, y, r) => {
      for (const c of m.circles) if ((x - c.x) ** 2 + (y - c.y) ** 2 < (r + c.r) ** 2) return false;
      for (const b of m.rects) if (x > b.x0 - r && x < b.x1 + r && y > b.y0 - r && y < b.y1 + r) return false;
      return true;
    };
    const trees = zone.statics.filter(d => d.spr === 'tree_0' || d.spr === 'tree_1');   // в статике карты — исходные tree_0/tree_1
    // хлам у домов: у видимых стен (+x, +z) — бочки, ящики, мешки, поленница; вплотную к стене, где герой почти не ходит
    const HB = { house_0: [2.3, 1.8], house_1: [2.7, 2.0], house_2: [2.0, 1.9] };
    for (const d of zone.statics) {
      const hb = HB[d.spr]; if (!hb) continue;
      const h = hash(d.x, d.y), [hx, hz] = hb;
      const spots = [['barrel', hx + 0.45, -hz * 0.55], ['crate', hx + 0.5, -hz * 0.1], ['sacks', -hx * 0.75, hz + 0.45], ['logpile', hx + 0.42, hz * 0.55], ['barrel', hx * 0.55, hz + 0.45]];
      spots.forEach(([id, ox, oz], i) => { if (hash(d.x + i, d.y - i) < 0.72) { push(id, d.x + ox, d.y + oz, id === 'logpile' ? Math.PI / 2 : h * 6.28 + i, 0.9 + h * 0.2); this.lastPushedQ(id, 0.2 + i * 0.1); } });
    }
    const S = 0.85;
    for (let y = -3; y < m.h + 3; y += S) for (let x = -3; x < m.w + 3; x += S) {
      const h1 = hash(x * 1.7 + 11, y * 1.3 - 5), h2 = hash(y * 2.1 - 3, x * 0.7 + 9), h3 = hash(x + y * 3.1, x * 2.3), px = x + (h2 - 0.5) * S, py = y + (h3 - 0.5) * S;
      const c = ch(px, py), q = hash(px * 3.3, py * 5.1), rot = h1 * 6.283;
      const forestEdge = c === '.' && near(px, py, 'x', 1), pathEdge = c === '.' && (near(px, py, ',', 1) || near(px, py, '#', 1));
      const nearTree = trees.some(t => (t.x - px) ** 2 + (t.y - py) ** 2 < 2.2);
      let id = null, sc = 0.8 + h2 * 0.5;
      if (c === 'x') { if (h1 < 0.28) { id = 'fern'; sc *= 1.15; } else if (h1 < 0.4) id = 'bush'; else if (h1 < 0.43) id = 'mushrooms'; sc *= 1.2; }
      else if (c === '.') {
        if (!clear(px, py, 0.45)) continue;
        const patch = fbm(px * 0.18 + 4, py * 0.18);
        if (forestEdge) { if (h1 < 0.32) id = 'fern'; else if (h1 < 0.5) id = 'bush'; else if (h1 < 0.55) id = 'mushrooms'; else if (h1 < 0.58) id = 'stump'; }
        else if (pathEdge) { if (h1 < 0.1) id = 'pebbles'; else if (h1 < 0.15) id = 'fern'; else if (h1 < 0.19 && patch > 0.5) id = 'flowers'; }
        else if (nearTree && h1 < 0.25) id = h1 < 0.1 ? 'mushrooms' : 'fern';
        else if (patch > 0.55 && h1 < 0.22) id = 'flowers';
        else if (h1 < 0.035) id = 'pebbles';
        else if (h1 < 0.06) id = 'fern';
      }
      if (id) { push(id, px, py, rot, sc); this.lastPushedQ(id, q); }
    }
  }
  lastPushedQ(id, q) { const l = this._lists.get(id); l[l.length - 1].q = q; }
  // окружение без обводки по умолчанию (как на референсах Torchlight); контур только у персонажей и оружия
  outlineFor(def) { const k = def.outline || null; return k ? outlineMat(k, true) : null; }
  addSingle(def, it) {
    const model = def.build(this.kit, it.opts || {}), g = new THREE.Group(); g.add(model.root);
    g.position.set(it.x, 0, it.y); g.rotation.y = it.rot; g.scale.setScalar(it.s); this.scene.add(g);
    const ol = this.outlineFor(def); if (ol) addOutlines(model.root, ol);
    model.root.traverse(o => { if (o.isMesh && !o.userData.isOutline) { o.castShadow = def.shadow !== false && !def.shadowProxy; o.receiveShadow = true; } });
    if (def.shadowProxy) { const pm = new THREE.Mesh(def.shadowProxy(this.kit), proxyMat()); pm.castShadow = true; pm.layers.set(1); pm.userData.isOutline = true; model.root.add(pm); }
    this.items.push(g); if (model.update) this.dyn.push(model);
  }
  addBatch(def, list) {
    const model = def.build(this.kit), root = model.root; root.updateMatrixWorld(true);
    const ol = this.outlineFor(def), meshes = [];
    root.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); meshes.push({ geo: g, mat: o.material }); } });
    const parts = meshes.map(({ geo, mat }) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length); im.name = def.id;
      if (def.tint) im.setColorAt(0, new THREE.Color(1, 1, 1)); im.frustumCulled = false; im.castShadow = def.shadow !== false; im.receiveShadow = def.receive !== false;
      this.scene.add(im); this.items.push(im);
      let oim = null;
      if (ol) { oim = new THREE.InstancedMesh(geo, ol, list.length); oim.name = def.id; oim.instanceMatrix = im.instanceMatrix; oim.frustumCulled = false; oim.userData.isOutline = true; this.scene.add(oim); this.items.push(oim); }
      return { im, oim };
    });
    if (def.shadowProxy) {   // тень от заменителя: только слой 1 (его видит камера тени, но не основная)
      for (const { im } of parts) im.castShadow = false;
      const pg = def.shadowProxy(this.kit), pm = new THREE.InstancedMesh(pg, proxyMat(), list.length);
      pm.instanceMatrix = parts[0].im.instanceMatrix; pm.frustumCulled = false; pm.castShadow = true; pm.layers.set(1); pm.userData.isOutline = true;
      this.scene.add(pm); this.items.push(pm); parts.push({ im: pm, oim: null, proxy: true });
    }
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
        sp.center.set(it.x, 2.2 * it.s, it.y); sp.radius = b.r * it.s + 4;   // запас: тень от предмета за краем кадра падает в кадр
        if (it.q !== undefined && it.q > this.decorK) continue;
        if (!this.fr.intersectsSphere(sp)) continue;
        m.compose(p.set(it.x, 0, it.y), q.setFromEuler(e.set(0, it.rot, 0)), s.setScalar(it.s));
        for (const { im, proxy } of b.parts) if (!proxy) { im.setMatrixAt(n, m); if (it.col && im.instanceColor) im.setColorAt(n, it.col); }
        n++;
      }
      for (const { im, oim } of b.parts) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; if (oim) oim.count = n; }
    }
  }
  setQuality(q) { this.quality = q; const k = QUALITY[q] ? QUALITY[q].decor : 1; if (k !== this.decorK) { this.decorK = k; this.lastK = 1e9; } }
  update(t) { for (const d of this.dyn) d.update(t); }
  dispose() { for (const o of this.items) { o.removeFromParent(); if (o.isInstancedMesh) o.dispose(); } this.items = []; }
}
