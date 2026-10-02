// Одноручный меч Ордена: широкий клинок с фасками и долом Бездны, латунная гарда-«крылья», рукоять в коже с обмоткой, навершие.
// Оружие: хват в начале координат, клинок вдоль +Y, плоскость клинка перпендикулярна X.
export default {
  id: 'sword_iron', kind: 'weapon', slot: 'handR', reach: 1.35,
  build(kit) {
    const { THREE, PAL, part, merge, bbox } = kit;
    const mat = kit.mat({ rim: 0.5 });
    // клинок: ромбическое сечение (центр толще кромок), сужение к острию
    const prof = new THREE.Shape([new THREE.Vector2(-0.075, 0), new THREE.Vector2(0.075, 0), new THREE.Vector2(0.065, 0.82), new THREE.Vector2(0, 1.05), new THREE.Vector2(-0.065, 0.82)]);
    const blade = new THREE.ExtrudeGeometry(prof, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.02, bevelSegments: 1 });
    blade.translate(0, 0, -0.006); blade.rotateY(Math.PI / 2);
    const root = new THREE.Group();
    root.add(new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.032, 0.03, 0.22, 7), 0x3a2418, [0, -0.01, 0], 0, 1, { top: 0x6a4428, tex: 'cloth' }),
      ...[-0.07, -0.01, 0.05].map(y => part(new THREE.TorusGeometry(0.034, 0.008, 3, 7), PAL.brassD, [0, y, 0], [Math.PI / 2, 0, 0])),
      part(new THREE.OctahedronGeometry(0.06, 0), PAL.brass, [0, -0.15, 0], 0, [1, 1.2, 1], { top: 0xf0c868 }),
      bbox(0.09, 0.07, 0.4, 0.02, PAL.brassD, [0, 0.12, 0], 0, { top: PAL.brass, tex: 'metal' }),
      ...[-1, 1].map(s => part(new THREE.ConeGeometry(0.035, 0.12, 5), PAL.brass, [0, 0.16, s * 0.22], [s * 1.9, 0, 0])),
      part(new THREE.SphereGeometry(0.035, 6, 5), PAL.abyss, [0, 0.12, 0], 0, [1.8, 1, 1], { emit: true }),
      kit.geo.paint(blade.translate(0, 0.15, 0), 0x9aa4bc, { top: 0xf4f8ff, tex: 'metal' }),
      part(new THREE.BoxGeometry(0.05, 0.62, 0.03), PAL.abyss, [0, 0.55, 0], 0, 1, { emit: true }),
    ]), mat));
    return { root, materials: [mat] };
  },
};
