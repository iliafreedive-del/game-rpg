// Шатёр торговки: полосатый восьмигранный навес на четырёх столбах, прилавок с товарами, подвешенные пучки трав и склянки, вывеска «Торговка».
// Вход и вывеска обращены к камере (+x, +z). Вывеска — холст-текстура на доске.
export default { id: 'market_tent', kind: 'prop', outline: false,
  build(kit, opts = {}) {
    const { THREE, PAL, part, merge, bbox, tube, geo } = kit, L = [];
    const R = 2.5, Y0 = 2.45, TOP = 3.5, SEG = 8;
    // навес: чередующиеся красно-кремовые клинья + бахрома
    for (let i = 0; i < SEG; i++) {
      const a0 = i / SEG * 6.283, a1 = (i + 1) / SEG * 6.283, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, TOP, 0, Math.cos(a1) * R, Y0, Math.sin(a1) * R, Math.cos(a0) * R, Y0, Math.sin(a0) * R], 3)); g.computeVertexNormals();
      L.push(geo.paint(g, i % 2 ? 0xe8dcc0 : 0x8a1e1e, { top: i % 2 ? 0xfff4d8 : 0xc83a3a, tex: 'cloth' }));
      const am = (a0 + a1) / 2; L.push(part(new THREE.ConeGeometry(0.2, 0.34, 3), i % 2 ? 0xe8dcc0 : 0x8a1e1e, [Math.cos(am) * (R - 0.02), Y0 - 0.14, Math.sin(am) * (R - 0.02)], [Math.PI, -am, 0], [1.3, 1, 0.3], { tex: 'cloth' }));
    }
    L.push(part(new THREE.SphereGeometry(0.12, 6, 5), PAL.brass, [0, TOP + 0.08, 0], 0, 1, { top: 0xf0c868 }), part(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), 0x4a3220, [0, TOP + 0.3, 0]));
    // четыре столба
    for (const [x, z] of [[-1.7, -1.3], [1.7, -1.3], [-1.7, 1.3], [1.7, 1.3]]) L.push(bbox(0.16, 2.5, 0.16, 0.02, 0x3a2416, [x, 1.25, z], 0, { top: 0x7a5230, tex: 'wood' }));
    // прилавок спереди (к камере: +x+z — вдоль диагонали он идёт «поперёк» взгляда), задняя стенка из ткани
    L.push(bbox(3.4, 0.14, 1.0, 0.03, 0x6a4a2a, [0, 0.95, 1.0], 0, { top: 0xb08a54, tex: 'woodH' }), bbox(3.3, 0.9, 0.9, 0.03, 0x4a3018, [0, 0.45, 1.0], 0, { top: 0x8a6a40, tex: 'woodH' }));
    L.push(bbox(3.4, 1.9, 0.06, 0.02, 0x5a3a60, [0, 1.3, -1.35], 0, { top: 0x9a6aa0, tex: 'cloth' }));
    // товары: ряд зелий, свёртки, ящики, тыквы, мешки
    const pot = (x, c, h = 0.28) => [part(new THREE.CylinderGeometry(0.07, 0.11, h, 8), c, [x, 1.1 + h / 2 - 0.03, 0.85], 0, 1, { top: 0xffffff }), part(new THREE.SphereGeometry(0.06, 6, 5), 0xd8c8a0, [x, 1.1 + h + 0.0, 0.85])];
    L.push(...pot(-1.3, 0xd04a4a), ...pot(-1.0, 0x4a7ad0), ...pot(-0.7, 0x4ab04a, 0.22), ...pot(0.5, 0xd04a4a), ...pot(0.8, 0x9a4ad0, 0.34));
    L.push(bbox(0.5, 0.3, 0.4, 0.03, 0x6a4a2a, [0.0, 1.17, 0.95], [0, 0.3, 0], { top: 0xb08a54, tex: 'woodH' }), part(new THREE.SphereGeometry(0.2, 8, 6), 0xd07a20, [1.35, 1.2, 0.9], 0, [1, 0.8, 1], { top: 0xf0a040 }), part(new THREE.SphereGeometry(0.16, 8, 6), 0xd07a20, [1.62, 1.16, 1.05], 0, [1, 0.8, 1], { top: 0xf0a040 }));
    for (const [x, z, r] of [[-1.9, 0.2, 0.2], [-2.0, -0.4, 0.5]]) L.push(bbox(0.55, 0.5, 0.55, 0.04, 0x4a3018, [x, 0.25, z], [0, r, 0], { top: 0x9a7a4a, tex: 'woodH' }));
    L.push(part(new THREE.CylinderGeometry(0.28, 0.34, 0.6, 8), 0x8a6a40, [1.95, 0.3, -0.2], 0, 1, { top: 0xc8a870, tex: 'cloth' }), part(new THREE.CylinderGeometry(0.16, 0.28, 0.2, 8), 0x8a6a40, [1.95, 0.7, -0.2], 0, 1, { top: 0xc8a870, tex: 'cloth' }));
    // подвесы под навесом: травы и склянки на нитях
    for (let i = 0; i < 6; i++) { const x = -1.4 + i * 0.56, y = 2.2 - (i % 2) * 0.25; L.push(part(new THREE.CylinderGeometry(0.012, 0.012, 2.45 - y, 3), 0xe8dcc0, [x, (2.45 + y) / 2, 1.25]), i % 2 ? part(new THREE.ConeGeometry(0.1, 0.34, 5), 0x4a8a3a, [x, y - 0.15, 1.25], [Math.PI, 0, 0], 1, { top: 0x8ac05a }) : part(new THREE.SphereGeometry(0.1, 7, 6), [0x4ab0d0, 0xd04ab0, 0xd0b04a][i % 3], [x, y - 0.1, 1.25], 0, 1, { emit: true })); }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this)));
    // вывеска: доска на цепях над входом + холст с надписью
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
      x.fillStyle = '#3a1e12'; x.fillRect(0, 0, 512, 160); x.strokeStyle = '#d6a548'; x.lineWidth = 8; x.strokeRect(8, 8, 496, 144);
      x.fillStyle = '#ffd98a'; x.font = 'bold 84px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#000'; x.shadowBlur = 6; x.fillText('ТОРГОВКА', 256, 86);
      const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; tex.colorSpace = THREE.SRGBColorSpace;   // С21: без него вывеска бледная и серая
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.69), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
      sign.position.set(0, 3.2, 1.75); sign.userData.noOutline = true; root.add(sign);
      const frame = new THREE.Mesh(merge([bbox(2.3, 0.79, 0.08, 0.02, 0x4a3018, [0, 3.2, 1.7], 0, { top: 0x8a6a40, tex: 'wood' })]), kit.propMat(this)); root.add(frame);
    }
    root.rotation.y = Math.PI / 4;   // фасад — к камере
    return { root };
  } };
