// Пустынный кабан: рыжий, поджарый, длинные клыки, тёмная грива по хребту.
import { beastModel } from './_beast.js';
export default { id: 'b_boar', kind: 'mob', outline: 'mob', build(kit) { return beastModel(kit, { furLen: 0.11, furDens: 0.85, furStiff: 0.55, seed: 17, fur: 0x8a4a26, furL: 0xc8804a, skin: 0x7a4a34, eye: 0xffb04a, lean: 1.05, hump: 0.75, snout: 0.85, plates: false, horns: false, ears: 'round', tusks: true, mane: 0x3a1a0c, maneL: 0x7a3a1a, scale: 0.92 }); } };
