// Саркофаг: каменный ящик с поясом резьбы, крышка с барельефом рыцаря и бирюзовыми рунами. open — крышка сдвинута наискось.
export function sarcophagus(kit, def, open) {
  const { THREE, PAL, part, merge, bbox } = kit, ST = 0x4a463c, STL = 0xaaa088, S = { top: STL, tex: 'stone' }, L = [];
  L.push(bbox(0.9, 0.15, 1.9, 0.04, 0x3a362e, [0, 0.075, 0], 0, S), bbox(0.8, 0.6, 1.75, 0.05, ST, [0, 0.45, 0], 0, S));
  for (const z of [-0.6, 0, 0.6]) L.push(bbox(0.82, 0.06, 0.08, 0.02, 0x3a362e, [0, 0.5, z], 0, S));
  for (const s of [-1, 1]) L.push(part(new THREE.BoxGeometry(0.02, 0.05, 1.4), PAL.teal, [s * 0.41, 0.42, 0], 0, 1, { emit: true }));
  const lid = [bbox(0.9, 0.16, 1.88, 0.05, ST, [0, 0, 0], 0, S), bbox(0.4, 0.12, 1.2, 0.04, STL, [0, 0.12, 0.05], 0, { top: 0xd0c8b0, tex: 'stone' }), part(new THREE.SphereGeometry(0.13, 8, 6), STL, [0, 0.18, -0.6], 0, [1, 0.7, 1], S), bbox(0.06, 0.04, 0.9, 0.01, PAL.teal, [0, 0.1, 0.1], 0, { emit: true })];
  for (const g of lid) { if (open) { g.rotateY(0.45); g.rotateZ(0.12); g.translate(0.35, -0.12, 0.25); } g.translate(0, 0.83, 0); L.push(g); }
  if (open) L.push(part(new THREE.BoxGeometry(0.66, 0.02, 1.6), 0x0c0a08, [0, 0.76, 0]));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); return { root };
}
