// Трон: каменное сиденье на ступени, высокая спинка с рогами из кости, подлокотники, фиолетовая подушка.
export default { id: 'throne', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit, ST = 0x3a362e, S = { top: 0x9a8e74, tex: 'stone' };
    const L = [bbox(1.3, 0.25, 1.1, 0.05, ST, [0, 0.12, 0], 0, S), bbox(0.9, 0.5, 0.7, 0.05, ST, [0, 0.5, 0], 0, S), bbox(0.9, 1.6, 0.2, 0.05, ST, [0, 1.3, -0.35], 0, S),
      ...[-1, 1].map(s => bbox(0.16, 0.35, 0.7, 0.04, ST, [s * 0.47, 0.9, 0], 0, S)), bbox(0.7, 0.1, 0.55, 0.03, 0x2c1f5c, [0, 0.8, 0.05], 0, { top: 0x6a4cb0, tex: 'cloth' }),
      ...[-1, 1].map(s => kit.tube([[s * 0.4, 2.0, -0.35], [s * 0.6, 2.3, -0.35], [s * 0.55, 2.6, -0.4]], 0.07, 0.02, PAL.boneD, { top: PAL.bone }, 6)),
      part(new THREE.OctahedronGeometry(0.09, 0), PAL.abyss, [0, 1.85, -0.24], 0, 1, { emit: true })];
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
