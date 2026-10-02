// Лук следопыта: изогнутые плечи из ясеня с латунными наконечниками, кожаная обмотка рукояти, тетива. Держится в левой руке.
export default {
  id: 'bow_hunter', kind: 'weapon', slot: 'handL',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 }), pts = s => [0, 0.2, 0.4, 0.58, 0.72].map(y => [0, s * y, -0.22 * (y / 0.72) ** 2 + 0.05]);
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      kit.tube(pts(1), 0.035, 0.014, 0x5a3a1c, { top: 0xb88a50, tex: 'wood' }, 6), kit.tube(pts(-1), 0.035, 0.014, 0x5a3a1c, { top: 0xb88a50, tex: 'wood' }, 6),
      part(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 7), 0x3a2418, [0, 0, 0.05], 0, 1, { top: 0x6a4428, tex: 'leather' }),
      ...[1, -1].map(s => part(new THREE.ConeGeometry(0.025, 0.07, 5), PAL.brass, [0, s * 0.74, -0.16], [s * -1.2, 0, 0], 1, { top: 0xf0c868 })),
      ...[1, -1].map(s => part(new THREE.TorusGeometry(0.04, 0.012, 4, 8), PAL.brass, [0, s * 0.3, -0.01 + 0.0], [Math.PI / 2, 0, 0])),
      part(new THREE.CylinderGeometry(0.004, 0.004, 1.48, 3), 0xe8dcb8, [0, 0, -0.17]),
    ]), mat));
    return { root, materials: [mat] };
  },
};
