// Мёртвое дерево: кривой ствол и голые ветви.
export default {
  id: 'deadtree', kind: 'prop', batch: true, sway: { base: 0.5, amt: 0.02, flutter: 0.006 },
  build(kit) {
    const { THREE, part, merge, geo } = kit;
    const L = [part(new THREE.CylinderGeometry(0.1, 0.3, 2.2, 7), 0x2a2230, [0, 1.1, 0], [0, 0, 0.05], 1, { top: 0x4a3f55, tex: 'bark' }),
      part(new THREE.CylinderGeometry(0.05, 0.1, 1.5, 6), 0x2a2230, [0.12, 2.65, 0], [0, 0, -0.18], 1, { top: 0x4a3f55, tex: 'bark' }),
      part(new THREE.CylinderGeometry(0.02, 0.05, 1.0, 5), 0x2f2638, [0.0, 3.55, 0], [0, 0, 0.2], 1, { top: 0x5a4d68 })];
    [[1.7, 0.9, 0.9, 1.1], [2.2, -0.9, 3.6, 1.3], [2.7, 0.6, 5.2, 0.9], [1.3, -0.7, 2.4, 0.8]].forEach(([y, rz, ry, len]) => {
      const g = geo.place(new THREE.CylinderGeometry(0.015, 0.06, len, 5), [0, len / 2, 0]);
      g.rotateZ(rz); g.rotateY(ry); g.translate(0, y, 0); L.push(geo.paint(g, 0x2a2230, { top: 0x5a4d68, y0: y, y1: y + len }));
    });
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  },
};
