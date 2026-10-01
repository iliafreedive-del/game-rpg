// Звено деревянного забора длиной 1 м вдоль X; fence_y — то же вдоль Z. Колья с заострёнными верхами, кривые жерди, вязки.
export function fence(kit, def, alongZ) {
  const { THREE, part, merge, geo, bbox } = kit;
  const L = [], R = geo.rng(alongZ ? 3 : 7);
  for (const x of [-0.5, 0.5]) {
    const hh = 0.95 + R() * 0.12;
    L.push(geo.paint(geo.warp(geo.chamferBox(0.12, hh, 0.12, 0.025).translate(x, hh / 2, 0), 0.03, R() * 9), 0x4a3220, { top: 0x8a6a40, tex: 'wood' }));
    L.push(part(new THREE.ConeGeometry(0.085, 0.16, 4), 0x5a3e26, [x, hh + 0.07, 0], [0, Math.PI / 4, 0], 1, { top: 0x9a7a4a, tex: 'wood' }));
    L.push(part(new THREE.BoxGeometry(0.15, 0.05, 0.15), 0x7a6a48, [x, 0.7, 0], [0, 0.3, 0]));   // вязка
  }
  for (const y of [0.35, 0.7]) L.push(geo.paint(geo.warp(geo.chamferBox(1.08, 0.08, 0.06, 0.02).translate(0, y + (R() - 0.5) * 0.04, 0.05), 0.04, R() * 9), 0x5a3e26, { top: 0x9a7a4a, tex: 'woodH' }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def)));
  if (alongZ) root.rotation.y = Math.PI / 2;
  return { root };
}
export default { id: 'fence_x', kind: 'prop', batch: true, outline: 'small', build(kit) { return fence(kit, this, false); } };
