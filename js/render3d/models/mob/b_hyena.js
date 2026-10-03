// Пятнистая гиена: высокие плечи, покатая спина, короткая щетинистая грива, светлая песочная шерсть.
import { beastModel } from './_beast.js';
export default { id: 'b_hyena', kind: 'mob', outline: 'mob', build(kit) { return beastModel(kit, { furLen: 0.12, furDens: 0.9, seed: 23, fur: 0x8a6a3a, furL: 0xd8b878, skin: 0x5a4430, eye: 0xffd24a, lean: 0.7, hump: 0.95, snout: 1.1, snoutW: 0.7, plates: false, horns: false, ears: 'round', mane: 0x2a1a10, maneL: 0x5a3a20, scale: 0.8 }); } };
