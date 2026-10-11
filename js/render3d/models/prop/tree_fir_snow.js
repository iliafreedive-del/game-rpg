// Ели Фьордов в снегу (правки 3): верх лап и макушка белые; три роста — обычная, высокая узкая, молодая низкая.
import pine from './tree_1.js';
const SNOWY = { pineHue: 0.4, pineTipHue: 0.38, sat: 0.7, light: -0.01, snow: 0.8 };
export const tree_fir_snow = { ...pine, id: 'tree_fir_snow', tiers: 5, wide: 1.05, seed: 31, opts: SNOWY };
export const tree_fir_snow_tall = { ...pine, id: 'tree_fir_snow_tall', tiers: 7, wide: 0.82, seed: 37, opts: SNOWY };
export const tree_fir_snow_small = { ...pine, id: 'tree_fir_snow_small', tiers: 3, wide: 0.9, seed: 41, opts: SNOWY };
export const FIR_SNOW = [tree_fir_snow, tree_fir_snow_tall, tree_fir_snow_small];
