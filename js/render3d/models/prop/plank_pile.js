// Стопка длинных досок на двух брусьях, светлые торцы, доски чуть вразнобой. Длинная ось — X.
export default { id: 'plank_pile', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { merge, bbox, geo } = kit, L = [], R = geo.rng(67);
    for (const x of [-0.8, 0.8]) L.push(bbox(0.14, 0.12, 0.8, 0.02, 0x4a3422, [x, 0.06, 0], 0, { top: 0x7a5a3a, tex: 'wood' }));
    for (let k = 0; k < 4; k++) for (let i = 0; i < 3 - (k > 2 ? 1 : 0); i++) {
      const c = R() < 0.5 ? 0xa07a4a : 0xb88c58;
      L.push(bbox(2.5 + (R() - 0.5) * 0.3, 0.07, 0.22, 0.015, c, [(R() - 0.5) * 0.2, 0.16 + k * 0.075, (i - 1) * 0.24 + (R() - 0.5) * 0.04], [0, (R() - 0.5) * 0.06, 0], { top: 0xe0c08a, tex: 'woodH' }));
    }
    const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
