// Стойка с инструментом у ворот поля: козлы, на них вилы, коса и топор (из набора POLYGON Adventure). Длинная ось — X.
export default { id: 'tool_stand', kind: 'prop', batch: true, outline: false,
  build(kit) {
    const { THREE, part, merge, bbox } = kit, L = [], H = 0x8a6a40, HL = 0xc8a070, IR = 0x5a5a62, IRL = 0xb0b0ba;
    for (const x of [-0.55, 0.55]) for (const d of [-1, 1]) L.push(bbox(0.07, 1.1, 0.07, 0.02, 0x4a3422, [x, 0.52, d * 0.12], [d * 0.25, 0, 0], { top: 0x7a5a3a, tex: 'wood' }));
    L.push(bbox(1.3, 0.08, 0.08, 0.02, 0x4a3422, [0, 1.02, 0], 0, { top: 0x7a5a3a, tex: 'woodH' }));
    const lean = (x, len) => { L.push(part(new THREE.CylinderGeometry(0.025, 0.025, len, 5), H, [x, len / 2 * Math.cos(0.32), -0.18], [-0.32, 0, 0], 1, { top: HL, tex: 'wood' })); return [x, len * Math.cos(0.32), -0.18 + Math.sin(0.32) * len / 2 * 2]; };
    // вилы
    { const [x, y, z] = lean(-0.4, 1.7); for (let i = -1; i <= 1; i++) L.push(part(new THREE.CylinderGeometry(0.012, 0.006, 0.36, 4), IR, [x + i * 0.07, y + 0.12, z - 0.17], [-0.32, 0, 0], 1, { top: IRL, tex: 'iron' })); L.push(bbox(0.2, 0.03, 0.03, 0.01, IR, [x, y - 0.04, z - 0.1], 0, { top: IRL })); }
    // коса
    { const [x, y, z] = lean(0.05, 1.8); L.push(part(new THREE.TorusGeometry(0.42, 0.025, 3, 10, Math.PI * 0.6), IR, [x + 0.3, y - 0.1, z - 0.2], [0, 0, Math.PI * 0.75], [1, 1, 0.4], { top: IRL, tex: 'iron' })); }
    // топор
    { const [x, y, z] = lean(0.45, 1.0); L.push(bbox(0.2, 0.16, 0.04, 0.01, IR, [x + 0.08, y - 0.06, z - 0.08], [-0.32, 0, 0], { top: IRL, tex: 'iron' })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
