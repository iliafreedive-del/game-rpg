// Кроны и ёлки из «карточек» листвы: квад с рисованной текстурой-кистью листьев (альфа-вырез, textures.js leafTex/pineTex).
// Low-poly (2 треугольника на кисть), но силуэт рваный и живой, как у Torchlight. Нормали карточек загнуты от центра доли —
// крона светится как мягкий шар; цвет вершин: низ и глубина темнее и холоднее, верх и сторона к солнцу — тёплый жёлто-зелёный.
// Ствол и ветки — в той же геометрии (UV смотрят в сплошной угол текстуры), поэтому дерево = 1 меш, 1 материал.
// Возвращает { leafTree(lobes, trunkH, bend, density), bush(lobes, density), pine(tiers, density) }.
export function foliage(kit, seed = 5) {
  const { THREE, FOLIAGE } = kit, { rng, paint } = kit.geo;
  const cr = rng(seed), V = (x, y, z) => new THREE.Vector3(x, y, z), UPV = V(0, 1, 0);
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const SOLID = [0.96, 0.96];
  let acc = { P: [], N: [], C: [], T: [], U: [] };
  const push = (p, n, c, uv) => { acc.P.push(p.x, p.y, p.z); acc.N.push(n.x, n.y, n.z); acc.C.push(c.r, c.g, c.b, 1); acc.T.push(0); acc.U.push(uv[0], uv[1]); };
  // карточка: центр, нормаль, размер, ось «вверх» текстуры ≈ мировой верх (светлый край кисти сверху), цвет низа/верха, центр доли для нормалей
  const card = (c, dir, size, base, tip, center, droop = 0) => {
    const n = dir.clone().normalize();
    let up = UPV.clone().addScaledVector(n, -n.y); if (up.lengthSq() < 1e-3) up = V(cr() - 0.5, 0, cr() - 0.5); up.normalize();
    up.applyAxisAngle(n, (cr() - 0.5) * 0.8);
    const right = V().crossVectors(up, n).normalize(), h = size / 2;
    const corner = (sx, sy) => c.clone().addScaledVector(right, sx * h).addScaledVector(up, sy * h).addScaledVector(n, -droop * (sy < 0 ? 1 : 0));
    const U1 = 212 / 256, pts = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], uvs = [[0, 0], [U1, 0], [U1, U1], [0, U1]];
    const nr = pts.map(p => p.clone().sub(center).normalize().multiplyScalar(0.75).addScaledVector(n, 0.25).addScaledVector(UPV, 0.15).normalize());
    const col = [base, base, tip, tip];
    for (const i of [0, 1, 2, 0, 2, 3]) push(pts[i], nr[i], col[i], uvs[i]);
  };
  const raw = (g, flat) => {
    const ng = g.index ? g.toNonIndexed() : g; ng.computeVertexNormals(); const pp = ng.attributes.position, nn = ng.attributes.normal, cc = ng.attributes.color, tt = ng.attributes.aTex;
    for (let i = 0; i < pp.count; i++) { acc.P.push(pp.getX(i), pp.getY(i), pp.getZ(i)); acc.N.push(nn.getX(i), nn.getY(i), nn.getZ(i)); acc.C.push(cc.getX(i), cc.getY(i), cc.getZ(i), 1); acc.T.push(tt ? tt.getX(i) : 0); acc.U.push(...SOLID); }
  };
  const limb = (a, b, r0, r1, c0, c1) => {
    const d = b.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, 6); g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UPV, d.clone().normalize())); g.translate(a.x, a.y, a.z); raw(paint(g, c0, { top: c1, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y), tex: 'bark' }));
  };
  const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, Math.max(0.02, l));
  const lobeSet = (lobes, y0, y1, density) => {
    for (const [x, y, z, r] of lobes) {
      const c = V(x, y, z);
      // заполнитель внутри доли: средне-зелёный (не чёрный), чтобы сквозь просветы не было «дыр»
      raw(paint(new THREE.IcosahedronGeometry(r * 0.7, 0), hsl(FOLIAGE.leafHue + 0.02, 0.5, 0.16), { top: hsl(FOLIAGE.leafHue, 0.55, 0.26) }).translate(x, y, z));
      const n = Math.round(density * r * r * 0.55 + 7);
      for (let i = 0; i < n; i++) {
        const d = V(cr() - .5, cr() - .35, cr() - .5).normalize(), pos = c.clone().addScaledVector(d, r * (0.62 + cr() * 0.3)), hgt = clamp01((pos.y - y0) / (y1 - y0));
        const sun = clamp01(d.y * 0.6 - d.x * 0.3 + d.z * 0.4), low = clamp01(-d.y);
        const base = hsl(FOLIAGE.leafHue + 0.03 - sun * 0.02 + (cr() - .5) * 0.03, 0.55, 0.2 + 0.12 * hgt - low * 0.06);
        const tip = hsl(FOLIAGE.leafTipHue + 0.01 - sun * 0.05 + (cr() - .5) * 0.04, 0.68, 0.36 + 0.14 * hgt + sun * 0.16 - low * 0.08);
        const dir = d.clone().multiplyScalar(0.7).addScaledVector(UPV, 0.45).normalize();
        card(pos, dir, (0.62 + r * 0.42) * (0.8 + cr() * 0.45), base, tip, c);
      }
    }
  };
  const finish = () => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(acc.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(acc.C, 4)); g.setAttribute('aTex', new THREE.Float32BufferAttribute(acc.T, 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(acc.U, 2));
    g.computeBoundingSphere(); acc = { P: [], N: [], C: [], T: [], U: [] }; return g;
  };
  const BARK = FOLIAGE.bark, BARK_L = FOLIAGE.barkL;
  return {
    leafTree(lobes, trunkH, bend, density = 22) {
      limb(V(0, 0, 0), V(bend, trunkH, 0), 0.3, 0.14, BARK, BARK_L);
      for (let a = 0; a < 4; a++) limb(V(Math.cos(a * 1.7) * 0.1, 0.05, Math.sin(a * 1.7) * 0.1), V(Math.cos(a * 1.7) * 0.5, -0.02, Math.sin(a * 1.7) * 0.5), 0.14, 0.04, BARK, BARK);
      for (const [x, y, z] of lobes) limb(V(bend, trunkH * 0.85, 0), V(x * 0.7, y - 0.2, z * 0.7), 0.1, 0.045, BARK, BARK_L);
      lobeSet(lobes, 1.6, 4.6, density);
      return finish();
    },
    bush(lobes, density = 16) {
      lobeSet(lobes, 0.1, 1.2, density);
      return finish();
    },
    // ель: ярусы лап-карточек, свисающих наружу и вниз; ствол и заполнитель-конус средне-зелёные
    pine(tiers = 5, density = 1) {
      limb(V(0, 0, 0), V(0, 1.4, 0), 0.16, 0.08, BARK, BARK_L);
      const top = 0.95 + tiers * 0.46;
      raw(paint(new THREE.ConeGeometry(0.62, top - 0.7, 7), hsl(FOLIAGE.pineHue, 0.45, 0.17), { top: hsl(FOLIAGE.pineHue - 0.02, 0.5, 0.3) }).translate(0, 0.7 + (top - 0.7) / 2, 0));
      for (let t = 0; t < tiers; t++) {
        const y = 0.95 + t * 0.46, R = 1.1 - t * 0.15, n = Math.max(6, Math.round((13 - t * 1.5) * density));
        for (let k = 0; k < n; k++) {
          const a = k / n * 6.283 + t * 0.7 + (cr() - .5) * 0.3, out = V(Math.cos(a), 0, Math.sin(a));
          const pos = out.clone().multiplyScalar(R * (0.55 + cr() * 0.15)).add(V(0, y - 0.05 + (cr() - .5) * 0.1, 0));
          const sun = clamp01(-out.x * 0.5 + out.z * 0.6);
          const base = hsl(FOLIAGE.pineHue + 0.01, 0.45, 0.2 + t * 0.015), tip = hsl(FOLIAGE.pineTipHue + 0.03 - sun * 0.04 + cr() * 0.03, 0.58, 0.4 + t * 0.03 + sun * 0.12);
          // лапа смотрит наружу-вверх, низ карточки свисает
          card(pos, out.clone().multiplyScalar(0.55).addScaledVector(UPV, 0.8).normalize(), (1.15 - t * 0.12) * (0.9 + cr() * 0.25), base, tip, V(0, y, 0), 0.25);
        }
      }
      card(V(0, top + 0.25, 0), V(0.3, 1, 0.3).normalize(), 0.7, hsl(FOLIAGE.pineHue, 0.5, 0.25), hsl(FOLIAGE.pineTipHue, 0.6, 0.5), V(0, top, 0));
      card(V(0, top + 0.25, 0), V(-0.3, 1, -0.3).normalize(), 0.7, hsl(FOLIAGE.pineHue, 0.5, 0.25), hsl(FOLIAGE.pineTipHue, 0.6, 0.5), V(0, top, 0));
      return finish();
    },
  };
}

// заменители для shadow map: тень от кроны — от гладких шаров/конусов (десятки треугольников вместо тысяч)
export function leafProxy(kit, lobes, trunkH) {
  const { THREE, merge, part } = kit;
  return merge([part(new THREE.CylinderGeometry(0.16, 0.28, trunkH + 0.4, 6), 0, [0, (trunkH + 0.4) / 2, 0]), ...lobes.map(([x, y, z, r]) => part(new THREE.IcosahedronGeometry(r * 0.9, 1), 0, [x, y, z]))]);
}
export function pineProxy(kit, tiers) {
  const { THREE, merge, part } = kit;
  return merge([part(new THREE.CylinderGeometry(0.1, 0.16, 1.4, 6), 0, [0, 0.7, 0]), part(new THREE.ConeGeometry(0.95, tiers * 0.46 + 1.0, 8), 0, [0, 0.95 + (tiers * 0.46 + 1.0) / 2 - 0.1, 0])]);
}
