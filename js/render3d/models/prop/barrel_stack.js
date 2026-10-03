// Штабель бочек: три лёжа на подкладках и одна сверху, железные обручи, светлые днища. Длинная ось — X.
export default { id: 'barrel_stack', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox } = kit, L = [];
    const barrel = (x, y, z) => {
      L.push(kit.lathe([[0.27, -0.42], [0.33, -0.2], [0.35, 0], [0.33, 0.2], [0.27, 0.42]], 0x7a5432, [x, y, z], [Math.PI / 2, 0, 0], 1, { top: 0xa8784a, tex: 'woodH' }, 12));
      for (const t of [-0.3, 0.3]) L.push(part(new THREE.TorusGeometry(0.335, 0.025, 4, 12), 0x3a3a40, [x, y, z + t], 0, 1, { top: 0x7a7a84, tex: 'iron' }));
      for (const s of [-1, 1]) L.push(part(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 12), 0xb08a5a, [x, y, z + s * 0.425], [Math.PI / 2, 0, 0], 1, { top: 0xd0a878, tex: 'woodH' }));
    };
    for (const x of [-0.72, 0, 0.72]) barrel(x, 0.36, 0);
    barrel(-0.36, 0.97, 0); barrel(0.36, 0.97, 0.05);
    for (const z of [-0.3, 0.3]) L.push(bbox(1.9, 0.06, 0.12, 0.02, 0x4a3422, [0, 0.03, z], 0, { top: 0x8a6a40, tex: 'wood' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
