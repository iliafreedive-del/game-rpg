// Молодое деревце: тонкий ствол, небольшая круглая крона светлее.
import oak from './tree_0.js';
export default { ...oak, id: 'tree_sapling', trunkH: 1.5, bend: 0.12, seed: 31, density: 16,
  lobes: [[0, 2.2, 0, 0.7], [0.45, 1.9, 0.15, 0.48], [-0.4, 1.95, -0.1, 0.5], [0.05, 2.7, 0.05, 0.44]],
  opts: { bark: 0x4a3a28, barkL: 0x9a7a52, leafHue: 0.26, leafTipHue: 0.19, light: 0.06, sat: 1.0 } };
