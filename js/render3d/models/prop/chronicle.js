// Врата Летописи битв: круглая каменная площадка с золотыми рунами, две колонны с огнями, перемычка со знаменем, парящая раскрытая книга.
// Стоит на открытом месте и светится: понятно, что к ней подходят. Условия открытия пишет табличка над ней (js/render/renderer.js).
export default {
  id: 'chronicle', kind: 'prop', outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox, lathe, tube } = kit, L = [];
    L.push(lathe([[2.1, 0], [2.0, 0.18], [1.2, 0.22], [0.0, 0.22]], 0x5a5a66, [0, 0, 0], 0, 1, { top: 0xa4a4b4, tex: 'stone' }, 24));
    L.push(part(new THREE.TorusGeometry(1.6, 0.04, 4, 40), 0xd8a020, [0, 0.24, 0], [Math.PI / 2, 0, 0], 1, { top: 0xffe070, emit: true }));
    L.push(part(new THREE.TorusGeometry(1.0, 0.03, 4, 32), 0xd8a020, [0, 0.24, 0], [Math.PI / 2, 0, 0], 1, { top: 0xffe070, emit: true }));
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; L.push(part(new THREE.BoxGeometry(0.1, 0.02, 0.28), 0xd8a020, [Math.cos(a) * 1.3, 0.24, Math.sin(a) * 1.3], [0, -a, 0], 1, { top: 0xffe070, emit: true })); }
    for (const x of [-1.7, 1.7]) {
      L.push(bbox(0.55, 3.3, 0.55, 0.05, 0x6a6a78, [x, 1.85, 0], 0, { top: 0xb4b4c4, tex: 'stone' }), bbox(0.75, 0.22, 0.75, 0.04, 0xc8921c, [x, 3.6, 0], 0, { top: 0xffd860, tex: 'gold' }), bbox(0.7, 0.2, 0.7, 0.04, 0xc8921c, [x, 0.3, 0], 0, { top: 0xffd860, tex: 'gold' }));
      L.push(part(new THREE.SphereGeometry(0.2, 8, 6), 0xff9a3c, [x, 3.9, 0], 0, [1, 1.4, 1], { top: 0xfff0a0, emit: true }));
    }
    L.push(bbox(3.9, 0.3, 0.4, 0.04, 0x6a6a78, [0, 3.35, 0], 0, { top: 0xb4b4c4, tex: 'stone' }), bbox(1.5, 0.5, 0.06, 0.02, 0x2a1a3a, [0, 3.35, 0.24], 0, { top: 0x6a3ab0, tex: 'cloth' }));
    for (const s of [-1, 1]) L.push(bbox(0.05, 0.9, 0.04, 0.01, 0xd8e0f0, [s * 0.18, 2.6, 0.25], [0, 0, s * 0.7], { top: 0xffffff, tex: 'metal' }));   // скрещённые клинки на знамени
    L.push(bbox(1.2, 0.04, 0.5, 0.01, 0xffe8a0, [-0.3, 1.3, 0], [0, 0, 0.18], { top: 0xffffff, emit: true }), bbox(1.2, 0.04, 0.5, 0.01, 0xffe8a0, [0.3, 1.3, 0], [0, 0, -0.18], { top: 0xffffff, emit: true }), bbox(0.1, 0.1, 0.52, 0.01, 0x8a5a1a, [0, 1.22, 0]));
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; L.push(part(new THREE.OctahedronGeometry(0.1, 0), 0xb48cff, [Math.cos(a) * 0.9, 1.7 + (i % 2) * 0.3, Math.sin(a) * 0.9], 0, [0.8, 1.4, 0.8], { top: 0xe9dcff, emit: true })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  },
};
