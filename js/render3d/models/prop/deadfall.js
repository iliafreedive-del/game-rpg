// Завал деревьев на дороге за мостом: поваленные стволы крест-накрест, вывернутый корень с землёй, обломанный пень,
// сучья, папоротник и камни. Дорога уходит в лес, но пройти нельзя.
export default { id: 'deadfall', kind: 'prop', outline: false,
  build(kit) {
    const { THREE, part, merge, geo } = kit, L = [], R = geo.rng(53), BK = 0x3e2c1c, BKL = 0x7a5a3a;
    const log = (x, z, len, r, yaw, y, tilt = 0) => {
      const g = new THREE.CylinderGeometry(r * 0.7, r, len, 9, 3); g.rotateZ(Math.PI / 2); g.rotateZ(tilt); g.rotateY(yaw);
      L.push(geo.paint(geo.warp(g.translate(x, y, z), 0.06, x * 7 + z), BK, { top: BKL, tex: 'bark' }));
      for (const s of [-1, 1]) { const ex = x + Math.cos(yaw) * s * len / 2, ez = z - Math.sin(yaw) * s * len / 2; L.push(part(new THREE.CylinderGeometry(r * (s > 0 ? 0.7 : 1) * 0.98, r * (s > 0 ? 0.7 : 1) * 0.98, 0.03, 9), 0xc8a070, [ex, y + Math.sin(tilt) * s * len / 2, ez], [0, -yaw, Math.PI / 2 + tilt])); }
      for (let i = 0; i < 3; i++) { const t = (R() - 0.5) * len * 0.8, bx = x + Math.cos(yaw) * t, bz = z - Math.sin(yaw) * t, a = R() * 6.283; L.push(kit.tube([[bx, y, bz], [bx + Math.cos(a) * 0.5, y + 0.4 + R() * 0.3, bz + Math.sin(a) * 0.5], [bx + Math.cos(a) * 0.9, y + 0.5 + R() * 0.5, bz + Math.sin(a) * 0.9]], r * 0.28, 0.02, BK, { top: BKL, tex: 'bark' }, 5)); }
    };
    log(0.2, 0, 6.4, 0.34, Math.PI / 2 + 0.25, 0.3, 0.05);
    log(-0.6, 0.3, 5.6, 0.3, Math.PI / 2 - 0.5, 0.75, -0.08);
    log(0.9, -0.4, 5.0, 0.28, Math.PI / 2 + 0.9, 1.05, 0.12);
    log(-0.2, -0.2, 4.6, 0.24, 0.3, 0.32);
    // вывернутый корень: диск земли с корнями
    const rx = 1.0, rz = -2.9;
    L.push(part(new THREE.CylinderGeometry(1.15, 1.25, 0.45, 12), 0x3a2a1a, [rx, 1.1, rz], [Math.PI / 2 - 0.3, 0.3, 0], [1, 1, 0.9], { top: 0x5a4028 }));
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; L.push(kit.tube([[rx, 1.1, rz + 0.1], [rx + Math.cos(a) * 0.9, 1.1 + Math.sin(a) * 0.9, rz + 0.25], [rx + Math.cos(a) * 1.5, 1.1 + Math.sin(a) * 1.4, rz + 0.5 + R() * 0.3]], 0.08, 0.01, BK, { top: BKL, tex: 'bark' }, 4)); }
    // обломанный пень с рваным верхом
    L.push(part(new THREE.CylinderGeometry(0.38, 0.5, 1.1, 9), BK, [-1.6, 0.55, 1.9], 0, 1, { top: BKL, tex: 'bark' }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; L.push(part(new THREE.ConeGeometry(0.12, 0.35 + R() * 0.4, 3), 0xb08a5a, [-1.6 + Math.cos(a) * 0.26, 1.2, 1.9 + Math.sin(a) * 0.26], [0, a, 0])); }
    for (let i = 0; i < 10; i++) { const a = R() * 6.283, r = 1 + R() * 2; L.push(part(new THREE.ConeGeometry(0.22, 0.7, 4), 0x2e5a22, [Math.cos(a) * r, 0.25, Math.sin(a) * r], [(R() - 0.5) * 0.8, R(), (R() - 0.5) * 0.8], [1.6, 1, 0.5], { top: 0x7ab04a })); }
    for (let i = 0; i < 5; i++) L.push(part(new THREE.DodecahedronGeometry(0.25 + R() * 0.2, 0), 0x5a5444, [(R() - 0.5) * 4, 0.1, (R() - 0.5) * 4], [R(), R(), 0], [1, 0.6, 1], { top: 0x8aa04a, tex: 'stone' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
