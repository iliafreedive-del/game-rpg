// Лужа: плоская неровная гладь, тёмная с бирюзовым отсветом (самосвечение по краю слабое).
export default { id: 'puddle', kind: 'prop', batch: true, outline: false, shadow: false,
  build(kit) {
    const { THREE, merge, geo } = kit, g = new THREE.CircleGeometry(0.9, 12); const p = g.attributes.position, R = geo.rng(61);
    for (let i = 1; i < p.count; i++) { const k = 0.7 + R() * 0.45; p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k * 0.75); }
    g.rotateX(-Math.PI / 2); g.translate(0, 0.015, 0);
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([geo.paint(g, 0x0c1a20, { top: 0x2a5a66 })]), kit.propMat(this))); return { root };
  } };
