// Жаровня: железная чаша на трёх кованых ногах, раскалённые угли и языки пламени (самосвечение). Свет — от зоны.
export default { id: 'brazier', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit, IR = 0x24242a, IRL = 0x6a6a74, L = [];
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283; L.push(kit.tube([[Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32], [Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.22], [Math.cos(a) * 0.26, 0.8, Math.sin(a) * 0.26]], 0.035, 0.03, IR, { top: IRL, tex: 'metal' }, 5)); }
    L.push(kit.lathe([[0.05, 0.75], [0.3, 0.8], [0.42, 0.98], [0.44, 1.02]], IR, [0, 0, 0], 0, 1, { top: IRL, tex: 'metal' }, 12));
    L.push(part(new THREE.TorusGeometry(0.43, 0.03, 4, 14), PAL.brassD, [0, 1.0, 0], [Math.PI / 2, 0, 0]));
    L.push(part(new THREE.CylinderGeometry(0.38, 0.3, 0.1, 10), 0xff6a20, [0, 0.96, 0], 0, 1, { emit: true }));
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; L.push(part(new THREE.ConeGeometry(0.1, 0.42 - (i % 2) * 0.12, 5), i % 2 ? 0xffb050 : 0xff8a2c, [Math.cos(a) * 0.15, 1.2, Math.sin(a) * 0.15], 0, 1, { emit: true })); }
    L.push(part(new THREE.ConeGeometry(0.14, 0.55, 6), 0xffe0a0, [0, 1.27, 0], 0, 1, { emit: true }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
