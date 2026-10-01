// Сталагмиты: три каменных конуса с натёками, мокрый блеск сверху.
export default { id: 'stalagmite', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, merge, geo } = kit, R = geo.rng(53), L = [];
    for (const [x, z, h, r] of [[0, 0, 1.4, 0.28], [0.3, 0.15, 0.8, 0.18], [-0.25, 0.2, 0.6, 0.15]]) L.push(geo.paint(geo.jitter(new THREE.ConeGeometry(r, h, 7, 3), r * 0.25, R).translate(x, h / 2, z), 0x3a3630, { top: 0x8a8274, tex: 'stone' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
