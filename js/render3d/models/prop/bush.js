// Куст: три доли гранёных листовых пластин (как кроны деревьев, но низкий). У кромки леса и вдоль заборов.
import { foliage } from './_foliage.js';
export default {
  id: 'bush', kind: 'prop', batch: true, sway: { base: 0.3, amt: 0.04, flutter: 0.03 }, rimColor: 0xe8ffb0, rim: 0.12, side: 'double', outline: false, leaf: 'leaf', receive: false, ao: 0.5, aoH: 0.9,
  build(kit) {
    const geometry = foliage(kit, 9).bush([[0, 0.55, 0, 0.6], [0.5, 0.42, 0.15, 0.45], [-0.4, 0.45, 0.2, 0.42]], 16);
    const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(geometry, kit.propMat(this))); return { root };
  },
};
