// Ржавый меч нежити. Хват в начале координат, клинок вдоль +Y.
export default {
  id: 'sword_rust', kind: 'weapon', slot: 'handR', reach: 1.15,
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 });
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 5), 0x3a2418, [0, 0, 0]),
      part(new THREE.BoxGeometry(0.3, 0.05, 0.07), kit.MOB.rust, [0, 0.11, 0]),
      part(new THREE.BoxGeometry(0.11, 0.8, 0.03), 0x7e848f, [0, 0.54, 0], 0, 1, { top: 0xc4c8d0 }),
      part(new THREE.ConeGeometry(0.075, 0.16, 4), 0xc4c8d0, [0, 1.02, 0], [0, Math.PI / 4, 0], [1, 1, 0.3]),
      part(new THREE.BoxGeometry(0.018, 0.6, 0.04), PAL.abyss, [0, 0.52, 0], 0, 1, { emit: true }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
