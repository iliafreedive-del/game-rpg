// Стойка с оружием: рама с фасками, три меча (латунные гарды), круглый щит Ордена, копьё.
export default { id: 'weapon_rack', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit;
    const T = 0x3a2416, TL = 0x6e4a2a;
    const L = [bbox(1.3, 0.1, 0.5, 0.03, T, [0, 0.05, 0], 0, { top: TL, tex: 'woodH' }), bbox(1.3, 0.08, 0.1, 0.02, 0x4a3220, [0, 0.7, -0.15], 0, { top: TL, tex: 'woodH' }), bbox(1.3, 0.08, 0.1, 0.02, 0x4a3220, [0, 1.15, -0.15], 0, { top: TL, tex: 'woodH' })];
    for (const sx of [-1, 1]) L.push(bbox(0.1, 1.45, 0.1, 0.02, T, [sx * 0.62, 0.72, -0.15], 0, { top: TL, tex: 'wood' }), part(new THREE.SphereGeometry(0.06, 6, 5), PAL.brass, [sx * 0.62, 1.5, -0.15]));
    [-0.35, 0, 0.35].forEach((x, i) => L.push(
      bbox(0.1, 1.0 - i * 0.08, 0.025, 0.008, 0x9aa4b8, [x, 0.92, -0.05], [0, 0, (i - 1) * 0.06], { top: 0xe8f0ff, tex: 'iron' }),
      bbox(0.3, 0.05, 0.07, 0.015, PAL.brassD, [x, 0.42, -0.05], 0, { top: PAL.brass }),
      part(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 5), 0x3a2416, [x, 0.3, -0.05], 0, 1, { tex: 'cloth' })));
    L.push(part(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 14), 0x2c2650, [0.52, 0.4, 0.2], [Math.PI / 2, 0.2, 0], 1, { top: 0x5a46a0, tex: 'wood' }), part(new THREE.TorusGeometry(0.28, 0.025, 4, 14), PAL.brassD, [0.52, 0.4, 0.2], [0, 0.2, 0]), part(new THREE.SphereGeometry(0.06, 6, 5), PAL.brass, [0.54, 0.4, 0.23]));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
