// Костяной колдун: парит, мантия Бездны до земли, корона из рогов, посох с орбой. Каст — воздеть посох (сборка 57 — модель skel_mage_m).
import { skeleton } from './_skeleton.js';
import { mobSkin } from './_skin.js';
export default { id: 'skel_mage', kind: 'mob', outline: 'mob', build(kit) { return mobSkin(kit, skeleton(kit, { head: 'horned', pauldron: false, robe: true, hover: true, cast: 'staff', cloth: 0x241850, clothL: 0x5b44b0, rimColor: kit.MOB.rimColor.mage, scale: 1.08, weapons: { handR: 'staff_bone' } }), 'skel_mage_m', { rimColor: kit.MOB.rimColor.mage }); } };
