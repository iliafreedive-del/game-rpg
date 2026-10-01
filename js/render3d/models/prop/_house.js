// Дом деревни: каменный цоколь, стены, пирамидальная крыша с навесом, дверь, окна с тёплым самосвечением, труба.
export function house(kit, o) {
  const { THREE, PAL, part, merge, geo } = kit;
  const { w, d, h = 1.9, wall, wallTop, roof, roofTop, seed = 1 } = o;
  const R = geo.rng(seed), L = [];
  L.push(part(new THREE.BoxGeometry(w + 0.2, 0.45, d + 0.2), 0x4a4538, [0, 0.22, 0], 0, 1, { top: 0x8a8068 }));
  L.push(part(new THREE.BoxGeometry(w, h, d), wall, [0, 0.45 + h / 2, 0], 0, 1, { top: wallTop }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push(part(new THREE.BoxGeometry(0.14, h, 0.14), 0x3a2416, [sx * w / 2, 0.45 + h / 2, sz * d / 2], 0, 1, { top: 0x6a4a2a }));
  L.push(part(new THREE.BoxGeometry(w + 0.04, 0.1, d + 0.04), 0x3a2416, [0, 0.45 + h * 0.55, 0], 0, 1, { top: 0x5a3a22 }));
  const rh = 1.25, rr = Math.max(w, d) * 0.5 * 1.18;
  const cone = new THREE.ConeGeometry(rr * 1.414, rh, 4); cone.rotateY(Math.PI / 4); cone.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
  L.push(part(cone, roof, [0, 0.45 + h + rh / 2 - 0.02, 0], 0, 1, { top: roofTop }));
  L.push(part(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), PAL.brassD, [0, 0.45 + h + rh + 0.2, 0]));
  L.push(part(new THREE.BoxGeometry(0.3, 0.9, 0.3), 0x5a5448, [w * 0.25, 0.45 + h + 0.55, -d * 0.2], 0, 1, { top: 0x8a8068 }));
  // дверь и окна на стороне, обращённой к камере (+x, +z): по одной на каждой видимой стене
  L.push(part(new THREE.BoxGeometry(0.5, 0.95, 0.08), 0x3a2416, [-w * 0.18, 0.45 + 0.475, d / 2 + 0.02], 0, 1, { top: 0x6a4a2a }));
  L.push(part(new THREE.SphereGeometry(0.04, 6, 5), PAL.brass, [-w * 0.18 + 0.15, 0.95, d / 2 + 0.07]));
  for (const [x, z, face] of [[w * 0.22, d / 2 + 0.02, 0], [w / 2 + 0.02, -d * 0.1, 1], [w / 2 + 0.02, d * 0.28, 1]]) {
    const bx = face ? 0.06 : 0.42, bz = face ? 0.42 : 0.06;
    L.push(part(new THREE.BoxGeometry(bx + 0.1, 0.5, bz + 0.1), 0x3a2416, [x, 0.45 + 1.0, z]));
    L.push(part(new THREE.BoxGeometry(bx, 0.4, bz), 0xffc070, [x + (face ? 0.02 : 0), 0.45 + 1.0, z + (face ? 0 : 0.02)], 0, 1, { emit: true }));
  }
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(o)));
  return { root };
}
