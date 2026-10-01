// Ель: ярусы лап-карточек. Породы-наследники: tree_pine_tall, tree_fir_blue. Для границы деревни и леса.
import { foliage, pineProxy } from './_foliage.js';
export default {
  id: 'tree_1', kind: 'prop', batch: true, sway: { base: 1.0, amt: 0.02, flutter: 0.022 }, rimColor: 0xd8ffc8, rim: 0.12, side: 'double', outline: false, leaf: 'pine', receive: false,
  tiers: 5, density: 1, wide: 1, seed: 9, opts: {}, tint: 0.2,
  shadowProxy(kit) { return pineProxy(kit, this.tiers, this.wide); },
  build(kit) {
    const geometry = foliage(kit, this.seed, this.opts).pine(this.tiers, this.density, this.wide);
    const root = new kit.THREE.Group(); root.add(new kit.THREE.Mesh(geometry, kit.propMat(this)));
    return { root };
  },
};
