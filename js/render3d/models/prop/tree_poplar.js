// Тополь: очень высокий узкий ствол и вытянутая колонна листвы.
import oak from './tree_0.js';
export default { ...oak, id: 'tree_poplar', trunkH: 3.6, bend: 0.05, seed: 23, density: 18,
  lobes: [[0, 4.4, 0, 0.7], [0.1, 5.2, 0.05, 0.66], [-0.1, 6.0, 0, 0.58], [0.05, 3.7, 0.2, 0.55], [0, 6.7, 0, 0.4]],
  opts: { bark: 0x4a3a2a, barkL: 0xa89070, leafHue: 0.25, leafTipHue: 0.2, light: 0.02, sat: 1.05 } };
