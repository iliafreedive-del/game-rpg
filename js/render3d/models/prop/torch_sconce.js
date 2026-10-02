// Настенный факел: кованая пластина на стене, кронштейн, факел в железной чаше, пламя (самосвечение). Свет — от зоны.
export default { id: 'torch_sconce', kind: 'prop', batch: true, outline: false, shadow: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit, IR = 0x24242a, IRL = 0x5a5a64;
    const L = [bbox(0.22, 0.34, 0.04, 0.01, IR, [0, 1.75, 0.02], 0, { top: IRL, tex: 'iron' }),
      bbox(0.05, 0.05, 0.3, 0.01, IR, [0, 1.8, 0.16], [-0.35, 0, 0], { top: IRL, tex: 'iron' }),
      part(new THREE.CylinderGeometry(0.035, 0.03, 0.45, 6), 0x4a3020, [0, 1.95, 0.3], [0.35, 0, 0], 1, { top: 0x7a5232, tex: 'wood' }),
      part(new THREE.CylinderGeometry(0.08, 0.05, 0.1, 7), IR, [0, 2.15, 0.37], [0.35, 0, 0], 1, { top: IRL, tex: 'iron' }),
      part(new THREE.ConeGeometry(0.075, 0.26, 6), 0xff9a3c, [0, 2.32, 0.42], [0.2, 0, 0], 1, { emit: true }),
      part(new THREE.ConeGeometry(0.04, 0.16, 5), 0xffe0a0, [0, 2.3, 0.43], [0.2, 0, 0], 1, { emit: true })];
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
