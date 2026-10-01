// Лиственное дерево (большое, 6 долей кроны). batch: true — все такие деревья рисуются одним instanced-мешем.
import { foliage, leafProxy } from './_foliage.js';
export default {
  id: 'tree_0', kind: 'prop', batch: true, sway: { base: 1.4, amt: 0.026, flutter: 0.035 }, rimColor: 0xe8ffb0, rim: 0.12, side: 'double', outline: false, leaf: 'leaf', receive: false,
  lobes: [[0, 3.1, 0, 1.0], [0.95, 2.65, 0.2, 0.72], [-0.9, 2.75, -0.2, 0.78], [0.2, 2.55, 0.95, 0.66], [-0.1, 3.75, 0.1, 0.72], [0.3, 2.7, -0.85, 0.66]],
  density: 22,
  // тень рисует лёгкий заменитель (ствол + шары крон), а не тысяча пластин листвы
  shadowProxy(kit) { return leafProxy(kit, this.lobes, 2.2); },
  build(kit) {
    const geometry = foliage(kit, 5).leafTree(this.lobes, 2.2, 0.08, this.density);
    const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(geometry, kit.propMat(this)));
    return { root };
  },
};
