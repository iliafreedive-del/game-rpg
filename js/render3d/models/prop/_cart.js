// Ручная телега в духе набора POLYGON Adventure: дощатый кузов с бортами, два колеса со ступицей и железным ободом,
// оглобли с поперечиной лежат на земле (кузов чуть наклонён). load — гружёная: ящики, мешок, тыква, сыр, фонарь.
// Длинная ось — локальная X (оглобли в +X).
export function cart(kit, def, load) {
  const { THREE, PAL, part, merge, bbox, geo } = kit, L = [], W = 0x7a5a3a, WL = 0xb08a5a, D = 0x4a3422, IR = 0x3a3a40;
  const tilt = 0.16, WR = 0.45;
  const g = (geo2) => L.push(geo2);
  // кузов
  g(bbox(1.7, 0.1, 0.95, 0.02, D, [0, 0.62, 0], 0, { top: WL, tex: 'woodH' }));
  for (let i = 0; i < 5; i++) g(bbox(1.68, 0.02, 0.17, 0.005, i % 2 ? W : 0x8a6644, [0, 0.68, -0.38 + i * 0.19], 0, { top: WL, tex: 'woodH' }));
  for (const s of [-1, 1]) { g(bbox(1.75, 0.3, 0.07, 0.02, W, [0, 0.83, s * 0.47], 0, { top: WL, tex: 'woodH' })); for (const x of [-0.8, 0, 0.8]) g(bbox(0.08, 0.38, 0.09, 0.02, D, [x, 0.8, s * 0.5], 0, { top: W, tex: 'wood' })); }
  g(bbox(0.07, 0.3, 0.95, 0.02, W, [-0.86, 0.83, 0], 0, { top: WL, tex: 'woodH' }));
  // оглобли и поперечина
  for (const s of [-1, 1]) g(bbox(1.5, 0.07, 0.07, 0.02, D, [1.45, 0.58, s * 0.36], [0, 0, -0.04], { top: W, tex: 'wood' }));
  g(bbox(0.07, 0.06, 0.78, 0.02, D, [2.1, 0.55, 0], 0, { top: W, tex: 'wood' }));
  // ось и колёса
  g(part(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 6), IR, [-0.15, WR, 0], [Math.PI / 2, 0, 0]));
  for (const s of [-1, 1]) {
    g(part(new THREE.CylinderGeometry(WR, WR, 0.08, 14), W, [-0.15, WR, s * 0.6], [Math.PI / 2, 0, 0], 1, { top: WL, tex: 'woodH' }));
    g(part(new THREE.TorusGeometry(WR, 0.035, 4, 14), IR, [-0.15, WR, s * 0.6], 0, 1, { top: 0x6a6a74, tex: 'iron' }));
    g(part(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 8), D, [-0.15, WR, s * 0.62], [Math.PI / 2, 0, 0], 1, { top: IR }));
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI; g(part(new THREE.BoxGeometry(0.05, WR * 1.8, 0.03), D, [-0.15, WR, s * 0.65], [0, 0, a])); }
  }
  if (load) {
    g(bbox(0.5, 0.42, 0.5, 0.03, 0x6a4a2a, [-0.45, 0.9, -0.12], [0, 0.2, 0], { top: 0xb08a54, tex: 'woodH' }));
    g(bbox(0.42, 0.34, 0.42, 0.03, 0x6a4a2a, [-0.42, 1.28, -0.1], [0, -0.3, 0], { top: 0xb08a54, tex: 'woodH' }));
    g(part(new THREE.CylinderGeometry(0.2, 0.25, 0.5, 8), 0xb89a68, [0.25, 0.93, 0.18], 0, 1, { top: 0xd8c090, tex: 'cloth' }), part(new THREE.SphereGeometry(0.16, 7, 5), 0xb89a68, [0.25, 1.2, 0.18], 0, [1, 0.5, 1], { top: 0xd8c090, tex: 'cloth' }));
    g(part(new THREE.SphereGeometry(0.22, 10, 6), 0xd86a1a, [0.35, 0.86, -0.2], 0, [1, 0.75, 1], { top: 0xf0a040 }), part(new THREE.CylinderGeometry(0.025, 0.03, 0.1, 5), 0x4a6a2a, [0.35, 1.04, -0.2]));
    g(part(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), 0xe0b030, [0.65, 0.8, 0.05], 0, 1, { top: 0xf8d860 }));
    g(bbox(0.16, 0.22, 0.16, 0.02, 0x24242a, [0.7, 0.98, 0.3], 0, { top: 0x5a5a64, tex: 'iron' }), part(new THREE.BoxGeometry(0.1, 0.13, 0.1), 0xffc070, [0.7, 0.98, 0.3], 0, 1, { emit: true }));
  }
  const root = new THREE.Group(), m = new THREE.Mesh(merge(L), kit.propMat(def));
  m.position.y = -0.02; m.rotation.z = -tilt; m.position.x = 0.1;   // кузов наклонён к лежащим оглоблям
  root.add(m); return { root };
}
