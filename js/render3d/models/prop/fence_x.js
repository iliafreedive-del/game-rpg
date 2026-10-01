// Звено деревянного забора длиной 1 м вдоль X; fence_y — то же вдоль Z.
export function fence(kit, def, alongZ) {
  const { THREE, part, merge } = kit;
  const L = [];
  for (const x of [-0.5, 0.5]) L.push(part(new THREE.BoxGeometry(0.1, 0.95, 0.1), 0x4a3220, [x, 0.47, 0], 0, 1, { top: 0x8a6a40 }));
  for (const y of [0.35, 0.7]) L.push(part(new THREE.BoxGeometry(1.0, 0.07, 0.05), 0x5a3e26, [0, y, 0.02], 0, 1, { top: 0x9a7a4a }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def)));
  if (alongZ) root.rotation.y = Math.PI / 2;
  return { root };
}
export default { id: 'fence_x', kind: 'prop', batch: true, outline: 'small', build(kit) { return fence(kit, this, false); } };
