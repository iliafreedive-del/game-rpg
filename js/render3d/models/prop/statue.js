// Статуя рыцаря на постаменте (камень с бирюзовыми рунами).
export default { id: 'statue', kind: 'prop', batch: true, outline: 'stone',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const S = 0x6a6a74, T = 0xb4b6c4;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      part(new THREE.BoxGeometry(1.1, 0.5, 1.1), 0x3a362c, [0, 0.25, 0], 0, 1, { top: 0x8a8068 }),
      part(new THREE.CylinderGeometry(0.2, 0.26, 1.0, 8), S, [0, 1.0, 0], 0, 1, { top: T }),
      part(new THREE.SphereGeometry(0.34, 10, 8), S, [0, 1.65, 0], 0, [1.2, 0.8, 0.8], { top: T }),
      part(new THREE.SphereGeometry(0.17, 10, 8), S, [0, 1.95, 0], 0, 1, { top: T }),
      part(new THREE.BoxGeometry(0.12, 1.3, 0.04), 0x8a8a94, [0.45, 1.2, 0.1], 0, 1, { top: 0xdadae4 }),
      part(new THREE.BoxGeometry(0.03, 0.2, 0.02), PAL.teal, [0, 1.9, 0.17], 0, 1, { emit: true }),
    ]), kit.propMat(this))); return { root };
  } };
