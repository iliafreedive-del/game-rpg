// Секач: приземистый кабан с клыками, щетинистым загривком и коротким рылом.
import { beastModel } from './_beast.js';
export default { id: 'w_boar', kind: 'mob', outline: 'mob', build(kit) { return beastModel(kit, { fur: 0x4a3626, furL: 0x8a6a48, skin: 0x6a4a3a, eye: 0xff8a4a, lean: 1.15, hump: 0.7, snout: 0.8, plates: false, horns: false, ears: 'round', tusks: true, mane: 0x2a1a10, maneL: 0x6a4a30, scale: 0.9 }); } };
