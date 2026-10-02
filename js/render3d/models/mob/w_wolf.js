// Серый волк: поджарый зверь с острыми ушами и пушистым хвостом.
import { beastModel } from './_beast.js';
export default { id: 'w_wolf', kind: 'mob', outline: 'mob', build(kit) { return beastModel(kit, { furLen: 0.2, furDens: 1.1, seed: 5, fur: 0x4a4a4c, furL: 0x9a9a98, skin: 0x5a5450, eye: 0xffc84a, lean: 0.62, hump: 0.45, snout: 1.35, snoutW: 0.62, plates: false, horns: false, ears: 'point', bushy: true, scale: 0.78 }); } };
