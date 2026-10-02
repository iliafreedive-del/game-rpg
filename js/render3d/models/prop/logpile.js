// Поленница: брёвна с корой и светлыми торцами, сложенные пирамидой. У стены дома.
export default { id: 'logpile', kind: 'prop', batch: true, outline: false, ao: 0.6, aoH: 0.6,
  build(kit) {
    const { THREE, part, merge, geo } = kit, L = [], R = geo.rng(5);
    const rows = [[-0.3, 0, 0.3], [-0.15, 0.15], [0]];
    rows.forEach((row, j) => row.forEach(x => {
      const r = 0.12 + R() * 0.03, y = 0.12 + j * 0.21, len = 0.9 + R() * 0.2;
      L.push(part(new THREE.CylinderGeometry(r, r, len, 8), 0x3a2618, [x, y, 0], [Math.PI / 2, 0, 0], 1, { top: 0x6a4a30, tex: 'bark' }));
      for (const s of [-1, 1]) L.push(part(new THREE.CircleGeometry(r * 0.92, 8), 0xc8a070, [x, y, s * (len / 2 + 0.005)], [0, s > 0 ? 0 : Math.PI, 0], 1, { top: 0xe8c890, tex: 'woodH' }));
    }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
