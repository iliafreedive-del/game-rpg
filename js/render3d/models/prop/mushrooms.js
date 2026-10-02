// Грибы у корней: три шляпки (ржаво-красные с костяными крапинами). Декор земли под деревьями.
export default { id: 'mushrooms', kind: 'prop', batch: true, outline: false, shadow: false, ao: 0.6, aoH: 0.2,
  build(kit) {
    const { THREE, PAL, part, merge } = kit, L = [];
    for (const [x, z, s] of [[0, 0, 1], [0.16, 0.1, 0.7], [-0.1, 0.15, 0.55]]) {
      L.push(part(new THREE.CylinderGeometry(0.03 * s, 0.045 * s, 0.16 * s, 5, 1, true), PAL.boneD, [x, 0.08 * s, z], 0, 1, { top: PAL.bone }));
      L.push(part(new THREE.SphereGeometry(0.1 * s, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0x6a2418, [x, 0.15 * s, z], 0, [1, 0.75, 1], { top: 0xc8502e }));
      for (let i = 0; i < 3; i++) L.push(part(new THREE.OctahedronGeometry(0.02 * s, 0), PAL.bone, [x + Math.cos(i * 2.1) * 0.05 * s, 0.21 * s, z + Math.sin(i * 2.1) * 0.05 * s]));
    }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
