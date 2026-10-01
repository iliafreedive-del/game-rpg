// Осенний клён: та же форма, что дуб, но крона медно-рыжая и красная (тёплое пятно среди зелени, как у Torchlight).
import oak from './tree_0.js';
export default { ...oak, id: 'tree_autumn', seed: 13, bend: -0.12, tint: 0.18,
  lobes: [[0, 3.0, 0, 0.95], [0.85, 2.6, 0.25, 0.7], [-0.8, 2.7, -0.2, 0.74], [0.15, 2.5, 0.85, 0.62], [-0.1, 3.6, 0.1, 0.7]],
  opts: { leafHue: 0.04, leafTipHue: 0.09, sat: 1.15, light: 0.02, bark: 0x2e1c12, barkL: 0x6a4630 } };
