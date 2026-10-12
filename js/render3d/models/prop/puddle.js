// Лужа: плоская неровная гладь. Правки 5: была сплошь почти чёрной (0x0c1a20 — у плоской сетки «верх» и «низ» на одной высоте, светлый край
// не появлялся) — в затопленном склепе читалась как «непонятные чёрные объекты». Теперь видно, что это вода: мокрый тёмный камень по краю,
// бирюзовая гладь, светлые блики отражения и пара кругов ряби.
export default { id: 'puddle', kind: 'prop', batch: true, outline: false, shadow: false,
  build(kit) {
    const { THREE, merge, geo } = kit, R = geo.rng(61), ks = [1];
    for (let i = 1; i <= 12; i++) ks.push(0.7 + R() * 0.45);
    const blob = (s, y) => { const g = new THREE.CircleGeometry(0.9 * s, 12), p = g.attributes.position;
      for (let i = 1; i < p.count; i++) { const k = ks[(i - 1) % 12 + 1]; p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k * 0.75); }
      g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };
    const ring = (r0, r1, x, z, y) => { const g = new THREE.RingGeometry(r0, r1, 18); g.rotateX(-Math.PI / 2); g.scale(1, 1, 0.75); g.translate(x, y, z); return g; };
    const strip = (w, d, x, z, a, y) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.rotateY(a); g.translate(x, y, z); return g; };
    const L = [
      geo.paint(blob(1.08, 0.012), 0x2a3236),               // мокрый камень по краю
      geo.paint(blob(0.92, 0.016), 0x1f4a54),               // вода
      geo.paint(blob(0.55, 0.019), 0x2f6c78),               // середина светлее — глубина и небо в отражении
      geo.paint(strip(0.5, 0.06, -0.12, -0.12, 0.5, 0.022), 0xbfeaf0, { emit: true }),   // блики
      geo.paint(strip(0.26, 0.045, 0.2, 0.06, 0.5, 0.022), 0xbfeaf0, { emit: true }),
      geo.paint(ring(0.16, 0.19, 0.18, 0.14, 0.021), 0x8fc8d2), geo.paint(ring(0.3, 0.325, 0.18, 0.14, 0.021), 0x5a9aa6),   // круги ряби
    ];
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
