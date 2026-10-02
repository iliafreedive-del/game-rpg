// Знамя Ордена на высоком древке: перекладина с латунными навершиями, полотно Бездны с вышитой руной и кистями, зубчатый низ.
export default { id: 'banner', kind: 'prop', batch: true, outline: false, sway: { base: 1.2, amt: 0.04, flutter: 0.03 },
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit;
    const cloth = new THREE.PlaneGeometry(0.8, 1.4, 4, 6); const p = cloth.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 4 + p.getY(i) * 2) * 0.03);
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.04, 0.055, 2.9, 7), 0x3a2416, [0, 1.45, 0], 0, 1, { top: 0x6a4a2a, tex: 'wood' }),
      bbox(0.95, 0.08, 0.08, 0.02, PAL.brassD, [0, 2.75, 0], 0, { top: PAL.brass, tex: 'metal' }),
      ...[-1, 1].map(s => part(new THREE.SphereGeometry(0.06, 6, 5), PAL.brass, [s * 0.5, 2.75, 0])),
      part(new THREE.ConeGeometry(0.06, 0.2, 6), PAL.brass, [0, 3.0, 0]),
      part(cloth, 0x2a1850, [0, 2.0, 0.05], 0, 1, { top: 0x6a40c0, tex: 'cloth' }),
      part(new THREE.ConeGeometry(0.4, 0.3, 3), 0x2a1850, [0, 1.15, 0.05], [Math.PI, 0, 0], [1, 1, 0.1], { tex: 'cloth' }),
      bbox(0.82, 0.06, 0.03, 0.01, PAL.brassD, [0, 2.68, 0.07], 0, { top: PAL.brass }),
      part(new THREE.BoxGeometry(0.1, 0.5, 0.02), PAL.abyss, [0, 2.1, 0.085], 0, 1, { emit: true }),
      part(new THREE.BoxGeometry(0.3, 0.06, 0.02), PAL.abyss, [0, 2.2, 0.085], 0, 1, { emit: true }),
      ...[-1, 1].map(s => part(new THREE.ConeGeometry(0.04, 0.18, 5), PAL.brass, [s * 0.36, 1.25, 0.06], [Math.PI, 0, 0])),
    ]), kit.propMat(this))); return { root };
  } };
