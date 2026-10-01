// Ёлка: ярусы листовых пластин. Для границы деревни и леса.
import { foliage } from './_foliage.js';
export default {
  id: 'tree_1', kind: 'prop', batch: true, sway: { base: 1.0, amt: 0.02, flutter: 0.022 }, rimColor: 0xd8ffc8, side: 'double', outline: false,
  build(kit) {
    const geometry = foliage(kit, 9).pine(5);
    const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(geometry, kit.propMat(this)));
    return { root };
  },
};
