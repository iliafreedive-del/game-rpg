// Сундук: доски с фасками, железные полосы с заклёпками, замок. open — крышка откинута, внутри блестит золото.
// rich — сундук Ордена: тёмно-фиолетовый, латунные полосы, самоцвет Бездны.
export function chest(kit, def, { open = false, rich = false } = {}) {
  const { THREE, PAL, part, merge, bbox, geo } = kit, L = [];
  const WD = rich ? 0x3a2a7a : 0x9a5a26, WDL = rich ? 0x8a6ae0 : 0xe8aa58, BAND = rich ? 0xc8921c : 0xc8921c, BANDL = rich ? 0xffe070 : 0xffd860, W = rich ? 0.95 : 0.85, D = rich ? 0.6 : 0.55;
  L.push(bbox(W, 0.45, D, 0.03, WD, [0, 0.225, 0], 0, { top: WDL, tex: 'woodH' }));
  for (const x of [-W * 0.32, W * 0.32]) L.push(bbox(0.08, 0.47, D + 0.02, 0.01, BAND, [x, 0.235, 0], 0, { top: BANDL, tex: 'gold' }));
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) L.push(bbox(0.08, 0.47, 0.08, 0.015, BAND, [x, 0.235, z], 0, { top: BANDL, tex: 'gold' }));
  // крышка-полуцилиндр на петлях вдоль задней кромки
  const lid = [part(new THREE.CylinderGeometry(D / 2, D / 2, W, 12, 1, false, 0, Math.PI), WD, [0, 0, 0], [0, 0, Math.PI / 2], 1, { top: WDL, tex: 'woodH' }),
    ...[-W * 0.32, W * 0.32].map(x => part(new THREE.CylinderGeometry(D / 2 + 0.01, D / 2 + 0.01, 0.08, 12, 1, false, 0, Math.PI), BAND, [x, 0, 0], [0, 0, Math.PI / 2], 1, { top: BANDL, tex: 'gold' }))];
  for (const g of lid) { g.translate(0, 0, D / 2); if (open) g.rotateX(-1.9); g.translate(0, 0.45, -D / 2); L.push(g); }
  if (!open) L.push(bbox(0.16, 0.18, 0.05, 0.01, 0xd8a020, [0, 0.4, D / 2 + 0.02], 0, { top: 0xffe890, emit: true }), part(new THREE.SphereGeometry(0.025, 5, 4), 0x0c0a08, [0, 0.38, D / 2 + 0.05]));
  else { L.push(part(new THREE.BoxGeometry(W - 0.1, 0.04, D - 0.1), 0x1a120a, [0, 0.42, 0])); for (let i = 0; i < 9; i++) L.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 8), PAL.brass, [(i % 3 - 1) * 0.2, 0.44 + (i % 2) * 0.02, (Math.floor(i / 3) - 1) * 0.12], [0.2 * (i % 3), 0, 0.1 * i], 1, { top: 0xffe08a })); }
  if (rich) L.push(part(new THREE.OctahedronGeometry(0.07, 0), PAL.abyss, [0, 0.3, D / 2 + 0.03], 0, [1, 1.3, 0.5], { emit: true }));
  const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(def))); root.scale.setScalar(1.3); return { root };
}
