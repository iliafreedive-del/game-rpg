// Круглый щит Ордена: доски под краской Бездны, железная окова с заклёпками, латунный умбон с руной, крестовина-усиление.
// Щит: нормаль лицевой грани — +X, центр в начале координат.
export default {
  id: 'shield_round', kind: 'weapon', slot: 'handL',
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit;
    const mat = kit.mat({ rim: 0.5 });
    const R = 0.36, rv = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; rv.push(part(new THREE.SphereGeometry(0.02, 5, 4), PAL.brass, [0.045, Math.cos(a) * (R - 0.03), Math.sin(a) * (R - 0.03)])); }
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(R, R * 0.97, 0.07, 20), 0x2c2650, [0, 0, 0], [0, 0, Math.PI / 2], 1, { top: 0x5a46a0, tex: 'woodH' }),
      part(new THREE.TorusGeometry(R, 0.04, 5, 22), 0x3a3a48, [0, 0, 0], [0, Math.PI / 2, 0], 1, { top: 0x8a8aa0, tex: 'metal' }),
      bbox(0.03, 0.08, R * 1.85, 0.01, PAL.brassD, [0.04, 0, 0], 0, { top: PAL.brass, tex: 'metal' }),
      bbox(0.03, R * 1.85, 0.08, 0.01, PAL.brassD, [0.04, 0, 0], 0, { top: PAL.brass, tex: 'metal' }),
      part(new THREE.SphereGeometry(0.11, 12, 8), PAL.brassD, [0.05, 0, 0], 0, [0.65, 1, 1], { top: 0xf0c868, tex: 'metal' }),
      part(new THREE.TorusGeometry(0.11, 0.018, 4, 14), PAL.brass, [0.05, 0, 0], [0, Math.PI / 2, 0]),
      part(new THREE.OctahedronGeometry(0.05, 0), PAL.abyss, [0.12, 0, 0], 0, [0.5, 1.3, 1], { emit: true }),
      ...rv,
    ]), mat));
    return { root, materials: [mat] };
  },
};
