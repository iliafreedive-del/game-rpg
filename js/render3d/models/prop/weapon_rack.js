// Стойка с оружием: рама, три меча и щит.
export default { id: 'weapon_rack', kind: 'prop', batch: true, outline: 'small',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const L = [part(new THREE.BoxGeometry(1.3, 0.08, 0.5), 0x3a2416, [0, 0.05, 0], 0, 1, { top: 0x6a4a2a }), part(new THREE.BoxGeometry(1.3, 0.08, 0.08), 0x4a3220, [0, 0.7, -0.15]), part(new THREE.BoxGeometry(1.3, 0.08, 0.08), 0x4a3220, [0, 1.15, -0.15])];
    for (const sx of [-1, 1]) L.push(part(new THREE.BoxGeometry(0.09, 1.4, 0.09), 0x3a2416, [sx * 0.62, 0.7, -0.15]));
    [-0.35, 0, 0.35].forEach((x, i) => L.push(part(new THREE.BoxGeometry(0.1, 1.0 - i * 0.08, 0.025), 0x9aa4b8, [x, 0.9, -0.05], [0, 0, (i - 1) * 0.06], 1, { top: 0xe8f0ff }), part(new THREE.BoxGeometry(0.28, 0.05, 0.06), PAL.brass, [x, 0.42, -0.05])));
    L.push(part(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 12), 0x2c2650, [0.52, 0.4, 0.2], [Math.PI / 2, 0.2, 0], 1, { top: 0x5a46a0 }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
