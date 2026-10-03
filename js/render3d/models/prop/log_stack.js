// Штабель брёвен 3-2-1 со светлыми спилами и кольями по бокам (из набора POLYGON Adventure). Длинная ось — X.
export default { id: 'log_stack', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox, geo } = kit, L = [], R = geo.rng(61), r = 0.27, len = 2.5;
    const log = (z, y) => {
      const ll = len + (R() - 0.5) * 0.3, dx = (R() - 0.5) * 0.15;
      L.push(geo.paint(new THREE.CylinderGeometry(r, r * 1.04, ll, 9).rotateZ(Math.PI / 2).translate(dx, y, z), 0x5a3e26, { top: 0x8a6440, tex: 'bark' }));
      for (const s of [-1, 1]) { L.push(part(new THREE.CylinderGeometry(r * 0.96, r * 0.96, 0.02, 9), 0xd8b47a, [dx + s * (ll / 2 + 0.005), y, z], [0, 0, Math.PI / 2], 1, { top: 0xf0d098 })); L.push(part(new THREE.TorusGeometry(r * 0.5, 0.012, 3, 9), 0xa8844a, [dx + s * (ll / 2 + 0.012), y, z], [0, Math.PI / 2, 0])); }
    };
    const d = r * 2 + 0.02;
    for (let i = 0; i < 3; i++) log((i - 1) * d, r);
    for (let i = 0; i < 2; i++) log((i - 0.5) * d, r + d * 0.87);
    log(0, r + d * 1.74);
    for (const s of [-1, 1]) for (const x of [-0.8, 0.8]) L.push(bbox(0.09, 1.3, 0.09, 0.02, 0x4a3422, [x, 0.6, s * (d * 1.5 + 0.05)], [s * 0.08, 0, 0], { top: 0x8a6a40, tex: 'wood' }));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
