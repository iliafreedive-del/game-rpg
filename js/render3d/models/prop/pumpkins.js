// Три тыквы с бороздками, хвостиками и листом — у огородов и лавки.
export default { id: 'pumpkins', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge } = kit, L = [];
    const pk = (x, z, r) => {
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; L.push(part(new THREE.SphereGeometry(r * 0.55, 8, 6), 0xd8661a, [x + Math.cos(a) * r * 0.42, r * 0.7, z + Math.sin(a) * r * 0.42], [0, a, 0], [0.75, 1.05, 1.2], { top: 0xf09a3a })); }
      L.push(part(new THREE.CylinderGeometry(r * 0.08, r * 0.12, r * 0.4, 5), 0x4a5a2a, [x, r * 1.35, z], [0.2, 0, 0.15]));
    };
    pk(0, 0, 0.32); pk(0.48, 0.22, 0.24); pk(-0.3, 0.4, 0.2);
    L.push(part(new THREE.ConeGeometry(0.18, 0.04, 5), 0x3e7a2c, [0.25, 0.04, -0.3], [0, 0.5, 0], [1.6, 1, 1], { top: 0x8ac04a }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
