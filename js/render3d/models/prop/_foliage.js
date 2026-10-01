// Кроны из слоёв гранёных листовых пластин (пятиугольник с приподнятым центром — у каждой грани свой свет). Порт из lab/three/js/dark/world.js.
// Возвращает { leafTree(lobes, trunkH, bend), pine() } — готовые геометрии для props tree_*.
export function foliage(kit, seed = 5) {
  const { THREE, FOLIAGE } = kit, { rng, paint } = kit.geo;
  const cr = rng(seed), V = (x, y, z) => new THREE.Vector3(x, y, z), UPV = V(0, 1, 0), Zax = V(0, 0, 1);
  const clamp01 = x => Math.min(1, Math.max(0, x));
  let acc = { P: [], N: [], C: [] };
  const plate = (c, dir, size, base, tip) => {
    const g = new THREE.CircleGeometry(1, 5), p = g.attributes.position, f = [0, 1, 2, 3, 4].map(() => 0.78 + cr() * 0.45);
    p.setZ(0, 0.3);
    for (let i = 1; i < p.count; i++) { const k = f[(i - 1) % 5]; p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k); p.setZ(i, (cr() - .5) * 0.08); }
    g.scale(size, size * (0.75 + cr() * 0.3), size); g.rotateZ(cr() * 6.283);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Zax, dir)); g.translate(c.x, c.y, c.z);
    const ng = g.toNonIndexed(); ng.computeVertexNormals();
    const pp = ng.attributes.position, nn = ng.attributes.normal;
    for (let i = 0; i < pp.count; i++) {
      const n = V(nn.getX(i), nn.getY(i), nn.getZ(i)).multiplyScalar(0.6).addScaledVector(dir, 0.4).normalize(), col = i % 3 === 0 ? tip : base.clone().lerp(tip, 0.25);
      acc.P.push(pp.getX(i), pp.getY(i), pp.getZ(i)); acc.N.push(n.x, n.y, n.z); acc.C.push(col.r, col.g, col.b, 1);
    }
  };
  const raw = g => {
    const ng = g.index ? g.toNonIndexed() : g; ng.computeVertexNormals(); const pp = ng.attributes.position, nn = ng.attributes.normal, cc = ng.attributes.color;
    for (let i = 0; i < pp.count; i++) { acc.P.push(pp.getX(i), pp.getY(i), pp.getZ(i)); acc.N.push(nn.getX(i), nn.getY(i), nn.getZ(i)); acc.C.push(cc.getX(i), cc.getY(i), cc.getZ(i), 1); }
  };
  const limb = (a, b, r0, r1, c0, c1) => {
    const d = b.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, 6); g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UPV, d.clone().normalize())); g.translate(a.x, a.y, a.z); raw(paint(g, c0, { top: c1, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) }));
  };
  const lobeSet = (lobes, y0, y1, density) => {
    for (const [x, y, z, r] of lobes) {
      const c = V(x, y, z);
      raw(paint(new THREE.IcosahedronGeometry(r * 0.8, 0), FOLIAGE.core, { top: FOLIAGE.coreTop }).translate(x, y, z));
      const n = Math.round(density * r * r + 10);
      for (let i = 0; i < n; i++) {
        const d = V(cr() - .5, cr() - .42, cr() - .5).normalize(), pos = c.clone().addScaledVector(d, r * (0.8 + cr() * 0.28)), hgt = clamp01((pos.y - y0) / (y1 - y0));
        // глубже в кроне и снизу — темнее и холоднее; верх и сторона к солнцу — тёплый жёлто-зелёный
        const sun = Math.max(0, d.y * 0.6 - d.x * 0.3 + d.z * 0.4), deep = d.y < 0 ? 0.06 : 0;
        const base = new THREE.Color().setHSL(FOLIAGE.leafHue + 0.03 - sun * 0.03 + (cr() - .5) * 0.05, 0.62, 0.08 + 0.12 * hgt - deep), tip = new THREE.Color().setHSL(FOLIAGE.leafTipHue + 0.02 - sun * 0.05 + (cr() - .5) * 0.06, 0.72, 0.18 + 0.14 * hgt + sun * 0.16 - deep);
        plate(pos, d.clone().multiplyScalar(0.8).addScaledVector(UPV, 0.35 + cr() * 0.25).add(V(cr() - .5, 0, cr() - .5).multiplyScalar(0.5)).normalize(), 0.3 + r * 0.26 * (0.6 + cr() * 0.7), base, tip);
      }
    }
  };
  const finish = () => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(acc.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(acc.C, 4));
    g.computeBoundingSphere(); acc = { P: [], N: [], C: [] }; return g;
  };
  const BARK = FOLIAGE.bark, BARK_L = FOLIAGE.barkL;
  return {
    leafTree(lobes, trunkH, bend, density = 46) {
      limb(V(0, 0, 0), V(bend, trunkH, 0), 0.3, 0.14, BARK, BARK_L);
      for (let a = 0; a < 4; a++) limb(V(Math.cos(a * 1.7) * 0.1, 0.05, Math.sin(a * 1.7) * 0.1), V(Math.cos(a * 1.7) * 0.5, -0.02, Math.sin(a * 1.7) * 0.5), 0.14, 0.04, BARK, BARK);
      for (const [x, y, z] of lobes) limb(V(bend, trunkH * 0.85, 0), V(x * 0.7, y - 0.2, z * 0.7), 0.1, 0.045, BARK, BARK_L);
      lobeSet(lobes, 1.6, 4.6, density);
      return finish();
    },
    bush(lobes, density = 30) {
      lobeSet(lobes, 0.1, 1.2, density);
      return finish();
    },
    pine(tiers = 8, density = 1) {
      limb(V(0, 0, 0), V(0, 1.4, 0), 0.16, 0.08, BARK, BARK_L);
      for (let t = 0; t < tiers; t++) {
        const y = 0.95 + t * 0.46, R = 1.0 - t * 0.115, n = Math.max(4, Math.round((14 - Math.floor(t * 0.8)) * density));
        raw(paint(new THREE.ConeGeometry(R * 0.72, 0.8, 6), 0x0a1f16, { top: 0x163a26 }).translate(0, y + 0.1, 0));
        for (let k = 0; k < n; k++) {
          const a = k / n * 6.283 + t * 0.7 + (cr() - .5) * 0.3, out = V(Math.cos(a), 0, Math.sin(a)), pos = out.clone().multiplyScalar(R * (0.62 + cr() * 0.3)).add(V(0, y + (cr() - .5) * 0.12, 0));
          const sun = Math.max(0, -out.x * 0.5 + out.z * 0.6);   // сторона к солнцу (слева сверху экрана) светлее и теплее
          const base = new THREE.Color().setHSL(FOLIAGE.pineHue + 0.02 + cr() * 0.03, 0.5, 0.07 + t * 0.012), tip = new THREE.Color().setHSL(FOLIAGE.pineTipHue + 0.03 - sun * 0.04 + cr() * 0.04, 0.62, 0.17 + t * 0.022 + sun * 0.1);
          plate(pos, out.clone().multiplyScalar(0.62).addScaledVector(UPV, 0.62).add(V(cr() - .5, 0, cr() - .5).multiplyScalar(0.25)).normalize(), 0.34 - t * 0.025, base, tip);
        }
      }
      raw(paint(new THREE.ConeGeometry(0.2, 0.6, 5), 0x163a26, { top: 0x5a9a44 }).translate(0, 0.95 + tiers * 0.46 + 0.4, 0));
      return finish();
    },
  };
}

// заменители для shadow map: тень от кроны — от гладких шаров/конусов (десятки треугольников вместо тысяч)
export function leafProxy(kit, lobes, trunkH) {
  const { THREE, merge, part } = kit;
  return merge([part(new THREE.CylinderGeometry(0.16, 0.28, trunkH + 0.4, 6), 0, [0, (trunkH + 0.4) / 2, 0]), ...lobes.map(([x, y, z, r]) => part(new THREE.IcosahedronGeometry(r * 0.82, 1), 0, [x, y, z]))]);
}
export function pineProxy(kit, tiers) {
  const { THREE, merge, part } = kit;
  return merge([part(new THREE.CylinderGeometry(0.1, 0.16, 1.4, 6), 0, [0, 0.7, 0]), part(new THREE.ConeGeometry(0.85, tiers * 0.46 + 1.0, 8), 0, [0, 0.95 + (tiers * 0.46 + 1.0) / 2 - 0.1, 0])]);
}
