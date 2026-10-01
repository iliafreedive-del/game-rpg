// Мешки с зерном: три мешковины с перевязью (ткань), один привален к другим. Хлам у домов.
export default { id: 'sacks', kind: 'prop', batch: true, outline: 'small', ao: 0.6, aoH: 0.5,
  build(kit) {
    const { THREE, part, merge, geo } = kit, L = [];
    for (const [x, z, s, tilt] of [[0, 0, 1, 0], [0.42, 0.1, 0.9, 0.1], [0.2, 0.35, 0.85, -0.9]]) {
      const g = new THREE.SphereGeometry(0.26 * s, 9, 7); g.scale(1, 1.25, 0.9); geo.warp(g, 0.05, x * 7); g.rotateX(tilt); g.translate(x, 0.28 * s, z);
      L.push(geo.paint(g, 0x8a7448, { top: 0xd8c08a, tex: 'cloth' }));
      L.push(part(new THREE.TorusGeometry(0.1 * s, 0.025, 4, 8), 0x5a4220, [x, 0.55 * s, z], [Math.PI / 2 + tilt, 0, 0]));
    }
    const root = new THREE.Group(); root.add(new THREE.Mesh(merge(L), kit.propMat(this))); return { root };
  } };
