// Большая наковальня кузнеца Горана (сборка 56): по пояс (верх 0,95 м), на дубовом чурбаке в железных обручах; рог — по +X,
// на лице — раскалённая поковка. Кузнец стоит сбоку (по −Z) и бьёт по ней молотом (npc_smith.js, renderer3d.js).
export const ANVIL_TOP = 0.95;
export default { id: 'anvil', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox } = kit;
    const IR = 0x2a2a32, IRL = 0x7a7a8a, IRD = 0x1a1a20, WD = 0x5a3a22, WDL = 0xa07a48;
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge([
      // чурбак и обручи
      part(new THREE.CylinderGeometry(0.34, 0.38, 0.46, 12), WD, [0, 0.23, 0], 0, 1, { top: WDL, tex: 'bark' }),
      part(new THREE.CylinderGeometry(0.345, 0.345, 0.04, 12), IRD, [0, 0.36, 0], 0, 1, { top: IRL, tex: 'iron' }),
      part(new THREE.CylinderGeometry(0.375, 0.375, 0.04, 12), IRD, [0, 0.08, 0], 0, 1, { top: IRL, tex: 'iron' }),
      // ноги, талия, тело
      bbox(0.62, 0.08, 0.36, 0.02, IR, [0, 0.5, 0], 0, { top: IRL, tex: 'iron' }),
      part(new THREE.CylinderGeometry(0.11, 0.17, 0.22, 4), IR, [0, 0.63, 0], [0, Math.PI / 4, 0], [1.5, 1, 1], { top: IRL, tex: 'iron' }),
      bbox(0.6, 0.12, 0.26, 0.02, IR, [-0.02, 0.8, 0], 0, { top: IRL, tex: 'iron' }),
      // лицо (светлая шлифованная сталь), пятка с отверстием, ступенька и рог
      bbox(0.64, 0.09, 0.27, 0.015, 0x4a4a56, [-0.04, ANVIL_TOP - 0.045, 0], 0, { top: 0xc8ccd8, tex: 'metal' }),
      part(new THREE.BoxGeometry(0.05, 0.02, 0.05), IRD, [-0.26, ANVIL_TOP + 0.002, 0]),
      bbox(0.1, 0.07, 0.2, 0.015, IR, [0.32, 0.875, 0], 0, { top: IRL, tex: 'iron' }),
      part(new THREE.ConeGeometry(0.1, 0.42, 10), IR, [0.57, 0.86, 0], [0, 0, -Math.PI / 2], [1, 1, 0.95], { top: IRL, tex: 'iron' }),
      // раскалённая поковка на лице и молоток-ручник у ноги
      part(new THREE.BoxGeometry(0.3, 0.035, 0.05), 0xff7a20, [0.02, ANVIL_TOP + 0.017, 0.03], [0, 0.25, 0], 1, { emit: true }),
      part(new THREE.BoxGeometry(0.12, 0.03, 0.04), 0xffc060, [0.12, ANVIL_TOP + 0.02, 0.04], [0, 0.25, 0], 1, { emit: true }),
    ]), kit.propMat(this))); return { root };
  } };
