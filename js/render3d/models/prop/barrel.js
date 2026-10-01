// Бочка: выпуклые клёпки (бочкообразный профиль), два железных обруча с заклёпками, крышка из досок.
export default { id: 'barrel', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const prof = []; for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(0.27 + Math.sin(t * Math.PI) * 0.06, t * 0.86)); }
    const body = new THREE.LatheGeometry(prof, 12);
    const L = [part(body, 0x5a3a22, [0, 0, 0], 0, 1, { top: 0xa07a48, tex: 'wood' })];
    for (const y of [0.14, 0.72]) { const r = 0.27 + Math.sin(y / 0.86 * Math.PI) * 0.06 + 0.012; L.push(part(new THREE.TorusGeometry(r, 0.022, 4, 14), 0x2a2a30, [0, y, 0], [Math.PI / 2, 0, 0], 1, { top: 0x6a6a74, tex: 'metal' })); }
    L.push(part(new THREE.CylinderGeometry(0.265, 0.265, 0.03, 12), 0x6a4a2a, [0, 0.855, 0], 0, 1, { top: 0x9a7a4a, tex: 'woodH' }));
    L.push(part(new THREE.BoxGeometry(0.5, 0.012, 0.03), 0x3a2416, [0, 0.872, 0.08]), part(new THREE.BoxGeometry(0.5, 0.012, 0.03), 0x3a2416, [0, 0.872, -0.1]));
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
