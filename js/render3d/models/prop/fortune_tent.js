// Шатёр гадалки: островерхий фиолетовый шатёр с золотыми полосами, откинутый полог, столик с хрустальным шаром,
// звёзды и полумесяц на ткани, фонарики. Вход — к камере (+x+z).
export default { id: 'fortune_tent', kind: 'prop', outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox, geo } = kit, L = [], R = 1.7, H0 = 1.9, TOP = 3.3, SEG = 10;
    for (let i = 0; i < SEG; i++) {   // стены и купол клиньями, у входа (две доли) — проём
      const a0 = i / SEG * 6.283, a1 = (i + 1) / SEG * 6.283, am = (a0 + a1) / 2, door = Math.abs(((am - Math.PI / 4) + 9.42) % 6.283 - 3.14) < 0.55;
      const c = i % 2 ? 0x3a1a5a : 0x5a2a7a, ct = i % 2 ? 0x6a3a9a : 0x8a4aba;
      const roof = new THREE.BufferGeometry(); roof.setAttribute('position', new THREE.Float32BufferAttribute([0, TOP, 0, Math.cos(a1) * R * 1.12, H0, Math.sin(a1) * R * 1.12, Math.cos(a0) * R * 1.12, H0, Math.sin(a0) * R * 1.12], 3)); roof.computeVertexNormals();
      L.push(geo.paint(roof, c, { top: ct, tex: 'cloth' }));
      if (!door) { const wall = new THREE.BufferGeometry(), p0 = [Math.cos(a0) * R, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, Math.sin(a1) * R]; wall.setAttribute('position', new THREE.Float32BufferAttribute([p0[0], 0, p0[1], p1[0], 0, p1[1], p1[0], H0, p1[1], p0[0], 0, p0[1], p1[0], H0, p1[1], p0[0], H0, p0[1]], 3)); wall.computeVertexNormals(); L.push(geo.paint(wall, c, { top: ct, tex: 'cloth' })); }
      L.push(part(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 3), PAL.brassD, [Math.cos(a0) * R * 1.12, H0 - 0.02, Math.sin(a0) * R * 1.12], [0, 0, Math.PI / 2], [1, 1, 1]));
      L.push(part(new THREE.ConeGeometry(0.12, 0.2, 3), PAL.brass, [Math.cos(am) * R * 1.12, H0 - 0.1, Math.sin(am) * R * 1.12], [Math.PI, -am, 0], [1.2, 1, 0.3]));
    }
    L.push(part(new THREE.SphereGeometry(0.12, 8, 6), PAL.brass, [0, TOP + 0.05, 0]), part(new THREE.ConeGeometry(0.06, 0.4, 5), PAL.brass, [0, TOP + 0.3, 0]));
    // откинутые полы у входа
    for (const s of [-1, 1]) { const a = Math.PI / 4 + s * 0.55; L.push(part(new THREE.ConeGeometry(0.35, H0, 4, 1, true), 0x6a3a9a, [Math.cos(a) * R * 1.05, H0 / 2, Math.sin(a) * R * 1.05], [0, -a, 0], [0.5, 1, 0.3], { top: 0x9a6aca, tex: 'cloth' })); }
    // столик с шаром у входа и звёзды
    L.push(part(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 12), 0x3a1a2a, [0.55, 0.78, 0.55], 0, 1, { top: 0x6a2a4a, tex: 'cloth' }), part(new THREE.CylinderGeometry(0.06, 0.1, 0.76, 6), 0x3a2416, [0.55, 0.38, 0.55]));
    L.push(part(new THREE.SphereGeometry(0.17, 12, 10), 0xb48cff, [0.55, 0.98, 0.55], 0, 1, { emit: true }), part(new THREE.CylinderGeometry(0.1, 0.13, 0.08, 8), PAL.brassD, [0.55, 0.84, 0.55], 0, 1, { top: PAL.brass }));
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + 0.4, y = 2.2 + (i % 3) * 0.3, r = R * (1.1 - (y - H0) / (TOP - H0) * 1.0) + 0.02; if (Math.abs(((a - Math.PI / 4) + 9.42) % 6.283 - 3.14) < 0.4) continue; L.push(part(new THREE.OctahedronGeometry(0.09, 0), 0xf0d070, [Math.cos(a) * r, y, Math.sin(a) * r], [0, -a, 0], [1, 1, 0.3], { emit: true })); }
    for (const s of [-1, 1]) { const a = Math.PI / 4 + s * 0.85; L.push(part(new THREE.SphereGeometry(0.1, 8, 6), s > 0 ? 0x9aff9a : 0xffb46a, [Math.cos(a) * R * 1.15, H0 - 0.35, Math.sin(a) * R * 1.15], 0, 1, { emit: true })); }
    L.push(part(new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.03, 16), 0x5a2a3a, [0, 0.02, 0], 0, 1, { top: 0x8a3a5a, tex: 'cloth' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat({ ...this, side: 'double' }))); return { root };
  } };
